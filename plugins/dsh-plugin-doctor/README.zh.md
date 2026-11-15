# 插件医生（Plugin Doctor）

DeepSeek Harness 的插件健康诊断、冲突检查、版本兼容、安装历史与禁用恢复插件。

[安装使用说明](INSTALL.zh.md) · [下载 0.1.0](https://github.com/Codenestra/deepseek-harness-plugins/releases/tag/dsh-plugin-doctor-v0.1.0)

## 功能

- 健康总览：汇总运行状态、依赖和 bundle 注册情况，定位异常插件。
- 冲突与兼容：检查 Slot 的 id、order、key 与样式归属，比较 peerDependencies 和实际版本。
- 安装历史：查看插件管理操作时间线和插件数据目录占用。
- 操作审计：禁用或恢复插件，保留操作记录，导出 JSON 诊断报告。

## 安装与使用

下载 Release 中的 ZIP，解压后通过 DSH 插件管理器安装 `local-dsh-plugin-doctor-0.1.0.tgz`。启用后从侧栏「插件医生」进入。

## 运行要求

DeepSeek Harness 桌面端，Node.js ≥ 22.19.0，宿主提供 `@deepseek-ai/cordis` ~4.0.4。插件使用 JavaScript，安装包包含运行文件。
