## 用量中心 1.1.0

DeepSeek Harness 的 Token 用量统计与可视化插件，汇总供应商返回的用量数据，并提供花费估算、预算进度和交互图表。

### 功能

- **Token 统计**：查看输入、输出、缓存读取、缓存写入、推理 Token，以及调用次数、重试次数与缓存命中率。
- **花费与预算**：按模型价格表估算人民币花费，显示日/月预算进度与月底花费预测。
- **交互图表**：支持趋势悬停、图例开关、拖拽缩放、按天或模型下钻、累计曲线、上期对比和周×小时热力图。
- **筛选与明细**：按时间、工作区、侧栏分组、模型和会话筛选；明细表支持分页、排序和搜索。
- **导出**：CSV、JSON、图表 PNG、Markdown 摘要和当前筛选链接。

### 下载与安装

下载 `usage-center-1.1.0.zip`，解压后打开 `usage-center-1.1.0` 文件夹，通过 DSH 插件管理器安装其中的 `local-dsh-usage-center-1.1.0.tgz`。

压缩包同时包含中文安装使用说明和中英文 README。也可以直接下载独立的 `.tgz` 安装包。

[查看源码与说明](https://github.com/Codenestra/deepseek-harness-plugins/tree/main/plugins/dsh-usage-center)。文件校验值见 `SHA256SUMS.txt`。

---

## 失控看门狗 1.2.1

DeepSeek Harness 的工具调用监控与花费熔断插件，用于发现重复调用、错误率升高、Token 消耗过快以及子代理数量或层级超限。

### 功能

- **重复调用检测**：识别相同工具和参数的连续调用，按阈值提醒或阻断。
- **错误与花费熔断**：监测工具错误率、输出 Token 速度和每分钟花费。
- **子代理限制**：控制委托深度与同时运行的子代理数量。
- **模型价格设置**：按模型分别设置输入、输出、缓存命中和缓存写入单价，保存后立即生效。
- **仪表盘与审计**：查看会话状态、触发规则、干预记录和预估节省金额；支持监测与强制执行两种模式。

### 下载与安装

下载 `dsh-runaway-watchdog-1.2.1-release.zip`，解压后得到：

1. `local-dsh-runaway-watchdog-1.2.1.tgz`：插件安装包。
2. `安装使用说明.md`：安装、配置和日常操作说明。

通过 DSH 插件管理安装 `.tgz`，按说明启用后，从侧栏「失控看门狗」进入。也可直接下载独立的 `.tgz`。

[查看源码与说明](https://github.com/Codenestra/deepseek-harness-plugins/tree/main/plugins/dsh-runaway-watchdog)。文件校验值见 `SHA256SUMS.txt`。

---

## DeepSeek Harness Plugins v0.1.0

本次发布三个 DeepSeek Harness 插件：

- **项目中枢**：跨工作区总览、全局搜索、项目笔记、会话管理和快速切换。
- **存储医生**：磁盘占用扫描、增长趋势、清理预览、回收站与还原，支持 ASR 模型清理和附件 GC。
- **回合级性能剖析器**：逐轮时延瀑布图、实时指标、token 与缓存诊断、重试分析和 JSON 导出。

### 下载与安装

每个插件的 ZIP 包含 **一个 `.tgz` 安装包和一份 `.md` 中文安装使用说明**。解压 ZIP 后，通过 DSH 插件管理器安装其中的 `.tgz`。也可以直接下载独立的 `.tgz` 文件。

详细操作见仓库中各插件的 `INSTALL.zh.md`，文件校验值见 `SHA256SUMS.txt`。
