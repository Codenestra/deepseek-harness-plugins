# 失控看门狗 · 花费熔断器

一个 DeepSeek Harness 的 **Harness 层安全插件**：在失控行为烧光你的 Token 预算
**之前**检测它，并确定性地阻止它。

与"你好像在死循环"式的提醒不同，看门狗会**强制执行**：同步工具守卫阻断违规调用，
花费/错误熔断器暂停工具执行，直到问题被解决。

## 检测能力

| 规则 | 信号 | 动作 |
| --- | --- | --- |
| `repeat` | 连续 N 次完全相同的工具调用（名称+规范化参数） | 提醒 → 硬阻断 |
| `error-rate` | 近期工具结果窗口内的错误比例 | 开启熔断 |
| `token-velocity` | 滑动窗口内**新生成 output** Token/分钟（不计上下文重发的 input/cache，避免长会话误报） | 开启熔断 |
| `spend-velocity` | 分类计价的 CNY/分钟（按会话实际模型的 input/output/缓存命中/缓存写分别计价） | 开启熔断 |
| `depth` | 子代理委托深度 ≥ `maxDepth` | 阻断派生 |
| `fanout` | 每个父代理的活跃子代理数 ≥ `maxFanout` | 阻断派生 |

检测是一个**纯会话投影**，由已提交的会话事件（`tool/call`、`tool/result`、
`assistant/message`、`user/message`）折叠而成。可重放、可检查点、会话恢复后依然
有效。**绝不追加新的会话事件类型**。委托深度直接读取持久化的
`SessionHeader.delegationDepth`。

## 分类计价与模型识别（人民币）

花费不是「一个混合单价 × 总 Token」的粗估，而是**按模型、按用量类别**精确计算：

- **模型识别**：每条 `assistant/message` 事件都携带 `message.source.{provider, model}`
  （模型路由的真实身份）。看门狗据此知道**每次调用究竟用的是哪个供应商的哪个模型**，
  无论你在 Harness 里配置了多少供应商/模型。
- **分类用量**：模型上报的 `usage` 含四个**互不重叠**的桶——`inputTokens`（未命中缓存的
  输入）、`outputTokens`（输出，已含 reasoning）、`cacheReadTokens`（缓存命中）、
  `cacheWriteTokens`（缓存写）。每桶按各自单价计费，绝不重复计算。
- **价格匹配**：价格表按 `模型 ID → provider/model → 通配符（如 deepseek-*）→ *` 的优先级
  匹配。来源分三级：`自定义`（你在面板设的）＞ `内置`（DeepSeek 常规费率参考）＞ `回退`（`*`）。
- **实时生效**：检测状态只存**原始用量桶 + 模型名**，花费在读取时按**当前价格**即时计算。
  你在面板改价 → 保存到 `prices.json` 并更新内存 → **下一次状态/折叠立即用新价，无需重启**。
- **货币**：默认人民币（¥，元/每百万 Token）；可设 `currency: USD` 按 `usdToCny` 汇率换算显示。

> ⚠️ 内置价（元/百万 Token，`输入 / 缓存命中 / 缓存写 / 输出`）：
> **deepseek-flash 2 / 0.04 / 0 / 8**、**deepseek-v4-pro 9 / 0.30 / 0 / 27** 取自官方
> 价格页的**高峰时段**价（空闲时段为其一半；DeepSeek 不单独收缓存写费用）。默认取高峰价
> 是有意的：花费守卫宁可高估早熔断，低估会让真实花费越过熔断线。`deepseek-chat` /
> `deepseek-reasoner` 作为历史参考保留，`*` 是通用回退。价格会变，请以官方页为准并在
> 面板覆盖（自定义行优先于内置价）。花费与「预估省下」均为**估算**（用量×费率），
> 拦截判定只依赖精确计数，不依赖估算。

### 面板价格设置

仪表盘新增「**模型价格设置**」面板：
- 顶部「**检测到的模型**」条列出当前会话实际使用的模型及其价格来源徽标与累计花费，
  点「设置」即可把该模型加入编辑表（自动预填当前价）。
- 编辑表逐模型设置 input/output/缓存命中/缓存写 四档单价，可添加任意模型 ID 或通配符、
  可删除；`*` 为回退价。
- 点「**保存价格**」→ 立即生效（实时），并持久化到 profile 的 `runaway-watchdog/prices.json`。

### 顶部新增指标

在「预估省下 Token」旁新增「**预估省下 (¥)**」卡片（人民币），按分类计价估算每次拦截
省下的钱；会话表新增「模型」「累计花费」列，花费/分以 ¥ 显示；审计账本「预估省下」列
同时给出 Token 与 ¥ 金额。

## 强制执行机制

- **同步工具守卫**（`ctx.tools.guard`）读取折叠状态，阻断第 N+1 次相同的失败调用、
  阻断超预算的派生、并在熔断开启时阻断所有工具。守卫**永不阻断看门狗自己的工具**，
  因此你随时可以查看状态并重置。
- **全局监听器**对违规排序、触发熔断（带冷却），并为每个事件段写入持久审计
  （**按"规则+严重度"去重**，两条规则同时命中时不会互相覆盖而重复记账）。
- **提醒上下文**只在跨越 warn 阈值与 block 阈值各注入一次，绝不每次调用都追加——
  否则一次死循环会自己把自己的上下文撑大。
- **拒绝不算工具错误**：守卫会记录它拒绝过的 callId，折叠时把这些结果**整条排除**
  在错误率窗口之外（因为没有任何真实工具结果被观察到）。否则一次相同的死循环
  会把错误率自己推满、自我升级成全局熔断，仪表盘上的"错误率 100%"就变成了
  对看门狗自身行为的测量。
- **重复阻断只有在改用不同调用或用户介入时才清除**——重置不会解除正在进行的相同
  死循环（否则就失去了意义）。`watchdog_reset` 用于关闭已触发的花费/错误熔断。

### 监测模式（monitor）语义

`mode: 'monitor'` 只检测与记录，绝不阻断：

| 折叠发现 | `enforce` | `monitor` |
| --- | --- | --- |
| 重复调用 / 错误率超过阻断阈值 | 守卫拒绝，审计 `blocked` | 审计 `advised`（严重度仍为 `block`）|
| 速率 / 错误率满足熔断条件 | 熔断开启（含冷却），审计 `circuit-opened` | **不开启熔断**，审计 `would-trip` |
| 提醒阈值跨越 | warn + block 各注入一次 | 同 |

监测模式**绝不**armed 熔断：面板显示「熔断开启」但实际什么都不会拦，是在骗人。
因此只记录 `would-trip`，且 `would-trip` 不计入「干预次数」。

## 架构

```
lib/detection.js  纯折叠 + 违规排序 + 守卫判定 + 分类花费（无外部依赖）
lib/pricing.js    纯分类计价：价格表匹配 + 来源解析 + 四桶成本（无依赖）
lib/config.js     默认值 + fail-loud 规范化（无依赖）
lib/ledger.js     基于 storage-domain 表的持久审计账本
lib/tree.js       纯深度/扇出判定
index.js          投影 + 守卫 + 监听器 + 5 个工具 + HTTP 路由（含价格读写）+ 服务
client.js         仪表盘（侧边栏入口 + 主页面 + 价格编辑面板），仅用主题 token
```

## 工具

- `watchdog_status` — 实时计数、熔断状态、聚合统计。
- `watchdog_audit` — 读取审计账本（按会话/规则过滤）。
- `watchdog_reset` — 关闭当前会话已触发的熔断。
- `watchdog_selftest` — 运行进程内科学自检。
- `watchdog_test_fail` — *（仅当 `enableTestTools: true`）* 确定性失败工具，用于驱动
  真实死循环并证明阻断生效。

## 科学验证（五层，均可复现）

1. **单元测试 + 集成测试**（`node --test tests/*.test.mjs`，**129 例全过**）：表驱动覆盖
   每条规则、阈值边界、窗口边缘、链重置、保留期淘汰、持久重建、配置校验、**input/cache
   token 不 inflate 速度**、**自拒绝不计入工具错误**、**monitor 审计 + would-trip**、
   **价格路由拒绝畸形输入且不丢数据**、**提醒注入有界**、**客户端渲染/本地化冒烟**；
   集成测试驱动真实 `apply()`/guard/账本/价格路由/自检。
2. **进程内自检**（`watchdog_selftest` 或 `GET /api/runaway-watchdog/selftest`）：对
   **真实**投影、守卫注册、检测核心、分类计价（模型识别+四桶成本+实时改价）、持久审计写读
   往返进行验证，返回通过/失败报告（live 11/11）。
3. **真实主机端到端回归**（`node tests/e2e/real-host.e2e.mjs`，**29 项断言全过**）：
   挂载**生产级** DSH 拓扑——真 cordis、真 `mountAgentLoopTestDependencies` 服务、
   生产 `AgentLoop`、真 `ToolRuntime` guard 层、真提交的会话事件——模型由脚本化
   adapter 驱动（无网络）。阻断、折叠、审计、熔断、计量、深度预算、路由与自检
   全部在**真实运行时**验证，而不是对着 mock 事件总线自说自话。
4. **端到端行为测试**：开启 `enableTestTools` 后，用相同参数反复调用
   `watchdog_test_fail`。前 `repeatBlockThreshold` 次正常失败；下一次调用被**守卫
   阻断**，理由为 "Runaway Watchdog blocked repeated call"，仪表盘出现 `blocked`
   审计记录。
5. **真实 host live 实测 + 用户现场复核**：已在真实 desktop host 内逐项确认（见
   `TEST_REPORT.md` 第 8 节预期↔实际对照表）。

## 部署 / 生效

- 安装后需**重启 host 一次**加载代码（HMR 忽略 `node_modules`）；客户端面板需**刷新
  GUI 窗口一次**（Ctrl+R / F5）。
- 所有宿主注册包裹 `ctx.effect`、`apply()` 同步、guard 返回 `string`/`undefined`——
  这是注册写入全局层的关键（详见 TEST_REPORT 第 4、7 节）。
- 发布配置 `cordis.patch.yml` 默认 `enableTestTools: false`（对模型隐藏诊断工具）；
  需要现场验证阻断时再临时置 `true`。

## 故障排查

**症状**：某一轮起，每轮对话都报
`Failed to deserialize the JSON body into the target type: messages[n]: missing field 'role'` +
`INVALID_REQUEST`，重试无效。

**原因（1.1.0 及更早）**：repeat advisory 以 `{source, content}` 交给宿主，宿主把它原样写成
`user/message` 事件，请求体里这条消息因此没有 `role` 键，供应商严格反序列化直接 400，
该会话此后每次请求都失败。1.1.1 已修（补 `id` + `role: 'user'`），**重启 host 生效**。

**已被写坏的历史会话**用工具修（先关掉 harness，自动留 `.bak-<时间戳>` 备份）：

```pwsh
node tools/repair-role-less-context.mjs           # 只体检：列出待修文件
node tools/repair-role-less-context.mjs --apply   # 改写（仅重压受影响帧，其余字节不变）
```

## 已知边界

- **折叠状态在内存里**：`states`/`live` 由 `session/event` 逐条重建，host 重启后从零开始；
  看门狗刻意不追加事件、不直读会话日志，因此"会话恢复后依然有效"仅指**通过事件流重放**
  能重建的那部分，而不是持久化检查点。
- **每会话状态有界**（256 个会话），空闲会话按插入序淘汰，活名册中的会话永不淘汰；
  `GET /status` 的 `tracked` 字段暴露当前数量与上限。
- **fanout 只统计 in-process 子代理**（`agents.list()`），ACP / remote / CLI 子进程派生的
  子代理不计入 `fanout` 预算；`depth` 不受影响（读持久化的 `SessionHeader.delegationDepth`）。
- **面板文案跟随宿主 locale 服务**（`ctx.locale` 快照），与内置面板一致；
  `locale/*.json` 是插件目录元数据（标题/描述），不是 UI 文案。

## 验证状态（如实）

**以下均为可复现的实测结果：**
- ✅ **148/148** 单元 + 集成 + 客户端渲染测试；进程内自检 live **11/11**。
- ✅ **31/31** 真实主机端到端断言（真 cordis + 真 AgentLoop + 真 ToolRuntime + 真会话事件 +
  真 JSONL 持久化后端）：第 6 次相同失败调用被守卫硬阻断、审计落盘、熔断拦截与 reset、
  深度派生阻断、真实 usage 计价、monitor 只记不拦、价格路由拒绝畸形输入，
  以及"被写坏的日志修复后必须能被真后端重新加载"。
- ✅ 合规性修复：monitor 模式此前**完全不写审计**（已修，现审计 `advised` 并按规则去重）；
  monitor 此前会算出并审计它永不执行的熔断（已修，改为 `would-trip` 且不 armed）；
  看门狗自身的拒绝此前计入错误率、导致死循环自我升级成全局熔断（已修，整条排除）；
  提醒此前每次调用都注入（已修，只在阈值跨越时注入）；`POST /prices` 畸形输入此前会清空
  价格表（已修，返回 400 且不动已存文件）；面板语言此前读一个 DSH 从不写入的
  `localStorage` 键（已修，改读宿主 locale 快照）。
- ✅ 分类计价：按 `source.{provider,model}` 识别模型、四桶分别计价；面板改价经路由
  实时重定价，持久化到 prices.json。
- ⚠️ 真实浏览器 GUI 目视未在本次自动化中覆盖（客户端为结构渲染 + locale 冒烟测试，
  真实渲染以你的现场确认为准）。

## 安全说明

- 看门狗只会*拒绝*工具调用，自身绝不执行任何操作。
- 审计数据为插件自有，存于独立 storage domain，可丢弃（损坏记录重建，不会导致插件崩溃）。
- `watchdog_test_fail` 是无害诊断工具；发布配置已默认 `enableTestTools: false` 将其
  对模型隐藏。