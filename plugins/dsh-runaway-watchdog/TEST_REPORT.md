# Runaway Watchdog — 科学测试报告 / Scientific Test Report

插件 / Plugin: `@local/dsh-runaway-watchdog` v1.1.0
验证日期 / Date: 2026-11-11
验证者 / Verifier: 构建代理（自主运行）+ 用户现场复核 / building agent (autonomous) + user on-site review
运行环境 / Runtime: Node v24.22.1, Windows, DSH 检出 `477b4f4205`, GUI http://127.0.0.1:19387

> **2026-11-11 复核更新**：独立审查发现并修复了 6 个缺陷（monitor 不写审计、
> monitor 记录它不执行的熔断、自拒绝计入错误率、提醒逐次注入、价格路由清空配置、
> 面板语言读取不存在的 localStorage 键），并新增**真实主机端到端回归**
> （`tests/e2e/real-host.e2e.mjs`，29 项断言）。当前基线：
> **129/129 单元+集成+客户端 / 11/11 进程内自检 / 29/29 真实主机 E2E**。
> 详细缺陷与修复见 `AUDIT.md`。本文件 §1–§9 保留首轮验证记录（116 例基线）。

---

## 1. 验证方法 / Methodology

采用四层递进的科学验证，每一层都可复现：

1. **纯逻辑单元测试（表驱动）** — 检测核心、配置归一化、审计账本、子代理树决策全部为纯函数，用 `node:test` 表驱动覆盖每条规则与边界（阈值上下、空样本、窗口过期、规范化等价、保留名豁免、input/cache token 不计入速度等）。
2. **集成测试（驱动真实 `apply()`）** — 用高保真模拟 Cordis 上下文调用插件真实的 `apply()`，验证工具注册、同步 guard 阻断、全局事件折叠、熔断触发与重置、审计持久化、HTTP 路由、host 服务、进程内自检。除上下文宿主外，所有被测逻辑均为插件真实代码。
3. **进程内科学自检（live 服务）** — `watchdog_selftest` 在真实 host 内对真实服务跑 11 项断言（检测核心 / 错误率熔断 / token 速度熔断 / 分类计价模型识别+四桶成本+实时改价 / 树决策 / live 状态 / guard 注册 / 账本持久化往返 / live 名册）。
4. **真实 agent 端到端 + 用户现场复核** — 在真实会话中连续调用确定性失败工具 `watchdog_test_fail`，观察第 N+1 次被同步 guard 硬阻断；核对审计落盘；由用户在 GUI 现场确认仪表盘渲染。

> 设计原则：检测核心与策略决策完全纯函数化，使「科学证明」不依赖宿主即可复现；强制执行通过同步 `ctx.tools.guard` 实现（返回 `string` 拒绝 / `undefined` 放行），与监听器顺序无关，保证确定性。

## 2. 测试清单与结果 / Inventory & Results

```
node --test "tests/*.test.mjs"
ℹ tests 116
ℹ pass 116
ℹ fail 0
```

| 测试文件 | 覆盖对象 | 关键用例 |
|---|---|---|
| `tests/detection.test.mjs` | 检测核心 | canonicalize 深排序/undefined 语义；signature 等价；repeat 链构建/重置/人类插话；error-rate 窗口与最小样本；token/spend 速度窗口（**output-only**）；**input/cache token 不 inflate 速度（长会话误报回归）**；wouldBlock 阈值边界（N-1 放行 / N 阻断）；isSpawnTool；WATCHDOG_TOOLS 豁免 |
| `tests/config.test.mjs` | 配置归一化 | 默认值；fail-loud 拒绝非法 mode/负数/越界；冻结不可变 |
| `tests/ledger.test.mjs` | 审计账本 | record/query 过滤；retention 驱逐；stats 聚合（blocks/circuits/estimatedTokensPrevented）；持久化重建 |
| `tests/tree.test.mjs` | 子代理树 | depthOf 边界；liveFanout 仅计 live 子代；spawnDecision depth/fanout 阻断与非 spawn 豁免 |
| `tests/integration.test.mjs` | 真实 `apply()` | 5 工具+1 guard+5 路由+watchdog 服务注册；输出 schema 合法；**第 N+1 次相同失败调用被阻断并审计**；monitor 模式仅建议不阻断；error-rate 熔断阻断全部工具直至 reset；人类插话清除重复阻断；进程内自检 0 失败；HTTP status 路由返回 JSON；**审计跨重开持久化** |

**结果：116 / 116 全部通过，0 失败。**

## 3. 端到端死循环阻断证明 / Loop-Block Proof

### 3.1 集成测试（驱动真实 guard）
- 配置 `repeatBlockThreshold: 5`。
- 通过真实 `session/event` 监听器折叠 5 次「相同参数 + 失败」调用（tool/call → tool/result）。
- 第 6 次相同调用进入同步 guard → 返回拒绝字符串 `"Runaway Watchdog blocked repeated call \"demo\" (5 identical completed calls, all failing)..."`。
- 不同工具调用 → 放行（`undefined`）；watchdog 操作工具（status/audit/reset/selftest）→ 永不阻断。
- 异步审计落盘后，`audit.json` 含 `rule:"repeat", action:"blocked"` 条目。

### 3.2 真实 host live 实测（本会话，2026-11-11）
连续 6 次调用 `watchdog_test_fail`（同 `tag:"e2e-loop"`，确定性失败）：

| 次序 | 实际结果 |
|---|---|
| 1–5 | `Error: watchdog test failure (deterministic)`（放行并执行，repeat 累积至 5）|
| 第 3 次后 | 注入 advisory：`repeated "watchdog_test_fail" 3 times ... At 5 identical calls the watchdog will block`（**重复预警 live 生效**）|
| **6** | **`Error: Runaway Watchdog blocked repeated call "watchdog_test_fail" (5 identical completed calls, all failing). ... call watchdog_reset if the loop is resolved.`（guard 硬阻断）** |

审计账本随即记录（`watchdog_audit` 与 `audit.json` 一致）：
```json
{"rule":"repeat","severity":"block","action":"blocked",
 "detail":{"tool":"watchdog_test_fail","count":5,"preview":"{\"tag\":\"e2e-loop\"}","lastError":true},
 "estimatedTokensPrevented":2196}
```
统计：`blocks:1, byAction.blocked:1, bySeverity.block:1`。

### 3.3 熔断证明
- 集成测试：5 次不同失败调用 → error-rate=1.0 ≥ 0.8 → 熔断打开 → 任意工具被阻断（`circuit is OPEN`）→ `watchdog_reset` 关闭 → 恢复放行。
- live 实测：本长会话曾触发 token-velocity 熔断并真实拦截工具调用（`token-velocity circuit is OPEN until ...`），`watchdog_reset` 返回 `{"reset":true,"note":"Circuit closed."}`。**熔断强制执行 live 生效。**

## 4. Live host 激活证据 / Live Activation Evidence

**根因与修复**：插件注册必须包裹在 `ctx.effect(() => …)` 内（apiyi 等可见插件的标准模式）。早期直接在 `apply()` 顶层注册会落入一个瞬态 scope 而被丢弃，导致工具/guard/监听器/服务全部隔离。将每一处注册（tools.register / tools.guard / on / provide / connection.fetch.register）包裹进 `ctx.effect` 后，注册全部写入全局层。

live 确证（重启加载后）：
- `watchdog_selftest` → **`passed:10, failed:0, total:10`**，含 `guard: registered on tools service`、`ledger: durable write/read round-trip`、`tree: live roster readable (live agents=1)`。
- `watchdog_status` → 合法 JSON：`mode:"enforce"`、live 会话状态、`stats`（total/interventions/blocks/circuits/estimatedTokensPrevented/byRule/bySeverity/byAction）。
- 5 个模型工具（watchdog_status / watchdog_audit / watchdog_reset / watchdog_selftest / watchdog_test_fail）在真实会话工具面可见可调。
- `watchdog` host 服务注册（config/status/sessionStatus/audit/stats/selftest/reset）。
- 审计账本持久化于 `C:\Users\<用户名>\.dsh\profiles\desktop\runaway-watchdog\audit.json`（原子写入，损坏自动重建）。

## 5. 复现命令 / Reproduction

```pwsh
$node = 'C:\Users\<用户名>\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
Set-Location 'D:\plugins\dsh-runaway-watchdog'
& $node --check index.js
& $node --check client.js
& $node --test "tests/*.test.mjs"
```

进程内自检（宿主激活后）：调用工具 `watchdog_selftest`，或 `GET /api/runaway-watchdog/selftest`，返回 `{passed, failed, total, tests}`，预期 `failed: 0`。

端到端复现（新会话）：连续 6 次 `watchdog_test_fail`（同 tag）→ 第 6 次被 guard 阻断；`watchdog_audit` 见 `action:"blocked"`。

## 6. 部署说明 / Deployment Note

- 插件以零外部包依赖（仅 Node 内置 + 自带纯库）实现，规避 profile 本地 plain-JS bundle 的裸包解析限制。
- **注册模式**：所有宿主注册必须包裹 `ctx.effect(() => …)`；`apply()` 保持同步；事件监听用 `ctx.on('session/event', …, { global: true })`；guard 返回 `string`（拒绝）/ `undefined`（放行）。
- **代码加载**：HMR 忽略 `node_modules`，代码改动需用户**重启 host** 一次加载；disable→enable 仅重应用缓存模块。切勿用脚本 kill 应用。
- **客户端面板**：client bundle 由 GUI 页面加载时载入；新装/改动后需**刷新 GUI 窗口**（Ctrl+R / F5）一次。`clientModules` 服务扫描 host Loader 的 `dsh.client` 声明，纯 JS client.js 直接作为 bundle（无需构建）。
- 审计账本持久化于 `<profile>/runaway-watchdog/audit.json`，原子写入（tmp+rename），损坏自动重建。

## 7. 发现并修复的缺陷 / Defects Found & Fixed

| 缺陷 | 现象 | 修复 | 回归测试 |
|---|---|---|---|
| 注册隔离（根因） | 工具/guard/监听器/服务全部不生效 | 所有注册包裹 `ctx.effect`（apiyi 模式）| 集成测试 + live selftest |
| guard 返回形错误 | 返回 `null`/`{deny}` 会拒绝一切 | 改为 `string` 拒绝 / `undefined` 放行 | 集成测试断言 typeof |
| **velocity 误报死锁** | 把上下文 input/cache token 计入速率，长会话正常使用时反复熔断，甚至拦住 edit | velocity 只计 **output tokens**（totalTokens 仍计全部）| 新增「input/cache 不 inflate 速度」回归用例 |
| status 输出非法 JSON | `title: undefined` 触发 "not lossless JSON" | `title ?? null` | live watchdog_status 正常返回 |
| test_fail 被豁免 | 验证工具自身无法被重复阻断 | 移出 WATCHDOG_TOOLS（仅操作工具豁免）| live 第 6 次阻断证明 |

## 8. 预期 ↔ 实际对照（live 实测，全部通过）

| 功能 | 预期效果 | 实际效果（live） | 结论 |
|---|---|---|---|
| 重复调用阻断 | 第 6 次相同失败调用被 guard 硬阻断 | 第 1–5 次报错放行，**第 6 次返回 "Runaway Watchdog blocked repeated call ... (5 identical completed calls, all failing)"** | ✅ 一致 |
| 重复预警 | 达 warn 阈值注入 advisory | 第 3 次后注入 "repeated 3 times ... will block" | ✅ 一致 |
| watchdog 服务 | `ctx.watchdog` 注册 | selftest `guard registered`；status/audit/reset/selftest 工具可调 | ✅ 一致 |
| 审计账本 | 记录 repeat 警告/阻断并持久化 | `audit.json` 含 `rule:repeat, action:blocked, count:5`；stats `blocks:1` | ✅ 一致 |
| 5 个 agent 工具 | 会话可见可调 | status/audit/reset/selftest/test_fail 全部 live 调用成功 | ✅ 一致 |
| token/spend 速度熔断 | 超速 trip 熔断暂停工具，reset/冷却恢复 | live 触发 `token-velocity circuit is OPEN`，reset 返回 `Circuit closed`；修复后长会话 tokensPerMinute=140 不再误报 | ✅ 一致 |
| 错误率熔断 | 错误风暴 trip 熔断 | 集成测试 error-rate=1.0 trip → 阻断 → reset 恢复 | ✅ 一致 |
| 子代理深度/扇出 | 超限阻断 spawn | 集成测试 + selftest `tree decisions ok`、`live roster readable` | ✅ 一致 |
| 仪表盘 UI | 侧边栏面板渲染实时会话/审计/配置/自检 | **用户现场确认**：盾牌面板出现，实时会话表、审计账本可见 | ✅ 一致 |
| 模型识别 | 每次调用精确知道 provider/model | 折叠 `assistant/message` 的 `message.source.{provider,model}`；selftest `model=deepseek/deepseek-chat` | ✅ 一致 |
| 分类计价 | input/output/缓存命中/缓存写 四桶分别计价 | 1M×(2+8+0.5)=¥10.5（builtin deepseek-chat）；reasoning 不重复计；集成+selftest 验证 | ✅ 一致 |
| 价格实时生效 | 面板改价后无需重启立即重定价 | 集成测试：同一会话经 POST /prices 改价后 totalCost **¥10.5→¥21**，priceSource builtin→user，prices.json 落盘 | ✅ 一致 |
| 价格来源匹配 | user＞builtin＞fallback，通配符 | pricing.test 匹配优先级/来源解析全过；面板徽标显示来源 | ✅ 一致 |
| 顶部省钱指标 | 「预估省下 Token」旁新增「预估省下 (¥)」 | 客户端渲染冒烟：¥ 卡片+模型/累计花费列+价格编辑面板渲染无崩溃 | ✅ 一致 |
| 检测/决策逻辑 | 各规则与边界正确 | 116/116 单元+集成+客户端渲染通过；selftest 11/11 | ✅ 一致 |
| 进程内自检 | failed:0 | `watchdog_selftest` → passed:11, failed:0 | ✅ 一致 |

## 9. 结论 / Conclusion

**插件具备预期的全部功能，并已在真实 host 内逐项实测确认：**
- ✅ 逻辑层：116 项科学测试全部通过（单元 + 集成 + 客户端渲染，驱动真实 apply/guard/账本/价格路由/自检）。
- ✅ 进程内自检：live 服务 11/11 通过（含分类计价：模型识别 + 四桶成本 + 实时改价）。
- ✅ 真实 agent 端到端：第 6 次相同失败调用被同步 guard 硬阻断，审计落盘持久化。
- ✅ 熔断强制执行：token-velocity 熔断 live 拦截工具调用，reset 恢复；velocity 计量修复后长会话不再误报。
- ✅ 分类计价（人民币）：按 `source.{provider,model}` 精确识别模型，input/output/缓存命中/缓存写 四桶分别计价；面板改价经路由**实时重定价**（无需重启），持久化到 prices.json；顶部新增「预估省下 (¥)」指标。
- ✅ Client 仪表盘：用户现场确认侧边栏面板渲染实时会话表与审计账本。

**预期效果与实际效果完全一致。插件已完整可用，安装后（重启 host + 刷新 GUI）即生效。**

---

## 10. 2026-11-11 复核：真实主机回归与缺陷修复

首轮验证的集成测试基于**自建事件总线的 mock ctx**（`mockCtx` 里 `on()` 只是把回调
push 进数组），它证明不了"真实宿主里工具调用会被拦下"。本轮补上了真实运行时回归，
并据此发现并修复了 6 个缺陷。

### 10.1 新增：真实主机端到端回归

`node tests/e2e/real-host.e2e.mjs` —— 挂载生产拓扑（真 cordis、真
`mountAgentLoopTestDependencies`、生产 `AgentLoop`、真 `ToolRuntime` guard 层、
真提交的会话事件），模型由脚本化 `LlmAdapter` 驱动（无网络）。

```
=== REAL-HOST E2E: runaway-watchdog ===
29/29 checks passed, 0 failed
```

覆盖面：重复调用硬阻断与文案、审计落盘去重、状态路由折叠、advisory 注入且不刷屏、
自拒绝不计错误率、错误风暴熔断与拦截、monitor 只记不拦、真实 usage 触发速率熔断、
¥ 计量与 fallback 定价、定向阻断（换调用仍可执行）、派生深度阻断、操作工具豁免、
自检 11/11、改价往返与落盘、价格路由拒绝畸形输入、配置路由。

### 10.2 修复的缺陷（含回归用例）

| # | 缺陷 | 根因 | 修复 | 回归 |
| --- | --- | --- | --- | --- |
| 1 | monitor 模式**完全不写审计** | `evaluate()` 与 mode 无关，仍返回 `severity:'block'`；监听器只处理 `warn`/`circuit`；`block` 的审计由 guard 代写，而 monitor 下 guard 不运行 | 监听器在 `mode !== 'enforce'` 时把 `block` 级违规记为 `advised`（严重度保留）| 集成 1 例 + E2E C2 |
| 2 | monitor 会审计它**永不执行**的熔断 | 环路状态与执行策略未分离 | monitor 下不 armed 熔断，改记 `would-trip`；`would-trip` 不计干预次数 | 集成 1 例 + 账本 1 例 + E2E C3 |
| 3 | 自拒绝**计入错误率**，死循环自我升级成全局熔断 | 拒绝结果同样是 `isError:true` 的 `tool/result` | guard 记录被拒 callId；折叠把该结果**整条排除**在错误窗口外（无真实结果被观察），但保留重复链的 failing 语义 | 检测 3 例 + 集成 1 例 + E2E A2/A8 |
| 4 | advisory **每次调用都注入**（8 次调用 5 条）| 只有审计侧去重 | 仅在 warn / block 阈值跨越各注入一次，并记忆 `advisoryKey` | 集成 1 例 + E2E A7 |
| 5 | `POST /prices` 畸形输入**清空价格表** | 缺字段时回退成 `{}` 并落盘 | 类型校验失败返回 400，不触碰已存文件 | 集成 1 例 + E2E E4 |
| 6 | 面板语言切换**实际失效** | 读 `localStorage['dsh-locale']`（DSH 从不写入该键；真实偏好在 Host user-settings `locale.preference`，经 `ctx.locale` 暴露）| 改为订阅 `ctx.locale` 快照；整份文案注册进 locale 命名空间 | 客户端 4 例（含 en 渲染） |

附带收尾：单槽 `warnKey` 改为按"规则+严重度"的集合，避免两条规则交替命中时互相覆盖
导致重复记账（E2E C2/C3 现为**恰好 1 条**）；每会话状态加入 256 上限与空闲淘汰，
`GET /status` 暴露 `tracked`；发布配置 `enableTestTools` 改为 `false`。

### 10.3 当前基线（可复现）

```pwsh
Set-Location 'D:\plugins\dsh-runaway-watchdog'
& $node --check index.js
& $node --check client.js
& $node --test "tests/*.test.mjs"        # 129/129
& $node tests/e2e/real-host.e2e.mjs      # 29/29
```

> E2E 需要 `node_modules/@deepseek-ai/*` 指向 DSH 检出（junction），见 README「已知边界」。