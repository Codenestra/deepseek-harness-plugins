## 插件工作台 0.1.0

DeepSeek Harness 的脚手架生成、运行时探索、本地安装管理与插件声明校验插件。

### 功能

- 脚手架生成：配置包名、标题、依赖和功能模块，预览文件树后生成插件工程。
- 运行时探索：查看宿主状态、服务依赖、客户端 Slot、侧栏排序、Remote 命名空间和模块图。
- 安装管理：安装或卸载本地工程，查看注册、启用和加载状态。
- 声明校验：检查结构、依赖、版本兼容、bundle patch 和入口，按文件展示通过、警告与错误。

### 下载与安装

下载 `dsh-plugin-devkit-0.1.0.zip`，解压后得到 `.tgz` 安装包和中文安装使用说明。通过 DSH 插件管理器安装 `local-dsh-plugin-devkit-0.1.0.tgz`，启用后从侧栏「插件工作台」进入。

[查看源码与使用说明](https://github.com/Codenestra/deepseek-harness-plugins/tree/main/plugins/dsh-plugin-devkit)。文件校验值见 `SHA256SUMS.txt`。

---

## 插件医生 0.1.0

DeepSeek Harness 的插件健康诊断、冲突检查、版本兼容、安装历史与禁用恢复插件。

### 功能

- 健康总览：汇总运行状态、依赖和 bundle 注册情况，定位异常插件。
- 冲突与兼容：检查 Slot 的 id、order、key 与样式归属，比较 peerDependencies 和实际版本。
- 安装历史：查看插件管理操作时间线和插件数据目录占用。
- 操作审计：禁用或恢复插件，保留操作记录，导出 JSON 诊断报告。

### 下载与安装

下载 `dsh-plugin-doctor-0.1.0.zip`，解压后得到 `.tgz` 安装包和中文安装使用说明。通过 DSH 插件管理器安装 `local-dsh-plugin-doctor-0.1.0.tgz`，启用后从侧栏「插件医生」进入。

[查看源码与使用说明](https://github.com/Codenestra/deepseek-harness-plugins/tree/main/plugins/dsh-plugin-doctor)。文件校验值见 `SHA256SUMS.txt`。

---

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
