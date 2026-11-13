# 失控看门狗 · 安装与使用手册

> 插件：`@local/dsh-runaway-watchdog` **v1.2.1** ｜ 宿主：DeepSeek Harness ｜ 文档更新：2026-11-12
> 适用读者：要给自己的 Harness 装上它的人，以及拿到 `.tgz` 分包要转发/部署的人。
> 本文件是完整的安装与使用手册。

---

## 目录

1. [它是什么](#1-它是什么)
2. [运行要求](#2-运行要求)
3. [安装](#3-安装)
4. [五分钟上手](#4-五分钟上手)
5. [配置参考](#5-配置参考)
6. [模型可调用的工具](#6-模型可调用的工具)
7. [HTTP 接口](#7-http-接口)
8. [数据与持久化](#8-数据与持久化)
9. [花费是怎么算的](#9-花费是怎么算的)
10. [面板指标口径](#10-面板指标口径)
11. [典型场景操作手册](#11-典型场景操作手册)
12. [故障排查](#12-故障排查)
13. [卸载与回滚](#13-卸载与回滚)
14. [FAQ](#14-faq)
15. [附录](#15-附录)

---

## 1. 它是什么

一个 **Harness 层**的安全插件：在失控行为烧掉预算**之前**发现它，并且**确定性地拦住**，
而不是只给模型一句"你好像在死循环"。

它只看**已经提交的会话事件**（`tool/call`、`tool/result`、`assistant/message`、`user/message`），
折叠出每个会话的状态；在每次工具调用**真正执行之前**，由一个同步守卫决定放行还是拒绝。

### 六条检测规则

| 规则 | 触发条件（默认值） | 动作 |
| --- | --- | --- |
| `repeat` | 相同工具 + 相同参数**连续** 3 次 → 提醒；5 次且都失败 → 硬阻断下一次 | 提醒 / 阻断 |
| `error-rate` | 最近 12 条工具结果里错误率 ≥ 80%（至少 6 条样本） | 熔断 |
| `token-velocity` | 最近 60 秒**新生成**的 output token ≥ 20 万 | 熔断 |
| `spend-velocity` | 最近 60 秒花费 ≥ ¥30（按当前价格表估算） | 熔断 |
| `depth` | 子代理委派深度 ≥ 8 | 阻断派生 |
| `fanout` | 某父代理的活跃子代理数 ≥ 16 | 阻断派生 |

### 三种后果

| 后果 | 表现 | 谁能解除 |
| --- | --- | --- |
| **阻断（block）** | 这一次工具调用被拒绝，模型收到一段说明文字 | 换成**不同的调用**、或用户插话、或（对熔断而言）`watchdog_reset` |
| **熔断（circuit）** | 冷却期内**所有**工具调用被拒（默认 60 秒） | 冷却到期 / `watchdog_reset` / 面板「重置」 |
| **提醒（advisory）** | 不拦，只在结果里追加一段上下文引导模型 | 自动（只在 3 次、5 次两个节点各一条） |

### 它不是

- 不是模型代理：不发起请求、不改写你的对话内容；
- 不是计费系统：花费是"用量 × 单价"的**估算**，拦截判定只用精确计数；
- 不往会话里写新事件类型，也不读已废弃的同步日志接口。

---

## 2. 运行要求

| 项目 | 要求 |
| --- | --- |
| 宿主 | DeepSeek Harness（桌面版 / CLI / Web 均可） |
| Node | ≥ 22.19.0（宿主自带的运行时即可） |
| 宿主服务 | `tools`、`connection`、`profileContext`（Host 侧），`agents`（可选） |
| 运行时依赖 | **零**：只用 Node 内置模块 + 自带 `lib/*.js`，不联网装包 |
| 平台 | Windows / macOS / Linux 均可（已实测 Windows） |

插件是**纯 ESM + 纯 JS**：没有构建步骤，`client.js` 直接作为 GUI 的客户端 bundle 加载。

---

## 3. 安装

### 3.1 你会拿到什么

| 文件 | 大小 | 说明 |
| --- | --- | --- |
| `local-dsh-runaway-watchdog-1.2.1.tgz` | ~78 KB | 分发包本身（npm 包格式） |
| `SHA256` | — | 校验值，随包一起提供 |

包内包含：宿主侧 `index.js` + `lib/`、客户端 `client.js`、bundle 补丁 `cordis.patch.yml`、
图标、本地化、`tools/repair-role-less-context.mjs`（修复历史会话用的可选工具）、
单元测试（用于装完自证）。

### 3.2 方式 A：作为 profile 依赖（推荐）

把 tgz 放到**一个长期存在的路径**（别放临时目录），例如 `D:\plugins\`。

编辑目标 profile 的 `package.json`（桌面版一般是
`%USERPROFILE%\.dsh\profiles\desktop\package.json`）：

```jsonc
{
  "name": "dsh-profile-desktop",
  "private": true,
  "dependencies": {
    // 关键：file: 指向 tgz 的绝对路径（Windows 用正斜杠更稳）
    "@local/dsh-runaway-watchdog": "file:D:/plugins/local-dsh-runaway-watchdog-1.2.1.tgz"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        // 加上这一行，插件才会被装进 profile 的组合
        "@local/dsh-runaway-watchdog"
      ]
    }
  }
}
```

在 profile 目录安装：

```pwsh
Set-Location "$env:USERPROFILE\.dsh\profiles\desktop"
pnpm install                       # 该 profile 用 pnpm
# 没有 pnpm 时：npm install --legacy-peer-deps
```

> `@local/dsh-runaway-watchdog` 只把 `@deepseek-ai/cordis` 声明为 **peer** 依赖（由宿主提供）。
> `npm install` 若报 peer 解析失败，加 `--legacy-peer-deps`；`pnpm` 默认就不装 peer，无需处理。

### 3.3 方式 B：插件管理器 UI

打开 GUI 左侧「**插件**」→ 从本地 `.tgz` 安装 → 选文件 → 按提示重启宿主。
装好后侧边栏会出现盾牌图标「**失控看门狗**」。

### 3.4 方式 C：源码 link（开发用）

```jsonc
"@local/dsh-runaway-watchdog": "link:D:/plugins/dsh-runaway-watchdog"
```

改代码后需要**重启宿主**才能加载宿主侧改动（HMR 不覆盖 `node_modules` 里的东西）。

### 3.5 生效（两种安装方式都一样）

1. **重启宿主一次** —— 加载宿主侧代码、注册工具/守卫/路由；
2. **刷新 GUI**（Ctrl+R / F5）—— 加载面板。

> 只重启不刷新：工具能用，但面板可能是旧的（或空白）。
> 只刷新不重启：面板能开，但三个数据接口会 404。

### 3.6 装完自证

**不需要宿主**（纯 Node）：

```pwsh
Set-Location node_modules\@local\dsh-runaway-watchdog
npm test            # 期望 148/148 通过
```

**在宿主内**：面板 →「运行自检」→ 期望 `通过 11 / 失败 0`。

**亲眼看它拦一次**（可选，需临时打开诊断工具）：

1. 配置里把 `enableTestTools` 改成 `true` → 重启宿主；
2. 让模型用**相同参数**连续调用 6 次 `watchdog_test_fail`；
3. 前 5 次正常失败，第 6 次返回：
   `Runaway Watchdog blocked repeated call "watchdog_test_fail" (5 identical completed calls, all failing)…`
4. 面板「阻断次数 +1」「审计账本」出现一条 `已阻断`。
5. 验证完记得改回 `false`。

### 3.7 安装阶段常见问题

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 侧边栏没有入口 | 没刷新 GUI，或 bundle 没加进 `bundles` | 刷新；检查 `dsh.profile.bundles` |
| 面板能开但显示 `HTTP 404` | 宿主没重启（路由未注册） | 重启宿主 |
| `pnpm install` 报 peer 冲突 | 用 npm 装了带 peer 的包 | 改用 pnpm，或 `npm i --legacy-peer-deps` |
| 插件加载报 config 校验错 | 配置字段类型/范围不对（见 §5.3） | 按报错修字段，它**不会**静默降级 |
| 面板样式塌陷/按钮像纯文字 | 主题缺少 `--dsw-alias-*` token 且浏览器缓存旧 bundle | 已在 1.1.x 修好；强制刷新（禁缓存） |

---

## 4. 五分钟上手

### 4.1 打开面板

侧边栏 →「**失控看门狗**」。顶部七个指标、实时会话表、价格设置、审计账本、当前配置、自检报告。

### 4.2 顶部七个指标

| 指标 | 含义 | 什么时候会变 |
| --- | --- | --- |
| 干预次数 | 真正"动手"的次数（阻断 + 熔断开启 + 派生阻断） | 越线时 |
| 阻断次数 | 被拒绝的调用 + 被拒绝的派生 | 越线时 |
| 熔断触发 | 开启过多少次熔断 | 越线时 |
| 预估省下 Token | 拦截估算省下的 token（启发式） | 越线时 |
| 预估省下 (¥) | 同上，按当前价格表折算成人民币 | 越线时 |
| 涉及会话 | 审计账本里出现过几个**真实**会话（自检不计） | 首次干预时 |
| 审计记录 | 账本条数 | 每次记录 |

> 只是聊天、没有失控时，这些数字**本来就该是 0**。看"它在不在工作"请看实时会话行。

### 4.3 实时会话表

| 列 | 含义 |
| --- | --- |
| 会话 | 会话 id 前 8 位 + 标题 |
| 模型 | 最近一次模型调用用的 `provider/model` |
| 深度 / 扇出 | 子代理嵌套层数 / 直接子代理数 |
| 重复 | 最近一个调用签名被连续重复了几次 |
| 最近工具 | 最后一次工具调用名 |
| 错误率 | 最近 12 条工具结果里的失败比例 |
| Token/分 | **最近 60 秒**新生成 output token 折算每分钟 |
| 花费/分 | **最近 60 秒**花费折算每分钟 |
| 累计花费 | 该会话自宿主启动以来按当前价累计 |
| 熔断 | 关闭 / 开启（含规则名） |

> **`—` 与 `0` 的区别**：`Token/分`、`花费/分` 显示 `—` 表示"最近 60 秒没有样本"，
> 不是测量值为 0。停手超过 1 分钟出现 `—` 属正常（悬停有说明）。
> 而 `累计花费` 会一直涨——那才是"它在记录"的证据。

### 4.4 价格设置（改完立刻生效，不用重启）

1. 顶部「**检测到的模型**」列出本会话真正用过的模型 + 价格来源徽标（内置 / 自定义 / 回退）；
2. 点某个模型右侧「**设置**」→ 自动预填当前生效价 → 进入编辑表；
3. 也可以在输入框手填模型 ID（或通配符）→「添加模型」；
4. 四列分别填 `输入 / 输出 / 缓存命中 / 缓存写`（单位：元 / 每百万 token）；
5. 点「**保存价格**」→ 立即生效（读取时按新价重算），落盘到 `<profile>/runaway-watchdog/prices.json`。

**匹配优先级**：精确模型 ID → `provider/model` → 通配符（如 `deepseek-*`）→ `*` 回退。
自定义行**永远优先于内置价**。所以：

- 只想让某一家供应商生效：填 `deepseek-official/deepseek-flash`；
- 想覆盖整个系列：填 `deepseek-*`；
- 想改兜底价：编辑 `*` 那一行。

> 内置 `*` **不会**覆盖能匹配到内置价的模型。要改 `deepseek-flash` 的价，必须显式加一行
> `deepseek-flash`；只改 `*` 无效。

### 4.5 审计账本

每次提醒/阻断/熔断/派生阻断/重置写一条，持久化、跨重启保留（去重：同一事件段只记一次）。
列：时间 / 会话 / 规则 / 级别 / 动作 / 详情（工具、次数、参数预览、速率…）/ 预估省下（token 与 ¥）。

### 4.6 运行自检

「运行自检」→ 11 项断言，覆盖检测核心、错误率熔断、速率熔断、分类计价与实时改价、树决策、
活会话状态、守卫注册、账本读写往返、活跃名册。**`失败 0` 才算健康。**

---

## 5. 配置参考

配置写在 profile 的 bundle 补丁里（该插件自带 `cordis.patch.yml`，插入 `runaway-watchdog` 一行）。
所有字段**可选**，缺省用默认值；**类型/范围不对会在加载时直接报错**（不静默降级）。

### 5.1 全部字段

| 字段 | 默认 | 范围 / 取值 | 作用 |
| --- | --- | --- | --- |
| `mode` | `enforce` | `enforce` / `monitor` | 强制 or 只观察不拦 |
| `repeatWarnThreshold` | 3 | 2–1000 整数 | 连续多少次开始提醒 |
| `repeatBlockThreshold` | 5 | 2–10000 整数，且 ≥ 提醒阈值 | 连续多少次后开始硬阻断 |
| `blockSuccessRepeats` | `false` | 布尔 | 成功的重复调用是否也阻断（默认只阻断失败） |
| `argumentsPreviewChars` | 300 | 16–100000 整数 | 提醒/审计里参数预览截断长度 |
| `errorWindow` | 12 | 2–1000 整数 | 错误率统计的最近结果条数 |
| `errorMinSamples` | 6 | 2–1000 整数，且 ≤ window | 少于这么多条不判错误率 |
| `errorRateThreshold` | 0.8 | 0–1 | 错误率达到即熔断 |
| `velocityWindowMs` | 60000 | 1000–3600000 | 速率窗口长度（毫秒） |
| `tokenVelocityLimit` | 200000 | 0–1e9（0=关闭） | 窗口内 output token 上限 |
| `spendVelocityLimit` | 30 | 0–1e6（0=关闭） | 窗口内花费上限（元） |
| `currency` | `CNY` | `CNY` / `USD` | 展示货币（价格表始终以人民币存储） |
| `usdToCny` | 7.2 | 0.01–1000 | 仅 `currency: USD` 时用于换算显示 |
| `pricing` | `{}` | 模型 → 四档单价 | 价格覆盖（面板保存的会叠加在这之上） |
| `circuitCooldownMs` | 60000 | 0–3600000 | 熔断冷却时长 |
| `maxDepth` | 8 | 1–256 | 委派深度上限（`depth >= maxDepth` 即阻断派生） |
| `maxFanout` | 16 | 1–4096 | 同一父代理活跃子代理上限 |
| `include` | `[]` | 工具名通配符数组 | 只统计这些工具（空=全部） |
| `exclude` | `[]` | 工具名通配符数组 | 这些工具透明（优先于 include） |
| `enableTestTools` | `false` | 布尔 | 注册"必定失败"的诊断工具（仅验证用） |
| `auditRetention` | 2000 | 10–1000000 整数 | 审计账本最多保留条数（超出淘汰最旧） |

配置示例（`cordis.patch.yml` 里那一行的 `config:` 下）：

```yaml
- id: runaway-watchdog
  name: '@local/dsh-runaway-watchdog'
  config:
    mode: enforce
    repeatBlockThreshold: 5
    spendVelocityLimit: 30
    pricing:
      deepseek-flash:
        inputPerM: 2
        outputPerM: 8
        cacheReadPerM: 0.04
        cacheWritePerM: 0
```

### 5.2 四套推荐配方

**① 保守（默认，推荐大多数情况）**
同上，什么都不用改。

**② 观察期 / 先不拦**
```yaml
mode: monitor
```
它仍会检测并写审计（`advised` / `would-trip`），但**绝不阻断、也不 armed 熔断**
（面板不会显示一个"打不断东西的熔断"）。

**③ 长任务、不想被速率误伤**
```yaml
tokenVelocityLimit: 0        # 关掉 token 速率
spendVelocityLimit: 60       # 只保留花费闸门，放宽到 ¥60/分
repeatBlockThreshold: 8      # 容忍更多重试
```

**④ 省钱优先**
```yaml
repeatWarnThreshold: 2
repeatBlockThreshold: 3
spendVelocityLimit: 10
errorRateThreshold: 0.6
tokenVelocityLimit: 100000
```

**⑤ 静音某类工具**（例如轮询类 MCP 工具）
```yaml
exclude: ['mcp_poll_*', 'browser_snapshot']
```

### 5.3 会拒绝加载的配置（fail-loud）

- `mode` 不是 `enforce` / `monitor`；
- 数值字段非有限数字、越界、该整数的给了小数；
- `repeatBlockThreshold < repeatWarnThreshold`；
- `errorMinSamples > errorWindow`；
- `pricing` 里出现负数/非数字，或键为空串；
- `include` / `exclude` 不是字符串数组。

报错会直接指出字段名，例如：
`runaway-watchdog: errorMinSamples must be <= errorWindow`。

---

## 6. 模型可调用的工具

| 工具 | 作用 | 参数 |
| --- | --- | --- |
| `watchdog_status` | 当前模式、本会话实时计数、熔断状态、聚合统计 | 无 |
| `watchdog_audit` | 读审计账本 | `session?`、`rule?`、`limit?`（默认 50） |
| `watchdog_reset` | 关闭本会话已触发的熔断，清空提醒去重 | 无 |
| `watchdog_selftest` | 进程内科学自检，返回逐项报告 | 无 |
| `watchdog_test_fail` | **仅 `enableTestTools: true`**：永远失败的诊断工具 | `tag?` |

**这 4 个操作工具永远不会被看门狗自己的守卫拦住**（否则你就没法查看状态或重置了）；
`watchdog_test_fail` 故意不豁免——它必须能被拦，才能证明阻断真的生效。

> `watchdog_reset` **不能**解除"相同调用"的重复阻断：那条只有在模型换成不同调用、
> 或用户插话时才清除。这是设计（否则重置就能无限续命）。

---

## 7. HTTP 接口

全部挂在 `/api/runaway-watchdog/` 下，由宿主的 `connection` 服务提供（继承宿主的
Host/Origin 校验与浏览器鉴权，插件自己不另做鉴权）。

| 路径 | 方法 | 说明 |
| --- | --- | --- |
| `/status` | GET, HEAD | 模式、配置、实时会话、统计、`tracked` |
| `/audit` | GET, HEAD | `?limit=&session=&rule=`，默认 200 条 |
| `/config` | GET, HEAD | 生效配置 + 默认值 |
| `/selftest` | GET, HEAD | 自检报告（11 项） |
| `/reset` | POST | body `{"session":"<id>"}`，关闭该会话熔断 |
| `/prices` | GET, HEAD, POST | GET 读价格表；POST body `{"pricing":{...}}` 保存 |

示例（在宿主所在机器、带浏览器会话时）：

```pwsh
Invoke-RestMethod 'http://127.0.0.1:19387/api/runaway-watchdog/status' | ConvertTo-Json -Depth 4
```

> 直接 `curl` 会得到 **401**（未带浏览器鉴权），这是正常的——面板用的是同源 cookie。

`POST /prices` 对畸形输入返回 **400** 且**不会**改写已保存的价格文件：

```jsonc
// 请求
{ "pricing": { "deepseek-flash": { "inputPerM": 2, "outputPerM": 8, "cacheReadPerM": 0.04, "cacheWritePerM": 0 } } }
// 成功：{ "ok": true, "user": {...} }
// 失败：{ "ok": false, "error": "pricing must be an object keyed by model" }  + HTTP 400
```

---

## 8. 数据与持久化

| 文件 | 位置 | 说明 |
| --- | --- | --- |
| 审计账本 | `<profile>/runaway-watchdog/audit.json` | 原子写入（临时文件 + 重命名）；损坏会自动重建；**可直接删除**（统计归零） |
| 价格覆盖 | `<profile>/runaway-watchdog/prices.json` | 面板「保存价格」后生成；删了回到内置价 |

- 账本最多保留 `auditRetention` 条（默认 2000），超出淘汰最旧。
- 会话折叠状态**不落盘**：每次宿主启动/插件重载后，首次接触某会话时从该会话
  **已有事件日志回放重建**（最近 4000 条）。所以：**重启不会清空预算**，
  正在死循环的会话不会因为重启又获得 5 次机会。
- 想清空统计：停宿主 → 删 `audit.json` → 启动。运行中删除会被内存中的账本重新写回。

---

## 9. 花费是怎么算的

花费 = 每个模型、四个**互不重叠**的用量桶各自 × 各自单价，再求和：

```
cost = inputTokens     × inputPerM
     + outputTokens    × outputPerM      （reasoning 已含在 output 里，不重复计）
     + cacheReadTokens × cacheReadPerM   （缓存命中）
     + cacheWriteTokens× cacheWritePerM  （缓存写；DeepSeek 目前不单独收费 → 0）
     ÷ 1,000,000
```

模型身份来自每条 `assistant/message` 的 `message.source.{provider, model}`——即
**真实路由**，不用你手工指定。状态里只存原始用量桶 + 模型名，
**花费在读取时按当前价格表现算**，所以改价立即生效（不用重新折叠、不用重启）。

### 内置参考价（元 / 百万 token，`输入 / 缓存命中 / 缓存写 / 输出`）

| 模型 | 输入 | 缓存命中 | 缓存写 | 输出 |
| --- | --- | --- | --- | --- |
| `deepseek-flash` | 2 | 0.04 | 0 | 8 |
| `deepseek-v4-pro` | 9 | 0.30 | 0 | 27 |
| `deepseek-chat`（历史） | 2 | 0.5 | 2 | 8 |
| `deepseek-reasoner`（历史） | 4 | 1 | 4 | 16 |
| `*`（兜底） | 2 | 0.5 | 2 | 8 |

- 来源：官方价格页 <https://api-docs.deepseek.com/zh-cn/quick_start/pricing>（2026-11-12 读取）。
- 官方执行**峰谷定价**：空闲时段 = 高峰的一半；高峰为北京时间工作日 9:00–12:00、14:00–18:00。
- 内置取**高峰价**是有意的：花费守卫宁可高估早熔断，低估会让真实花费越过熔断线。
  你要贴自己的账单，就在面板里按实际结算价覆盖。
- 花费与「预估省下」都是**估算**；**拦截判定只依赖精确计数**，不依赖估算。

---

## 10. 面板指标口径

| 指标 | 计算方式 | 注意 |
| --- | --- | --- |
| 重复 | 最近一个"工具+规范化参数"签名连续出现次数 | 参数键顺序不影响；换签名即归 1；用户插话归 0 |
| 错误率 | 最近 `errorWindow` 条**真实**工具结果的失败比例 | **看门狗自己的拒绝不计入**（否则死循环会自我升级成全局熔断） |
| Token/分 | 窗口内 output token ÷ 窗口分钟数 | 只计**新生成**；输入/缓存重发不算（长会话不误报）。窗口无样本显示 `—` |
| 花费/分 | 窗口内花费 ÷ 窗口分钟数 | 同上 |
| 累计 Token / 花费 | 会话全量 | 跨重启保留（靠事件日志重建） |
| 熔断 | 当前是否处于冷却期 | monitor 模式不会开启 |
| 干预次数 | 阻断 + 熔断开启 + 派生阻断 | 提醒、重置、冷却关闭不计 |
| 涉及会话 | 账本里的真实会话数 | 自检用的合成 session 不计 |

**参数"相同"如何判定**：先做深键排序规范化再比较，所以 `{"a":1,"b":2}` 与 `{"b":2,"a":1}` 视为同一个调用；
非法 JSON 参数按原文比较（仍然能识别"一模一样的坏参数"）。

---

## 11. 典型场景操作手册

### 11.1 我被拦了，怎么办

1. 看拒绝文案：它会告诉你是"重复调用"还是"熔断"；
2. 看面板审计账本：确认是哪条规则、哪个工具、连续几次；
3. **换一种做法**（改参数/换工具/先读结果再决定）——这是唯一能让重复阻断消失的方式；
4. 若是熔断：等冷却，或调用 `watchdog_reset` / 面板「重置」；
5. 若是误判：把它当作配置信号（见 §5.2），别硬顶。

### 11.2 熔断一直开着 / 反复开

- 通常是真实错误风暴（模型在反复试同一个坏办法）→ 让它换成不同调用；
- 也可能是价格表填得太低导致 `spend-velocity` 过敏感 → 校正价格或调高 `spendVelocityLimit`；
- 也可能是 `errorRateThreshold` 设得过严 → 调到 0.9 之类。

### 11.3 只想先观察一周

```yaml
mode: monitor
```
面板会显示检测结果与 `would-trip` 记录，但什么都不拦。观察结束后改回 `enforce` 并重启。

### 11.4 某个工具太吵

```yaml
exclude: ['mcp_poll_*']
```
被 exclude 的工具既不计数、也不会打断重复链（完全透明）。

### 11.5 子代理递归烧钱

- `maxDepth` 管嵌套层数（默认 8 层），超了直接拒绝派生；
- `maxFanout` 管并发子代理数（默认 16）；
- 注意：fanout 只统计**本进程**的活子代理；ACP/远程/CLI 子进程派生的看不到，`depth` 不受影响。

### 11.6 想清空历史统计

停宿主 → 删 `<profile>/runaway-watchdog/audit.json` → 启动。价格文件 `prices.json` 不受影响。

---

## 12. 故障排查

| 现象 | 最可能原因 | 处理 |
| --- | --- | --- |
| 面板 `HTTP 404` | 宿主没重启 / 插件未激活（配置校验失败会整体回滚） | 重启宿主；看宿主日志里的 `runaway-watchdog:` 报错 |
| 侧边栏没有入口 | 未刷新 GUI；`bundles` 没加；客户端 bundle 未加载 | 刷新；检查 profile 配置 |
| 面板样式塌陷、按钮像文字 | 主题缺 token 且缓存了旧 bundle | 1.1.x 起已全部带 fallback；强制刷新/禁缓存 |
| 点「添加模型」没反应 | 输入框为空（会显示红字提示）或旧 bundle | 先填模型 ID；刷新 GUI |
| 数字一直是 0 | 看的是"干预类"指标，且确实没有失控 | 看实时会话行的 Token/分、累计花费 |
| `Token/分` 显示 `—` | 最近 60 秒无新调用 | 正常；连续调用时会出现数值 |
| 花费明显偏高 | 该模型落到了 `*` 兜底价，或缓存命中价填成 0.5 | 面板显式加该模型行，缓存命中填实际值（flash 为 0.04） |
| 加了价格但没生效 | 只改了 `*`，没加具体模型行 | 内置价优先于 `*`；显式加模型行 |
| 重启后计数变小 | 旧版本行为（现已修复：从事件日志重建） | 升级到 1.1.x+ |
| 工具调用被莫名拒绝 | 熔断开着 / 重复链未清除 | `watchdog_status` 查看 → `watchdog_reset` |
| 报 `messages[n]: missing field role` | **旧版本**的提醒上下文缺少 `role`（已在 1.1.2 修复） | 升级；历史坏日志用 `npm run repair:context` 修 |

---

## 13. 卸载与回滚

**卸载**：

1. 从 profile `package.json` 的 `dependencies` 和 `dsh.profile.bundles` 里删掉
   `@local/dsh-runaway-watchdog`；
2. `pnpm install`（或 `npm install`）清掉安装目录；
3. 重启宿主 + 刷新 GUI；
4. 可选：删 `<profile>/runaway-watchdog/`（审计与价格，纯插件自有数据）。

**回滚到旧版**：把依赖路径指回旧 tgz → 重新安装 → 重启。
数据文件向前兼容（账本缺字段按 0 处理），无需迁移。

---

## 14. FAQ

**Q：它会不会误拦正常的长任务？**
正常干活不会。重复规则看的是"同参数连续重复"；速率只计新生成的 output token。
长上下文会话的输入/缓存重发**不计入**速率（这是专门的回归项）。

**Q：会不会拖慢模型请求？**
守卫是同步的，只做内存里的几次比较（O(窗口大小)），不发起任何 IO。

**Q：能不能只监控某个工具？**
可以：`include: ['bash']` 只统计 bash，其余工具完全透明。

**Q：花费准吗？**
是"用量 × 你配的单价"的估算。单价默认取官方高峰价，可在面板改成你自己的结算价；
跨峰谷时段不会自动切换，需要就手动改一行。

**Q：删除 `audit.json` 会丢什么？**
只丢统计与历史记录；不会影响拦截能力（拦截依据的是会话事件折叠出的状态）。

**Q：多个会话同时跑，限额是共享的吗？**
不是。重复/错误率/速率都是**按会话**统计；`maxFanout` 按父代理统计。

**Q：面板显示"模式：强制执行"和"用户自定义价"正常吗？**
正常：模式来自配置；"自定义"表示该模型匹配到了你保存的价格行（优先级最高）。

---

## 15. 附录

### 15.1 目录结构

```
dsh-runaway-watchdog/
├── index.js                宿主侧：折叠 + 守卫 + 监听器 + 5 工具 + 6 路由 + 自检
├── client.js               面板：侧边栏入口 + 主页 + 价格编辑（纯 JS，无需构建）
├── cordis.patch.yml        bundle 插入行（含默认配置）
├── lib/
│   ├── detection.js        纯检测核心：规范化签名、折叠、违规排序、守卫判定
│   ├── pricing.js          纯计价：匹配优先级 + 四桶成本
│   ├── config.js           默认值 + fail-loud 归一化
│   ├── ledger.js           审计账本（去重、保留期、统计）
│   ├── file-domain.js      原子 JSON 文件表
│   ├── tree.js             深度/扇出决策
│   └── tool-schema.js      最小 JSON-Schema 编译器（注册工具用，零依赖）
├── tools/repair-role-less-context.mjs   修复历史坏日志（角色缺失）
├── tests/                  148 项单元/集成/客户端测试（npm test 可直接跑）
├── locale/{zh,en}.json     插件目录元数据（标题/描述）
└── 安装使用说明.md          本手册
```

### 15.2 命令清单

```pwsh
npm test            # 148/148（纯 Node，无需宿主）
npm run check       # 语法 + 单元
npm run test:e2e    # 31 项真实主机端到端（需要 DSH 源码检出）
npm run verify      # check + e2e
npm run repair:context   # 修复带缺失 role 的历史会话日志（见 --help）
```

### 15.3 版本要点

| 版本 | 关键变化 |
| --- | --- |
| 1.2.1 | 本手册；分发包补自证测试 |
| 1.2.0 | 重启/重载后从会话日志重建折叠（不再给死循环新预算）；统计口径修正 |
| 1.1.2 | 提醒上下文补齐 `id`/`role`（修服务端 400）；历史日志修复工具 |
| 1.1.0 | 分类计价 + 人民币 + 面板价格编辑 + 实时改价 |
| 1.0.0 | 检测六规则 + 同步守卫 + 熔断 + 审计 + 面板 + 自检 |
