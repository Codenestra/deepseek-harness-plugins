# Plugin Doctor

Plugin health diagnostics for DeepSeek Harness, covering runtime status, conflicts, version compatibility, installation history, and disable/restore actions.

[中文安装使用说明](INSTALL.zh.md) · [Download 0.1.0](https://github.com/Codenestra/deepseek-harness-plugins/releases/tag/dsh-plugin-doctor-v0.1.0)

## Features

- Inspect plugin runtime health, dependencies, and bundle registration.
- Detect slot conflicts and inspect peer dependency compatibility.
- Review installation history and plugin data storage usage.
- Disable and restore bundles with an audit trail and export diagnostic reports.

## Installation

Download the ZIP from Releases and install `local-dsh-plugin-doctor-0.1.0.tgz` through the DSH plugin manager. Enable the plugin and open its sidebar panel.

## Requirements

DeepSeek Harness desktop with Node.js >=22.19.0 and host-provided `@deepseek-ai/cordis` ~4.0.4. JavaScript runtime files are included.
