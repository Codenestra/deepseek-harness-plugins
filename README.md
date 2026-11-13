# DeepSeek Harness Plugins

Codenestra 维护的 **DeepSeek Harness（DSH）插件仓库**，提供插件源码、安装包与中文使用说明。

## 插件与下载

| 插件 | 版本 | 功能 | 下载 | 使用说明 |
|---|---|---|---|---|
| [项目中枢](plugins/dsh-project-hub) | 0.1.0 | 跨工作区总览、全局搜索、项目笔记、会话管理、快速切换 | [ZIP](https://github.com/Codenestra/deepseek-harness-plugins/releases/download/v0.1.0/dsh-project-hub-0.1.0.zip) | [说明](plugins/dsh-project-hub/INSTALL.zh.md) |
| [存储医生](plugins/dsh-storage-doctor) | 0.1.0 | 磁盘占用扫描、增长趋势、清理预览、回收站与还原 | [ZIP](https://github.com/Codenestra/deepseek-harness-plugins/releases/download/v0.1.0/dsh-storage-doctor-0.1.0.zip) | [说明](plugins/dsh-storage-doctor/INSTALL.zh.md) |
| [回合级性能剖析器](plugins/dsh-turn-profiler) | 0.1.0 | 时延瀑布图、实时指标、token 与缓存诊断、JSON 导出 | [ZIP](https://github.com/Codenestra/deepseek-harness-plugins/releases/download/v0.1.0/dsh-turn-profiler-0.1.0.zip) | [说明](plugins/dsh-turn-profiler/INSTALL.zh.md) |
| [失控看门狗](plugins/dsh-runaway-watchdog) | 1.2.1 | 重复调用检测、花费与错误熔断、子代理限制、审计记录 | [ZIP](https://github.com/Codenestra/deepseek-harness-plugins/releases/download/dsh-runaway-watchdog-v1.2.1/dsh-runaway-watchdog-1.2.1-release.zip) | [说明](plugins/dsh-runaway-watchdog/INSTALL.zh.md) |
| [用量中心](plugins/dsh-usage-center) | 1.1.0 | Token 用量统计、花费估算、预算进度、交互图表与数据导出 | [ZIP](https://github.com/Codenestra/deepseek-harness-plugins/releases/download/dsh-usage-center-v1.1.0/usage-center-1.1.0.zip) | [说明](plugins/dsh-usage-center/INSTALL.zh.md) |

## 安装

1. 下载对应插件的 ZIP 并解压，得到 `.tgz` 安装包和 `.md` 中文安装使用说明。
2. 使用 DSH 插件管理器安装 `.tgz`，按说明启用插件。
3. 从 DSH 侧栏进入插件面板。配置方法与日常操作见上表中的使用说明。

[Releases](https://github.com/Codenestra/deepseek-harness-plugins/releases) 中也提供独立 `.tgz` 文件与 SHA-256 校验文件。

## 源码结构

```text
plugins/
  dsh-project-hub/
  dsh-storage-doctor/
  dsh-turn-profiler/
  dsh-runaway-watchdog/
  dsh-usage-center/
```

每个目录是独立的 DSH bundle，包含 `package.json`、`cordis.patch.yml`、host/client JavaScript 源码、语言文件、图标与说明。

## English

Plugins for DeepSeek Harness: **Project Hub**, **Storage Doctor**, **Turn Profiler**, **Runaway Watchdog**, and **Usage Center**. Download installable `.tgz` bundles or ZIPs with Chinese installation guides from [Releases](https://github.com/Codenestra/deepseek-harness-plugins/releases). Source code is organized by plugin in `plugins/`.
