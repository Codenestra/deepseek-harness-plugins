(() => {
  const PACKAGE_ID = '@local/dsh-plugin-doctor'
  const PANEL_ID = 'plugin-doctor'
  const API = '/api/plugin-doctor'
  const REFRESH_MS = 30000

  const COPY = {
    zh: {
      panel: '插件医生', title: '插件医生',
      subtitle: '插件栈健康诊断：运行状态 · 清单差异 · 实时纤维状态',
      refresh: '刷新', refreshing: '扫描中…', updatedAt: '更新于', retry: '重试',
      loadError: '诊断数据加载失败', empty: '没有发现已注册的插件',
      total: '插件总数', libraries: '库依赖', hostErrors: 'Host 错误',
      healthy: '健康', pending: '等待依赖', failed: '失败', dormant: '休眠',
      broken: '注册损坏', disabled: '已禁用', unloading: '卸载中', unknown: '未知',
      healthyHint: 'fiber ACTIVE，依赖与注册齐全',
      pendingHint: 'fiber PENDING，等待 inject 服务',
      failedHint: 'fiber FAILED，回调或配置抛错',
      dormantHint: '依赖存在但未注册进 bundles',
      brokenHint: '注册损坏或包文件缺失',
      disabledHint: 'loader 条目被禁用',
      unloadingHint: '正在卸载（过渡态）',
      unknownHint: '已注册但无运行时记录',
      version: '版本', source: '来源', shipped: '随 DSH 发货', entries: '条目',
      container: '容器 bundle', contributedRows: '聚合子行', componentBadge: 'bundle 携带组件',
      requiredServices: '等待服务', missingServices: '缺失', notes: '备注',
      noFibers: '无活动 fiber', filterClear: '清除筛选',
      runtimesTitle: '运行时视图（registry 原始枚举）',
      runtimesHint: '来自 ctx.registry 的全部插件运行时，含内部插件；包名经 fiber.entry 精确归属。',
      unnamed: '未知插件', runtimeName: '名称', runtimePackage: '包名', runtimeFibers: 'fiber 数', runtimeStates: '状态',
      librariesTitle: '库依赖（非插件，不参与诊断）',
      librariesHint: '这些依赖没有 dsh.bundle 声明，是其他插件的库，不是休眠插件。',
      profile: 'Profile', manifest: '清单', deps: '依赖', bundles: '注册', scanTook: '扫描耗时',
      groupEmpty: '该状态下没有插件',
      tabOverview: '健康总览', tabConflicts: '冲突报告',
      conflictsSubtitle: 'Slot 撞车与样式归属风险 · 纯客户端分析，不依赖 Host',
      conflictId: 'ID 冲突', conflictOrder: 'Order 冲突', conflictKey: 'Key 冲突', conflictStyle: '样式风险',
      conflictIdHint: '同 slot 重复 id，后注册者被遮蔽',
      conflictOrderHint: 'sidebar.panellist 重复 order，显示顺序不确定',
      conflictKeyHint: '同 key 多占位，后注册者被遮蔽',
      conflictStyleHint: '未标记样式 / css 键多归属',
      noConflicts: '未发现冲突 —— slot 与样式归属干净',
      conflictsUnavailable: '冲突分析不可用',
      slotsMissing: 'ctx.slots.snapshot() 不可用',
      chunkError: '冲突分析模块加载失败',
      analyzedAt: '分析于', involved: '涉及', suggestion: '建议',
      winner: '胜出', shadowed: '被遮蔽', untaggedStyles: '未标记 style 标签',
      orderTableTitle: 'sidebar.panellist order 占用表',
      orderTableHint: '全部已注册面板按 order 排序；重复 order 标橙。新面板请挑空闲值。',
      registrantCfHint: '注册者显示 cf = 框架默认归属（该插件未显式声明 registrant），请以 ID 列为准。',
      colOrder: 'Order', colId: 'ID', colRegistrant: '注册者', colActive: '渲染中',
      activeYes: '是', activeNo: '否',
      styleInventoryTitle: '样式盘点',
      styleInventoryHint: 'claimStyles 契约：无 data-plugin 的 style 会被下一个物化的插件认领，HMR 时可能误删。',
      styleTotal: 'style 标签', styleTagged: '已标记', styleUntagged: '未标记',
      styleByPlugin: '按插件', styleCssKeys: 'css 键归属',
      conflictBadge: '冲突',
      tabCompat: '兼容矩阵', tabHistory: '安装历史',
      compatSubtitle: 'peerDependencies 与实际安装版本对照 · 零依赖 semver（与 node-semver 交叉验证）',
      historySubtitle: '安装操作时间线 · 数据占地（只报告，清理请用存储医生）',
      cordisRuntime: 'cordis 运行时版本',
      compatSatisfied: '兼容', compatMismatch: '不兼容', compatMissing: '未独立安装',
      compatWorkspace: '工作区', compatUnknown: '未知', compatOptional: '可选缺失', compatNoPeers: '无 peer',
      compatSatisfiedHint: '声明范围被满足', compatMismatchHint: '版本冲突，需处理',
      compatMissingHint: 'peer 包未独立安装（可能由运行时内部提供）', compatWorkspaceHint: 'pnpm 工作区协议，非版本约束',
      compatPlugins: '插件', compatWithPeers: '含 peer',
      peerRange: '声明范围', peerInstalled: '实际版本', peerStatus: '判定',
      compatEmpty: '没有可分析的插件',
      historyOps: '操作记录', historyFootprint: '数据占地',
      historyEmpty: '暂无安装操作日志',
      opAdd: '安装', opRemove: '移除', opDuration: '耗时', opDelta: '包变化', opWarnings: '警告',
      footprintHint: '只读报告，不执行任何清理。清理插件数据请使用「存储医生」。',
      footprintName: '目录 / 文件', footprintSize: '体积', footprintFiles: '文件数', footprintTruncated: '已截断',
      dataUnavailable: '数据加载失败',
      tabAudit: '操作审计',
      auditSubtitle: '安全禁用 / 恢复（四重保护）· 操作审计 trail · 报告导出',
      exportReport: '导出报告',
      actionPanelTitle: '安全操作',
      safetyNote: '禁用仅从 bundles 移除条目（依赖与文件全保留），自动备份清单、原子写、需确认参数；可一键恢复。永不触碰 node_modules、凭据与其他插件数据。',
      actionTarget: '目标插件', selectPlaceholder: '选择插件…',
      actionConfirmLabel: '确认短语', actionConfirmPlaceholder: '禁用输入 DISABLE · 恢复输入 RESTORE',
      disableBtn: '禁用', restoreBtn: '恢复',
      confirmMismatch: '确认短语不匹配',
      actionSuccess: '操作成功', actionFailed: '操作失败',
      auditTrail: '操作审计', auditEmpty: '暂无操作记录',
      auditTime: '时间', auditKind: '类型', auditTarget: '目标', auditBackup: '备份',
      auditKindDisable: '禁用', auditKindRestore: '恢复',
      hmrHint: '清单编辑可能经 HMR 热应用；若未生效请重启应用。',
    },
    en: {
      panel: 'Plugin Doctor', title: 'Plugin Doctor',
      subtitle: 'Plugin-stack health: runtime status · manifest diff · live fiber states',
      refresh: 'Refresh', refreshing: 'Scanning…', updatedAt: 'Updated', retry: 'Retry',
      loadError: 'Failed to load diagnostics', empty: 'No registered plugins found',
      total: 'Plugins', libraries: 'Libraries', hostErrors: 'Host errors',
      healthy: 'Healthy', pending: 'Pending', failed: 'Failed', dormant: 'Dormant',
      broken: 'Broken', disabled: 'Disabled', unloading: 'Unloading', unknown: 'Unknown',
      healthyHint: 'fiber ACTIVE, dependency and registration present',
      pendingHint: 'fiber PENDING, waiting for injected services',
      failedHint: 'fiber FAILED, callback or config threw',
      dormantHint: 'dependency present but not registered in bundles',
      brokenHint: 'broken registration or missing package files',
      disabledHint: 'loader entries are disabled',
      unloadingHint: 'unloading in progress (transitional)',
      unknownHint: 'registered but no runtime records',
      version: 'Version', source: 'Source', shipped: 'Shipped with DSH', entries: 'Entries',
      container: 'Container bundle', contributedRows: 'contributed rows', componentBadge: 'bundle-carried component',
      requiredServices: 'Waiting for', missingServices: 'Missing', notes: 'Notes',
      noFibers: 'No live fibers', filterClear: 'Clear filter',
      runtimesTitle: 'Runtime view (raw registry enumeration)',
      runtimesHint: 'All plugin runtimes from ctx.registry, including internal ones; package names attributed via fiber.entry.',
      unnamed: 'Unnamed plugin', runtimeName: 'Name', runtimePackage: 'Package', runtimeFibers: 'Fibers', runtimeStates: 'States',
      librariesTitle: 'Library dependencies (not plugins, not diagnosed)',
      librariesHint: 'These dependencies declare no dsh.bundle; they are libraries for other plugins, not dormant plugins.',
      profile: 'Profile', manifest: 'Manifest', deps: 'deps', bundles: 'bundles', scanTook: 'Scan took',
      groupEmpty: 'No plugins in this state',
      tabOverview: 'Health overview', tabConflicts: 'Conflict report',
      conflictsSubtitle: 'Slot collisions and style-ownership risks · pure client-side analysis, no host needed',
      conflictId: 'ID conflict', conflictOrder: 'Order conflict', conflictKey: 'Key conflict', conflictStyle: 'Style risk',
      conflictIdHint: 'duplicate id in one slot; the later entry is shadowed',
      conflictOrderHint: 'duplicate order in sidebar.panellist; display order is ambiguous',
      conflictKeyHint: 'same key claimed twice; the later entry is shadowed',
      conflictStyleHint: 'untagged styles / css key owned by several plugins',
      noConflicts: 'No conflicts found — slot and style ownership are clean',
      conflictsUnavailable: 'Conflict analysis unavailable',
      slotsMissing: 'ctx.slots.snapshot() is unavailable',
      chunkError: 'Failed to load the conflict analysis module',
      analyzedAt: 'Analyzed', involved: 'Involved', suggestion: 'Suggestion',
      winner: 'winner', shadowed: 'shadowed', untaggedStyles: 'untagged style tag(s)',
      orderTableTitle: 'sidebar.panellist order occupancy',
      orderTableHint: 'All registered panels sorted by order; duplicates highlighted. Pick a free value for new panels.',
      registrantCfHint: 'Registrant "cf" = framework default (the plugin did not declare registrant); use the ID column.',
      colOrder: 'Order', colId: 'ID', colRegistrant: 'Registrant', colActive: 'Rendering',
      activeYes: 'yes', activeNo: 'no',
      styleInventoryTitle: 'Style inventory',
      styleInventoryHint: 'claimStyles contract: a style without data-plugin is claimed by the next materializing plugin and may be removed by its HMR.',
      styleTotal: 'style tags', styleTagged: 'tagged', styleUntagged: 'untagged',
      styleByPlugin: 'By plugin', styleCssKeys: 'CSS key ownership',
      conflictBadge: 'Conflict',
      tabCompat: 'Compatibility', tabHistory: 'Install history',
      compatSubtitle: 'peerDependencies vs installed versions · zero-dep semver (cross-validated against node-semver)',
      historySubtitle: 'Install-operation timeline · data footprint (report-only; clean up via Storage Doctor)',
      cordisRuntime: 'cordis runtime version',
      compatSatisfied: 'Satisfied', compatMismatch: 'Mismatch', compatMissing: 'Not installed',
      compatWorkspace: 'Workspace', compatUnknown: 'Unknown', compatOptional: 'Optional missing', compatNoPeers: 'No peers',
      compatSatisfiedHint: 'declared range is satisfied', compatMismatchHint: 'version conflict, needs attention',
      compatMissingHint: 'peer not independently installed (may be provided by the runtime)', compatWorkspaceHint: 'pnpm workspace protocol, not a version constraint',
      compatPlugins: 'Plugins', compatWithPeers: 'With peers',
      peerRange: 'Declared range', peerInstalled: 'Installed', peerStatus: 'Verdict',
      compatEmpty: 'No plugins to analyze',
      historyOps: 'Operations', historyFootprint: 'Data footprint',
      historyEmpty: 'No install-operation logs yet',
      opAdd: 'add', opRemove: 'remove', opDuration: 'Duration', opDelta: 'Package delta', opWarnings: 'Warnings',
      footprintHint: 'Read-only report; nothing is cleaned here. Use Storage Doctor to clean plugin data.',
      footprintName: 'Directory / file', footprintSize: 'Size', footprintFiles: 'Files', footprintTruncated: 'truncated',
      dataUnavailable: 'Failed to load data',
      tabAudit: 'Audit',
      auditSubtitle: 'Safe disable / restore (quadruple protection) · audit trail · report export',
      exportReport: 'Export report',
      actionPanelTitle: 'Safe actions',
      safetyNote: 'Disable only removes the bundles entry (dependency and files preserved); automatic backup, atomic write, explicit confirm required; one-click restore. Never touches node_modules, credentials, or other plugins\u2019 data.',
      actionTarget: 'Target plugin', selectPlaceholder: 'Select a plugin\u2026',
      actionConfirmLabel: 'Confirm phrase', actionConfirmPlaceholder: 'Type DISABLE to disable \u00b7 RESTORE to restore',
      disableBtn: 'Disable', restoreBtn: 'Restore',
      confirmMismatch: 'Confirm phrase does not match',
      actionSuccess: 'Action succeeded', actionFailed: 'Action failed',
      auditTrail: 'Audit trail', auditEmpty: 'No actions recorded yet',
      auditTime: 'Time', auditKind: 'Kind', auditTarget: 'Target', auditBackup: 'Backup',
      auditKindDisable: 'disable', auditKindRestore: 'restore',
      hmrHint: 'Manifest edits may hot-apply via HMR; restart the app if not effective.',
    },
  }

  function localeKey() {
    const language = document.documentElement.lang || navigator.language || 'en'
    return language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
  }

  const STATUS_ORDER = ['failed', 'broken', 'pending', 'unloading', 'unknown', 'disabled', 'dormant', 'healthy']

  const STYLE = `
  .pd-page, .pd-page * { box-sizing: border-box; }
  .pd-page {
    height:100%; min-width:0; min-height:0; overflow:auto;
    padding:calc(26px + var(--dsh-frame-top-clearance, 0px)) 28px 48px;
    background:var(--dsw-alias-bg-base); color:var(--dsw-alias-label-primary); font-family:var(--dsw-font-family, inherit);
  }
  .pd-shell { width:min(1280px, 100%); margin:0 auto; }
  .pd-head { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; margin-bottom:20px; }
  .pd-title { margin:0; font-size:28px; line-height:1.2; letter-spacing:-.02em; }
  .pd-subtitle { margin:8px 0 0; color:var(--dsw-alias-label-secondary); font-size:13px; }
  .pd-stamp { display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-top:9px; color:var(--dsw-alias-label-tertiary); font-size:10px; }
  .pd-stamp b { color:var(--dsw-alias-label-secondary); font-weight:600; }
  .pd-stamp[data-errors='true'] b { color:var(--dsw-alias-state-error); }
  .pd-actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; }
  .pd-button { min-height:36px; padding:0 13px; border:0.5px solid var(--dsw-alias-border-l2); border-radius:var(--dsw-radius-md, 10px); background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); cursor:pointer; font:inherit; font-size:12px; font-weight:600; transition:background .12s ease, transform .12s ease; }
  .pd-button:hover { background:var(--dsw-alias-interactive-hover); }
  .pd-button:active { transform:scale(.97); }
  .pd-button:disabled { cursor:not-allowed; opacity:.55; }
  .pd-summary { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:10px; margin-bottom:18px; }
  .pd-tile { min-width:0; padding:12px 14px; border:0.5px solid var(--dsw-alias-border-l3); border-radius:var(--dsw-radius-lg, 14px); background:var(--dsw-alias-bg-layer-1); cursor:pointer; text-align:left; font:inherit; color:inherit; transition:border-color .15s ease, transform .15s ease; }
  .pd-tile:hover { border-color:color-mix(in srgb, var(--pd-tile-color, var(--dsw-alias-brand-primary)) 45%, var(--dsw-alias-border-l3)); transform:translateY(-1px); }
  .pd-tile[data-active='true'] { border-color:var(--pd-tile-color, var(--dsw-alias-brand-primary)); box-shadow:0 0 0 1px var(--pd-tile-color, var(--dsw-alias-brand-primary)); }
  .pd-tile__label { display:flex; align-items:center; gap:6px; color:var(--dsw-alias-label-secondary); font-size:11px; font-weight:600; }
  .pd-tile__label i { width:7px; height:7px; border-radius:2px; background:var(--pd-tile-color, var(--dsw-alias-brand-primary)); }
  .pd-tile__value { margin-top:6px; font-size:22px; font-weight:720; letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
  .pd-tile__hint { margin-top:4px; color:var(--dsw-alias-label-tertiary); font-size:10px; line-height:1.4; }
  .pd-tile--total { cursor:default; }
  .pd-tile--total:hover { transform:none; border-color:var(--dsw-alias-border-l3); }
  .pd-group { margin-bottom:20px; }
  .pd-group__head { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
  .pd-group__title { margin:0; font-size:14px; font-weight:700; }
  .pd-group__count { color:var(--dsw-alias-label-tertiary); font-size:11px; font-variant-numeric:tabular-nums; }
  .pd-cards { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:10px; }
  .pd-card { min-width:0; padding:14px 15px; border:0.5px solid var(--dsw-alias-border-l3); border-left:3px solid var(--pd-status-color, var(--dsw-alias-border-l3)); border-radius:var(--dsw-radius-lg, 14px); background:var(--dsw-alias-bg-layer-1); }
  .pd-card__head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .pd-card__name { margin:0; overflow:hidden; font-size:13px; font-weight:700; text-overflow:ellipsis; white-space:nowrap; }
  .pd-badge { flex:none; display:inline-flex; align-items:center; gap:5px; padding:2px 8px; border-radius:99px; background:color-mix(in srgb, var(--pd-status-color, var(--dsw-alias-label-caption)) 14%, transparent); color:var(--pd-status-color, var(--dsw-alias-label-secondary)); font-size:10px; font-weight:700; }
  .pd-badge::before { width:6px; height:6px; border-radius:50%; background:currentColor; content:''; }
  .pd-card__meta { display:flex; flex-wrap:wrap; gap:6px 12px; margin-top:8px; color:var(--dsw-alias-label-tertiary); font-size:10px; }
  .pd-card__meta b { color:var(--dsw-alias-label-secondary); font-weight:600; }
  .pd-chips { display:flex; flex-wrap:wrap; gap:5px; margin-top:9px; }
  .pd-chip { padding:2px 7px; border-radius:6px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-secondary); font-size:10px; font-variant-numeric:tabular-nums; }
  .pd-chip[data-state='FAILED'] { background:color-mix(in srgb, var(--dsw-alias-state-error) 16%, transparent); color:var(--dsw-alias-state-error); }
  .pd-chip[data-state='PENDING'] { background:color-mix(in srgb, var(--dsw-alias-state-warn) 16%, transparent); color:var(--dsw-alias-state-warn); }
  .pd-chip[data-state='ACTIVE'] { background:color-mix(in srgb, var(--dsw-alias-state-success) 14%, transparent); color:var(--dsw-alias-state-success); }
  .pd-services { margin-top:9px; font-size:11px; color:var(--dsw-alias-label-secondary); }
  .pd-services code { padding:1px 5px; border-radius:5px; background:var(--dsw-alias-bg-layer-2); font-size:10px; }
  .pd-services code[data-missing='true'] { background:color-mix(in srgb, var(--dsw-alias-state-error) 16%, transparent); color:var(--dsw-alias-state-error); font-weight:700; }
  .pd-card__notes { margin:8px 0 0; color:var(--dsw-alias-label-tertiary); font-size:10px; line-height:1.5; }
  .pd-section { margin-top:14px; border:0.5px solid var(--dsw-alias-border-l3); border-radius:var(--dsw-radius-lg, 14px); background:var(--dsw-alias-bg-layer-1); }
  .pd-section > summary { padding:13px 15px; cursor:pointer; font-size:12px; font-weight:700; list-style:none; }
  .pd-section > summary::-webkit-details-marker { display:none; }
  .pd-section > summary::before { content:'▸ '; color:var(--dsw-alias-label-tertiary); }
  .pd-section[open] > summary::before { content:'▾ '; }
  .pd-section__hint { margin:0; padding:0 15px 10px; color:var(--dsw-alias-label-tertiary); font-size:10px; line-height:1.5; }
  .pd-table-wrap { overflow:auto; border-top:0.5px solid var(--dsw-alias-border-l4); }
  .pd-table { width:100%; border-collapse:collapse; font-size:11px; }
  .pd-table th { position:sticky; top:0; padding:8px 12px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-tertiary); font-weight:650; text-align:left; white-space:nowrap; }
  .pd-table td { padding:7px 12px; border-top:0.5px solid var(--dsw-alias-border-l4); color:var(--dsw-alias-label-secondary); font-variant-numeric:tabular-nums; }
  .pd-table td:first-child { color:var(--dsw-alias-label-primary); font-weight:600; }
  .pd-liblist { margin:0; padding:0 15px 13px; color:var(--dsw-alias-label-secondary); font-size:11px; line-height:1.8; list-style:none; }
  .pd-empty, .pd-error { display:grid; min-height:220px; padding:30px; place-items:center; color:var(--dsw-alias-label-tertiary); text-align:center; }
  .pd-error { color:var(--dsw-alias-state-error); }
  .pd-error__body { display:grid; gap:10px; justify-items:center; }
  .pd-foot { margin-top:18px; color:var(--dsw-alias-label-caption); font-size:10px; }
  .pd-filterbar { display:flex; align-items:center; gap:8px; margin-bottom:12px; color:var(--dsw-alias-label-tertiary); font-size:11px; }
  [data-status='failed'], [data-status='broken'] { --pd-status-color:var(--dsw-alias-state-error); }
  [data-status='pending'] { --pd-status-color:var(--dsw-alias-state-warn); }
  [data-status='healthy'] { --pd-status-color:var(--dsw-alias-state-success); }
  [data-status='unloading'] { --pd-status-color:var(--dsw-alias-state-business); }
  [data-status='dormant'], [data-status='disabled'], [data-status='unknown'] { --pd-status-color:var(--dsw-alias-label-caption); }
  .pd-tabs { display:flex; gap:6px; margin-bottom:16px; border-bottom:0.5px solid var(--dsw-alias-border-l3); }
  .pd-tab { padding:8px 14px; border:0; border-bottom:2px solid transparent; background:none; color:var(--dsw-alias-label-secondary); cursor:pointer; font:inherit; font-size:13px; font-weight:650; }
  .pd-tab:hover { color:var(--dsw-alias-label-primary); }
  .pd-tab[data-active='true'] { border-bottom-color:var(--dsw-alias-brand-primary); color:var(--dsw-alias-label-primary); }
  .pd-tab__count { margin-left:6px; padding:1px 7px; border-radius:99px; background:color-mix(in srgb, var(--dsw-alias-state-warn) 18%, transparent); color:var(--dsw-alias-state-warn); font-size:10px; font-weight:700; font-variant-numeric:tabular-nums; }
  .pd-conflict-summary { display:grid; grid-template-columns:repeat(5, minmax(0, 1fr)); gap:10px; margin-bottom:18px; }
  .pd-conflict { min-width:0; margin-bottom:10px; padding:14px 15px; border:0.5px solid var(--dsw-alias-border-l3); border-left:3px solid var(--dsw-alias-state-warn); border-radius:var(--dsw-radius-lg, 14px); background:var(--dsw-alias-bg-layer-1); }
  .pd-conflict__head { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
  .pd-conflict__type { display:inline-flex; align-items:center; gap:5px; padding:2px 8px; border-radius:99px; background:color-mix(in srgb, var(--dsw-alias-state-warn) 14%, transparent); color:var(--dsw-alias-state-warn); font-size:10px; font-weight:700; }
  .pd-conflict__type::before { width:6px; height:6px; border-radius:50%; background:currentColor; content:''; }
  .pd-conflict__where { color:var(--dsw-alias-label-primary); font-size:12px; font-weight:700; }
  .pd-conflict__where code { padding:1px 6px; border-radius:5px; background:var(--dsw-alias-bg-layer-2); font-size:11px; }
  .pd-conflict__message { margin:8px 0 0; color:var(--dsw-alias-label-secondary); font-size:11px; line-height:1.5; }
  .pd-conflict__suggestion { margin:6px 0 0; color:var(--dsw-alias-label-tertiary); font-size:10px; line-height:1.5; }
  .pd-conflict__suggestion b { color:var(--dsw-alias-label-secondary); }
  .pd-occupants { display:flex; flex-wrap:wrap; gap:5px; margin-top:9px; }
  .pd-occupant { padding:2px 8px; border-radius:6px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-secondary); font-size:10px; }
  .pd-occupant[data-active='true'] { background:color-mix(in srgb, var(--dsw-alias-state-success) 14%, transparent); color:var(--dsw-alias-state-success); font-weight:700; }
  .pd-occupant[data-active='false'] { background:color-mix(in srgb, var(--dsw-alias-state-warn) 14%, transparent); color:var(--dsw-alias-state-warn); }
  .pd-table tr[data-duplicate='true'] td { background:color-mix(in srgb, var(--dsw-alias-state-warn) 10%, transparent); }
  .pd-table tr[data-duplicate='true'] td:first-child { color:var(--dsw-alias-state-warn); font-weight:700; }
  .pd-stylestats { display:flex; flex-wrap:wrap; gap:8px; padding:0 15px 12px; }
  .pd-stylestat { padding:6px 12px; border-radius:8px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-secondary); font-size:11px; }
  .pd-stylestat b { color:var(--dsw-alias-label-primary); font-variant-numeric:tabular-nums; }
  .pd-stylestat[data-warn='true'] b { color:var(--dsw-alias-state-warn); }
  .pd-conflict-chip { flex:none; padding:2px 8px; border-radius:99px; background:color-mix(in srgb, var(--dsw-alias-state-warn) 16%, transparent); color:var(--dsw-alias-state-warn); font-size:10px; font-weight:700; }
  .pd-cordis-banner { display:flex; align-items:center; gap:10px; margin-bottom:16px; padding:12px 15px; border:0.5px solid var(--dsw-alias-border-l3); border-radius:var(--dsw-radius-lg, 14px); background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-secondary); font-size:12px; }
  .pd-cordis-banner b { color:var(--dsw-alias-label-primary); font-size:14px; font-variant-numeric:tabular-nums; }
  .pd-compat-card { min-width:0; margin-bottom:10px; padding:13px 15px; border:0.5px solid var(--dsw-alias-border-l3); border-radius:var(--dsw-radius-lg, 14px); background:var(--dsw-alias-bg-layer-1); }
  .pd-compat-card[data-status='mismatch'] { border-left:3px solid var(--dsw-alias-state-warn); }
  .pd-compat-card__head { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-bottom:8px; }
  .pd-compat-card__name { margin:0; font-size:13px; font-weight:700; color:var(--dsw-alias-label-primary); overflow-wrap:anywhere; }
  .pd-compat-card__ver { color:var(--dsw-alias-label-tertiary); font-size:10px; }
  .pd-peer { display:grid; grid-template-columns:minmax(0,1.4fr) minmax(0,1.6fr) minmax(0,0.8fr) auto; gap:8px; align-items:center; padding:6px 0; border-top:0.5px solid var(--dsw-alias-border-l2); font-size:11px; }
  .pd-peer__name { color:var(--dsw-alias-label-primary); overflow-wrap:anywhere; }
  .pd-peer__range { color:var(--dsw-alias-label-secondary); font-family:ui-monospace,monospace; font-size:10px; overflow-wrap:anywhere; }
  .pd-peer__installed { color:var(--dsw-alias-label-secondary); font-variant-numeric:tabular-nums; }
  .pd-peer__note { grid-column:1 / -1; margin:2px 0 0; color:var(--dsw-alias-label-tertiary); font-size:10px; line-height:1.4; }
  .pd-pill { display:inline-flex; align-items:center; gap:5px; padding:2px 8px; border-radius:99px; font-size:10px; font-weight:700; white-space:nowrap; }
  .pd-pill::before { width:6px; height:6px; border-radius:50%; background:currentColor; content:''; }
  .pd-pill[data-status='satisfied'] { background:color-mix(in srgb, var(--dsw-alias-state-success) 14%, transparent); color:var(--dsw-alias-state-success); }
  .pd-pill[data-status='mismatch'] { background:color-mix(in srgb, var(--dsw-alias-state-warn) 16%, transparent); color:var(--dsw-alias-state-warn); }
  .pd-pill[data-status='missing'], .pd-pill[data-status='optional-missing'], .pd-pill[data-status='workspace'], .pd-pill[data-status='unknown'], .pd-pill[data-status='no-peers'] { background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-tertiary); }
  .pd-timeline { list-style:none; margin:0; padding:0; }
  .pd-op { padding:12px 15px; border:0.5px solid var(--dsw-alias-border-l3); border-radius:var(--dsw-radius-lg, 14px); background:var(--dsw-alias-bg-layer-1); margin-bottom:8px; }
  .pd-op__head { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
  .pd-op__time { color:var(--dsw-alias-label-primary); font-size:12px; font-weight:700; font-variant-numeric:tabular-nums; }
  .pd-op__id { color:var(--dsw-alias-label-tertiary); font-size:10px; font-family:ui-monospace,monospace; }
  .pd-op__meta { margin-left:auto; display:flex; gap:8px; color:var(--dsw-alias-label-tertiary); font-size:10px; }
  .pd-op__pkgs { display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }
  .pd-op__pkg { padding:2px 8px; border-radius:6px; font-size:10px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-secondary); }
  .pd-op__pkg[data-action='add'] { background:color-mix(in srgb, var(--dsw-alias-state-success) 12%, transparent); color:var(--dsw-alias-state-success); }
  .pd-op__pkg[data-action='remove'] { background:color-mix(in srgb, var(--dsw-alias-state-warn) 12%, transparent); color:var(--dsw-alias-state-warn); }
  .pd-op__warn { margin:6px 0 0; color:var(--dsw-alias-state-warn); font-size:10px; }
  .pd-footprint-row { display:grid; grid-template-columns:minmax(0,1.6fr) minmax(0,1fr) auto; gap:10px; align-items:center; padding:7px 15px; border-top:0.5px solid var(--dsw-alias-border-l2); font-size:11px; }
  .pd-footprint-row__name { color:var(--dsw-alias-label-primary); overflow-wrap:anywhere; }
  .pd-footprint-bar { height:8px; border-radius:99px; background:var(--dsw-alias-bg-layer-2); overflow:hidden; }
  .pd-footprint-bar__fill { height:100%; border-radius:99px; background:var(--dsw-alias-brand-primary); }
  .pd-footprint-row__size { color:var(--dsw-alias-label-secondary); font-variant-numeric:tabular-nums; white-space:nowrap; }
  .pd-action-panel { padding:15px; border:0.5px solid var(--dsw-alias-border-l3); border-radius:var(--dsw-radius-lg, 14px); background:var(--dsw-alias-bg-layer-1); margin-bottom:16px; }
  .pd-action-panel__title { margin:0 0 8px; font-size:13px; font-weight:700; color:var(--dsw-alias-label-primary); }
  .pd-action-panel__note { margin:0 0 12px; color:var(--dsw-alias-label-tertiary); font-size:11px; line-height:1.5; }
  .pd-action-row { display:flex; flex-wrap:wrap; gap:10px; align-items:flex-end; }
  .pd-field { display:flex; flex-direction:column; gap:4px; }
  .pd-field__label { color:var(--dsw-alias-label-secondary); font-size:10px; font-weight:600; }
  .pd-select, .pd-input { padding:7px 10px; border:0.5px solid var(--dsw-alias-border-l3); border-radius:var(--dsw-radius-md, 9px); background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); font-size:12px; min-width:220px; }
  .pd-input { font-family:ui-monospace,monospace; }
  .pd-button--danger { background:color-mix(in srgb, var(--dsw-alias-state-warn) 16%, transparent); color:var(--dsw-alias-state-warn); border-color:color-mix(in srgb, var(--dsw-alias-state-warn) 40%, transparent); }
  .pd-button--danger:disabled { opacity:0.45; }
  .pd-action-msg { margin:10px 0 0; font-size:11px; }
  .pd-action-msg[data-ok='true'] { color:var(--dsw-alias-state-success); }
  .pd-action-msg[data-ok='false'] { color:var(--dsw-alias-state-warn); }
  .pd-audit-table { width:100%; border-collapse:collapse; font-size:11px; }
  .pd-audit-table th { text-align:left; padding:7px 10px; color:var(--dsw-alias-label-tertiary); font-weight:600; border-bottom:0.5px solid var(--dsw-alias-border-l3); }
  .pd-audit-table td { padding:7px 10px; border-bottom:0.5px solid var(--dsw-alias-border-l2); color:var(--dsw-alias-label-secondary); overflow-wrap:anywhere; }
  .pd-audit-kind { display:inline-flex; padding:1px 7px; border-radius:99px; font-size:10px; font-weight:700; }
  .pd-audit-kind[data-kind='disable'] { background:color-mix(in srgb, var(--dsw-alias-state-warn) 14%, transparent); color:var(--dsw-alias-state-warn); }
  .pd-audit-kind[data-kind='restore'] { background:color-mix(in srgb, var(--dsw-alias-state-success) 14%, transparent); color:var(--dsw-alias-state-success); }
  @media (max-width:1100px) { .pd-summary { grid-template-columns:repeat(2, minmax(0, 1fr)); } .pd-cards { grid-template-columns:1fr; } .pd-conflict-summary { grid-template-columns:repeat(3, minmax(0, 1fr)); } }
  @media (max-width:680px) { .pd-page { padding-left:14px; padding-right:14px; } .pd-head { display:grid; } .pd-actions { justify-content:flex-start; } .pd-summary { grid-template-columns:1fr 1fr; gap:8px; } .pd-conflict-summary { grid-template-columns:1fr 1fr; gap:8px; } }
  @media (prefers-reduced-motion: reduce) { .pd-tile, .pd-button { transition:none; } }
  `

  window.__ModuleLoader__.load({
    id: PACKAGE_ID,
    factory(require) {
      const React = require('react')
      const { useCallback, useEffect, useMemo, useRef, useState } = React
      const h = React.createElement

      function tcopy() { return COPY[localeKey()] }

      function clock(value) {
        if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
        return new Intl.DateTimeFormat(localeKey() === 'zh' ? 'zh-CN' : 'en-US', {
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        }).format(new Date(value))
      }

      function Icon({ size = 20 }) {
        return h('svg', {
          width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
          stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true',
        },
        h('path', { d: 'M6 3v5a4 4 0 0 0 8 0V3' }),
        h('path', { d: 'M10 12v3a5 5 0 0 0 10 0v-2' }),
        h('circle', { cx: 20, cy: 10, r: 2 }))
      }

      function StatusBadge({ status }) {
        const c = tcopy()
        return h('span', { className: 'pd-badge', 'data-status': status }, c[status] ?? status)
      }

      function SummaryBar({ summary, filter, onFilter }) {
        const c = tcopy()
        const tiles = STATUS_ORDER.map(status => h('button', {
          key: status,
          type: 'button',
          className: 'pd-tile',
          'data-status': status,
          'data-active': filter === status ? 'true' : 'false',
          style: { '--pd-tile-color': `var(--pd-status-color)` },
          onClick: () => onFilter(filter === status ? null : status),
          title: c[`${status}Hint`],
        },
        h('span', { className: 'pd-tile__label' }, h('i'), c[status]),
        h('span', { className: 'pd-tile__value' }, summary?.[status] ?? 0),
        h('span', { className: 'pd-tile__hint' }, c[`${status}Hint`])))
        return h('div', { className: 'pd-summary' },
          h('div', { className: 'pd-tile pd-tile--total' },
            h('span', { className: 'pd-tile__label' }, c.total),
            h('span', { className: 'pd-tile__value' }, summary?.total ?? 0),
            h('span', { className: 'pd-tile__hint' }, `${c.libraries}: ${summary?.libraries ?? 0}`)),
          ...tiles)
      }

      const FIBER_CHIP_LIMIT = 12

      function FiberChips({ row }) {
        const c = tcopy()
        const fibers = row.fibers ?? []
        if (fibers.length === 0) {
          return h('div', { className: 'pd-chips' }, h('span', { className: 'pd-chip' }, c.noFibers))
        }
        // Container bundles can aggregate dozens of fibers; cap the chips and
        // summarize the rest so the card stays readable.
        const shown = fibers.slice(0, FIBER_CHIP_LIMIT)
        const rest = fibers.length - shown.length
        return h('div', { className: 'pd-chips' },
          shown.map((fiber, index) => h('span', {
            key: `${fiber.uid}-${index}`,
            className: 'pd-chip',
            'data-state': fiber.stateName,
          }, `#${fiber.uid ?? '—'} ${fiber.stateName}`)),
          rest > 0 ? h('span', { className: 'pd-chip', title: `${fibers.length} fibers` }, `+${rest}`) : null)
      }

      function PluginCard({ row, conflicted }) {
        const c = tcopy()
        const missing = Array.isArray(row.missingServices) ? row.missingServices : []
        return h('article', { className: 'pd-card', 'data-status': row.status },
          h('div', { className: 'pd-card__head' },
            h('h3', { className: 'pd-card__name', title: row.package }, row.package),
            h('span', { style: { display: 'inline-flex', gap: '6px', alignItems: 'center' } },
              conflicted ? h('span', { className: 'pd-conflict-chip' }, c.conflictBadge) : null,
              h(StatusBadge, { status: row.status }))),
          h('div', { className: 'pd-card__meta' },
            row.version ? h('span', null, c.version, ' ', h('b', null, row.version)) : null,
            row.source ? h('span', { title: row.source }, c.source, ' ', h('b', null, row.source.length > 48 ? `${row.source.slice(0, 48)}…` : row.source)) : null,
            row.shipped ? h('span', null, h('b', null, c.shipped)) : null,
            row.component ? h('span', null, h('b', null, c.componentBadge)) : null,
            row.contributedRows > 0 ? h('span', null, c.container, ' · ', c.contributedRows, ' ', h('b', null, row.contributedRows)) : null,
            row.entries?.length ? h('span', null, c.entries, ' ', h('b', null, row.entries.map(entry => entry.id).join(', '))) : null),
          h(FiberChips, { row }),
          row.requiredServices?.length ? h('div', { className: 'pd-services' },
            c.requiredServices, ': ',
            row.requiredServices.map(name => h('code', { key: name, 'data-missing': missing.includes(name) ? 'true' : 'false' }, name)),
            missing.length ? h('span', null, `  (${c.missingServices}: ${missing.join(', ')})`) : null) : null,
          row.notes?.length ? h('p', { className: 'pd-card__notes' }, row.notes.join(' · ')) : null)
      }

      function RuntimeTable({ runtimes }) {
        const c = tcopy()
        return h('details', { className: 'pd-section' },
          h('summary', null, c.runtimesTitle, ` (${runtimes.length})`),
          h('p', { className: 'pd-section__hint' }, c.runtimesHint),
          h('div', { className: 'pd-table-wrap' },
            h('table', { className: 'pd-table' },
              h('thead', null, h('tr', null,
                h('th', null, c.runtimeName), h('th', null, c.runtimePackage),
                h('th', null, c.runtimeFibers), h('th', null, c.runtimeStates))),
              h('tbody', null, runtimes.map((runtime, index) => {
                const pkg = runtime.fibers?.find(fiber => fiber.packageName)?.packageName ?? '—'
                const states = (runtime.fibers ?? []).map(fiber => fiber.stateName).join(', ') || '—'
                return h('tr', { key: `${runtime.name}-${index}` },
                  h('td', null, runtime.unnamed ? c.unnamed : runtime.name),
                  h('td', null, pkg),
                  h('td', null, runtime.fibers?.length ?? 0),
                  h('td', null, states))
              })))))
      }

      function LibraryList({ libraries }) {
        const c = tcopy()
        if (!libraries?.length) return null
        return h('details', { className: 'pd-section' },
          h('summary', null, c.librariesTitle, ` (${libraries.length})`),
          h('p', { className: 'pd-section__hint' }, c.librariesHint),
          h('ul', { className: 'pd-liblist' },
            libraries.map(item => h('li', { key: item.package }, item.package, item.version ? ` @ ${item.version}` : ''))))
      }

      const CONFLICT_TYPE_COPY = { id: 'conflictId', order: 'conflictOrder', key: 'conflictKey', style: 'conflictStyle' }

      function ConflictCard({ conflict }) {
        const c = tcopy()
        const where = conflict.slot
          ? h('span', { className: 'pd-conflict__where' },
            h('code', null, conflict.slot),
            conflict.id !== undefined ? h('span', null, ' · id ', h('code', null, conflict.id)) : null,
            conflict.key !== undefined ? h('span', null, ' · key ', h('code', null, conflict.key)) : null,
            conflict.order !== undefined ? h('span', null, ' · order ', h('code', null, conflict.order)) : null)
          : conflict.cssKey !== undefined
            ? h('span', { className: 'pd-conflict__where' }, 'css ', h('code', null, conflict.cssKey))
            : h('span', { className: 'pd-conflict__where' }, c.untaggedStyles, ' × ', conflict.untagged)
        const occupants = conflict.occupants ?? []
        return h('article', { className: 'pd-conflict' },
          h('div', { className: 'pd-conflict__head' },
            h('span', { className: 'pd-conflict__type' }, c[CONFLICT_TYPE_COPY[conflict.type]] ?? conflict.type),
            where),
          occupants.length ? h('div', { className: 'pd-occupants' },
            occupants.map((occupant, index) => h('span', {
              key: `${occupant.registrant ?? 'unknown'}-${index}`,
              className: 'pd-occupant',
              'data-active': occupant.active ? 'true' : 'false',
              title: occupant.active ? c.winner : c.shadowed,
            }, occupant.registrant ?? '(unknown)', occupant.active ? ` · ${c.winner}` : ` · ${c.shadowed}`))) : null,
          !occupants.length && conflict.registrants?.length ? h('div', { className: 'pd-occupants' },
            conflict.registrants.map(name => h('span', { key: name, className: 'pd-occupant' }, name))) : null,
          h('p', { className: 'pd-conflict__message' }, conflict.message),
          h('p', { className: 'pd-conflict__suggestion' }, h('b', null, c.suggestion, ': '), conflict.suggestion))
      }

      function OrderTable({ rows }) {
        const c = tcopy()
        const counts = new Map()
        for (const row of rows) {
          if (row.order !== null) counts.set(row.order, (counts.get(row.order) ?? 0) + 1)
        }
        const hasCf = rows.some(row => row.registrant === 'cf')
        return h('details', { className: 'pd-section', open: true },
          h('summary', null, c.orderTableTitle, ` (${rows.length})`),
          h('p', { className: 'pd-section__hint' }, c.orderTableHint),
          hasCf ? h('p', { className: 'pd-section__hint' }, c.registrantCfHint) : null,
          h('div', { className: 'pd-table-wrap' },
            h('table', { className: 'pd-table' },
              h('thead', null, h('tr', null,
                h('th', null, c.colOrder), h('th', null, c.colId),
                h('th', null, c.colRegistrant), h('th', null, c.colActive))),
              h('tbody', null, rows.map((row, index) => h('tr', {
                key: `${row.id ?? 'row'}-${index}`,
                'data-duplicate': row.order !== null && (counts.get(row.order) ?? 0) > 1 ? 'true' : 'false',
              },
              h('td', null, row.order ?? '—'),
              h('td', null, row.id ?? '—'),
              h('td', null, row.registrant ?? '(unknown)'),
              h('td', null, row.active ? c.activeYes : c.activeNo)))))))
      }

      function StyleInventory({ inventory }) {
        const c = tcopy()
        return h('details', { className: 'pd-section' },
          h('summary', null, c.styleInventoryTitle, ` (${inventory.total})`),
          h('p', { className: 'pd-section__hint' }, c.styleInventoryHint),
          h('div', { className: 'pd-stylestats' },
            h('span', { className: 'pd-stylestat' }, c.styleTotal, ' ', h('b', null, inventory.total)),
            h('span', { className: 'pd-stylestat' }, c.styleTagged, ' ', h('b', null, inventory.tagged)),
            h('span', { className: 'pd-stylestat', 'data-warn': inventory.untagged > 0 ? 'true' : 'false' }, c.styleUntagged, ' ', h('b', null, inventory.untagged))),
          h('div', { className: 'pd-table-wrap' },
            h('table', { className: 'pd-table' },
              h('thead', null, h('tr', null, h('th', null, c.styleByPlugin), h('th', null, c.styleTagged))),
              h('tbody', null, inventory.byPlugin.map(row => h('tr', { key: row.plugin },
                h('td', null, row.plugin), h('td', null, row.count)))))))
      }

      function ConflictsView({ state }) {
        const c = tcopy()
        if (state.error) {
          return h('div', { className: 'pd-error' }, h('div', { className: 'pd-error__body' },
            h('div', null, `${c.conflictsUnavailable}: ${state.error}`)))
        }
        if (!state.report) return h('div', { className: 'pd-empty' }, c.refreshing)
        const report = state.report
        const tiles = ['id', 'order', 'key', 'style'].map(type => h('div', { key: type, className: 'pd-tile pd-tile--total' },
          h('span', { className: 'pd-tile__label' }, c[CONFLICT_TYPE_COPY[type]]),
          h('span', { className: 'pd-tile__value' }, report.summary[type]),
          h('span', { className: 'pd-tile__hint' }, c[`${CONFLICT_TYPE_COPY[type]}Hint`])))
        return h('div', null,
          h('div', { className: 'pd-conflict-summary' },
            h('div', { className: 'pd-tile pd-tile--total' },
              h('span', { className: 'pd-tile__label' }, c.tabConflicts),
              h('span', { className: 'pd-tile__value' }, report.summary.total),
              h('span', { className: 'pd-tile__hint' }, `${c.analyzedAt} ${clock(state.at)}`)),
            ...tiles),
          report.conflicts.length === 0
            ? h('div', { className: 'pd-empty' }, c.noConflicts)
            : report.conflicts.map((conflict, index) => h(ConflictCard, { key: `${conflict.type}-${index}`, conflict })),
          h(OrderTable, { rows: report.orderTable }),
          h(StyleInventory, { inventory: report.styleInventory }))
      }

      function formatBytes(bytes) {
        if (typeof bytes !== 'number' || !Number.isFinite(bytes)) return '—'
        if (bytes < 1024) return `${bytes} B`
        const units = ['KB', 'MB', 'GB', 'TB', 'PB']
        let value = bytes; let unit = -1
        do { value /= 1024; unit += 1 } while (value >= 1024 && unit < units.length - 1)
        return `${value.toFixed(1)} ${units[unit]}`
      }

      const PEER_STATUS_COPY = {
        satisfied: 'compatSatisfied', mismatch: 'compatMismatch', missing: 'compatMissing',
        'optional-missing': 'compatOptional', workspace: 'compatWorkspace', unknown: 'compatUnknown', 'no-peers': 'compatNoPeers',
      }

      function PeerRow({ peer }) {
        const c = tcopy()
        return h('div', { className: 'pd-peer' },
          h('span', { className: 'pd-peer__name', title: peer.name }, peer.name),
          h('span', { className: 'pd-peer__range', title: c.peerRange }, peer.range),
          h('span', { className: 'pd-peer__installed', title: c.peerInstalled }, peer.installed ?? '—'),
          h('span', { className: 'pd-pill', 'data-status': peer.status }, c[PEER_STATUS_COPY[peer.status]] ?? peer.status),
          peer.note ? h('p', { className: 'pd-peer__note' }, peer.note) : null)
      }

      function CompatView({ state }) {
        const c = tcopy()
        if (state.error) {
          return h('div', { className: 'pd-error' }, h('div', { className: 'pd-error__body' }, `${c.dataUnavailable}: ${state.error}`))
        }
        if (!state.data) return h('div', { className: 'pd-empty' }, c.refreshing)
        const data = state.data
        const summary = data.summary
        const rank = { mismatch: 0, missing: 1, unknown: 2, satisfied: 3, workspace: 4, 'optional-missing': 4, 'no-peers': 5 }
        const withPeers = data.rows
          .filter(row => row.peers.length > 0)
          .sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9))
        const noPeers = data.rows.length - withPeers.length
        const tiles = [
          ['compatSatisfied', summary.satisfied, 'compatSatisfiedHint'],
          ['compatMismatch', summary.mismatch, 'compatMismatchHint'],
          ['compatMissing', summary.missing, 'compatMissingHint'],
          ['compatWorkspace', summary.workspace, 'compatWorkspaceHint'],
        ].map(([label, value, hint]) => h('div', { key: label, className: 'pd-tile pd-tile--total' },
          h('span', { className: 'pd-tile__label' }, c[label]),
          h('span', { className: 'pd-tile__value' }, value),
          h('span', { className: 'pd-tile__hint' }, c[hint])))
        return h('div', null,
          h('div', { className: 'pd-cordis-banner' }, c.cordisRuntime, ' ', h('b', null, data.cordisVersion ?? '—'),
            h('span', { style: { marginLeft: 'auto' } }, `${c.compatPlugins} ${summary.plugins} · ${c.compatWithPeers} ${summary.withPeers}`)),
          h('div', { className: 'pd-conflict-summary' }, ...tiles),
          withPeers.length === 0
            ? h('div', { className: 'pd-empty' }, c.compatEmpty)
            : withPeers.map(row => h('article', { key: row.package, className: 'pd-compat-card', 'data-status': row.status },
              h('div', { className: 'pd-compat-card__head' },
                h('h3', { className: 'pd-compat-card__name' }, row.package),
                row.version ? h('span', { className: 'pd-compat-card__ver' }, 'v', row.version) : null,
                h('span', { className: 'pd-pill', 'data-status': row.status, style: { marginLeft: 'auto' } }, c[PEER_STATUS_COPY[row.status]] ?? row.status)),
              row.peers.map(peer => h(PeerRow, { key: peer.name, peer })))),
          noPeers > 0 ? h('p', { className: 'pd-section__hint' }, `${noPeers} ${c.compatNoPeers}`) : null)
      }

      function HistoryView({ state }) {
        const c = tcopy()
        if (state.error) {
          return h('div', { className: 'pd-error' }, h('div', { className: 'pd-error__body' }, `${c.dataUnavailable}: ${state.error}`))
        }
        if (!state.data) return h('div', { className: 'pd-empty' }, c.refreshing)
        const data = state.data
        const totalBytes = data.footprint.reduce((sum, row) => sum + row.bytes, 0)
        const maxBytes = data.footprint.reduce((max, row) => Math.max(max, row.bytes), 1)
        return h('div', null,
          h('div', { className: 'pd-conflict-summary' },
            h('div', { className: 'pd-tile pd-tile--total' },
              h('span', { className: 'pd-tile__label' }, c.historyOps),
              h('span', { className: 'pd-tile__value' }, data.totalOperations),
              h('span', { className: 'pd-tile__hint' }, data.logDir)),
            h('div', { className: 'pd-tile pd-tile--total' },
              h('span', { className: 'pd-tile__label' }, c.historyFootprint),
              h('span', { className: 'pd-tile__value' }, formatBytes(totalBytes)),
              h('span', { className: 'pd-tile__hint' }, c.footprintHint))),
          h('details', { className: 'pd-section', open: true },
            h('summary', null, c.historyOps, ` (${data.timeline.length})`),
            data.timeline.length === 0
              ? h('div', { className: 'pd-empty' }, c.historyEmpty)
              : h('ul', { className: 'pd-timeline' }, data.timeline.map(op => h('li', { key: op.id, className: 'pd-op' },
                h('div', { className: 'pd-op__head' },
                  h('span', { className: 'pd-op__time' }, op.at ? new Date(op.at).toLocaleString() : '—'),
                  h('span', { className: 'pd-op__id' }, op.id),
                  h('span', { className: 'pd-op__meta' },
                    op.durationMs !== null ? h('span', null, c.opDuration, ' ', (op.durationMs / 1000).toFixed(1), 's') : null,
                    op.packageDelta !== null ? h('span', null, c.opDelta, ' ', op.packageDelta > 0 ? `+${op.packageDelta}` : op.packageDelta) : null)),
                op.packages.length ? h('div', { className: 'pd-op__pkgs' },
                  op.packages.map((pkg, index) => h('span', { key: `${pkg.name}-${index}`, className: 'pd-op__pkg', 'data-action': pkg.action, title: pkg.source ?? '' },
                    `${pkg.action === 'add' ? '+' : '−'} ${pkg.name}`))) : null,
                op.warnings.length ? h('p', { className: 'pd-op__warn' }, c.opWarnings, ': ', op.warnings.join(' · ')) : null)))),
          h('details', { className: 'pd-section', open: true },
            h('summary', null, c.historyFootprint, ` (${formatBytes(totalBytes)})`),
            h('p', { className: 'pd-section__hint' }, c.footprintHint),
            h('div', null, data.footprint.map(row => h('div', { key: row.name, className: 'pd-footprint-row' },
              h('span', { className: 'pd-footprint-row__name' }, row.name, row.truncated ? ` (${c.footprintTruncated})` : ''),
              h('span', { className: 'pd-footprint-bar' }, h('span', { className: 'pd-footprint-bar__fill', style: { width: `${Math.max(2, (row.bytes / maxBytes) * 100)}%` } })),
              h('span', { className: 'pd-footprint-row__size' }, formatBytes(row.bytes), ' · ', row.files, ' ', c.footprintFiles))))))
      }

      function AuditView({ state, packages, actionState, onAction, onExport }) {
        const c = tcopy()
        const [target, setTarget] = useState('')
        const [confirm, setConfirm] = useState('')
        const canDisable = Boolean(target) && confirm === 'DISABLE' && !actionState.busy
        const canRestore = Boolean(target) && confirm === 'RESTORE' && !actionState.busy
        return h('div', null,
          h('div', { className: 'pd-action-panel' },
            h('h3', { className: 'pd-action-panel__title' }, c.actionPanelTitle),
            h('p', { className: 'pd-action-panel__note' }, c.safetyNote),
            h('div', { className: 'pd-action-row' },
              h('label', { className: 'pd-field' },
                h('span', { className: 'pd-field__label' }, c.actionTarget),
                h('select', { className: 'pd-select', value: target, onChange: event => setTarget(event.target.value) },
                  h('option', { value: '' }, c.selectPlaceholder),
                  packages.map(pkg => h('option', { key: pkg, value: pkg }, pkg)))),
              h('label', { className: 'pd-field' },
                h('span', { className: 'pd-field__label' }, c.actionConfirmLabel),
                h('input', { className: 'pd-input', value: confirm, placeholder: c.actionConfirmPlaceholder, onChange: event => setConfirm(event.target.value) })),
              h('button', { type: 'button', className: 'pd-button pd-button--danger', disabled: !canDisable, onClick: () => onAction('remove', target, confirm) }, c.disableBtn),
              h('button', { type: 'button', className: 'pd-button', disabled: !canRestore, onClick: () => onAction('add', target, confirm) }, c.restoreBtn),
              h('button', { type: 'button', className: 'pd-button', onClick: onExport }, c.exportReport)),
            actionState.message ? h('p', { className: 'pd-action-msg', 'data-ok': actionState.ok ? 'true' : 'false' }, actionState.message) : null,
            h('p', { className: 'pd-action-panel__note', style: { marginTop: '8px', marginBottom: 0 } }, c.hmrHint)),
          h('details', { className: 'pd-section', open: true },
            h('summary', null, c.auditTrail, state.data ? ` (${state.data.actions.length})` : ''),
            state.error
              ? h('div', { className: 'pd-error' }, h('div', { className: 'pd-error__body' }, `${c.dataUnavailable}: ${state.error}`))
              : !state.data ? h('div', { className: 'pd-empty' }, c.refreshing)
              : state.data.actions.length === 0 ? h('div', { className: 'pd-empty' }, c.auditEmpty)
              : h('table', { className: 'pd-audit-table' },
                h('thead', null, h('tr', null,
                  h('th', null, c.auditTime), h('th', null, c.auditKind), h('th', null, c.auditTarget), h('th', null, c.auditBackup))),
                h('tbody', null, state.data.actions.map(row => h('tr', { key: row.id },
                  h('td', null, row.at ? new Date(row.at).toLocaleString() : '—'),
                  h('td', null, h('span', { className: 'pd-audit-kind', 'data-kind': row.kind }, row.kind === 'disable' ? c.auditKindDisable : c.auditKindRestore)),
                  h('td', null, row.target),
                  h('td', null, row.detail?.backupPath ?? '—')))))))
      }

      function Page({ ctx, conflictsApi }) {
        const c = tcopy()
        const [tab, setTab] = useState('overview')
        const [conflictState, setConflictState] = useState({ report: null, at: null, error: null })
        const [compatState, setCompatState] = useState({ data: null, error: null })
        const [auditState, setAuditState] = useState({ data: null, error: null })
        const [actionState, setActionState] = useState({ busy: false, message: null, ok: false })
        const [historyState, setHistoryState] = useState({ data: null, error: null })
        const [data, setData] = useState(null)
        const [error, setError] = useState(null)
        const [loading, setLoading] = useState(false)
        const [filter, setFilter] = useState(null)
        const busyRef = useRef(false)

        const load = useCallback(async () => {
          if (busyRef.current) return
          busyRef.current = true
          setLoading(true)
          try {
            const response = await fetch(`${API}/overview`, { headers: { accept: 'application/json' } })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const payload = await response.json()
            setData(payload)
            setError(null)
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught))
          } finally {
            busyRef.current = false
            setLoading(false)
          }
        }, [])

        const loadConflicts = useCallback(() => {
          if (!conflictsApi) {
            setConflictState({ report: null, at: null, error: c.chunkError })
            return
          }
          try {
            const snapshot = typeof ctx?.slots?.snapshot === 'function' ? ctx.slots.snapshot() : null
            if (!Array.isArray(snapshot)) {
              setConflictState({ report: null, at: null, error: c.slotsMissing })
              return
            }
            const styles = Array.from(document.querySelectorAll('style')).map(el => ({
              plugin: el.getAttribute('data-plugin'),
              cssKey: el.getAttribute('data-plugin-css'),
            }))
            const report = conflictsApi.analyzeConflicts({ snapshot, styles })
            setConflictState({ report, at: Date.now(), error: null })
          } catch (caught) {
            setConflictState({ report: null, at: null, error: caught instanceof Error ? caught.message : String(caught) })
          }
        }, [conflictsApi, ctx])

        const loadCompat = useCallback(async () => {
          try {
            const response = await fetch(`${API}/compatibility`, { headers: { accept: 'application/json' } })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            setCompatState({ data: await response.json(), error: null })
          } catch (caught) {
            setCompatState(prev => ({ data: prev.data, error: caught instanceof Error ? caught.message : String(caught) }))
          }
        }, [])

        const loadHistory = useCallback(async () => {
          try {
            const response = await fetch(`${API}/history`, { headers: { accept: 'application/json' } })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            setHistoryState({ data: await response.json(), error: null })
          } catch (caught) {
            setHistoryState(prev => ({ data: prev.data, error: caught instanceof Error ? caught.message : String(caught) }))
          }
        }, [])

        const loadAudit = useCallback(async () => {
          try {
            const response = await fetch(`${API}/audit`, { headers: { accept: 'application/json' } })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            setAuditState({ data: await response.json(), error: null })
          } catch (caught) {
            setAuditState(prev => ({ data: prev.data, error: caught instanceof Error ? caught.message : String(caught) }))
          }
        }, [])

        const doAction = async (action, target, confirm) => {
          setActionState({ busy: true, message: null, ok: false })
          try {
            const route = action === 'remove' ? 'disable' : 'restore'
            const response = await fetch(`${API}/${route}`, {
              method: 'POST',
              headers: { 'content-type': 'application/json', accept: 'application/json' },
              body: JSON.stringify({ bundleId: target, confirm }),
            })
            const payload = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(payload?.error?.message ?? `HTTP ${response.status}`)
            setActionState({ busy: false, message: `${c.actionSuccess}: ${target}`, ok: true })
            void load()
            void loadAudit()
          } catch (caught) {
            setActionState({ busy: false, message: `${c.actionFailed}: ${caught instanceof Error ? caught.message : String(caught)}`, ok: false })
          }
        }

        const doExport = async () => {
          try {
            const response = await fetch(`${API}/export.json`, { headers: { accept: 'application/json' } })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const anchor = document.createElement('a')
            anchor.href = url
            anchor.download = 'plugin-doctor-export.json'
            document.body.append(anchor)
            anchor.click()
            anchor.remove()
            URL.revokeObjectURL(url)
            void loadAudit()
          } catch (caught) {
            setActionState({ busy: false, message: `${c.actionFailed}: ${caught instanceof Error ? caught.message : String(caught)}`, ok: false })
          }
        }

        useEffect(() => {
          void load()
          loadConflicts()
          void loadCompat()
          void loadHistory()
          void loadAudit()
          const timer = setInterval(() => {
            if (!document.hidden) {
              void load()
              loadConflicts()
              void loadCompat()
              void loadHistory()
              void loadAudit()
            }
          }, REFRESH_MS)
          return () => clearInterval(timer)
        }, [load, loadConflicts, loadCompat, loadHistory, loadAudit])

        const conflictRegistrants = useMemo(
          () => new Set(conflictState.report?.registrants ?? []),
          [conflictState.report])

        const groups = useMemo(() => {
          const plugins = data?.plugins ?? []
          return STATUS_ORDER
            .map(status => ({ status, rows: plugins.filter(row => row.status === status && (!filter || row.status === filter)) }))
            .filter(group => group.rows.length > 0)
        }, [data, filter])

        if (error && !data) {
          return h('main', { className: 'pd-page' }, h('div', { className: 'pd-shell' },
            h('div', { className: 'pd-error' }, h('div', { className: 'pd-error__body' },
              h('div', null, `${c.loadError}: ${error}`),
              h('button', { type: 'button', className: 'pd-button', onClick: () => void load() }, c.retry)))))
        }

        const refreshAll = () => { void load(); loadConflicts(); void loadCompat(); void loadHistory(); void loadAudit() }

        return h('main', { className: 'pd-page' }, h('div', { className: 'pd-shell' },
          h('header', { className: 'pd-head' },
            h('div', null,
              h('h1', { className: 'pd-title' }, c.title),
              h('p', { className: 'pd-subtitle' },
                tab === 'conflicts' ? c.conflictsSubtitle
                : tab === 'compatibility' ? c.compatSubtitle
                : tab === 'history' ? c.historySubtitle
                : tab === 'audit' ? c.auditSubtitle
                : c.subtitle),
              h('div', { className: 'pd-stamp', 'data-errors': (data?.liveErrorCount ?? 0) > 0 ? 'true' : 'false' },
                data ? h('span', null, c.updatedAt, ' ', h('b', null, clock(data.at))) : null,
                data ? h('span', null, c.profile, ' ', h('b', null, data.profile?.name ?? '—')) : null,
                data ? h('span', null, c.manifest, ' ', h('b', null, `${data.manifest?.dependencyCount ?? 0} ${c.deps} / ${data.manifest?.bundleCount ?? 0} ${c.bundles}`)) : null,
                (data?.liveErrorCount ?? 0) > 0 ? h('span', null, c.hostErrors, ' ', h('b', null, data.liveErrorCount)) : null)),
            h('div', { className: 'pd-actions' },
              h('button', { type: 'button', className: 'pd-button', onClick: doExport }, c.exportReport),
              h('button', { type: 'button', className: 'pd-button', onClick: refreshAll, disabled: loading },
                loading ? c.refreshing : c.refresh))),
          h('nav', { className: 'pd-tabs' },
            h('button', { type: 'button', className: 'pd-tab', 'data-active': tab === 'overview' ? 'true' : 'false', onClick: () => setTab('overview') }, c.tabOverview),
            h('button', { type: 'button', className: 'pd-tab', 'data-active': tab === 'conflicts' ? 'true' : 'false', onClick: () => { setTab('conflicts'); loadConflicts() } },
              c.tabConflicts,
              (conflictState.report?.summary.total ?? 0) > 0 ? h('span', { className: 'pd-tab__count' }, conflictState.report.summary.total) : null),
            h('button', { type: 'button', className: 'pd-tab', 'data-active': tab === 'compatibility' ? 'true' : 'false', onClick: () => { setTab('compatibility'); void loadCompat() } },
              c.tabCompat,
              (compatState.data?.summary.mismatch ?? 0) > 0 ? h('span', { className: 'pd-tab__count' }, compatState.data.summary.mismatch) : null),
            h('button', { type: 'button', className: 'pd-tab', 'data-active': tab === 'history' ? 'true' : 'false', onClick: () => { setTab('history'); void loadHistory() } }, c.tabHistory),
            h('button', { type: 'button', className: 'pd-tab', 'data-active': tab === 'audit' ? 'true' : 'false', onClick: () => { setTab('audit'); void loadAudit() } }, c.tabAudit)),
          tab === 'conflicts'
            ? h(ConflictsView, { state: conflictState })
            : tab === 'compatibility'
            ? h(CompatView, { state: compatState })
            : tab === 'history'
            ? h(HistoryView, { state: historyState })
            : tab === 'audit'
            ? h(AuditView, {
              state: auditState,
              packages: (data?.plugins ?? []).map(row => row.package).sort(),
              actionState,
              onAction: doAction,
              onExport: doExport,
            })
            : h('div', null,
              data ? h(SummaryBar, { summary: data.summary, filter, onFilter: setFilter }) : null,
              filter ? h('div', { className: 'pd-filterbar' },
                h(StatusBadge, { status: filter }),
                h('button', { type: 'button', className: 'pd-button', onClick: () => setFilter(null) }, c.filterClear)) : null,
              data && groups.length === 0 ? h('div', { className: 'pd-empty' }, filter ? c.groupEmpty : c.empty) : null,
              groups.map(group => h('section', { key: group.status, className: 'pd-group', 'data-status': group.status },
                h('div', { className: 'pd-group__head' },
                  h(StatusBadge, { status: group.status }),
                  h('h2', { className: 'pd-group__title' }, c[`${group.status}Hint`]),
                  h('span', { className: 'pd-group__count' }, group.rows.length)),
                h('div', { className: 'pd-cards' }, group.rows.map(row => h(PluginCard, { key: row.package, row, conflicted: conflictRegistrants.has(row.package) })) ))),
              data ? h(RuntimeTable, { runtimes: data.runtimes ?? [] }) : null,
              data ? h(LibraryList, { libraries: data.libraries }) : null,
              data ? h('footer', { className: 'pd-foot' },
                `${c.scanTook}: ${data.durationMs ?? 0} ms · registry + loader + manifest (read-only)`) : null)))
      }

      return {
        inject: ['slots', 'locale'],
        async apply(ctx) {
          // M2: pure conflict analysis lives in a package-local chunk, loaded
          // through the client module system (no host API involved). Failure
          // degrades the conflict page only; the health overview still works.
          let conflictsApi = null
          try {
            conflictsApi = await require.async('./client.conflicts.js')
          } catch {
            conflictsApi = null
          }
          ctx.effect(() => {
            const style = document.createElement('style')
            // Ownership declared up front (system.ts claimStyles contract):
            // untagged styles are adopted by whichever plugin materializes next
            // and deleted on that plugin's HMR — the project-hub style-loss pitfall.
            style.dataset.plugin = PACKAGE_ID
            style.dataset.pluginCss = `${PACKAGE_ID}/${PANEL_ID}`
            style.textContent = STYLE
            document.head.append(style)
            return () => style.remove()
          }, 'plugin-doctor: styles')
          ctx.effect(() => ctx.locale.register('pluginDoctor', {
            zh: { panel: COPY.zh.panel },
            en: { panel: COPY.en.panel },
          }), 'plugin-doctor: locale')
          const label = ctx.locale.bind('pluginDoctor')
          // registrant is explicit: the framework otherwise stamps the calling
          // fiber name ('cf'), which cannot be attributed to a package
          // (ui-renderer registry.ts: options.registrant ?? ctx.fiber.name).
          ctx.slots.inject('main', () => ctx.slots.register({
            name: 'main', key: PANEL_ID, locale: 'pluginDoctor', registrant: PACKAGE_ID,
          }, props => h(Page, { ...props, ctx, conflictsApi })))
          ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
            name: 'sidebar.panellist', id: PANEL_ID, order: 22, registrant: PACKAGE_ID,
            label: () => label('panel'), locale: 'pluginDoctor',
          }, Icon))
        },
      }
    },
  })
})()