# 安装说明 · Installation

> 这是快速版；完整的安装/使用/配置/排障见 [`GUIDE.md`](GUIDE.md)。

`@local/dsh-runaway-watchdog` 1.2.1 —— DeepSeek Harness 的失控检测 / 花费熔断插件。

## 1. 前置条件

- DeepSeek Harness（桌面版或 CLI）已安装，Node ≥ 22.19.0；
- 插件**零运行时依赖**（只用 Node 内置模块），不需要联网装包；
- 需要一个可用的 DSH profile（默认 `desktop`，目录一般在 `~/.dsh/profiles/desktop`）。

## 2. 安装（两种方式，任选其一）

把 `local-dsh-runaway-watchdog-1.2.1.tgz` 放到任意固定路径（例如 `D:\plugins\`），然后编辑
该 profile 的 `package.json`。

### 方式 A：作为 profile 依赖 + bundle（推荐）

```jsonc
{
  "dependencies": {
    "@local/dsh-runaway-watchdog": "file:D:/plugins/local-dsh-runaway-watchdog-1.2.1.tgz"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "@local/dsh-runaway-watchdog"
      ]
    }
  }
}
```

然后在 profile 目录执行安装（pnpm / npm 都行）：

```pwsh
Set-Location "$env:USERPROFILE\.dsh\profiles\desktop"
pnpm install      # 或 npm install --legacy-peer-deps
```

> `@local/dsh-runaway-watchdog` 只把 `@deepseek-ai/cordis` 声明为 peer 依赖，由宿主提供；
> 用 npm 安装时如提示 peer 解析失败，加 `--legacy-peer-deps` 即可。

### 方式 B：在插件管理器 UI 里安装

打开「插件」面板 → 从本地 .tgz 安装 → 选择该文件 → 重启宿主。装上后侧边栏会出现
「失控看门狗」入口。

## 3. 生效

1. **重启宿主一次**（加载宿主侧代码；HMR 不覆盖 `node_modules`）；
2. **刷新 GUI**（Ctrl+R / F5）一次 → 侧边栏出现盾牌图标「失控看门狗」。

## 4. 装完自证（不需要宿主）

```pwsh
Set-Location node_modules\@local\dsh-runaway-watchdog
npm test          # 期望：148 / 148 通过（纯 Node，无需联网、无需 DSH）
```

宿主内自证：面板里点「运行自检」→ 期望 `通过 11 / 失败 0`。
想亲眼看它拦一次：把配置里的 `enableTestTools` 改成 `true` 后重启，让模型用**相同参数**
连续调用 6 次 `watchdog_test_fail`，第 6 次会被硬阻断，审计账本出现 `已阻断` 记录。

> `npm run test:e2e` / `npm run verify` 需要 DSH 源码检出（要解析 `@deepseek-ai/*`），
> 在纯安装环境里跑不通属正常，不影响插件运行。

## 5. 数据与配置

| 内容 | 位置 |
| --- | --- |
| 审计账本 | `<profile>/runaway-watchdog/audit.json`（可删，删了统计归零） |
| 价格覆盖 | `<profile>/runaway-watchdog/prices.json`（面板保存后生成） |
| 行配置 | profile 的 bundle patch（`enableTestTools`、阈值、`mode` 等） |

内置参考价（元/百万 Token，`输入 / 缓存命中 / 缓存写 / 输出`）：
`deepseek-flash 2 / 0.04 / 0 / 8`、`deepseek-v4-pro 9 / 0.30 / 0 / 27`（官方**高峰时段**价；
空闲时段为其一半，可在面板按实际结算价覆盖）。

## 6. 已知边界

- 折叠状态由会话事件流重建（首次接触会话时回放最近 4000 条），**宿主重启不会给死循环重新
  5 次机会**；但真正的"现场速度窗口"是最近 60 秒，停手超过 1 分钟这两列显示 `—`；
- `fanout` 只统计 in-process 子代理（ACP / remote / CLI 子进程派生的看不到），`depth` 不受影响；
- 面板语言跟随宿主 locale，改 `.js` 后需刷新 GUI，改宿主侧代码需重启宿主。
