# DeepSeek Harness Plugins

Codenestra 维护的 **DeepSeek Harness（DSH）社区插件仓库**，集中提供插件源码、安装包与中文使用说明。非 DeepSeek 官方项目。

## 下载与安装

**[下载 v0.1.0 正式发布包](https://github.com/Codenestra/deepseek-harness-plugins/releases/tag/v0.1.0)**

| 插件 | 用途 | 安装说明 | 完整交付包 |
|---|---|---|---|
| [项目中枢](plugins/dsh-project-hub) | 多项目总览、搜索、笔记、快速切换 | [说明](plugins/dsh-project-hub/INSTALL.zh.md) | [ZIP](https://github.com/Codenestra/deepseek-harness-plugins/releases/download/v0.1.0/dsh-project-hub-0.1.0.zip) |
| [存储医生](plugins/dsh-storage-doctor) | 磁盘体检、趋势、清理预览、回收站与还原 | [说明](plugins/dsh-storage-doctor/INSTALL.zh.md) | [ZIP](https://github.com/Codenestra/deepseek-harness-plugins/releases/download/v0.1.0/dsh-storage-doctor-0.1.0.zip) |
| [回合级性能剖析器](plugins/dsh-turn-profiler) | 时延瀑布图、token 与缓存诊断、实时指标 | [说明](plugins/dsh-turn-profiler/INSTALL.zh.md) | [ZIP](https://github.com/Codenestra/deepseek-harness-plugins/releases/download/v0.1.0/dsh-turn-profiler-0.1.0.zip) |

每个 ZIP 只有两个文件：一个 `.tgz` 插件安装包和一份 `.md` 安装使用说明。Release 也提供独立 TGZ 和 SHA-256 校验文件。使用 DSH 插件管理器安装 TGZ；需要重启时，等所有任务自然结束后再重启应用与 Host。

## 版本与兼容性

- 三个插件当前版本均为 `0.1.0`，已完成功能验收。
- 验收环境：Windows 桌面 DSH `0.1.7-rc.2` 本地构建，Node.js `>=22.19.0`。其他宿主版本尚未验收。
- 项目中枢：全文搜索需启用宿主索引；快捷键冲突时使用「切换器」按钮或自行改键。
- 存储医生：当前配置方式为 YAML + Host 重启；附件 GC 为实验性功能，默认关闭。回收站默认 7 天自动清空，详见说明。
- 性能剖析器：功能验收通过，7 天真实使用观察保留为待办。
- GitHub Release 与 DSH Market 收录是两个步骤；本仓库的发布不代表已经被 Market 收录。尚未发布到 npm。

## 源码结构

```text
plugins/
  dsh-project-hub/
  dsh-storage-doctor/
  dsh-turn-profiler/
```

每个目录是独立 DSH bundle，包含 `package.json`、`cordis.patch.yml`、host/client JavaScript 源码、语言文件、图标与说明。无需编译。公开发布版本只整理包元数据与文档，运行时代码与已验收安装包保持一致；本机验收截图和内部记录不包含在发布中。

## English

Community plugins for DeepSeek Harness: **Project Hub**, **Storage Doctor**, and **Turn Profiler**. Download installable `.tgz` bundles or ZIPs with Chinese installation guides from [Releases](https://github.com/Codenestra/deepseek-harness-plugins/releases). Runtime sources are in `plugins/`. This repository is independent of DeepSeek and does not imply DSH Market inclusion.
