# 插件工作台（Plugin DevKit）

DeepSeek Harness 的脚手架生成、运行时探索、本地安装管理与插件声明校验插件。

[安装使用说明](INSTALL.zh.md) · [下载 0.1.0](https://github.com/Codenestra/deepseek-harness-plugins/releases/tag/dsh-plugin-devkit-v0.1.0)

## 功能

- 脚手架生成：配置包名、标题、依赖和功能模块，预览文件树后生成插件工程。
- 运行时探索：查看宿主状态、服务依赖、客户端 Slot、侧栏排序、Remote 命名空间和模块图。
- 安装管理：安装或卸载本地工程，查看注册、启用和加载状态。
- 声明校验：检查结构、依赖、版本兼容、bundle patch 和入口，按文件展示通过、警告与错误。

## 安装与使用

下载 Release 中的 ZIP，解压后通过 DSH 插件管理器安装 `local-dsh-plugin-devkit-0.1.0.tgz`。启用后从侧栏「插件工作台」进入。

## 运行要求

DeepSeek Harness 桌面端，Node.js ≥ 22.19.0，宿主提供 `@deepseek-ai/cordis` ~4.0.4。插件使用 JavaScript，安装包包含运行文件。
