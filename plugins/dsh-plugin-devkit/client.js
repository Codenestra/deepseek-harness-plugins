(() => {
  const PACKAGE_ID = '@local/dsh-plugin-devkit'
  const PANEL_ID = 'plugin-devkit'
  const API = '/api/plugin-devkit'
  const BASIC_INJECT = [
    '@deepseek-ai/dsh-client-locale',
    '@deepseek-ai/dsh-client-ui-layout',
    '@deepseek-ai/dsh-client-ui-sidebar',
    '@deepseek-ai/dsh-client-ui-renderer',
  ]
  const FULL_INJECT = [
    '@deepseek-ai/dsh-api-remotes',
    '@deepseek-ai/dsh-api-session-controller',
    '@deepseek-ai/dsh-api-workspace-controller',
    '@deepseek-ai/dsh-client-locale',
    '@deepseek-ai/dsh-client-ui-layout',
    '@deepseek-ai/dsh-client-ui-renderer',
    '@deepseek-ai/dsh-client-ui-sidebar',
    '@deepseek-ai/dsh-client-ui-workspace',
  ]

  const COPY = {
    zh: {
      panel: '插件工作台', title: '插件工作台',
      subtitle: '脚手架生成 · 运行时探索 · 一键安装 · 声明校验（M4：脚手架 + 探索器 + 安装 + 校验）',
      stepForm: '1 · 填写表单', stepPreview: '2 · 预览与生成', stepDone: '3 · 完成',
      packageName: '包名', packageNameHint: '格式：@local/dsh-<kebab-case>（小写字母、数字、单连字符）',
      titleZh: '面板标题（中文）', titleEn: '面板标题（英文）',
      order: 'sidebar order', orderAuto: '自动推荐', orderRecommended: '推荐', orderOccupied: '已占用',
      orderHint: '推荐值来自当前 sidebar.panellist 占用（max+1），仅供参考，生成前会再查一次。',
      injectPreset: 'client inject 预设',
      presetBasic: '基础四件套', presetBasicHint: 'locale / layout / sidebar / renderer',
      presetFull: '完整版', presetFullHint: '基础 + api-remotes / session / workspace / ui-workspace',
      presetCustom: '自定义', customInjectHint: '每行一个包名',
      features: '功能勾选',
      featHttpApi: 'HTTP API 示例', featSqlite: 'SQLite 存储', featTimer: '定时任务', featSettings: '设置页',
      previewBtn: '预览文件树', previewing: '渲染中…', backBtn: '返回修改',
      generateBtn: '生成工程', generating: '生成中…',
      targetDir: '目标目录（必须不存在或为空，永不覆盖）', pickDir: '选择目录…',
      pickDirUnavailable: '当前部署未提供目录选择器，请手填绝对路径',
      targetDirPlaceholder: 'D:\\code\\my-plugin',
      templateInfo: '模板', filesUnit: '个文件', expandAll: '全部展开', collapseAll: '全部收起',
      doneTitle: '工程已生成', nextStepsTitle: '下一步',
      nextInstall: '安装到 desktop profile（M3 将提供一键安装）：',
      nextInstall1: '在 profile 的 package.json dependencies 中加入 link 依赖（指向生成的目录）',
      nextInstall2: '在 dsh.profile.bundles 中加入包名',
      nextInstall3: '重启桌面应用，侧边栏出现新面板',
      nextDev: '开发：宿主改动（index.js / lib）需重启；client.js 改动刷新页面即可。',
      nextTest: '验证：在工程目录运行 npm test 与 npm run check。',
      againBtn: '再生成一个', errTitle: '出错了',
      orderConflict: '已被占用，请调整 order 后重试（当前推荐：',
      pickFailed: '目录选择失败', previewFailed: '预览失败', generateFailed: '生成失败',
      safetyNote: '安全边界：只写空目录；生成需确认；不触碰已有文件。',
      viewScaffold: '脚手架生成', viewExplorer: '运行时探索器',
      expHost: '宿主运行时', expSlots: 'Slot 树', expOrder: 'Order 占用', expRemotes: 'Remote 面', expModules: '模块图',
      expSearch: '按名字 / registrant 过滤…', expRefresh: '刷新', expLoading: '读取中…',
      expReadonly: '只读视图：不修改任何运行时状态。',
      expRegistry: '插件运行时（registry）', expServices: '服务（reflect）',
      expRuntimeName: '插件', expFibers: 'fiber 数', expStates: '状态', expInject: 'inject',
      expDeclared: '已声明', expProvided: '已提供', expProvider: '提供者', expHasValue: '有值',
      expServiceName: '服务名', expType: '类型', expState: '状态',
      expReflectSource: '数据源：cordis ReflectService（props + store，已验证）',
      expServicesUnavailable: '当前部署未暴露 reflect 反射面，服务列表不可用（如实降级）。',
      expRegistryUnavailable: '当前部署未暴露 registry，运行时列表不可用。',
      expSlotName: 'Slot', expKind: '类型', expScope: '作用域', expOccupants: '占用', expDeclaredBy: '声明于',
      expOrderTitle: 'sidebar.panellist 已用 order（实时）', expOrderCol: 'order', expIdCol: 'id / key', expRegistrant: 'registrant', expActive: '选中',
      expRemoteTitle: 'remote 命名空间（Object.keys）', expMethods: '方法数', expRemoteUnavailable: '当前部署未提供 remote 服务（如实降级）。',
      expModuleTitle: '已物化 client 模块（loadCache）', expStyles: '样式', expEdges: '依赖边', expExports: '导出', expModuleUnavailable: '当前部署未提供 modules 服务（如实降级）。',
      expEmpty: '无匹配项', expHostFailed: '宿主探索读取失败',
      expActiveYes: '是', expActiveNo: '否', expCount: '项',
      viewInstall: '安装管理',
      instTitle: '一键本地安装 / 卸载',
      instHint: '委托应用官方 pluginManager：自动 pnpm 物化 link 依赖、写清单（失败回滚）、加 bundles 条目。卸载只移除清单条目，不删工程文件。',
      instProjectDir: '工程目录（绝对路径）',
      instInstallBtn: '安装', instInstalling: '安装中…',
      instUninstallBtn: '卸载', instUninstalling: '卸载中…',
      instListTitle: '已安装的本地插件', instNoPlugins: '尚无已安装的 @local 本地插件。',
      instRefresh: '刷新状态', instLoading: '读取状态中…',
      instRegistered: '已注册', instEnabled: '已启用', instLoaded: '已加载', instNotLoaded: '未加载', instError: '错误',
      instRestartHint: '已注册但需重启桌面应用后加载（或等待 HMR）。重启后状态变为「已加载」。',
      instInstallOk: '安装成功', instUninstallOk: '卸载成功',
      instConfirmInstall: '确认安装该工程到桌面 profile？', instConfirmUninstall: '确认卸载该插件？（工程文件保留）',
      instManagerUnavailable: '当前部署未提供 pluginManager 服务，无法一键安装/卸载（如实降级）。',
      instFailed: '操作失败', instVersion: '版本', instRemovable: '可卸载', instStatusFailed: '状态读取失败',
      viewValidate: '校验报告',
      valTitle: '声明校验报告',
      valHint: '只读体检工程声明（六规则）：package.json 结构 / inject 可解析 / cordis 兼容 / patch 一致 / 入口文件。不写任何文件。',
      valProjectDir: '工程目录（绝对路径）',
      valBtn: '开始校验', valRunning: '校验中…',
      valEmpty: '输入工程目录后开始校验。', valFailed: '校验失败',
      valStatusPass: '通过', valStatusWarning: '有警告', valStatusError: '有错误',
      valPass: '通过', valWarning: '警告', valError: '错误',
      valRuleStructure: '结构', valRuleInject: 'inject 可解析', valRulePeerdep: 'cordis 兼容', valRulePatch: 'patch 一致', valRuleEntry: '入口文件',
      valChecks: '检查项', valNoChecks: '无检查项', valProject: '工程',
    },
    en: {
      panel: 'Plugin DevKit', title: 'Plugin DevKit',
      subtitle: 'Scaffold · Runtime explorer · One-click install · Validation (M4: scaffold + explorer + install + validate)',
      stepForm: '1 · Form', stepPreview: '2 · Preview & generate', stepDone: '3 · Done',
      packageName: 'Package name', packageNameHint: 'Format: @local/dsh-<kebab-case> (lowercase, digits, single hyphens)',
      titleZh: 'Panel title (Chinese)', titleEn: 'Panel title (English)',
      order: 'sidebar order', orderAuto: 'auto', orderRecommended: 'recommended', orderOccupied: 'occupied',
      orderHint: 'The recommendation comes from live sidebar.panellist occupancy (max+1). It is advisory; re-checked before generation.',
      injectPreset: 'client inject preset',
      presetBasic: 'Basic four', presetBasicHint: 'locale / layout / sidebar / renderer',
      presetFull: 'Full', presetFullHint: 'basic + api-remotes / session / workspace / ui-workspace',
      presetCustom: 'Custom', customInjectHint: 'one package per line',
      features: 'Features',
      featHttpApi: 'Sample HTTP API', featSqlite: 'SQLite storage', featTimer: 'Periodic task', featSettings: 'Settings page',
      previewBtn: 'Preview file tree', previewing: 'Rendering…', backBtn: 'Back to form',
      generateBtn: 'Generate project', generating: 'Generating…',
      targetDir: 'Target directory (must not exist or be empty; never overwrites)', pickDir: 'Choose directory…',
      pickDirUnavailable: 'This deployment has no directory picker; type an absolute path',
      targetDirPlaceholder: 'D:\\code\\my-plugin',
      templateInfo: 'template', filesUnit: 'files', expandAll: 'Expand all', collapseAll: 'Collapse all',
      doneTitle: 'Project generated', nextStepsTitle: 'Next steps',
      nextInstall: 'Install into the desktop profile (one-click install arrives in M3):',
      nextInstall1: 'Add a link dependency pointing at the generated directory to the profile package.json dependencies',
      nextInstall2: 'Add the package name to dsh.profile.bundles',
      nextInstall3: 'Restart the desktop app; the new panel appears in the sidebar',
      nextDev: 'Develop: host changes (index.js / lib) need a restart; client.js changes apply on page refresh.',
      nextTest: 'Verify: run npm test and npm run check inside the project.',
      againBtn: 'Generate another', errTitle: 'Something went wrong',
      orderConflict: 'is occupied; adjust the order and retry (current recommendation: ',
      pickFailed: 'Directory pick failed', previewFailed: 'Preview failed', generateFailed: 'Generation failed',
      safetyNote: 'Safety: empty directories only; explicit confirmation; existing files are never touched.',
      viewScaffold: 'Scaffold', viewExplorer: 'Runtime explorer',
      expHost: 'Host runtime', expSlots: 'Slot tree', expOrder: 'Order occupancy', expRemotes: 'Remote faces', expModules: 'Module graph',
      expSearch: 'Filter by name / registrant…', expRefresh: 'Refresh', expLoading: 'Reading…',
      expReadonly: 'Read-only view: no runtime state is modified.',
      expRegistry: 'Plugin runtimes (registry)', expServices: 'Services (reflect)',
      expRuntimeName: 'Plugin', expFibers: 'fibers', expStates: 'States', expInject: 'inject',
      expDeclared: 'Declared', expProvided: 'Provided', expProvider: 'Provider', expHasValue: 'has value',
      expServiceName: 'Service', expType: 'Type', expState: 'State',
      expReflectSource: 'Source: cordis ReflectService (props + store, verified)',
      expServicesUnavailable: 'This deployment does not expose the reflect surface; the service list is unavailable (honest degradation).',
      expRegistryUnavailable: 'This deployment does not expose the registry; the runtime list is unavailable.',
      expSlotName: 'Slot', expKind: 'Kind', expScope: 'Scope', expOccupants: 'Occupants', expDeclaredBy: 'Declared by',
      expOrderTitle: 'sidebar.panellist orders in use (live)', expOrderCol: 'order', expIdCol: 'id / key', expRegistrant: 'registrant', expActive: 'selected',
      expRemoteTitle: 'remote namespaces (Object.keys)', expMethods: 'methods', expRemoteUnavailable: 'This deployment does not provide the remote service (honest degradation).',
      expModuleTitle: 'Materialized client modules (loadCache)', expStyles: 'styles', expEdges: 'edges', expExports: 'exports', expModuleUnavailable: 'This deployment does not provide the modules service (honest degradation).',
      expEmpty: 'No matches', expHostFailed: 'Host explorer read failed',
      expActiveYes: 'yes', expActiveNo: 'no', expCount: 'items',
      viewInstall: 'Install',
      instTitle: 'One-click local install / uninstall',
      instHint: 'Delegates to the app pluginManager: pnpm-materializes the link dependency, writes the manifest (rollback on failure), adds the bundles entry. Uninstall removes only the manifest entry, never project files.',
      instProjectDir: 'Project directory (absolute path)',
      instInstallBtn: 'Install', instInstalling: 'Installing…',
      instUninstallBtn: 'Uninstall', instUninstalling: 'Uninstalling…',
      instListTitle: 'Installed local plugins', instNoPlugins: 'No installed @local plugins yet.',
      instRefresh: 'Refresh status', instLoading: 'Loading status…',
      instRegistered: 'registered', instEnabled: 'enabled', instLoaded: 'loaded', instNotLoaded: 'not loaded', instError: 'error',
      instRestartHint: 'Registered but needs a desktop restart to load (or wait for HMR). After restart the status becomes "loaded".',
      instInstallOk: 'Installed', instUninstallOk: 'Uninstalled',
      instConfirmInstall: 'Install this project into the desktop profile?', instConfirmUninstall: 'Uninstall this plugin? (project files are kept)',
      instManagerUnavailable: 'This deployment does not provide the pluginManager service; one-click install/uninstall is unavailable (honest degradation).',
      instFailed: 'Operation failed', instVersion: 'version', instRemovable: 'removable', instStatusFailed: 'Status read failed',
      viewValidate: 'Validation',
      valTitle: 'Declaration validation report',
      valHint: 'Read-only declaration check (six rules): package.json structure / inject resolvability / cordis compatibility / patch consistency / entry files. Writes nothing.',
      valProjectDir: 'Project directory (absolute path)',
      valBtn: 'Validate', valRunning: 'Validating…',
      valEmpty: 'Enter a project directory to validate.', valFailed: 'Validation failed',
      valStatusPass: 'Pass', valStatusWarning: 'Warnings', valStatusError: 'Errors',
      valPass: 'pass', valWarning: 'warning', valError: 'error',
      valRuleStructure: 'Structure', valRuleInject: 'Inject', valRulePeerdep: 'cordis peer', valRulePatch: 'Patch', valRuleEntry: 'Entry',
      valChecks: 'checks', valNoChecks: 'No checks', valProject: 'Project',
    },
  }

  function localeKey() {
    const language = document.documentElement.lang || navigator.language || 'en'
    return language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
  }

  const STYLE = `
  .dk-page, .dk-page * { box-sizing: border-box; }
  .dk-page { height:100%; min-width:0; overflow:auto; padding:calc(26px + var(--dsh-frame-top-clearance, 0px)) 28px 48px; background:var(--dsw-alias-bg-base); color:var(--dsw-alias-label-primary); font-family:var(--dsw-font-family, inherit); }
  .dk-shell { width:min(960px, 100%); margin:0 auto; }
  .dk-title { margin:0; font-size:26px; line-height:1.2; letter-spacing:-.02em; }
  .dk-subtitle { margin:8px 0 18px; color:var(--dsw-alias-label-secondary); font-size:13px; }
  .dk-steps { display:flex; gap:8px; margin-bottom:18px; flex-wrap:wrap; }
  .dk-step { padding:5px 12px; border-radius:999px; border:0.5px solid var(--dsw-alias-border-l3); background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-tertiary); font-size:11.5px; font-weight:600; }
  .dk-step[data-active='true'] { border-color:var(--dsw-alias-brand-primary); color:var(--dsw-alias-brand-primary); background:color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, var(--dsw-alias-bg-layer-1)); }
  .dk-card { padding:16px; border:0.5px solid var(--dsw-alias-border-l3); border-radius:var(--dsw-radius-lg, 14px); background:var(--dsw-alias-bg-layer-1); margin-bottom:14px; }
  .dk-form { display:grid; gap:14px; }
  .dk-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .dk-field { display:grid; gap:5px; }
  .dk-label { font-size:12px; font-weight:600; color:var(--dsw-alias-label-secondary); }
  .dk-hint { font-size:11px; color:var(--dsw-alias-label-tertiary); line-height:1.45; }
  .dk-input, .dk-textarea { width:100%; min-height:36px; padding:7px 10px; border:0.5px solid var(--dsw-alias-border-l2); border-radius:var(--dsw-radius-md, 10px); background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); font:inherit; font-size:12.5px; }
  .dk-textarea { min-height:110px; resize:vertical; font-family:var(--dsw-font-family-mono, monospace); font-size:11.5px; line-height:1.5; }
  .dk-input:focus, .dk-textarea:focus { outline:none; border-color:var(--dsw-alias-brand-primary); box-shadow:0 0 0 3px color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent); }
  .dk-radios { display:flex; gap:8px; flex-wrap:wrap; }
  .dk-radio { display:inline-flex; align-items:center; gap:6px; padding:7px 12px; border:0.5px solid var(--dsw-alias-border-l2); border-radius:var(--dsw-radius-md, 10px); background:var(--dsw-alias-bg-layer-2); cursor:pointer; font-size:12px; }
  .dk-radio[data-active='true'] { border-color:var(--dsw-alias-brand-primary); color:var(--dsw-alias-brand-primary); font-weight:600; }
  .dk-checks { display:flex; gap:8px; flex-wrap:wrap; }
  .dk-check { display:inline-flex; align-items:center; gap:6px; padding:7px 12px; border:0.5px solid var(--dsw-alias-border-l2); border-radius:var(--dsw-radius-md, 10px); background:var(--dsw-alias-bg-layer-2); cursor:pointer; font-size:12px; }
  .dk-check[data-active='true'] { border-color:var(--dsw-alias-brand-primary); color:var(--dsw-alias-brand-primary); font-weight:600; }
  .dk-orders { display:flex; gap:6px; flex-wrap:wrap; margin-top:6px; }
  .dk-order { padding:2px 8px; border-radius:999px; background:var(--dsw-alias-bg-layer-2); border:0.5px solid var(--dsw-alias-border-l3); font-size:10.5px; color:var(--dsw-alias-label-secondary); font-variant-numeric:tabular-nums; }
  .dk-order[data-recommended='true'] { border-color:var(--dsw-alias-brand-primary); color:var(--dsw-alias-brand-primary); font-weight:700; }
  .dk-actions { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-top:4px; }
  .dk-button { min-height:38px; padding:0 16px; border:0.5px solid transparent; border-radius:var(--dsw-radius-md, 10px); background:var(--dsw-alias-brand-primary); color:var(--dsw-alias-label-on-color, white); cursor:pointer; font:inherit; font-size:12.5px; font-weight:600; }
  .dk-button--ghost { background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); border-color:var(--dsw-alias-border-l2); }
  .dk-button:disabled { opacity:.55; cursor:not-allowed; }
  .dk-error { margin:0 0 14px; padding:11px 14px; border:0.5px solid var(--dsw-alias-state-error); border-radius:var(--dsw-radius-md, 10px); background:color-mix(in srgb, var(--dsw-alias-state-error) 8%, var(--dsw-alias-bg-layer-1)); color:var(--dsw-alias-label-primary); font-size:12px; line-height:1.5; }
  .dk-error strong { color:var(--dsw-alias-state-error); }
  .dk-meta { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:10px; font-size:11.5px; color:var(--dsw-alias-label-tertiary); }
  .dk-badge { padding:2px 9px; border-radius:999px; background:var(--dsw-alias-bg-layer-2); border:0.5px solid var(--dsw-alias-border-l3); font-size:10.5px; font-weight:600; color:var(--dsw-alias-label-secondary); }
  .dk-tree { display:grid; gap:2px; }
  .dk-dir { margin:10px 0 4px; font-size:11px; font-weight:700; color:var(--dsw-alias-label-tertiary); text-transform:uppercase; letter-spacing:.04em; }
  .dk-file { border:0.5px solid var(--dsw-alias-border-l3); border-radius:var(--dsw-radius-md, 10px); background:var(--dsw-alias-bg-layer-2); overflow:hidden; }
  .dk-file-head { display:flex; width:100%; align-items:center; gap:8px; padding:8px 12px; border:0; background:transparent; color:var(--dsw-alias-label-primary); cursor:pointer; font:inherit; font-size:12px; text-align:left; }
  .dk-file-head:hover { background:var(--dsw-alias-bg-layer-3); }
  .dk-file-name { font-family:var(--dsw-font-family-mono, monospace); font-size:11.5px; }
  .dk-file-size { margin-left:auto; color:var(--dsw-alias-label-tertiary); font-size:10.5px; font-variant-numeric:tabular-nums; }
  .dk-caret { color:var(--dsw-alias-label-tertiary); font-size:10px; }
  .dk-pre { margin:0; padding:12px; max-height:420px; overflow:auto; border-top:0.5px solid var(--dsw-alias-border-l3); background:var(--dsw-alias-bg-base); font-family:var(--dsw-font-family-mono, monospace); font-size:11px; line-height:1.55; white-space:pre; }
  .dk-dirrow { display:flex; gap:8px; align-items:center; }
  .dk-dirrow .dk-input { flex:1; }
  .dk-done-path { font-family:var(--dsw-font-family-mono, monospace); font-size:12px; padding:10px 12px; border-radius:var(--dsw-radius-md, 10px); background:var(--dsw-alias-bg-layer-2); border:0.5px solid var(--dsw-alias-border-l3); word-break:break-all; }
  .dk-next { margin:0; padding-left:20px; display:grid; gap:7px; font-size:12.5px; line-height:1.55; color:var(--dsw-alias-label-secondary); }
  .dk-next code { font-family:var(--dsw-font-family-mono, monospace); font-size:11px; padding:1px 5px; border-radius:5px; background:var(--dsw-alias-bg-layer-2); }
  .dk-safety { margin-top:14px; font-size:11px; color:var(--dsw-alias-label-tertiary); }
  .dk-views { display:flex; gap:8px; margin-bottom:18px; flex-wrap:wrap; }
  .dk-view { padding:7px 16px; border-radius:999px; border:0.5px solid var(--dsw-alias-border-l3); background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-secondary); font:inherit; font-size:13px; font-weight:600; cursor:pointer; }
  .dk-view[data-active='true'] { border-color:var(--dsw-alias-brand-primary); color:var(--dsw-alias-brand-primary); background:color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, var(--dsw-alias-bg-layer-1)); }
  .dk-exp-bar { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:14px; }
  .dk-subtabs { display:flex; gap:6px; flex-wrap:wrap; }
  .dk-subtab { padding:5px 12px; border-radius:8px; border:0.5px solid var(--dsw-alias-border-l3); background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-secondary); font:inherit; font-size:12px; cursor:pointer; }
  .dk-subtab[data-active='true'] { border-color:var(--dsw-alias-brand-primary); color:var(--dsw-alias-brand-primary); background:color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, var(--dsw-alias-bg-layer-1)); }
  .dk-search { flex:1; min-width:180px; padding:8px 11px; border:0.5px solid var(--dsw-alias-border-l3); border-radius:9px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); font:inherit; font-size:12.5px; }
  .dk-section-title { margin:0 0 10px; font-size:13.5px; font-weight:650; }
  .dk-note { padding:10px 12px; border-radius:9px; border:0.5px solid var(--dsw-alias-border-l3); background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-secondary); font-size:12px; line-height:1.5; margin-bottom:12px; }
  .dk-note[data-warn='true'] { border-color:var(--dsw-alias-state-warning, #d99a06); color:var(--dsw-alias-state-warning, #d99a06); }
  .dk-table { width:100%; border-collapse:collapse; font-size:12.5px; }
  .dk-table th { text-align:left; padding:7px 10px; border-bottom:0.5px solid var(--dsw-alias-border-l2); color:var(--dsw-alias-label-secondary); font-weight:600; font-size:11.5px; }
  .dk-table td { padding:7px 10px; border-bottom:0.5px solid var(--dsw-alias-border-l3); vertical-align:top; }
  .dk-table tr:last-child td { border-bottom:0; }
  .dk-mono { font-family:var(--dsw-font-family-mono, monospace); font-size:11.5px; }
  .dk-muted { color:var(--dsw-alias-label-tertiary); }
  .dk-badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:10.5px; font-weight:600; border:0.5px solid var(--dsw-alias-border-l3); background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-secondary); }
  .dk-badge[data-state='ACTIVE'] { border-color:var(--dsw-alias-state-success, #2e9e5b); color:var(--dsw-alias-state-success, #2e9e5b); }
  .dk-badge[data-state='FAILED'] { border-color:var(--dsw-alias-state-danger, #d64545); color:var(--dsw-alias-state-danger, #d64545); }
  .dk-badge[data-state='PENDING'], .dk-badge[data-state='LOADING'] { border-color:var(--dsw-alias-state-warning, #d99a06); color:var(--dsw-alias-state-warning, #d99a06); }
  .dk-chips { display:flex; flex-wrap:wrap; gap:7px; }
  .dk-chip { padding:4px 10px; border-radius:999px; border:0.5px solid var(--dsw-alias-border-l3); background:var(--dsw-alias-bg-layer-2); font-size:11.5px; font-family:var(--dsw-font-family-mono, monospace); }
  .dk-stree { display:grid; gap:2px; }
  .dk-tree-node { border:0.5px solid var(--dsw-alias-border-l3); border-radius:9px; background:var(--dsw-alias-bg-layer-1); }
  .dk-tree-head { display:flex; align-items:center; gap:8px; padding:8px 10px; cursor:pointer; flex-wrap:wrap; }
  .dk-tree-toggle { width:16px; color:var(--dsw-alias-label-tertiary); font-size:11px; }
  .dk-tree-name { font-family:var(--dsw-font-family-mono, monospace); font-size:12px; font-weight:600; }
  .dk-tree-meta { font-size:11px; color:var(--dsw-alias-label-tertiary); }
  .dk-tree-children { padding:0 10px 10px 30px; display:grid; gap:2px; }
  .dk-occ { display:flex; flex-wrap:wrap; gap:6px; padding:0 10px 8px 34px; }
  .dk-occ-item { padding:3px 9px; border-radius:7px; border:0.5px solid var(--dsw-alias-border-l3); background:var(--dsw-alias-bg-layer-2); font-size:11px; font-family:var(--dsw-font-family-mono, monospace); }
  .dk-occ-item[data-active='true'] { border-color:var(--dsw-alias-brand-primary); }
  .dk-empty { padding:18px; text-align:center; color:var(--dsw-alias-label-tertiary); font-size:12.5px; }
  .dk-inst-card { margin:0 0 16px; padding:16px; border:0.5px solid var(--dsw-alias-border-l2); border-radius:var(--dsw-radius-md, 10px); background:var(--dsw-alias-bg-layer-1); }
  .dk-inst-form { display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap; margin:12px 0 0; }
  .dk-inst-field { flex:1; min-width:260px; display:flex; flex-direction:column; gap:6px; }
  .dk-inst-label { font-size:12px; font-weight:600; color:var(--dsw-alias-label-secondary); }
  .dk-plugin-row { display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding:10px 12px; border:0.5px solid var(--dsw-alias-border-l2); border-radius:var(--dsw-radius-md, 10px); background:var(--dsw-alias-bg-layer-2); margin:0 0 8px; }
  .dk-plugin-name { font-weight:600; font-size:12.5px; }
  .dk-plugin-ver { color:var(--dsw-alias-label-tertiary); font-size:11.5px; }
  .dk-plugin-badges { display:flex; gap:6px; flex-wrap:wrap; }
  .dk-plugin-actions { margin-left:auto; display:flex; gap:8px; }
  .dk-badge[data-state='loaded'] { border-color:var(--dsw-alias-state-success, #2e9e5b); color:var(--dsw-alias-state-success, #2e9e5b); }
  .dk-badge[data-state='enabled'] { border-color:var(--dsw-alias-brand-primary); color:var(--dsw-alias-brand-primary); }
  .dk-badge[data-state='registered'] { border-color:var(--dsw-alias-border-l3); color:var(--dsw-alias-label-secondary); }
  .dk-badge[data-state='notloaded'] { border-color:var(--dsw-alias-state-warning, #d99a06); color:var(--dsw-alias-state-warning, #d99a06); }
  .dk-badge[data-state='error'] { border-color:var(--dsw-alias-state-danger, #d64545); color:var(--dsw-alias-state-danger, #d64545); }
  .dk-inst-result { margin:12px 0 0; padding:11px 14px; border:0.5px solid var(--dsw-alias-state-success, #2e9e5b); border-radius:var(--dsw-radius-md, 10px); background:color-mix(in srgb, var(--dsw-alias-state-success, #2e9e5b) 8%, var(--dsw-alias-bg-layer-1)); font-size:12px; line-height:1.6; }
  .dk-inst-result[data-failed='true'] { border-color:var(--dsw-alias-state-error); background:color-mix(in srgb, var(--dsw-alias-state-error) 8%, var(--dsw-alias-bg-layer-1)); }
  .dk-button--danger { background:var(--dsw-alias-state-danger, #d64545); color:var(--dsw-alias-label-on-color, white); }
  .dk-button--sm { min-height:30px; padding:0 12px; font-size:12px; }
  .dk-val-head { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:12px; }
  .dk-val-summary { display:flex; gap:12px; font-size:12px; font-weight:600; }
  .dk-val-summary [data-level='pass'] { color:var(--dsw-alias-state-success, #2e9e5b); }
  .dk-val-summary [data-level='warning'] { color:var(--dsw-alias-state-warning, #d99a06); }
  .dk-val-summary [data-level='error'] { color:var(--dsw-alias-state-danger, #d64545); }
  .dk-checks { display:grid; gap:6px; }
  .dk-check-row { display:flex; align-items:flex-start; gap:10px; padding:8px 12px; border:0.5px solid var(--dsw-alias-border-l2); border-left-width:3px; border-radius:var(--dsw-radius-md, 10px); background:var(--dsw-alias-bg-layer-2); font-size:12px; line-height:1.5; }
  .dk-check-row[data-level='pass'] { border-left-color:var(--dsw-alias-state-success, #2e9e5b); }
  .dk-check-row[data-level='warning'] { border-left-color:var(--dsw-alias-state-warning, #d99a06); }
  .dk-check-row[data-level='error'] { border-left-color:var(--dsw-alias-state-danger, #d64545); }
  .dk-check-rule { flex:0 0 auto; min-width:88px; font-weight:600; color:var(--dsw-alias-label-secondary); }
  .dk-check-file { flex:0 0 auto; color:var(--dsw-alias-label-tertiary); font-size:11px; }
  .dk-check-msg { flex:1 1 auto; min-width:0; color:var(--dsw-alias-label-primary); word-break:break-word; }
  @media (max-width: 720px) { .dk-row { grid-template-columns:1fr; } .dk-page { padding-left:16px; padding-right:16px; } .dk-check-row { flex-wrap:wrap; } }
  `

  window.__ModuleLoader__.load({
    id: PACKAGE_ID,
    factory(require) {
      const React = require('react')
      const { useEffect, useMemo, useState } = React
      const h = React.createElement
      let hostCtx = null

      function tcopy() { return COPY[localeKey()] }

      /** Read live sidebar.panellist occupants from the slot topology (read-only). */
      function sidebarOccupants() {
        if (!hostCtx || !hostCtx.slots || typeof hostCtx.slots.snapshot !== 'function') return []
        try {
          const found = []
          const walk = (nodes) => {
            for (const node of nodes ?? []) {
              if (node && node.type === 'slot' && node.name === 'sidebar.panellist') {
                for (const occupant of node.occupants ?? []) {
                  if (Number.isSafeInteger(occupant.order)) {
                    found.push({ order: occupant.order, id: occupant.id ?? occupant.key ?? '', registrant: occupant.registrant ?? '', active: occupant.active !== false })
                  }
                }
              }
              if (node && Array.isArray(node.children)) walk(node.children)
            }
          }
          walk(hostCtx.slots.snapshot())
          return found.sort((a, b) => a.order - b.order)
        } catch (error) {
          return []
        }
      }

      function recommendation() {
        const occupants = sidebarOccupants()
        const max = occupants.reduce((top, item) => Math.max(top, item.order), 0)
        return { recommended: max + 1, occupants }
      }

      function Icon({ size = 20 }) {
        return h('svg', {
          width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
          stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true',
        },
        h('path', { d: 'M12 3l7 4v10l-7 4-7-4V7l7-4z' }),
        h('path', { d: 'M12 12l7-4M12 12v9M12 12L5 8' }),
        h('circle', { cx: 12, cy: 12, r: 1.6, fill: 'currentColor', stroke: 'none' }))
      }

      function Field({ label, hint, children }) {
        return h('div', { className: 'dk-field' },
          h('span', { className: 'dk-label' }, label),
          children,
          hint ? h('span', { className: 'dk-hint' }, hint) : null)
      }

      function FileTree({ files, expanded, onToggle }) {
        const rows = []
        let lastDir = null
        for (const file of files) {
          const slash = file.path.lastIndexOf('/')
          const dir = slash === -1 ? '' : file.path.slice(0, slash)
          const name = slash === -1 ? file.path : file.path.slice(slash + 1)
          if (dir !== lastDir) {
            rows.push(h('div', { key: 'dir:' + dir, className: 'dk-dir' }, dir === '' ? '/' : dir + '/'))
            lastDir = dir
          }
          const open = Boolean(expanded[file.path])
          rows.push(h('div', { key: file.path, className: 'dk-file' },
            h('button', { type: 'button', className: 'dk-file-head', onClick: () => onToggle(file.path), 'aria-expanded': open },
              h('span', { className: 'dk-caret' }, open ? '▼' : '▶'),
              h('span', { className: 'dk-file-name' }, name),
              h('span', { className: 'dk-file-size' }, file.content.length + ' B')),
            open ? h('pre', { className: 'dk-pre' }, file.content) : null))
        }
        return h('div', { className: 'dk-tree' }, rows)
      }

      // ---- M2 explorer: pure transforms (read-only) ----
      function matchQuery(query, ...fields) {
        if (!query) return true
        const q = String(query).toLowerCase()
        return fields.some(f => f != null && String(f).toLowerCase().includes(q))
      }

      function panelOccupants(topology) {
        let found = null
        const walk = (nodes) => {
          for (const node of nodes ?? []) {
            if (found) return
            if (node && node.type === 'slot' && node.name === 'sidebar.panellist') {
              found = node.occupants ?? []
              return
            }
            if (node && Array.isArray(node.children)) walk(node.children)
          }
        }
        walk(topology)
        return found ?? []
      }

      function orderRows(topology) {
        const rows = panelOccupants(topology).map(occ => ({
          order: typeof occ.order === 'number' ? occ.order : null,
          id: occ.id ?? occ.key ?? '—',
          registrant: occ.registrant ?? '—',
          active: Boolean(occ.active),
        }))
        rows.sort((a, b) => (a.order ?? -1) - (b.order ?? -1))
        return rows
      }

      function remoteRows(remote) {
        if (!remote || typeof remote !== 'object') return null
        return Object.keys(remote).sort().map(name => {
          const face = remote[name]
          const methods = face && typeof face === 'object'
            ? Object.keys(face).filter(key => typeof face[key] === 'function').length : 0
          return { name, methods }
        })
      }

      function moduleRows(modules) {
        const cache = modules?.loadCache
        if (!cache || typeof cache.forEach !== 'function') return null
        const rows = []
        cache.forEach((record, id) => {
          const edges = record?.edges ? Array.from(record.edges) : []
          const exportKeys = record?.exports && typeof record.exports === 'object' ? Object.keys(record.exports) : []
          rows.push({
            id: record?.id ?? id,
            styles: Array.isArray(record?.styles) ? record.styles.length : 0,
            edges,
            exportKeys,
          })
        })
        rows.sort((a, b) => String(a.id).localeCompare(String(b.id)))
        return rows
      }

      // The client module loader is a client-side service; the host cannot read it.
      // Collect the loaded module ids here so the validate route can check inject
      // resolvability against the real client module graph.
      function loadedClientModuleIds() {
        const modules = hostCtx && typeof hostCtx.get === 'function' ? hostCtx.get('modules', false) : null
        const cache = modules?.loadCache
        if (!cache || typeof cache.forEach !== 'function') return undefined
        const ids = []
        cache.forEach((record, id) => {
          const name = record && typeof record.id === 'string' ? record.id : typeof id === 'string' ? id : null
          if (name) ids.push(name)
        })
        return ids
      }

      function slotNodeMatches(node, query) {
        if (matchQuery(query, node.name, node.declaredBy, node.registrant)) return true
        return (node.occupants ?? []).some(occ => matchQuery(query, occ.registrant, occ.id, occ.key))
      }

      function filterSlotTree(nodes, query) {
        if (!query) return nodes ?? []
        const out = []
        for (const node of nodes ?? []) {
          const children = filterSlotTree(node.children ?? [], query)
          if (slotNodeMatches(node, query) || children.length > 0) out.push({ ...node, children })
        }
        return out
      }

      function SlotNode({ node }) {
        const c = tcopy()
        const h = React.createElement
        const [open, setOpen] = useState(false)
        const children = node.children ?? []
        const occupants = node.occupants ?? []
        const isFactory = node.type === 'factory'
        const meta = [node.kind, node.scope].filter(Boolean).join(' · ')
        return h('div', { className: 'dk-tree-node' },
          h('div', { className: 'dk-tree-head', role: 'button', 'aria-expanded': open, onClick: () => setOpen(value => !value) },
            h('span', { className: 'dk-tree-toggle' }, children.length > 0 ? (open ? '▼' : '▶') : '·'),
            h('span', { className: 'dk-tree-name' }, isFactory ? 'factory:' + node.name : node.name),
            meta ? h('span', { className: 'dk-tree-meta' }, meta) : null,
            node.declaredBy ? h('span', { className: 'dk-tree-meta' }, c.expDeclaredBy + ': ' + node.declaredBy) : null,
            occupants.length > 0 ? h('span', { className: 'dk-badge' }, occupants.length + ' ' + c.expOccupants) : null),
          occupants.length > 0 ? h('div', { className: 'dk-occ' }, occupants.map((occ, index) =>
            h('span', { key: index, className: 'dk-occ-item', 'data-active': String(Boolean(occ.active)) },
              [occ.id ?? occ.key ?? '(cell)', typeof occ.order === 'number' ? 'order ' + occ.order : null, occ.registrant ?? null, occ.active ? '✓' : null]
                .filter(Boolean).join(' · ')))) : null,
          open && children.length > 0 ? h('div', { className: 'dk-tree-children' },
            children.map((child, index) => h(SlotNode, { key: child.name + ':' + index, node: child }))) : null)
      }

      function Explorer() {
        const c = tcopy()
        const h = React.createElement
        const [subTab, setSubTab] = useState('host')
        const [query, setQuery] = useState('')
        const [hostData, setHostData] = useState(null)
        const [hostError, setHostError] = useState('')
        const [hostLoading, setHostLoading] = useState(false)
        const [tick, setTick] = useState(0)

        useEffect(() => {
          if (subTab !== 'host') return undefined
          let cancelled = false
          setHostLoading(true)
          setHostError('')
          fetch(API + '/explore/host', { method: 'GET' })
            .then(response => response.json().then(data => ({ ok: response.ok, data })))
            .then(({ ok, data }) => {
              if (cancelled) return
              if (!ok) throw new Error(data?.error?.message ?? 'HTTP error')
              setHostData(data)
            })
            .catch(error => { if (!cancelled) setHostError(String(error?.message ?? error)) })
            .finally(() => { if (!cancelled) setHostLoading(false) })
          return () => { cancelled = true }
        }, [subTab, tick])

        const topology = hostCtx?.slots?.snapshot?.() ?? []
        const remote = hostCtx?.get?.('remote', false)
        const modules = hostCtx?.get?.('modules', false)

        const subTabs = [
          ['host', c.expHost], ['slots', c.expSlots], ['order', c.expOrder],
          ['remotes', c.expRemotes], ['modules', c.expModules],
        ]

        function stateBadge(stateName) {
          return h('span', { className: 'dk-badge', 'data-state': stateName }, stateName)
        }

        function renderHost() {
          if (hostError) return h('div', { className: 'dk-error' }, h('strong', null, c.expHostFailed), h('div', null, hostError))
          if (!hostData) return h('div', { className: 'dk-empty' }, c.expLoading)
          const registry = hostData.registry ?? {}
          const services = hostData.services ?? {}
          const runtimes = (registry.runtimes ?? []).filter(runtime =>
            matchQuery(query, runtime.name, ...(runtime.fibers ?? []).flatMap(fiber => fiber.inject)))
          const declared = (services.declared ?? []).filter(item => matchQuery(query, item.name, item.type))
          const provided = (services.provided ?? []).filter(item => matchQuery(query, item.name, item.provider))
          const registryRows = runtimes.map((runtime, index) =>
            h('tr', { key: (runtime.name ?? 'anon') + ':' + index },
              h('td', { className: 'dk-mono' }, runtime.name ?? '(anonymous)'),
              h('td', null, String(runtime.fiberCount)),
              h('td', null, h('div', { className: 'dk-chips' },
                (runtime.fibers ?? []).map((fiber, fi) => h('span', { key: fi }, stateBadge(fiber.stateName))))),
              h('td', { className: 'dk-muted dk-mono' }, (runtime.fibers?.[0]?.inject ?? []).join(', '))))
          const registryTable = h('table', { className: 'dk-table' },
            h('thead', null, h('tr', null,
              h('th', null, c.expRuntimeName), h('th', null, c.expFibers), h('th', null, c.expStates), h('th', null, c.expInject))),
            h('tbody', null, registryRows))
          const registryBody = registry.available === false
            ? h('div', { className: 'dk-note', 'data-warn': 'true' }, c.expRegistryUnavailable)
            : runtimes.length === 0 ? h('div', { className: 'dk-empty' }, c.expEmpty) : registryTable
          const registryCard = h('div', { className: 'dk-card' },
            h('h3', { className: 'dk-section-title' }, c.expRegistry + ' · ' + (registry.size ?? 0)),
            registryBody)

          const declaredChips = h('div', { className: 'dk-chips', style: { marginBottom: '14px' } },
            declared.map(item => h('span', { key: item.name, className: 'dk-chip' }, item.name + ':' + item.type)))
          const providedRows = provided.map((item, index) =>
            h('tr', { key: item.name + ':' + index },
              h('td', { className: 'dk-mono' }, item.name),
              h('td', null, stateBadge(item.stateName)),
              h('td', { className: 'dk-muted' }, item.provider ?? '—'),
              h('td', null, item.hasValue ? c.expActiveYes : c.expActiveNo)))
          const providedTable = h('table', { className: 'dk-table' },
            h('thead', null, h('tr', null,
              h('th', null, c.expServiceName), h('th', null, c.expState), h('th', null, c.expProvider), h('th', null, c.expHasValue))),
            h('tbody', null, providedRows))
          const servicesBody = services.available === false
            ? h('div', { className: 'dk-note', 'data-warn': 'true' }, c.expServicesUnavailable)
            : h(React.Fragment, null,
              h('div', { className: 'dk-note' }, c.expReflectSource),
              h('div', { className: 'dk-label', style: { marginBottom: '6px' } }, c.expDeclared + ' · ' + declared.length),
              declaredChips,
              h('div', { className: 'dk-label', style: { marginBottom: '6px' } }, c.expProvided + ' · ' + provided.length),
              provided.length === 0 ? h('div', { className: 'dk-empty' }, c.expEmpty) : providedTable)
          const servicesCard = h('div', { className: 'dk-card' },
            h('h3', { className: 'dk-section-title' }, c.expServices),
            servicesBody)

          return h(React.Fragment, null,
            h('div', { className: 'dk-note' }, c.expReadonly),
            registryCard,
            servicesCard)
        }

        function renderSlots() {
          const tree = filterSlotTree(topology, query)
          return h('div', { className: 'dk-card' },
            h('h3', { className: 'dk-section-title' }, c.expSlots + ' · ' + tree.length),
            h('div', { className: 'dk-note' }, c.expReadonly),
            tree.length === 0 ? h('div', { className: 'dk-empty' }, c.expEmpty)
              : h('div', { className: 'dk-stree' }, tree.map((node, index) => h(SlotNode, { key: node.name + ':' + index, node }))))
        }

        function renderOrder() {
          const rows = orderRows(topology).filter(row => matchQuery(query, row.id, row.registrant, row.order))
          const body = rows.map((row, index) =>
            h('tr', { key: row.id + ':' + index },
              h('td', { className: 'dk-mono' }, row.order == null ? '—' : String(row.order)),
              h('td', { className: 'dk-mono' }, row.id),
              h('td', { className: 'dk-muted dk-mono' }, row.registrant),
              h('td', null, row.active ? c.expActiveYes : c.expActiveNo)))
          const table = h('table', { className: 'dk-table' },
            h('thead', null, h('tr', null,
              h('th', null, c.expOrderCol), h('th', null, c.expIdCol), h('th', null, c.expRegistrant), h('th', null, c.expActive))),
            h('tbody', null, body))
          return h('div', { className: 'dk-card' },
            h('h3', { className: 'dk-section-title' }, c.expOrderTitle),
            rows.length === 0 ? h('div', { className: 'dk-empty' }, c.expEmpty) : table)
        }

        function renderRemotes() {
          const rows = remoteRows(remote)
          if (rows === null) return h('div', { className: 'dk-card' }, h('div', { className: 'dk-note', 'data-warn': 'true' }, c.expRemoteUnavailable))
          const filtered = rows.filter(row => matchQuery(query, row.name))
          const body = filtered.map(row =>
            h('tr', { key: row.name }, h('td', { className: 'dk-mono' }, row.name), h('td', null, String(row.methods))))
          const table = h('table', { className: 'dk-table' },
            h('thead', null, h('tr', null, h('th', null, c.expServiceName), h('th', null, c.expMethods))),
            h('tbody', null, body))
          return h('div', { className: 'dk-card' },
            h('h3', { className: 'dk-section-title' }, c.expRemoteTitle + ' · ' + rows.length),
            filtered.length === 0 ? h('div', { className: 'dk-empty' }, c.expEmpty) : table)
        }

        function renderModules() {
          const rows = moduleRows(modules)
          if (rows === null) return h('div', { className: 'dk-card' }, h('div', { className: 'dk-note', 'data-warn': 'true' }, c.expModuleUnavailable))
          const filtered = rows.filter(row => matchQuery(query, row.id, ...row.edges))
          const body = filtered.map(row =>
            h('tr', { key: row.id },
              h('td', { className: 'dk-mono' }, row.id),
              h('td', null, String(row.styles)),
              h('td', { className: 'dk-muted dk-mono' }, row.edges.join(', ') || '—'),
              h('td', { className: 'dk-muted dk-mono' }, row.exportKeys.join(', ') || '—')))
          const table = h('table', { className: 'dk-table' },
            h('thead', null, h('tr', null,
              h('th', null, c.expServiceName), h('th', null, c.expStyles), h('th', null, c.expEdges), h('th', null, c.expExports))),
            h('tbody', null, body))
          return h('div', { className: 'dk-card' },
            h('h3', { className: 'dk-section-title' }, c.expModuleTitle + ' · ' + rows.length),
            filtered.length === 0 ? h('div', { className: 'dk-empty' }, c.expEmpty) : table)
        }

        const content = subTab === 'host' ? renderHost()
          : subTab === 'slots' ? renderSlots()
            : subTab === 'order' ? renderOrder()
              : subTab === 'remotes' ? renderRemotes()
                : renderModules()

        return h(React.Fragment, null,
          h('div', { className: 'dk-exp-bar' },
            h('div', { className: 'dk-subtabs' }, subTabs.map(([id, label]) =>
              h('button', { key: id, type: 'button', className: 'dk-subtab', 'data-active': String(subTab === id), onClick: () => setSubTab(id) }, label))),
            h('input', { className: 'dk-search', value: query, placeholder: c.expSearch, onChange: event => setQuery(event.target.value) }),
            subTab === 'host' ? h('button', { type: 'button', className: 'dk-btn', onClick: () => setTick(value => value + 1) }, c.expRefresh) : null),
          content)
      }

      function Install() {
        const c = tcopy()
        const [projectDir, setProjectDir] = useState('')
        const [busy, setBusy] = useState(null)
        const [error, setError] = useState('')
        const [outcome, setOutcome] = useState(null)
        const [status, setStatus] = useState(null)
        const [statusError, setStatusError] = useState('')
        const [tick, setTick] = useState(0)

        useEffect(() => {
          let cancelled = false
          setStatusError('')
          fetch(API + '/status', { headers: { accept: 'application/json' } })
            .then(response => response.json().then(body => ({ ok: response.ok, body })))
            .then(({ ok, body }) => {
              if (cancelled) return
              if (!ok) { setStatusError(body && body.error ? body.error.message : c.instStatusFailed); setStatus(null); return }
              setStatus(body)
            })
            .catch(err => { if (!cancelled) { setStatusError(err instanceof Error ? err.message : String(err)); setStatus(null) } })
          return () => { cancelled = true }
        }, [tick])

        const pickerAvailable = Boolean(hostCtx && hostCtx.uiWorkspace && typeof hostCtx.uiWorkspace.pickDirectory === 'function')
        const pickDirectory = async () => {
          if (!pickerAvailable) return
          setError('')
          try {
            const picked = await hostCtx.uiWorkspace.pickDirectory()
            if (typeof picked === 'string' && picked !== '') setProjectDir(picked)
          } catch (err) { setError(c.pickFailed + ' — ' + (err instanceof Error ? err.message : String(err))) }
        }

        const post = async (path, payload) => {
          const response = await fetch(API + path, {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify(payload),
          })
          const body = await response.json().catch(() => null)
          if (!response.ok) throw new Error(body && body.error && body.error.message ? body.error.message : String(response.status))
          return body
        }

        const doInstall = async () => {
          if (busy) return
          if (!window.confirm(c.instConfirmInstall)) return
          setBusy('install'); setError(''); setOutcome(null)
          try {
            const body = await post('/install', { projectDir: projectDir.trim(), confirm: 'INSTALL' })
            setOutcome({ kind: 'install', name: body.name, result: body.result })
            setTick(value => value + 1)
          } catch (err) { setError(err instanceof Error ? err.message : String(err)) }
          finally { setBusy(null) }
        }

        const doUninstall = async (name) => {
          if (busy) return
          if (!window.confirm(c.instConfirmUninstall)) return
          setBusy('uninstall:' + name); setError(''); setOutcome(null)
          try {
            const body = await post('/uninstall', { packageName: name, confirm: 'UNINSTALL' })
            setOutcome({ kind: 'uninstall', name: body.name, result: body.result })
            setTick(value => value + 1)
          } catch (err) { setError(err instanceof Error ? err.message : String(err)) }
          finally { setBusy(null) }
        }

        const managerUnavailable = Boolean(status && status.available === false)
        const errorBar = error ? h('div', { className: 'dk-error' }, h('strong', null, c.errTitle + '：'), error) : null
        const unavailableNote = managerUnavailable ? h('div', { className: 'dk-note', 'data-warn': 'true' }, c.instManagerUnavailable) : null

        const installForm = h('div', { className: 'dk-inst-form' },
          h('div', { className: 'dk-inst-field' },
            h('label', { className: 'dk-inst-label' }, c.instProjectDir),
            h('input', { className: 'dk-input', value: projectDir, placeholder: 'D:\\code\\my-plugin', onChange: event => setProjectDir(event.target.value) })),
          h('button', { type: 'button', className: 'dk-button dk-button--ghost dk-button--sm', onClick: () => void pickDirectory(), disabled: !pickerAvailable, title: pickerAvailable ? '' : c.pickDirUnavailable }, c.pickDir),
          h('button', { type: 'button', className: 'dk-button', onClick: () => void doInstall(), disabled: Boolean(busy) || managerUnavailable || projectDir.trim() === '' }, busy === 'install' ? c.instInstalling : c.instInstallBtn))

        let outcomeBar = null
        if (outcome) {
          const failed = outcome.result.application === 'failed'
          const head = outcome.kind === 'install' ? c.instInstallOk : c.instUninstallOk
          const detail = failed
            ? c.instFailed + (outcome.result.error ? '：' + outcome.result.error.code + (outcome.result.error.message ? ' — ' + outcome.result.error.message : '') : '')
            : head + ' · ' + outcome.name + (outcome.result.restartRequired ? ' · ' + c.instRestartHint : '')
          outcomeBar = h('div', { className: 'dk-inst-result', 'data-failed': String(failed) }, detail)
        }

        const installCard = h('div', { className: 'dk-card' },
          h('h3', { className: 'dk-section-title' }, c.instTitle),
          unavailableNote,
          installForm,
          outcomeBar)

        const pluginBadges = (plugin) => {
          const badges = [h('span', { key: 'reg', className: 'dk-badge', 'data-state': 'registered' }, c.instRegistered)]
          if (plugin.enabled) badges.push(h('span', { key: 'en', className: 'dk-badge', 'data-state': 'enabled' }, c.instEnabled))
          badges.push(h('span', { key: 'load', className: 'dk-badge', 'data-state': plugin.loaded ? 'loaded' : 'notloaded' }, plugin.loaded ? c.instLoaded : c.instNotLoaded))
          if (plugin.error) badges.push(h('span', { key: 'err', className: 'dk-badge', 'data-state': 'error' }, c.instError + ': ' + plugin.error))
          return h('div', { className: 'dk-plugin-badges' }, badges)
        }

        const pluginRow = (plugin) => {
          const uninstallBtn = h('button', {
            type: 'button', className: 'dk-button dk-button--danger dk-button--sm',
            onClick: () => void doUninstall(plugin.name),
            disabled: Boolean(busy) || !plugin.removable,
          }, busy === 'uninstall:' + plugin.name ? c.instUninstalling : c.instUninstallBtn)
          const version = plugin.version ? h('span', { className: 'dk-plugin-ver' }, c.instVersion + ' ' + plugin.version) : null
          return h('div', { key: plugin.name, className: 'dk-plugin-row' },
            h('span', { className: 'dk-plugin-name' }, plugin.name),
            version,
            pluginBadges(plugin),
            h('div', { className: 'dk-plugin-actions' }, uninstallBtn))
        }

        let statusBody
        if (statusError) {
          statusBody = h('div', { className: 'dk-note', 'data-warn': 'true' }, c.instStatusFailed + '：' + statusError)
        } else if (!status) {
          statusBody = h('div', { className: 'dk-empty' }, c.instLoading)
        } else if (managerUnavailable) {
          statusBody = h('div', { className: 'dk-note', 'data-warn': 'true' }, c.instManagerUnavailable)
        } else if (status.plugins.length === 0) {
          statusBody = h('div', { className: 'dk-empty' }, c.instNoPlugins)
        } else {
          statusBody = h('div', null, status.plugins.map(pluginRow))
        }

        const refreshBtn = h('button', { type: 'button', className: 'dk-button dk-button--ghost dk-button--sm', onClick: () => setTick(value => value + 1) }, c.instRefresh)
        const statusCard = h('div', { className: 'dk-card' },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' } },
            h('h3', { className: 'dk-section-title', style: { margin: 0 } }, c.instListTitle + (status && status.plugins ? ' · ' + status.plugins.length : '')),
            refreshBtn),
          statusBody)

        return h('div', { className: 'dk-explorer' },
          h('div', { className: 'dk-note' }, c.instHint),
          errorBar,
          installCard,
          statusCard)
      }

      const FORM_STORAGE_KEY = 'plugin-devkit:scaffold-form'
      function loadSavedForm() {
        try {
          if (typeof sessionStorage === 'undefined') return null
          const raw = sessionStorage.getItem(FORM_STORAGE_KEY)
          const parsed = raw ? JSON.parse(raw) : null
          return parsed && typeof parsed === 'object' ? parsed : null
        } catch { return null }
      }
      function saveFormSnapshot(snapshot) {
        try {
          if (typeof sessionStorage === 'undefined') return
          sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(snapshot))
        } catch { /* storage unavailable or full — ignore */ }
      }

      function Validate() {
        const c = tcopy()
        const [projectDir, setProjectDir] = useState('')
        const [busy, setBusy] = useState(false)
        const [error, setError] = useState('')
        const [report, setReport] = useState(null)

        const pickerAvailable = Boolean(hostCtx && hostCtx.uiWorkspace && typeof hostCtx.uiWorkspace.pickDirectory === 'function')
        const pickDirectory = async () => {
          if (!pickerAvailable) return
          setError('')
          try {
            const picked = await hostCtx.uiWorkspace.pickDirectory()
            if (typeof picked === 'string' && picked !== '') setProjectDir(picked)
          } catch (err) { setError(c.pickFailed + ' — ' + (err instanceof Error ? err.message : String(err))) }
        }

        const doValidate = async () => {
          if (busy || projectDir.trim() === '') return
          setBusy(true); setError(''); setReport(null)
          try {
            const response = await fetch(API + '/validate', {
              method: 'POST',
              headers: { 'content-type': 'application/json', accept: 'application/json' },
              body: JSON.stringify({ projectDir: projectDir.trim(), clientModules: loadedClientModuleIds() }),
            })
            const body = await response.json().catch(() => null)
            if (!response.ok) throw new Error(body && body.error && body.error.message ? body.error.message : String(response.status))
            setReport(body)
          } catch (err) { setError(err instanceof Error ? err.message : String(err)) }
          finally { setBusy(false) }
        }

        const errorBar = error ? h('div', { className: 'dk-error' }, h('strong', null, c.errTitle + '：'), error) : null

        const form = h('div', { className: 'dk-inst-form' },
          h('div', { className: 'dk-inst-field' },
            h('label', { className: 'dk-inst-label' }, c.valProjectDir),
            h('input', { className: 'dk-input', value: projectDir, placeholder: 'D:\\code\\my-plugin', spellCheck: false, onChange: event => setProjectDir(event.target.value) })),
          h('button', { type: 'button', className: 'dk-button dk-button--ghost dk-button--sm', onClick: () => void pickDirectory(), disabled: !pickerAvailable, title: pickerAvailable ? '' : c.pickDirUnavailable }, c.pickDir),
          h('button', { type: 'button', className: 'dk-button', onClick: () => void doValidate(), disabled: busy || projectDir.trim() === '' }, busy ? c.valRunning : c.valBtn))

        const formCard = h('div', { className: 'dk-card' },
          h('h3', { className: 'dk-section-title' }, c.valTitle),
          form)

        const ruleLabel = { structure: c.valRuleStructure, inject: c.valRuleInject, peerdep: c.valRulePeerdep, patch: c.valRulePatch, entry: c.valRuleEntry }
        const levelText = { pass: c.valPass, warning: c.valWarning, error: c.valError }
        const levelState = { pass: 'loaded', warning: 'notloaded', error: 'error' }
        const statusText = { pass: c.valStatusPass, warning: c.valStatusWarning, error: c.valStatusError }

        const checkRow = (check, index) => h('div', { key: index, className: 'dk-check-row', 'data-level': check.level },
          h('span', { className: 'dk-badge', 'data-state': levelState[check.level] || 'registered' }, levelText[check.level] || check.level),
          h('span', { className: 'dk-check-rule' }, ruleLabel[check.rule] || check.rule),
          h('span', { className: 'dk-check-file dk-mono' }, check.file),
          h('span', { className: 'dk-check-msg' }, check.message))

        let reportCard = null
        if (report) {
          const summary = report.summary || { pass: 0, warning: 0, error: 0 }
          const checks = Array.isArray(report.checks) ? report.checks : []
          const head = h('div', { className: 'dk-val-head' },
            h('span', { className: 'dk-badge', 'data-state': levelState[report.status] || 'registered' }, statusText[report.status] || report.status),
            h('span', { className: 'dk-val-summary' },
              h('span', { 'data-level': 'pass' }, c.valPass + ' ' + summary.pass),
              h('span', { 'data-level': 'warning' }, c.valWarning + ' ' + summary.warning),
              h('span', { 'data-level': 'error' }, c.valError + ' ' + summary.error)),
            h('span', { className: 'dk-muted dk-mono', style: { marginLeft: 'auto' } }, report.name || report.dir || ''))
          reportCard = h('div', { className: 'dk-card' },
            head,
            checks.length === 0
              ? h('div', { className: 'dk-empty' }, c.valNoChecks)
              : h('div', { className: 'dk-checks' }, checks.map(checkRow)))
        } else if (!busy) {
          reportCard = h('div', { className: 'dk-card' }, h('div', { className: 'dk-empty' }, c.valEmpty))
        }

        return h('div', { className: 'dk-explorer' },
          h('div', { className: 'dk-note' }, c.valHint),
          errorBar,
          formCard,
          reportCard)
      }

      function Page() {
        const c = tcopy()
        const [saved] = useState(() => loadSavedForm())
        const [view, setView] = useState('scaffold')
        const [step, setStep] = useState('form')
        const [packageName, setPackageName] = useState(saved?.packageName ?? '@local/dsh-')
        const [titleZh, setTitleZh] = useState(saved?.titleZh ?? '')
        const [titleEn, setTitleEn] = useState(saved?.titleEn ?? '')
        const [order, setOrder] = useState(saved?.order ?? '')
        const [orderTouched, setOrderTouched] = useState(saved?.orderTouched ?? false)
        const [injectPreset, setInjectPreset] = useState(saved?.injectPreset ?? 'basic')
        const [customInject, setCustomInject] = useState(saved?.customInject ?? FULL_INJECT.join('\n'))
        const [features, setFeatures] = useState(saved?.features ?? { httpApi: true, sqlite: false, timer: false, settings: false })
        const [orderInfo, setOrderInfo] = useState({ recommended: null, occupants: [] })
        const [preview, setPreview] = useState(null)
        const [expanded, setExpanded] = useState({})
        const [targetDir, setTargetDir] = useState(saved?.targetDir ?? '')
        const [busy, setBusy] = useState(null)
        const [error, setError] = useState('')
        const [result, setResult] = useState(null)

        useEffect(() => {
          const info = recommendation()
          setOrderInfo(info)
          if (!orderTouched) setOrder(String(info.recommended))
        }, [])

        // Persist the wizard form so switching to another panel and back does not
        // lose the user's input. Guarded: a no-op where sessionStorage is absent.
        useEffect(() => {
          saveFormSnapshot({ packageName, titleZh, titleEn, order, orderTouched, injectPreset, customInject, features, targetDir })
        }, [packageName, titleZh, titleEn, order, orderTouched, injectPreset, customInject, features, targetDir])

        const formPayload = () => ({
          packageName: packageName.trim(),
          titleZh: titleZh.trim(),
          titleEn: titleEn.trim(),
          order: order === '' ? NaN : Number(order),
          injectPreset,
          ...(injectPreset === 'custom' ? { customInject: customInject.split(/\r?\n/).map(line => line.trim()).filter(Boolean) } : {}),
          features,
        })

        const post = async (path, payload) => {
          const response = await fetch(API + path, {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify(payload),
          })
          const body = await response.json().catch(() => null)
          if (!response.ok) {
            const message = body && body.error && body.error.message ? body.error.message : String(response.status)
            const code = body && body.error && body.error.code ? body.error.code : ''
            throw new Error(code ? code + ': ' + message : message)
          }
          return body
        }

        const doPreview = async () => {
          setBusy('preview'); setError('')
          try {
            const body = await post('/scaffold/preview', formPayload())
            setPreview(body)
            setExpanded({})
            setStep('preview')
          } catch (err) {
            setError(c.previewFailed + ' — ' + (err instanceof Error ? err.message : String(err)))
          } finally {
            setBusy(null)
          }
        }

        const pickDirectory = async () => {
          if (!hostCtx || !hostCtx.uiWorkspace || typeof hostCtx.uiWorkspace.pickDirectory !== 'function') return
          setError('')
          try {
            const picked = await hostCtx.uiWorkspace.pickDirectory()
            if (typeof picked === 'string' && picked !== '') setTargetDir(picked)
          } catch (err) {
            setError(c.pickFailed + ' — ' + (err instanceof Error ? err.message : String(err)))
          }
        }

        const doGenerate = async () => {
          // Re-check the live occupancy right before writing: the recommendation
          // is advisory and another session may have taken the order meanwhile.
          const info = recommendation()
          setOrderInfo(info)
          const chosen = Number(order)
          if (info.occupants.some(item => item.active && item.order === chosen)) {
            setError('order ' + chosen + ' ' + c.orderConflict + info.recommended + ')')
            return
          }
          if (targetDir.trim() === '') {
            setError(c.generateFailed + ' — ' + c.targetDir)
            return
          }
          setBusy('generate'); setError('')
          try {
            const body = await post('/scaffold/generate', { ...formPayload(), targetDir: targetDir.trim(), confirm: 'GENERATE' })
            setResult(body)
            setStep('done')
          } catch (err) {
            setError(c.generateFailed + ' — ' + (err instanceof Error ? err.message : String(err)))
          } finally {
            setBusy(null)
          }
        }

        const reset = () => {
          setStep('form'); setPreview(null); setResult(null); setError(''); setTargetDir('')
        }

        const toggleFile = (path) => setExpanded(current => ({ ...current, [path]: !current[path] }))
        const setAll = (open) => {
          if (!preview) return
          const next = {}
          for (const file of preview.files) next[file.path] = open
          setExpanded(next)
        }

        const pickerAvailable = Boolean(hostCtx && hostCtx.uiWorkspace && typeof hostCtx.uiWorkspace.pickDirectory === 'function')
        const featureKeys = [['httpApi', c.featHttpApi], ['sqlite', c.featSqlite], ['timer', c.featTimer], ['settings', c.featSettings]]

        const stepsBar = h('div', { className: 'dk-steps' },
          h('span', { className: 'dk-step', 'data-active': step === 'form' }, c.stepForm),
          h('span', { className: 'dk-step', 'data-active': step === 'preview' }, c.stepPreview),
          h('span', { className: 'dk-step', 'data-active': step === 'done' }, c.stepDone))

        const errorBar = error === '' ? null : h('p', { className: 'dk-error', role: 'alert' }, h('strong', null, c.errTitle + ' '), error)

        let content
        if (step === 'form') {
          content = h('section', { className: 'dk-card' },
            h('div', { className: 'dk-form' },
              h(Field, { label: c.packageName, hint: c.packageNameHint },
                h('input', { className: 'dk-input', value: packageName, onChange: event => setPackageName(event.target.value), placeholder: '@local/dsh-my-plugin', spellCheck: false })),
              h('div', { className: 'dk-row' },
                h(Field, { label: c.titleZh },
                  h('input', { className: 'dk-input', value: titleZh, onChange: event => setTitleZh(event.target.value), placeholder: '我的插件' })),
                h(Field, { label: c.titleEn },
                  h('input', { className: 'dk-input', value: titleEn, onChange: event => setTitleEn(event.target.value), placeholder: 'My Plugin' }))),
              h(Field, { label: c.order + (orderInfo.recommended === null ? '' : ' · ' + c.orderRecommended + ' ' + orderInfo.recommended), hint: c.orderHint },
                h('input', {
                  className: 'dk-input', type: 'number', min: 0, step: 1, value: order,
                  onChange: event => { setOrder(event.target.value); setOrderTouched(true) },
                }),
                orderInfo.occupants.length > 0 ? h('div', { className: 'dk-orders' },
                  orderInfo.occupants.map(item => h('span', { key: item.id + ':' + item.order, className: 'dk-order', title: item.registrant }, item.order + ' · ' + (item.id || '?'))),
                  h('span', { className: 'dk-order', 'data-recommended': 'true' }, orderInfo.recommended + ' · ' + c.orderRecommended)) : null),
              h(Field, { label: c.injectPreset },
                h('div', { className: 'dk-radios' },
                  h('button', { type: 'button', className: 'dk-radio', 'data-active': injectPreset === 'basic', onClick: () => setInjectPreset('basic'), title: c.presetBasicHint }, c.presetBasic),
                  h('button', { type: 'button', className: 'dk-radio', 'data-active': injectPreset === 'full', onClick: () => setInjectPreset('full'), title: c.presetFullHint }, c.presetFull),
                  h('button', { type: 'button', className: 'dk-radio', 'data-active': injectPreset === 'custom', onClick: () => setInjectPreset('custom') }, c.presetCustom)),
                injectPreset === 'custom' ? h('textarea', { className: 'dk-textarea', value: customInject, onChange: event => setCustomInject(event.target.value), placeholder: c.customInjectHint, spellCheck: false }) : null,
                injectPreset !== 'custom' ? h('span', { className: 'dk-hint' }, (injectPreset === 'basic' ? BASIC_INJECT : FULL_INJECT).join('  ·  ')) : null),
              h(Field, { label: c.features },
                h('div', { className: 'dk-checks' },
                  featureKeys.map(([key, label]) => h('button', {
                    key, type: 'button', className: 'dk-check', 'data-active': features[key],
                    onClick: () => setFeatures(current => ({ ...current, [key]: !current[key] })),
                  }, (features[key] ? '✓ ' : '') + label)))),
              h('div', { className: 'dk-actions' },
                h('button', { type: 'button', className: 'dk-button', onClick: () => void doPreview(), disabled: busy !== null }, busy === 'preview' ? c.previewing : c.previewBtn)),
              h('p', { className: 'dk-safety' }, c.safetyNote)))
        } else if (step === 'preview' && preview) {
          content = h(React.Fragment, null,
            h('section', { className: 'dk-card' },
              h('div', { className: 'dk-meta' },
                h('span', { className: 'dk-badge' }, c.templateInfo + ' ' + preview.templateVersion),
                h('span', { className: 'dk-badge' }, preview.baseline),
                h('span', null, preview.files.length + ' ' + c.filesUnit),
                h('span', { style: { marginLeft: 'auto', display: 'flex', gap: '8px' } },
                  h('button', { type: 'button', className: 'dk-button dk-button--ghost', style: { minHeight: '28px', fontSize: '11px' }, onClick: () => setAll(true) }, c.expandAll),
                  h('button', { type: 'button', className: 'dk-button dk-button--ghost', style: { minHeight: '28px', fontSize: '11px' }, onClick: () => setAll(false) }, c.collapseAll))),
              h(FileTree, { files: preview.files, expanded, onToggle: toggleFile })),
            h('section', { className: 'dk-card' },
              h('div', { className: 'dk-form' },
                h(Field, { label: c.targetDir },
                  h('div', { className: 'dk-dirrow' },
                    h('input', { className: 'dk-input', value: targetDir, onChange: event => setTargetDir(event.target.value), placeholder: c.targetDirPlaceholder, spellCheck: false }),
                    h('button', { type: 'button', className: 'dk-button dk-button--ghost', onClick: () => void pickDirectory(), disabled: !pickerAvailable, title: pickerAvailable ? '' : c.pickDirUnavailable }, c.pickDir)),
                  pickerAvailable ? null : h('span', { className: 'dk-hint' }, c.pickDirUnavailable)),
                h('div', { className: 'dk-actions' },
                  h('button', { type: 'button', className: 'dk-button dk-button--ghost', onClick: () => { setStep('form'); setError('') }, disabled: busy !== null }, c.backBtn),
                  h('button', { type: 'button', className: 'dk-button', onClick: () => void doGenerate(), disabled: busy !== null }, busy === 'generate' ? c.generating : c.generateBtn)))))
        } else if (step === 'done' && result) {
          const pkg = preview ? preview.form.packageName : packageName.trim()
          content = h('section', { className: 'dk-card' },
            h('h2', { style: { margin: '0 0 10px', fontSize: '16px' } }, '✓ ' + c.doneTitle),
            h('div', { className: 'dk-done-path' }, result.targetDir),
            h('p', { className: 'dk-hint', style: { margin: '8px 0 14px' } }, result.files.length + ' ' + c.filesUnit + ' · ' + c.templateInfo + ' ' + result.templateVersion),
            h('h3', { style: { margin: '0 0 8px', fontSize: '13px' } }, c.nextStepsTitle),
            h('ol', { className: 'dk-next' },
              h('li', null, c.nextInstall,
                h('div', { className: 'dk-hint', style: { marginTop: '4px' } },
                  '1) ' + c.nextInstall1 + ' ', h('code', null, '"' + pkg + '": "link:' + result.targetDir + '"'),
                  h('br'), '2) ' + c.nextInstall2 + ' ', h('code', null, pkg),
                  h('br'), '3) ' + c.nextInstall3)),
              h('li', null, c.nextDev),
              h('li', null, c.nextTest)),
            h('div', { className: 'dk-actions', style: { marginTop: '14px' } },
              h('button', { type: 'button', className: 'dk-button dk-button--ghost', onClick: reset }, c.againBtn)))
        } else {
          content = null
        }

        const viewsBar = h('div', { className: 'dk-views' },
          h('button', { type: 'button', className: 'dk-view', 'data-active': String(view === 'scaffold'), onClick: () => setView('scaffold') }, c.viewScaffold),
          h('button', { type: 'button', className: 'dk-view', 'data-active': String(view === 'explorer'), onClick: () => setView('explorer') }, c.viewExplorer),
          h('button', { type: 'button', className: 'dk-view', 'data-active': String(view === 'install'), onClick: () => setView('install') }, c.viewInstall),
          h('button', { type: 'button', className: 'dk-view', 'data-active': String(view === 'validate'), onClick: () => setView('validate') }, c.viewValidate))

        const activeView = view === 'scaffold'
          ? h(React.Fragment, null, stepsBar, errorBar, content)
          : view === 'install'
            ? h(Install, null)
            : view === 'validate'
              ? h(Validate, null)
              : h(Explorer, null)

        return h('div', { className: 'dk-page' },
          h('div', { className: 'dk-shell' },
            h('h1', { className: 'dk-title' }, c.title),
            h('p', { className: 'dk-subtitle' }, c.subtitle),
            viewsBar,
            activeView))
      }

      return {
        inject: ['slots', 'locale', 'uiWorkspace'],
        apply(ctx) {
          hostCtx = ctx
          ctx.effect(() => {
            const style = document.createElement('style')
            style.dataset.plugin = PACKAGE_ID
            style.textContent = STYLE
            document.head.append(style)
            return () => style.remove()
          }, 'plugin-devkit: styles')
          ctx.effect(() => ctx.locale.register('pluginDevkit', {
            zh: { panel: COPY.zh.panel },
            en: { panel: COPY.en.panel },
          }), 'plugin-devkit: locale')
          const label = ctx.locale.bind('pluginDevkit')
          ctx.slots.inject('main', () => ctx.slots.register({
            name: 'main', key: PANEL_ID, locale: 'pluginDevkit',
          }, Page))
          ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
            name: 'sidebar.panellist', id: PANEL_ID, order: 23,
            label: () => label('panel'), locale: 'pluginDevkit',
          }, Icon))
        },
      }
    },
  })
})()