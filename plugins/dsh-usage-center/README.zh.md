# DeepSeek Harness 用量中心

[安装与使用说明](INSTALL.zh.md) · [下载 1.1.0](https://github.com/Codenestra/deepseek-harness-plugins/releases/tag/dsh-usage-center-v1.1.0)

这是一个独立、可分发的 DeepSeek Harness 插件。它通过公开的 Cordis、LLM waterfall、Session Query、Connection Fetch 和 Client Slots 扩展点工作，不修改 Harness 源码。

## 能看到什么

- 未缓存输入、输出、缓存读取、缓存写入、总 Token。
- 供应商实际报告时才显示推理 Token。
- 缓存 Token 命中率：`cacheRead / (uncachedInput + cacheRead + cacheWrite)`。
- “有缓存命中的请求占比”单独统计，不与 Token 命中率混用。
- 模型调用、重试调用，以及有可靠终止标记时的失败和取消调用。
- Provider、模型、工作目录、侧栏分组、会话状态、会话和日期维度；支持单独查看“未分组”。
- 精确 LLM 时长、TTFT、解码速度及 P50/P95；只在原始边界完整时汇总。
- 每个字段的覆盖率和未知字段数。
- 历史冷会话回填、fork 继承前缀去重、CSV/JSON 导出。
- 花费估算（¥）：按可覆盖的价格表对四个桶计价，分桶明细进图表与导出。
- 预算与预测：日/月预算进度条 + 按近 7 日均值预计月底花费（1.1.0 起）。

默认面板包含 KPI、按日 Token / 花费趋势、缓存命中环图（读 / 写 / 未缓存三段）、Provider/模型对比（Token 或花费）、请求与解码速度趋势、周×小时活跃热力图、覆盖率、预算卡和调用明细。

**图表交互**：鼠标悬停任意日期即出现明细（当日数值、占比、与前一日环比、覆盖率），键盘 Tab 聚焦后可用 ←/→ 切日；点击图例可隐藏序列；在趋势图上拖拽可缩放时间范围，双击还原；点击某天可把筛选收窄到那天，点击某个模型可把它设为筛选条件；「累计」切换为累计曲线，「对比上期」叠加显示上一个等长周期的虚线（tooltip 同时给出上期数值与差距）。

**动效**：折线绘制、面积渐显、柱状生长、点位放大、数字滚动、悬浮卡片淡入；遵循 `prefers-reduced-motion`，不需要动画时自动退化为瞬时。

**明细表**：服务端分页（不再只给前 500 行）、点列头排序、关键词搜索、列显示设置、点会话 ID 直接筛到该会话、复制 `call_key`。

**导出**：JSON / CSV（含 `cost_rmb`、`cost_complete`）、当前图表 PNG、Markdown 摘要一键复制，以及「链接」——当前筛选、区间与视图开关已同步在地址栏，可整段复制分享。

**无障碍**：每张趋势图带 `aria-describedby` 指向一份隐藏数据表，表格有 `caption`/`scope`，图表可用键盘逐日浏览。

**快捷键**：`1/2/3/0` 切 7/30/90/全部，`R` 刷新，`E` 导出 CSV，`P` 导出 PNG，`/` 聚焦搜索。

日期按浏览器所在 IANA 时区分桶。支持 7/30/90 天、全部及自定义日期筛选。

“工作目录”来自会话头的 `cwd`；“侧栏分组”来自 Harness 当前 Workspace 注册表，两者是不同维度。侧栏没有归入任何 Workspace 的会话会显示为“未分组”，已经归档的会话可通过“会话状态”筛选。

## 准确性口径

插件只接受供应商通过 Harness `TokenUsage` 报告的计数，不按字符数、消息长度或上下文大小推算。

- `inputTokens` 是未缓存输入，与两个缓存桶互斥。
- 同一次流调用出现多个 usage chunk 时采用最后一个。
- `assistant/message.usage` 存在时覆盖同次流中的 usage，避免重复累计。
- 每个重试后的真实 settlement 是独立调用；已安排但没有真正开始的重试不计为调用。
- 供应商完全不返回 Token 时，该次调用不入库、不展示，也不会影响其他供应商。
- 已返回的可用字段照实记录；可选字段缺失就是未知，不补零。
- 负数、非安全整数、推理 Token 大于输出 Token，或与总量矛盾的样本整体跳过，不参与统计。
- 缺少 `totalTokens` 时，只有缓存读取与缓存写入都存在，才可由互斥字段精确相加得到总量。
- 汇总值只有覆盖全部所选调用时才标为精确；图表里的“已报告”数据始终附带覆盖信息。

实时精确时延来自 `llm/stream` 的单调时钟边界：

```text
TTFT       = 首个 token delta - 流开始
LLM 时长  = 流结束 - 流开始
解码时长  = 流结束 - 首个 token delta
解码速度  = outputTokens / 解码秒数
```

历史日志可以恢复精确 Token，但旧日志没有完整的流开始边界，因此历史时延保持未知。插件不会把 `step/start` 近似时间混入精确时延。

模型调用指一次 Harness LLM 逻辑流尝试。主 Agent 调用以 `(sessionId, settlementEventSeq)` 为唯一键；标题、压缩等非 Agent 调用从插件启用后的实时流捕获。

## 花费与预算配置（1.1.0）

价格与预算写在 profile 的 `cordis.patch.yml` 里，改完重启生效：

```yaml
- id: usage-center
  name: '@local/dsh-usage-center'
  config:
    pricing:
      deepseek-flash: { inputPerM: 2, outputPerM: 8, cacheReadPerM: 0.04, cacheWritePerM: 0 }
      deepseek/deepseek-v4-pro: { inputPerM: 9, outputPerM: 27, cacheReadPerM: 0.3, cacheWritePerM: 0 }
    budget: { daily: 30, monthly: 600 }
```

- 价格单位为「元 / 百万 token」，四个桶必须齐全；缺字段或负数会在启动时报错，不会静默按 0 计价。
- 匹配顺序：`provider/model` → `model` → `provider/*` → `*` → 内置表；内置价目与 `@local/dsh-runaway-watchdog` 一致（DeepSeek 高峰档）。
- 花费始终标注为估算，不是供应商账单；`budget` 省略或为 0 时不显示预算卡。

## 存储与去重
插件在当前 Harness profile 下创建：

```text
<profile>/usage-center/usage-center.sqlite
```

数据库使用 SQLite WAL 和唯一调用键。实时监听与历史回填可以重叠，Desktop 与 Web 进程也可以指向同一 profile；重复写入会被唯一键忽略。精确 timing 放在独立一对一表中，因此即使另一个进程先写入历史 Token，实时进程仍能补充同一调用的精确 timing。

回填只扫描 `events.slice(inheritedEventCount)`。子会话继承的父会话事件不会再次累计。

## 安装

要求 Harness 运行时使用 Node.js 22.19 或更高版本。

从发布产物安装（示例）：

```powershell
dsh plugin --profile default add "D:\path\deepseek-harness-usage-center-1.1.0.tgz"
dsh --profile default --dump-config
```

本地开发可直接用 `link:` 指向源码目录，改完刷新面板即可（host 端改动仍需重启）：

```powershell
dsh plugin --profile default add "link:D:\path\deepseek-harness-usage-center"
```

重启或重新加载该 profile 后，左侧会出现“用量中心”。首次启动会异步扫描已有冷会话，进度显示在页面顶部。

## 本地验证与打包

```powershell
npm test
npm run check
npm pack
```

包中只有独立插件文件。`cordis.patch.yml` 会插入 `@local/dsh-usage-center`，不会改写 DeepSeek Harness 仓库。

## 数据接口

以下精确 Fetch 路由由 Harness Connection 承载，Web 与 Desktop 共用：

- `GET /api/usage-center/query`
- `GET /api/usage-center/export.json`
- `GET /api/usage-center/export.csv`

筛选参数为 `from`、`to`（Unix 毫秒）、`workspace`（工作目录）、`group`（侧栏分组）、`sessionState`（`active` 或 `archived`）、`session`、`provider`、`model` 和 `timeZone`（IANA 时区）。未传 `timeZone` 的旧客户端继续按 UTC 分桶。导出的未知字段为空值或 `null`，不会变成 `0`。

明细窗口参数（1.1.0）：`offset`、`limit`（1–200，默认 30）、`sort`（`captured_at`｜`total_tokens`｜`input_tokens`｜`output_tokens`｜`cache_read_tokens`｜`cache_write_tokens`｜`cost_rmb`｜`llm_ms`｜`ttft_ms`｜`decode_tokens_per_second`｜`model`｜`provider`｜`status`｜`session_id`）、`dir`（`asc`/`desc`）、`search`（会话/模型/目录/用途子串）。未列入白名单的 `sort` 会退回 `captured_at`。

响应带弱校验 `ETag`（数据身份 + 明细窗口），请求头带上 `If-None-Match` 且数据未变时返回 `304` 空响应，页面每 15s 轮询不再重复拉全量。`query` 的响应体是 `schemaVersion: 2`：在原有 `summary`/`daily`/`byProvider`/`byModel`/`details` 之外新增 `heatmap`（周×小时）、`previous`（上一个等长周期，已重分桶到相同日期；无明确区间时为 `null`）、`detail`（窗口元信息）、`budget`、`pricing` 与 `etag`；`export.json` 升级为 `dsh-usage-center/v2`，`export.csv` 新增 `cost_rmb`、`cost_complete` 两列。
