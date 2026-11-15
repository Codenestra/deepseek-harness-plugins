# 插件医生（dsh-plugin-doctor）安装使用说明

版本：0.1.0 · 适用：DeepSeek Harness 桌面端（Cordis 4.x 运行时）

插件医生是插件栈的健康诊断仪：一个侧边栏入口，五个面板，回答「我的插件栈健康吗、谁和谁冲突、谁版本不兼容、谁坏了、装过什么、谁在吃磁盘」。诊断全程只读；唯一会写清单的「禁用/恢复」受四重保护。

---

## 一、功能

| 面板 | 作用 |
|---|---|
| 健康总览 | 每个插件的七态分类（健康 / 等待依赖 / 失败 / 休眠 / 注册损坏 / 已禁用 / 卸载中 / 未知），运行时 fiber 状态、清单依赖与注册差异 |
| 冲突报告 | slot 的 `id` / `order` / `key` 撞车检测 + 样式归属盘点，占用表与胜出/被遮蔽归属 |
| 兼容矩阵 | 每个插件的 `peerDependencies` 与实际安装版本逐一比对（零依赖 semver，含 prerelease 判定） |
| 安装历史 | 插件管理器操作时间线（增/删包、耗时、包变化、警告）+ 各插件数据目录占地榜（只报告，不清理） |
| 操作审计 | 安全禁用 / 恢复插件、操作审计 trail、一键导出完整诊断报告（JSON） |

数据每 30 秒自动刷新，也可点页头「刷新」。冲突检测只报四类真实冲突，slot 的正常遮蔽不会误报。

---

## 二、运行要求

- DeepSeek Harness 桌面端，搭载 Cordis 4.x 运行时（peer：`@deepseek-ai/cordis` ~4.0.4）。
- Node.js ≥ 22.19（审计账本使用内置 `node:sqlite`，无需额外安装数据库）。
- 纯 JS 插件，无构建步骤、零第三方运行时依赖、无网络/shell 访问。

---

## 三、安装

安装包为 `local-dsh-plugin-doctor-0.1.0.tgz`。以下以 desktop profile 为例（profile 目录通常位于 `~/.dsh/profiles/desktop/`）。

### 方式 A：插件管理器本地安装（推荐）

若你的 DSH 提供插件管理器「本地安装 / 从 tgz 安装」入口，直接选择本 tgz，按提示完成安装并重启应用即可。插件管理器会自动处理依赖物化与 bundle 注册。

### 方式 B：手动注册

1. 把 tgz 放到一个固定目录，例如 `D:/plugins/plugin-doctor/local-dsh-plugin-doctor-0.1.0.tgz`。
2. 编辑 profile 的 `package.json`：
   - 在 `dependencies` 中加入：
     ```json
     "@local/dsh-plugin-doctor": "file:D:/plugins/plugin-doctor/local-dsh-plugin-doctor-0.1.0.tgz"
     ```
   - 在 `dsh.profile.bundles` 数组中加入一行：
     ```json
     "@local/dsh-plugin-doctor"
     ```
3. 在 profile 目录执行 `pnpm install`，把依赖物化进 `node_modules`（只改清单不物化会导致插件标为异常）。
4. 完全退出并重新启动 DSH 应用。
5. 侧边栏出现「插件医生」即安装成功。

> 说明：desktop profile 由桌面应用管理，`dsh plugin --profile desktop` 命令行会被拒绝，故采用上述本地注册方式。

---

## 四、升级

1. 用新版本 tgz 替换旧文件（或放到新路径）。
2. 把 `dependencies` 中 `@local/dsh-plugin-doctor` 的 `file:` 路径指向新 tgz。
3. 在 profile 目录执行 `pnpm install`。
4. 重启应用。

审计账本（`<profile>/plugin-doctor/plugin-doctor.sqlite`）在升级后保留，历史操作记录不丢失。 bundles 注册项无需改动（包名不变）。

---

## 五、日常使用

- **看健康**：打开「健康总览」，按状态分组浏览；点状态卡片可过滤。休眠＝依赖在但未注册进 bundles；注册损坏＝注册了但包不可解析。
- **查冲突**：「冲突报告」列出 id/order/key/style 四类冲突与样式归属；无冲突时显示空态。
- **核版本**：「兼容矩阵」标红不满足的 peer 依赖；`workspace:*` 视为中性工作区链接；rc 版本的 prerelease 不匹配会附注说明（常为良性）。
- **看历史/占地**：「安装历史」展示操作时间线与数据占地榜。占地仅报告，清理请用专门的存储工具。
- **导出报告**：页头「导出报告」下载完整 JSON（含总览/兼容/历史/审计）。
- **禁用 / 恢复**：在「操作审计」页选择目标插件，输入确认短语（禁用输 `DISABLE`、恢复输 `RESTORE`）后点对应按钮。

---

## 六、必要配置

无需额外配置。bundle 补丁 `cordis.patch.yml` 以空 config 插入 `plugin-doctor` 条目；审计账本首次使用时自动创建于 `<profile>/plugin-doctor/`。

---

## 七、安全边界

- 五个诊断面板对 profile 清单**只读**。
- 禁用/恢复**只**修改 `dsh.profile.bundles` 数组，四重保护：
  1. 写前备份 `package.json.bak-<时间戳>`（逐字节原件）；
  2. 原子写（临时文件 + rename，失败时原件完好）；
  3. 只动 bundles，`dependencies` 与其他字段逐字节不变（深比较校验）；
  4. 必须显式确认参数（`DISABLE` / `RESTORE`），UI 还需手动输入短语。
- 禁用 ≠ 删除：依赖与文件全保留，恢复即重新加回 bundles。
- **永不**触碰 `node_modules` 内容、凭据、其他插件的数据目录。
- 清单编辑可能经 HMR 热应用；若未生效，重启应用即可。

---

## 八、卸载

1. 在「操作审计」页禁用本插件，或手动从 `dsh.profile.bundles` 移除 `"@local/dsh-plugin-doctor"`。
2. 如需彻底移除，再从 `dependencies` 删除对应条目并 `pnpm install`。
3. 重启应用。审计账本目录 `<profile>/plugin-doctor/` 可手动删除（仅含本插件自己的扫描与操作记录）。

---

## 九、包内容

`package.json` · `cordis.patch.yml`（bundle 入口）· `index.js`（宿主）· `client.js` + `client.conflicts.js`（客户端）· `lib/`（inspect / bundle-rows / compat / history / actions / ledger）· `locale/`（中英）· `icon.svg` · 双语 README。