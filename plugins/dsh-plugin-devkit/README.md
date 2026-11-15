# Plugin DevKit

A developer workbench for DeepSeek Harness with scaffold generation, runtime exploration, local install management, and declaration validation.

[中文安装使用说明](INSTALL.zh.md) · [Download 0.1.0](https://github.com/Codenestra/deepseek-harness-plugins/releases/tag/dsh-plugin-devkit-v0.1.0)

## Features

- Generate a plugin project from configurable templates and a file-tree preview.
- Inspect runtime modules, service dependencies, slots, sidebar ordering, and remote namespaces.
- Install and uninstall local projects through the host plugin manager.
- Validate manifests, dependencies, compatibility, patches, and entry points.

## Installation

Download the ZIP from Releases and install `local-dsh-plugin-devkit-0.1.0.tgz` through the DSH plugin manager. Enable the plugin and open its sidebar panel.

## Requirements

DeepSeek Harness desktop with Node.js >=22.19.0 and host-provided `@deepseek-ai/cordis` ~4.0.4. JavaScript runtime files are included.
