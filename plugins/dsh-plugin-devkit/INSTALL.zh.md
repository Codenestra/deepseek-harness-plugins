# DeepSeek Harness 插件工作台（Plugin DevKit）安装使用说明

版本：0.1.0 ｜ 包名：`@local/dsh-plugin-devkit`

面向插件开发者的工作台——「淘金热里卖铲子」。一个面板集成四项能力：**脚手架生成、运行时探索、一键本地安装/卸载、声明校验**。纯 JavaScript 实现，无构建步骤，零第三方运行时依赖。

---

## 一、功能介绍

插件工作台在侧边栏注册一个「插件工作台」面板，含四个视图：

### 1. 脚手架生成
以表单驱动生成一个结构完整、开箱即用的 DSH 插件工程：

- 填写包名（`@local/dsh-<kebab-case>`）、中英文面板标题、sidebar order。
- order 自动推荐：读取当前 `sidebar.panellist` 实时占用，按「最大值 + 1」给出建议（仅参考，生成前会再查一次，避免与其他插件冲突）。
- client inject 预设：基础四件套（locale / layout / sidebar / renderer）、完整版（追加 api-remotes、session/workspace 控制器、ui-workspace）、自定义。
- 功能勾选：HTTP API 示例、SQLite 存储（`node:sqlite`，WAL）、定时任务（cordis timer）、设置页。
- 三步向导：填写表单 → 预览文件树（可逐文件展开查看内容）→ 生成到指定目录。
- 生成的工程自带可通过的冒烟测试，所有 JS 文件均通过 `node --check`。

### 2. 运行时探索器
只读查看当前应用的运行时状态，五个子页：

- 宿主运行时：registry 插件列表 + fiber 七态（PENDING / LOADING / ACTIVE / FAILED / DISPOSED / UNLOADING 等）+ inject。
- 服务：cordis reflect 声明/提供的服务。
- Slot 树：客户端 slot 嵌套拓扑与占用（含 registrant）。
- Order 占用：`sidebar.panellist` 已用 order 实时升序表。
- Remote 面 / 模块图：remote 命名空间与方法数、已物化 client 模块（依赖边/导出/样式）。

支持按名字过滤；反射面缺失时如实降级，不修改任何运行时状态。

### 3. 安装管理
一键安装/卸载本地插件工程，并显示「已注册 / 已启用 / 已加载」状态徽章：

- 委托应用官方插件管理器（pluginManager）完成：自动 pnpm 物化 link 依赖、写清单（失败回滚）、加 bundles 条目。
- 全新安装经热更新即时生效；重复安装会提示需重启。
- 卸载只移除清单条目与依赖链接，**绝不删除工程文件**。

### 4. 校验报告
对插件工程做只读「六规则」体检，输出「通过 / 警告 / 错误」三级报告，逐条定位到文件：

1. 结构：`package.json` 的 `type:module`、`exports["./client"]`、`dsh.bundle.patch` 指向存在的 yml、`dsh.client.platform=web`。
2. inject 可解析：`dsh.client.inject` 每个包可被解析（已加载 client 模块或 profile `node_modules`），否则给出拼写警告。
3. cordis 兼容：`@deepseek-ai/cordis` peer 范围与实际安装版本是否兼容。
4. patch 一致：`cordis.patch.yml` 的 insert 行 `id`/`name` 与包名一致。
5. 入口文件：`client.js` 调用 `__ModuleLoader__.load`；`index.js` 导出 `apply` 与 `name`。
6. 汇总：三级统计，总体状态取「错误 > 警告 > 通过」。

校验全程不写任何文件。

---

## 二、运行要求

- DeepSeek Harness 桌面应用（Web 客户端平台）。插件随应用自带的 Node 运行时运行，无需另行安装 Node。
- 插件自身零第三方运行时依赖；仅以 `@deepseek-ai/cordis`（`~4.0.4`）为 peer 依赖，由应用提供。
- 生成的插件工程如需独立运行测试，建议 Node ≥ 22.19.0（工程 `engines` 声明）。

---

## 三、安装

交付包内含 `local-dsh-plugin-devkit-0.1.0.tgz`（标准 npm 包格式，可独立安装的 DSH bundle）。

### 方式一：通过应用插件管理器安装（推荐）

1. 打开 DSH 桌面应用的插件管理界面，选择「安装本地插件包」。
2. 选择本压缩包内的 `local-dsh-plugin-devkit-0.1.0.tgz`。
3. 插件管理器会自动完成依赖物化、写入 profile 清单与 bundles 注册。
4. 按提示重启桌面应用，侧边栏出现「插件工作台」（order 23）。

### 方式二：手动安装（高级）

在目标 profile 的 `package.json` 中：

1. `dependencies` 加入：`"@local/dsh-plugin-devkit": "file:D:/path/to/local-dsh-plugin-devkit-0.1.0.tgz"`
2. `dsh.profile.bundles` 加入：`"@local/dsh-plugin-devkit"`
3. 用应用自带 pnpm 物化依赖后，重启桌面应用。

> 说明：desktop profile 由桌面应用统一管理，推荐优先使用方式一，由插件管理器处理物化与回滚。

---

## 四、升级

1. 获取新版本的 `.tgz` 安装包。
2. 通过插件管理器重新安装新包（覆盖旧版本），或先卸载旧版再安装新版。
3. 重启桌面应用使新版本生效。

升级不影响你用脚手架生成的工程文件，也不影响已安装的其他插件。

---

## 五、日常使用

### 生成一个新插件
1. 侧边栏打开「插件工作台」→「脚手架生成」。
2. 填写包名、标题，确认推荐的 order（可手动调整）。
3. 选择 inject 预设与功能勾选，点「预览文件树」检查内容。
4. 选择目标目录（必须不存在或为空），点「生成工程」。
5. 按完成页提示进入「安装管理」一键安装，或手动安装后重启。

### 安装/卸载本地工程
1. 切到「安装管理」，输入工程绝对路径（或点「选择目录…」）。
2. 点「安装」，确认后等待结果；状态列表显示注册/启用/加载徽章。
3. 卸载在状态列表点对应插件的「卸载」，确认后仅移除清单条目，工程文件保留。

### 校验一个工程
1. 切到「校验报告」，输入工程绝对路径。
2. 点「开始校验」，查看三级报告：绿色通过、黄色警告、红色错误，每条标注规则与文件。
3. 按报告修正后重新校验，直至全部通过。

### 探索运行时
切到「运行时探索器」，在五个子页查看 registry/slot/order/remote/模块图，可用搜索框过滤。

---

## 六、必要配置

- 插件开箱即用，**无需额外配置**。面板 order 固定为 23，与常见插件错开。
- 脚手架生成的工程可在生成后按需修改其 `cordis.patch.yml`、`package.json` 与功能代码。
- 校验报告的 inject 可解析规则依赖客户端已加载模块列表，请在 GUI 内使用以获得完整结果。

---

## 七、卸载

通过应用插件管理器移除 `@local/dsh-plugin-devkit`。

卸载只移除插件自身的清单条目与依赖链接，重启后生效。**不会删除**你用脚手架生成的任何工程文件。

---

## 八、安全边界

- 脚手架只写用户选定且「不存在或为空」的目录；已占用目标一律拒绝、保持原样；每个文件用独占标志创建，写失败只回滚本次创建的文件。
- 安装/卸载经确认门禁，委托官方受保护清单路径（备份/回滚 + 文件锁 + 只动自己的条目）。
- 校验全程只读，不写任何文件。
- 卸载不删工程文件；不触碰 `node_modules` 内容、凭据或其他插件条目；无网络、无 shell 调用。

---

## 九、常见问题

- **改了宿主代码（index.js / lib）不生效？** 宿主改动需重启桌面应用；`client.js` 改动刷新页面即可。
- **安装后侧边栏没出现面板？** 确认已重启桌面应用，并在「安装管理」查看状态徽章是否为「已加载」。
- **校验报告 inject 全是警告？** 请在 GUI 内使用校验视图（客户端会提供已加载模块列表）；裸调 HTTP 且不传模块列表时该规则会如实降级为警告，不影响其余规则。
- **order 冲突？** 生成前会再查一次实时占用；若推荐值已被占用，按提示调整后重试。

---

## 十、包内容

`.tgz` 内含：`package.json`、`cordis.patch.yml`、`index.js`（宿主入口）、`client.js`（客户端入口）、`lib/`（脚手架/探索/安装/校验逻辑与模板）、`locale/`（中英文）、`icon.svg`、双语 README。