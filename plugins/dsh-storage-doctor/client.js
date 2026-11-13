(() => {
  const PACKAGE_ID = '@local/dsh-storage-doctor'
  const PANEL_ID = 'storage-doctor'
  const API = '/api/storage-doctor'

  /** Stacked-bar / legend order (matches lib/scan.js CATEGORY_NAMES, display-tuned). */
  const CAT_ORDER = [
    'sessions', 'attachments', 'pluginData', 'profileDeps', 'models', 'runtimes',
    'logs', 'cache', 'storages', 'profileMeta', 'doctorOwn', 'other',
  ]

  const COPY = {
    zh: {
      panel: '存储医生', title: '存储医生',
      subtitle: '~/.dsh 磁盘健康体检 · 只读扫描，不改动任何文件',
      scan: '开始扫描', rescan: '重新扫描', scanning: '扫描中…', readOnly: '只读',
      homeLabel: '存储根目录', lastScan: '上次扫描', never: '尚未扫描', took: '耗时',
      total: '总占用', files: '文件数', dirs: '已遍历目录',
      sessionsBytes: '会话日志', pluginBytes: '插件数据', ofTotal: '占总量',
      categoriesTitle: '空间分布', categoriesHint: '按类别统计 DSH 主目录占用',
      topFilesTitle: '大文件 Top 10', topFilesHint: '单文件 ≥ 50 MB；node_modules 与捆绑运行时只计总量、不逐文件列出',
      pluginRankTitle: '插件数据体积榜', pluginRankHint: '各插件的自有数据 —— 存储医生只报告体积，请在对应插件内处理',
      colPath: '路径', colSize: '体积', colCategory: '类别', colModified: '修改时间',
      largest: '最大文件', filesUnit: '个文件',
      emptyTitle: '还没有扫描记录', emptyBody: '生成本机 ~/.dsh 的存储体检报告：总量、分类占比、大文件与插件数据榜。',
      emptySafety: '扫描是只读的：不写入、不移动、不删除任何文件。',
      persistedNote: '当前显示上次持久化的汇总快照（不含插件榜与文件数），重新扫描可获取完整报告。',
      loadError: '加载失败', retry: '重试', errorsBadge: '扫描错误',
      scanStarted: '扫描已开始', scanDone: '扫描完成', alreadyRunning: '已有扫描在进行中', actionFailed: '操作失败',
      runningTitle: '正在扫描存储…', runningDirs: '已遍历目录', runningFiles: '已统计文件',
      noPluginData: '本次结果未包含插件数据榜', noTopFiles: '没有达到阈值的单个大文件', noData: '暂无数据',
      footer: 'M4 高级与打磨版本 · 清理 = 预览 → 确认 → 移入回收站 → 可还原；永不直接永久删除；附件 GC 实验性、默认关闭、干跑先行、语料不完整即拒绝；周期扫描与回收站超期清空按配置运行',
      tabOverview: '总览', tabClean: '清理预览', tabTrash: '回收站',
      cleanTitle: '清理预览', cleanHint: '按保留策略生成候选；受保护项自动排除并显示原因',
      policySessions: '会话保留天数', policyLogs: '日志保留天数', policyTmp: '临时文件时龄（小时）',
      policyModels: 'ASR 模型（speech-to-text）',
      policyModelsWarn: '清理后，下次使用语音转文字会重新下载模型（约 230 MB）；默认不勾选',
      policyModelsOn: '含 ASR 模型',
      gcTitle: '附件 GC（实验性）',
      gcHint: '针对内容寻址附件对象（attachments/v1/objects）。默认关闭；开启后仅手动触发、干跑先行；任何解析失败都会拒绝清理（fail closed）；移动仍然走回收站，可还原。',
      gcScope: '范围：仅规范化图片对象；file-objects/files 与其他插件的衍生缓存（如 context-inspector 镜像）不在清理范围内。',
      gcDisabledNote: '未启用：需在插件配置中设置 attachmentGc = true（默认关闭）。',
      gcDays: '无引用超期天数',
      gcDryRun: '干跑报告',
      gcRunPreview: '生成 GC 预览',
      gcObjectsLine: '对象存储：{n} 个 · {b}',
      gcForeignLine: '异形格式对象（带图片扩展名，非平台写入格式）：{n} 个 · 仅盘点保护，永不清理',
      gcCorpusLine: '引用语料：{f} 个文件 · {h} 个哈希引用',
      gcIncomplete: '语料不完整（{r}）：已按 fail-closed 拒绝生成候选。',
      gcFailuresTitle: '失败明细：',
      gcCandidatesLine: '候选：{n} 个对象 · {b}（无引用且超期）',
      gcNothingMoved: '没有对象被移动（引用重新出现或状态已变化）',
      gcPolicySummary: '附件 GC · {d} 天无引用',
      generate: '生成预览', generating: '生成中…',
      candidatesTitle: '可清理候选', protectedTitle: '受保护（自动排除，仅报告）',
      colTitle: '标题', colLastActive: '最后活动', colReason: '保护原因',
      reasonLive: '活跃会话', reasonRecent: '24 小时内活动', reasonOrphan: '会话库外的孤儿目录',
      selectAll: '全选', selectNone: '全不选',
      moveToTrash: '移入回收站', confirmMove: '确认移入回收站？', moving: '移动中…',
      cleanDone: '已移入回收站，批次', cleanSkipped: '跳过（占用/权限）',
      noCandidates: '当前策略下没有可清理项',
      overflowNote: '可清理文件过多，仅列出部分；请缩短时间窗后重新预览',
      cleanSafety: '清理只是把文件移入 ~/.dsh/.storage-doctor/trash 下的批次目录（附清单），可随时完整还原；彻底删除需要在回收站页输入 PURGE。',
      trashTitle: '回收站', trashHint: '批次以原样保留在磁盘上；还原零覆盖风险',
      colBatch: '批次', colPolicy: '策略', colItems: '项数', colStatus: '状态', colActions: '操作',
      statusTrashed: '在回收站', statusRestored: '已还原', statusPurged: '已彻底删除', statusIncomplete: '不完整批次',
      restore: '还原', restoring: '还原中…', restoreDone: '批次已还原',
      purge: '彻底删除', purgePrompt: '输入 PURGE 确认彻底删除（不可恢复）', purging: '删除中…', purgeDone: '批次已彻底删除',
      noBatches: '回收站是空的',
      loadFailedNotListed: '读取失败：在重试成功之前，不能据此断定回收站为空。',
      policySummary: '会话 {s} 天 · 日志 {l} 天 · 临时 {t} 小时',
      kindSession: '会话', kindLog: '日志', kindTmp: '临时文件', kindModel: '模型', kindObject: '附件对象',
      tabTrend: '趋势', trendTitle: '增长趋势', trendHint: '每次扫描一个数据点 · 总量与主要类别（汇总口径，不存文件级明细）',
      noHistory: '还没有扫描历史，完成第一次扫描后曲线开始记录',
      autoScanLine: '自动扫描：{every}　·　回收站保留：{days}',
      autoScanEvery: '每 {h} 小时', autoScanOff: '关闭', retentionOff: '不自动清空',
      unitDays: '天',
      seriesTotal: '总量', seriesSessions: '会话日志', seriesPlugin: '插件数据',
      cat: {
        sessions: '会话日志', attachments: '附件', pluginData: '插件数据', profileDeps: '插件依赖',
        profileMeta: 'Profile 配置', runtimes: '捆绑运行时', models: '语音模型', logs: '日志',
        cache: '缓存', storages: '工作区注册', doctorOwn: '存储医生回收站', other: '其他',
      },
    },
    en: {
      panel: 'Storage Doctor', title: 'Storage Doctor',
      subtitle: 'Disk health inspection of ~/.dsh · read-only, never touches your files',
      scan: 'Scan now', rescan: 'Rescan', scanning: 'Scanning…', readOnly: 'read-only',
      homeLabel: 'Home', lastScan: 'Last scan', never: 'never', took: 'took',
      total: 'Total size', files: 'Files', dirs: 'Directories walked',
      sessionsBytes: 'Session logs', pluginBytes: 'Plugin data', ofTotal: 'of total',
      categoriesTitle: 'Space breakdown', categoriesHint: 'DSH home usage by category',
      topFilesTitle: 'Top 10 large files', topFilesHint: 'Single files ≥ 50 MB; node_modules and bundled runtimes are counted, not itemized',
      pluginRankTitle: 'Plugin data leaderboard', pluginRankHint: "Other plugins' own data — Storage Doctor only reports sizes; manage them inside each plugin",
      colPath: 'Path', colSize: 'Size', colCategory: 'Category', colModified: 'Modified',
      largest: 'largest file', filesUnit: 'files',
      emptyTitle: 'No scan yet', emptyBody: 'Generate a storage report for this machine: totals, category shares, large files, and the plugin leaderboard.',
      emptySafety: 'Scanning is read-only: nothing is written, moved, or deleted.',
      persistedNote: 'Showing the last persisted summary snapshot (without the leaderboard); rescan for the full report.',
      loadError: 'Load failed', retry: 'Retry', errorsBadge: 'scan errors',
      scanStarted: 'Scan started', scanDone: 'Scan complete', alreadyRunning: 'A scan is already running', actionFailed: 'Action failed',
      runningTitle: 'Scanning storage…', runningDirs: 'Directories', runningFiles: 'Files counted',
      noPluginData: 'This result has no plugin leaderboard', noTopFiles: 'No single file reaches the threshold', noData: 'No data',
      footer: 'M4 advanced & polish release · cleanup = preview → confirm → move to trash → restore; never deletes permanently; the experimental attachment GC is off by default, dry-run first, fail-closed on any corpus gap; periodic scans and trash expiry run per config',
      tabOverview: 'Overview', tabClean: 'Cleanup preview', tabTrash: 'Trash',
      cleanTitle: 'Cleanup preview', cleanHint: 'Candidates by retention policy; protected items are excluded with reasons',
      policySessions: 'Keep sessions (days)', policyLogs: 'Keep logs (days)', policyTmp: 'Temp file age (hours)',
      policyModels: 'ASR models (speech-to-text)',
      policyModelsWarn: 'After cleanup the model re-downloads (~230 MB) on the next speech-to-text use; off by default',
      policyModelsOn: 'incl. ASR models',
      gcTitle: 'Attachment GC (experimental)',
      gcHint: 'Content-addressed attachment objects (attachments/v1/objects). Off by default; manual only, dry run first; any parse failure refuses the cleanup (fail closed); moves still go through the trash and stay restorable.',
      gcScope: 'Scope: normalized image objects only; file-objects/files and derived caches of other plugins (e.g. context-inspector mirrors) are never cleaned.',
      gcDisabledNote: 'Disabled: set attachmentGc = true in the plugin config (off by default).',
      gcDays: 'Unreferenced age (days)',
      gcDryRun: 'Dry-run report',
      gcRunPreview: 'Build GC preview',
      gcObjectsLine: 'Object store: {n} objects · {b}',
      gcForeignLine: 'Foreign-shape objects (image-extension variants, not written by the platform): {n} · inventoried and protected, never cleaned',
      gcCorpusLine: 'Reference corpus: {f} files · {h} hash references',
      gcIncomplete: 'Corpus incomplete ({r}): candidate selection refused (fail closed).',
      gcFailuresTitle: 'Failures:',
      gcCandidatesLine: 'Candidates: {n} objects · {b} (unreferenced and aged)',
      gcNothingMoved: 'Nothing moved (references reappeared or state changed)',
      gcPolicySummary: 'attachment GC · {d} days unreferenced',
      generate: 'Build preview', generating: 'Building…',
      candidatesTitle: 'Cleanup candidates', protectedTitle: 'Protected (excluded, report only)',
      colTitle: 'Title', colLastActive: 'Last active', colReason: 'Protection reason',
      reasonLive: 'live session', reasonRecent: 'active within 24h', reasonOrphan: 'orphan dir outside the corpus',
      selectAll: 'Select all', selectNone: 'Select none',
      moveToTrash: 'Move to trash', confirmMove: 'Confirm move to trash?', moving: 'Moving…',
      cleanDone: 'Moved to trash, batch', cleanSkipped: 'skipped (busy/locked)',
      noCandidates: 'Nothing to clean under this policy',
      overflowNote: 'Too many cleanable files; only part is listed. Shorten the window and preview again.',
      cleanSafety: 'Cleanup only moves files into a batch directory under ~/.dsh/.storage-doctor/trash with a manifest; everything can be restored. Permanent deletion needs PURGE on the trash page.',
      trashTitle: 'Trash', trashHint: 'Batches stay on disk as-is; restore never overwrites',
      colBatch: 'Batch', colPolicy: 'Policy', colItems: 'Items', colStatus: 'Status', colActions: 'Actions',
      statusTrashed: 'in trash', statusRestored: 'restored', statusPurged: 'purged', statusIncomplete: 'incomplete batch',
      restore: 'Restore', restoring: 'Restoring…', restoreDone: 'Batch restored',
      purge: 'Delete forever', purgePrompt: 'Type PURGE to confirm irreversible deletion', purging: 'Deleting…', purgeDone: 'Batch purged',
      noBatches: 'The trash is empty',
      loadFailedNotListed: 'Load failed: until a retry succeeds, this must not be read as an empty trash.',
      policySummary: 'sessions {s}d · logs {l}d · tmp {t}h',
      kindSession: 'session', kindLog: 'log', kindTmp: 'tmp', kindModel: 'model', kindObject: 'object',
      tabTrend: 'Trend', trendTitle: 'Growth trend', trendHint: 'One point per scan · total and main categories (summary level, never file-level rows)',
      noHistory: 'No scan history yet; the curve starts after the first scan',
      autoScanLine: 'Auto scan: {every} · trash retention: {days}',
      autoScanEvery: 'every {h} h', autoScanOff: 'off', retentionOff: 'never auto-purged',
      unitDays: 'd',
      seriesTotal: 'Total', seriesSessions: 'Session logs', seriesPlugin: 'Plugin data',
      cat: {
        sessions: 'Session logs', attachments: 'Attachments', pluginData: 'Plugin data', profileDeps: 'Plugin deps',
        profileMeta: 'Profile config', runtimes: 'Bundled runtimes', models: 'Speech models', logs: 'Logs',
        cache: 'Cache', storages: 'Workspace registry', doctorOwn: 'Storage Doctor trash', other: 'Other',
      },
    },
  }

  function localeKey() {
    const language = document.documentElement.lang || navigator.language || 'en'
    return language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
  }

  const STYLE = `
  .sd-page, .sd-page * { box-sizing: border-box; }
  .sd-page {
    --sd-dur-1:.12s; --sd-dur-2:.25s;
    --sd-ease-out: cubic-bezier(.22,1,.36,1);
    --sd-c-sessions: var(--dsw-alias-brand-primary);
    --sd-c-attachments: color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, var(--dsw-alias-state-idle-primary));
    --sd-c-pluginData: var(--dsw-alias-state-warn-primary);
    --sd-c-profileDeps: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 45%, var(--dsw-alias-label-secondary));
    --sd-c-profileMeta: var(--dsw-alias-label-caption);
    --sd-c-runtimes: color-mix(in srgb, var(--dsw-alias-label-secondary) 65%, var(--dsw-alias-bg-layer-3));
    --sd-c-models: var(--dsw-alias-state-success-primary);
    --sd-c-logs: color-mix(in srgb, var(--dsw-alias-state-success-primary) 50%, var(--dsw-alias-brand-primary));
    --sd-c-cache: color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, var(--dsw-alias-state-success-primary));
    --sd-c-storages: color-mix(in srgb, var(--dsw-alias-state-error-primary) 55%, var(--dsw-alias-state-warn-primary));
    --sd-c-doctorOwn: var(--dsw-alias-state-error-primary);
    --sd-c-other: var(--dsw-alias-label-tertiary);
    height:100%; min-width:0; min-height:0; overflow:auto;
    padding:calc(26px + var(--dsh-frame-top-clearance, 0px)) 28px 48px;
    background:var(--dsw-alias-bg-base); color:var(--dsw-alias-label-primary); font-family:var(--dsw-font-family, inherit);
  }
  .sd-shell { width:min(1280px, 100%); margin:0 auto; }
  .sd-head { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; margin-bottom:18px; }
  .sd-title { margin:0; font-size:28px; line-height:1.2; letter-spacing:-.02em; }
  .sd-subtitle { margin:8px 0 0; color:var(--dsw-alias-label-secondary); font-size:13px; }
  .sd-meta { display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-top:10px; color:var(--dsw-alias-label-tertiary); font-size:11px; }
  .sd-meta code { padding:2px 7px; border-radius:6px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-secondary); font-size:10px; }
  .sd-meta b { color:var(--dsw-alias-label-secondary); font-weight:600; }
  .sd-actions { display:flex; flex-wrap:wrap; align-items:center; justify-content:flex-end; gap:8px; }
  .sd-button { min-height:36px; padding:0 15px; border:0.5px solid var(--dsw-alias-border-l2); border-radius:var(--dsw-radius-md, 10px); background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); cursor:pointer; font:inherit; font-size:12px; font-weight:600; transition:background var(--sd-dur-1) ease, transform var(--sd-dur-1) ease; }
  .sd-button:hover { background:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 82%, var(--dsw-alias-label-primary)); }
  .sd-button:active { transform:scale(.97); }
  .sd-button:disabled { cursor:not-allowed; opacity:.55; }
  .sd-button--primary { border-color:transparent; background:var(--dsw-alias-brand-primary); color:var(--dsw-alias-label-on-color, white); }
  .sd-button--primary:hover { background:color-mix(in srgb, var(--dsw-alias-brand-primary) 84%, var(--dsw-alias-label-primary)); }
  .sd-button--big { min-height:44px; padding:0 22px; font-size:14px; }
  .sd-badge { display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:99px; background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent); color:var(--dsw-alias-state-success-primary); font-size:10px; font-weight:700; }
  .sd-badge::before { width:6px; height:6px; border-radius:50%; background:currentColor; content:''; }
  .sd-badge--warn { background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 15%, transparent); color:var(--dsw-alias-state-warn-primary); }
  .sd-card { min-width:0; border:0.5px solid var(--dsw-alias-border-l3); border-radius:var(--dsw-radius-lg, 14px); background:var(--dsw-alias-bg-layer-1); }
  .sd-card__head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:13px; }
  .sd-card__title { margin:0; font-size:13px; font-weight:700; }
  .sd-card__hint { margin:5px 0 0; color:var(--dsw-alias-label-tertiary); font-size:10px; line-height:1.4; }
  .sd-note { display:flex; gap:8px; align-items:baseline; margin-bottom:12px; padding:10px 13px; border:0.5px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 35%, var(--dsw-alias-border-l3)); border-radius:var(--dsw-radius-md, 10px); background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 8%, var(--dsw-alias-bg-layer-1)); color:var(--dsw-alias-label-secondary); font-size:11px; }
  .sd-running { display:grid; grid-template-columns:minmax(220px, 1fr) auto auto; gap:14px; align-items:center; margin-bottom:14px; padding:14px 16px; }
  .sd-running__title { font-size:12px; font-weight:700; }
  .sd-progress { height:4px; margin-top:9px; overflow:hidden; border-radius:99px; background:var(--dsw-alias-bg-layer-3); }
  .sd-progress span { display:block; width:36%; height:100%; border-radius:inherit; background:var(--dsw-alias-brand-primary); animation:sd-slide 1.2s ease-in-out infinite; }
  .sd-running__stat { color:var(--dsw-alias-label-tertiary); font-size:10px; text-transform:uppercase; letter-spacing:.04em; text-align:right; }
  .sd-running__stat strong { display:block; margin-top:4px; color:var(--dsw-alias-label-primary); font-size:14px; letter-spacing:0; font-variant-numeric:tabular-nums; }
  .sd-kpis { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:12px; margin-bottom:12px; }
  .sd-kpi { min-height:112px; padding:16px; }
  .sd-kpi__label { display:flex; align-items:center; gap:6px; color:var(--dsw-alias-label-secondary); font-size:11px; }
  .sd-kpi__label i { width:7px; height:7px; border-radius:2px; background:var(--sd-kpi-color, var(--dsw-alias-brand-primary)); }
  .sd-kpi__value { margin-top:10px; overflow:hidden; color:var(--dsw-alias-label-primary); font-size:25px; font-weight:720; letter-spacing:-.025em; text-overflow:ellipsis; white-space:nowrap; font-variant-numeric:tabular-nums; }
  .sd-kpi__value--hero { font-size:34px; }
  .sd-kpi__meta { margin-top:8px; color:var(--dsw-alias-label-tertiary); font-size:10px; line-height:1.45; }
  .sd-section { padding:17px; margin-bottom:12px; }
  .sd-stack { display:flex; height:16px; overflow:hidden; border-radius:99px; background:var(--dsw-alias-bg-layer-3); }
  .sd-stack__seg { height:100%; transition:opacity var(--sd-dur-1) ease; }
  .sd-stack__seg:hover { opacity:.82; }
  .sd-legend { display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:8px 18px; margin-top:14px; }
  .sd-legend__row { display:grid; grid-template-columns:auto minmax(0,1fr) auto auto; gap:8px; align-items:baseline; font-size:11px; }
  .sd-legend__row i { width:8px; height:8px; border-radius:2px; background:var(--sd-c); align-self:center; }
  .sd-legend__name { overflow:hidden; color:var(--dsw-alias-label-secondary); text-overflow:ellipsis; white-space:nowrap; }
  .sd-legend__bytes { color:var(--dsw-alias-label-primary); font-weight:650; font-variant-numeric:tabular-nums; }
  .sd-legend__pct { min-width:44px; color:var(--dsw-alias-label-tertiary); text-align:right; font-variant-numeric:tabular-nums; }
  .sd-grid { display:grid; grid-template-columns:minmax(0, 1.5fr) minmax(300px, 1fr); gap:12px; margin-bottom:12px; }
  .sd-table { width:100%; border-collapse:collapse; font-size:11px; }
  .sd-table th { padding:7px 9px; border-bottom:0.5px solid var(--dsw-alias-border-l3); color:var(--dsw-alias-label-tertiary); font-weight:650; text-align:left; white-space:nowrap; }
  .sd-table td { max-width:0; padding:8px 9px; border-bottom:0.5px solid var(--dsw-alias-border-l4); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-variant-numeric:tabular-nums; }
  .sd-table td.sd-path { font-family:ui-monospace, SFMono-Regular, Consolas, monospace; font-size:10px; direction:rtl; }
  .sd-table tbody tr { transition:background var(--sd-dur-1) ease; }
  .sd-table tbody tr:hover { background:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 65%, transparent); }
  .sd-chip { display:inline-flex; align-items:center; gap:5px; color:var(--dsw-alias-label-secondary); white-space:nowrap; }
  .sd-chip i { width:7px; height:7px; border-radius:2px; background:var(--sd-c, var(--dsw-alias-label-tertiary)); }
  .sd-rank { display:grid; gap:12px; }
  .sd-rank__row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:4px 10px; font-size:11px; }
  .sd-rank__name { display:flex; align-items:center; gap:7px; overflow:hidden; }
  .sd-rank__name strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; }
  .sd-rank__profile { flex:none; padding:1px 7px; border-radius:99px; background:var(--dsw-alias-bg-layer-3); color:var(--dsw-alias-label-tertiary); font-size:9px; font-weight:600; }
  .sd-rank__bytes { color:var(--dsw-alias-label-primary); font-weight:700; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .sd-rank__track { grid-column:1 / -1; height:7px; overflow:hidden; border-radius:99px; background:var(--dsw-alias-bg-layer-3); }
  .sd-rank__fill { display:block; height:100%; border-radius:inherit; background:var(--sd-c-pluginData); animation:sd-widen .5s var(--sd-ease-out) backwards; animation-delay:calc(var(--sd-i, 0) * 30ms); }
  .sd-rank__meta { grid-column:1 / -1; color:var(--dsw-alias-label-tertiary); font-size:10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .sd-empty, .sd-error { display:grid; min-height:320px; padding:40px 30px; place-items:center; text-align:center; }
  .sd-empty__body { display:grid; gap:12px; justify-items:center; max-width:460px; }
  .sd-empty__icon { color:var(--dsw-alias-label-caption); }
  .sd-empty__title { margin:0; font-size:17px; font-weight:700; }
  .sd-empty__text { margin:0; color:var(--dsw-alias-label-secondary); font-size:12px; line-height:1.6; }
  .sd-empty__safety { margin:0; color:var(--dsw-alias-label-tertiary); font-size:11px; }
  .sd-error { color:var(--dsw-alias-state-error-primary); }
  .sd-error__body { display:grid; gap:12px; justify-items:center; font-size:12px; }
  .sd-skeleton { position:relative; overflow:hidden; border-radius:8px; background:var(--dsw-alias-bg-layer-2); }
  .sd-skeleton::after { position:absolute; inset:0; background:linear-gradient(90deg, transparent, color-mix(in srgb, var(--dsw-alias-bg-layer-3) 80%, transparent), transparent); animation:sd-shimmer 1.4s infinite; content:''; }
  .sd-skeleton--kpi { min-height:112px; }
  .sd-skeleton--block { min-height:200px; }
  .sd-toast { position:fixed; right:24px; bottom:24px; z-index:20; padding:9px 14px; border-radius:10px; background:var(--dsw-alias-bg-layer-3); color:var(--dsw-alias-label-primary); font-size:12px; box-shadow:var(--dsw-elevation-2, 0 10px 28px rgba(0,0,0,.24)); animation:sd-pop-in .18s var(--sd-ease-out); }
  .sd-foot { margin-top:18px; color:var(--dsw-alias-label-caption); font-size:10px; line-height:1.6; text-align:center; }
  @keyframes sd-slide { from { transform:translateX(-110%); } to { transform:translateX(320%); } }
  @keyframes sd-widen { from { transform:scaleX(0); transform-origin:left; } to { transform:scaleX(1); transform-origin:left; } }
  @keyframes sd-pop-in { from { opacity:0; transform:translateY(4px) scale(.98); } to { opacity:1; transform:none; } }
  @keyframes sd-shimmer { from { transform:translateX(-100%); } to { transform:translateX(100%); } }
  @media (prefers-reduced-motion: reduce) {
    .sd-progress span, .sd-rank__fill, .sd-skeleton::after, .sd-toast { animation:none !important; }
  }
  @media (max-width:1100px) { .sd-kpis { grid-template-columns:repeat(2, minmax(0, 1fr)); } .sd-grid { grid-template-columns:1fr; } }
  @media (max-width:680px) {
    .sd-page { padding-left:14px; padding-right:14px; }
    .sd-head { display:grid; } .sd-actions { justify-content:flex-start; }
    .sd-running { grid-template-columns:1fr 1fr; } .sd-running > :first-child { grid-column:1 / -1; }
  }
  .sd-tabs { display:flex; gap:4px; width:fit-content; margin:0 0 16px; padding:4px; border:0.5px solid var(--dsw-alias-border-l2); border-radius:12px; background:var(--dsw-alias-bg-layer-2); }
  .sd-tabs button { padding:7px 15px; border:0; border-radius:9px; background:transparent; color:var(--dsw-alias-label-secondary); font:inherit; font-size:12px; font-weight:600; cursor:pointer; transition:background var(--sd-dur-1) ease, color var(--sd-dur-1) ease; }
  .sd-tabs button:hover { color:var(--dsw-alias-label-primary); }
  .sd-tabs button[aria-selected="true"] { background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-primary); }
  .sd-form { display:flex; flex-wrap:wrap; gap:14px; align-items:flex-end; margin-bottom:14px; }
  .sd-field { display:flex; flex-direction:column; gap:5px; color:var(--dsw-alias-label-secondary); font-size:11px; font-weight:600; }
  .sd-field input { width:120px; min-height:34px; padding:0 10px; border:0.5px solid var(--dsw-alias-border-l2); border-radius:9px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); font:inherit; font-size:12px; }
  .sd-list { display:flex; flex-direction:column; margin-top:4px; }
  .sd-check { display:grid; grid-template-columns:20px minmax(0, 1fr) auto auto auto; gap:10px; align-items:baseline; padding:8px 10px; border-radius:9px; font-size:12px; }
  .sd-check:hover { background:var(--dsw-alias-bg-layer-2); }
  .sd-check input { accent-color:var(--dsw-alias-brand-primary); align-self:center; }
  .sd-check__path { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; direction:rtl; text-align:left; font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:11px; }
  .sd-check__title { color:var(--dsw-alias-label-secondary); font-size:11px; }
  .sd-check__bytes { font-weight:700; font-variant-numeric:tabular-nums; }
  .sd-check__time { color:var(--dsw-alias-label-tertiary); font-size:11px; }
  .sd-protected .sd-check { opacity:.66; }
  .sd-reason { padding:2px 9px; border-radius:99px; background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 14%, transparent); color:var(--dsw-alias-state-warn-primary); font-size:10px; font-weight:700; white-space:nowrap; }
  .sd-bar { position:sticky; bottom:10px; z-index:5; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; margin-top:14px; padding:12px 14px; border:0.5px solid var(--dsw-alias-border-l2); border-radius:12px; background:var(--dsw-alias-bg-layer-1); box-shadow:var(--dsw-elevation-2, 0 10px 28px rgba(0,0,0,.18)); }
  .sd-bar__sum { color:var(--dsw-alias-label-secondary); font-size:12px; }
  .sd-bar__sum b { color:var(--dsw-alias-label-primary); font-variant-numeric:tabular-nums; }
  .sd-button--warn { border-color:transparent; background:var(--dsw-alias-state-warn-primary); color:white; }
  .sd-button--warn:hover { background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 84%, var(--dsw-alias-label-primary)); }
  .sd-button--danger { border-color:transparent; background:var(--dsw-alias-state-error-primary); color:white; }
  .sd-button--danger:hover { background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 84%, var(--dsw-alias-label-primary)); }
  .sd-batch { display:flex; flex-wrap:wrap; gap:10px 16px; align-items:center; justify-content:space-between; margin-bottom:10px; padding:12px 14px; border:0.5px solid var(--dsw-alias-border-l2); border-radius:12px; background:var(--dsw-alias-bg-layer-1); }
  .sd-batch__id { font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:11px; color:var(--dsw-alias-label-secondary); }
  .sd-batch__meta { display:flex; flex-wrap:wrap; gap:6px 14px; align-items:baseline; color:var(--dsw-alias-label-secondary); font-size:11px; }
  .sd-batch__meta b { color:var(--dsw-alias-label-primary); font-variant-numeric:tabular-nums; }
  .sd-batch__actions { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
  .sd-purge input { width:110px; min-height:32px; padding:0 9px; border:0.5px solid var(--dsw-alias-border-l2); border-radius:8px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); font-family:ui-monospace, monospace; font-size:11px; }
  .sd-status { padding:2px 9px; border-radius:99px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-secondary); font-size:10px; font-weight:700; }
  .sd-status--trashed { background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 14%, transparent); color:var(--dsw-alias-state-warn-primary); }
  .sd-status--restored { background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent); color:var(--dsw-alias-state-success-primary); }
  .sd-status--purged { background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent); color:var(--dsw-alias-state-error-primary); }
  .sd-chart { width:100%; height:auto; display:block; margin-top:6px; }
  .sd-chart text { fill:var(--dsw-alias-label-tertiary); font-size:10px; font-variant-numeric:tabular-nums; }
  .sd-chart .sd-chart__grid { stroke:var(--dsw-alias-border-l1); stroke-dasharray:3 4; }
  .sd-chart__legend { display:flex; flex-wrap:wrap; gap:8px 18px; margin-top:10px; font-size:11px; color:var(--dsw-alias-label-secondary); }
  .sd-chart__legend span { display:inline-flex; align-items:center; gap:6px; }
  .sd-chart__legend i { width:10px; height:10px; border-radius:3px; }
  `

  window.__ModuleLoader__.load({
    id: PACKAGE_ID,
    factory(require) {
      const React = require('react')
      const { useCallback, useEffect, useRef, useState } = React
      const h = React.createElement

      function tcopy() { return COPY[localeKey()] }

      function number(value) {
        return typeof value === 'number' && Number.isFinite(value)
          ? new Intl.NumberFormat(localeKey() === 'zh' ? 'zh-CN' : 'en-US').format(value)
          : '—'
      }

      function bytes(value) {
        if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
        const units = [['TB', 1024 ** 4], ['GB', 1024 ** 3], ['MB', 1024 ** 2], ['KB', 1024]]
        for (const [suffix, size] of units) {
          if (value >= size) return `${(value / size).toFixed(value >= size * 10 ? 1 : 2)} ${suffix}`
        }
        return `${value} B`
      }

      function share(part, total) {
        if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return '—'
        return `${(part / total * 100).toFixed(1)}%`
      }

      function dateTime(value) {
        if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '—'
        return new Intl.DateTimeFormat(localeKey() === 'zh' ? 'zh-CN' : 'en-US', {
          year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
        }).format(new Date(value))
      }

      function duration(value) {
        if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
        if (value < 1000) return `${Math.round(value)} ms`
        return `${(value / 1000).toFixed(1)} s`
      }

      function baseName(path) {
        const text = String(path ?? '')
        const index = text.lastIndexOf('/')
        return index >= 0 ? text.slice(index + 1) : text
      }

      function Icon({ size = 20 }) {
        return h('svg', {
          width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
          stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true',
        },
        h('rect', { x: 3, y: 4.5, width: 18, height: 15, rx: 2.5 }),
        h('path', { d: 'M5.5 12.2h3l1.6-3.1 2.9 6.2 1.9-3.9 1.2.8h2.4' }),
        h('circle', { cx: 17.8, cy: 7.6, r: 1.2, fill: 'currentColor', stroke: 'none' }))
      }

      function Kpi({ label, value, hero, meta, color }) {
        return h('article', { className: 'sd-card sd-kpi', style: color ? { '--sd-kpi-color': color } : undefined },
          h('div', { className: 'sd-kpi__label' }, h('i'), label),
          h('div', { className: `sd-kpi__value${hero ? ' sd-kpi__value--hero' : ''}` }, value),
          meta ? h('div', { className: 'sd-kpi__meta' }, meta) : null)
      }

      function Categories({ categories, total, c }) {
        const entries = CAT_ORDER
          .map(name => ({ name, ...(categories?.[name] ?? { bytes: 0, files: 0 }) }))
          .filter(entry => entry.bytes > 0)
        return h('section', { className: 'sd-card sd-section' },
          h('div', { className: 'sd-card__head' },
            h('div', null,
              h('h2', { className: 'sd-card__title' }, c.categoriesTitle),
              h('p', { className: 'sd-card__hint' }, c.categoriesHint))),
          entries.length === 0
            ? h('p', { className: 'sd-card__hint' }, c.noData)
            : h('div', null,
              h('div', { className: 'sd-stack', role: 'img', 'aria-label': c.categoriesTitle },
                ...entries.map(entry => h('span', {
                  key: entry.name,
                  className: 'sd-stack__seg',
                  title: `${c.cat[entry.name]} · ${bytes(entry.bytes)} · ${share(entry.bytes, total)}`,
                  style: { width: `${Math.max(0.4, entry.bytes / total * 100)}%`, background: `var(--sd-c-${entry.name})` },
                }))),
              h('div', { className: 'sd-legend' },
                ...entries.map(entry => h('div', { className: 'sd-legend__row', key: entry.name, style: { '--sd-c': `var(--sd-c-${entry.name})` } },
                  h('i'),
                  h('span', { className: 'sd-legend__name' }, `${c.cat[entry.name]} · ${number(entry.files)}`),
                  h('span', { className: 'sd-legend__bytes' }, bytes(entry.bytes)),
                  h('span', { className: 'sd-legend__pct' }, share(entry.bytes, total)))))))
      }

      function TopFiles({ files, c }) {
        const rows = (files ?? []).slice(0, 10)
        return h('section', { className: 'sd-card sd-section' },
          h('div', { className: 'sd-card__head' },
            h('div', null,
              h('h2', { className: 'sd-card__title' }, c.topFilesTitle),
              h('p', { className: 'sd-card__hint' }, c.topFilesHint))),
          rows.length === 0
            ? h('p', { className: 'sd-card__hint' }, c.noTopFiles)
            : h('table', { className: 'sd-table' },
              h('thead', null, h('tr', null,
                h('th', null, c.colPath), h('th', null, c.colCategory),
                h('th', null, c.colSize), h('th', null, c.colModified))),
              h('tbody', null, ...rows.map(file => h('tr', { key: file.path },
                h('td', { className: 'sd-path', title: file.path }, file.path),
                h('td', null, h('span', { className: 'sd-chip', style: { '--sd-c': `var(--sd-c-${file.category})` } }, h('i'), c.cat[file.category] ?? file.category)),
                h('td', null, bytes(file.bytes)),
                h('td', null, dateTime(file.mtimeMs)))))))
      }

      function PluginRank({ plugins, c }) {
        const rows = (plugins ?? []).slice(0, 12)
        const max = rows.length > 0 ? Math.max(1, rows[0].bytes) : 1
        return h('section', { className: 'sd-card sd-section' },
          h('div', { className: 'sd-card__head' },
            h('div', null,
              h('h2', { className: 'sd-card__title' }, c.pluginRankTitle),
              h('p', { className: 'sd-card__hint' }, c.pluginRankHint))),
          rows.length === 0
            ? h('p', { className: 'sd-card__hint' }, c.noPluginData)
            : h('div', { className: 'sd-rank' },
              ...rows.map((entry, index) => h('div', { className: 'sd-rank__row', key: `${entry.profile}/${entry.plugin}` },
                h('span', { className: 'sd-rank__name' },
                  h('strong', { title: entry.plugin }, entry.plugin),
                  h('span', { className: 'sd-rank__profile' }, entry.profile)),
                h('span', { className: 'sd-rank__bytes' }, bytes(entry.bytes)),
                h('span', { className: 'sd-rank__track' },
                  h('span', { className: 'sd-rank__fill', style: { width: `${Math.max(1.5, entry.bytes / max * 100)}%`, '--sd-i': index } })),
                entry.largest
                  ? h('span', { className: 'sd-rank__meta', title: entry.largest.path },
                    `${number(entry.files)} ${c.filesUnit} · ${c.largest}: ${baseName(entry.largest.path)} (${bytes(entry.largest.bytes)})`)
                  : h('span', { className: 'sd-rank__meta' }, `${number(entry.files)} ${c.filesUnit}`)))))
      }

      function KindChip({ kind, c }) {
        const label = kind === 'session' ? c.kindSession : kind === 'log' ? c.kindLog
          : kind === 'model' ? c.kindModel : kind === 'attachment-object' ? c.kindObject : c.kindTmp
        const color = kind === 'session' ? 'var(--sd-c-sessions)' : kind === 'log' ? 'var(--sd-c-logs)'
          : kind === 'model' ? 'var(--dsw-alias-state-warn-primary)'
            : kind === 'attachment-object' ? 'var(--dsw-alias-state-danger-primary)' : 'var(--sd-c-cache)'
        return h('span', { className: 'sd-chip', style: { '--sd-c': color } }, h('i'), label)
      }

      function CleanView({ c, say, onCleaned }) {
        const [policy, setPolicy] = useState({ sessionsDays: '90', logsDays: '30', tmpHours: '24', models: false })
        const [state, setState] = useState({ loading: false, failed: null, preview: null, previewId: null })
        const [selected, setSelected] = useState([])
        const [armed, setArmed] = useState(false)
        const [busy, setBusy] = useState(false)

        const load = useCallback(async () => {
          setArmed(false)
          setState(current => ({ ...current, loading: true, failed: null }))
          try {
            const query = new URLSearchParams({
              sessionsDays: policy.sessionsDays, logsDays: policy.logsDays, tmpHours: policy.tmpHours,
              // M4: ASR models join the preview only on the explicit opt-in.
              ...(policy.models === true ? { models: '1' } : {}),
            })
            const response = await fetch(`${API}/preview?${query}`)
            const body = await response.json().catch(() => null)
            if (!response.ok) throw new Error(body?.error?.message ?? `HTTP ${response.status}`)
            setState({ loading: false, failed: null, preview: body.preview, previewId: body.previewId })
            setSelected((body.preview?.candidates ?? []).map(candidate => candidate.relPath))
          } catch (error) {
            setState({
              loading: false, preview: null, previewId: null,
              failed: error instanceof Error ? error.message : String(error),
            })
          }
        }, [policy])

        const toggle = (relPath) => {
          setArmed(false)
          setSelected(current => (current.includes(relPath)
            ? current.filter(item => item !== relPath)
            : [...current, relPath]))
        }

        const candidates = state.preview?.candidates ?? []
        const chosen = candidates.filter(candidate => selected.includes(candidate.relPath))
        const chosenBytes = chosen.reduce((sum, candidate) => sum + candidate.bytes, 0)

        const clean = useCallback(async () => {
          if (!armed) { setArmed(true); return }
          setBusy(true)
          try {
            const response = await fetch(`${API}/clean`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ previewId: state.previewId, selected }),
            })
            const body = await response.json().catch(() => null)
            if (!response.ok) throw new Error(body?.error?.message ?? `HTTP ${response.status}`)
            const skipped = Array.isArray(body.skipped) ? body.skipped.length : 0
            say(`${c.cleanDone} ${body.batchId}${skipped > 0 ? ` · ${c.cleanSkipped} ${skipped}` : ''}`)
            setState({ loading: false, failed: null, preview: null, previewId: null })
            setSelected([])
            setArmed(false)
            onCleaned()
          } catch (error) {
            say(`${c.actionFailed}: ${error instanceof Error ? error.message : String(error)}`)
            setArmed(false)
          } finally {
            setBusy(false)
          }
        }, [armed, c, onCleaned, say, selected, state.previewId])

        const field = (key, label) => h('label', { className: 'sd-field' }, label,
          h('input', {
            type: 'number', min: '1', step: 'any', value: policy[key],
            onChange: event => setPolicy(current => ({ ...current, [key]: event.target.value })),
          }))

        return h('div', null,
          h('section', { className: 'sd-card sd-section' },
            h('div', { className: 'sd-card__head' },
              h('div', null,
                h('h2', { className: 'sd-card__title' }, c.cleanTitle),
                h('p', { className: 'sd-card__hint' }, c.cleanHint))),
            h('div', { className: 'sd-form' },
              field('sessionsDays', c.policySessions),
              field('logsDays', c.policyLogs),
              field('tmpHours', c.policyTmp),
              h('label', { className: 'sd-check', style: { gridColumn: '1 / -1' } },
                h('input', {
                  type: 'checkbox', checked: policy.models === true,
                  onChange: event => {
                    setArmed(false)
                    setPolicy(current => ({ ...current, models: event.target.checked }))
                  },
                }),
                h('span', { className: 'sd-check__path' }, c.policyModels),
                h('span', { className: 'sd-check__title' }, c.policyModelsWarn),
                h('span'), h('span')),
              h('button', {
                type: 'button', className: 'sd-button sd-button--primary',
                onClick: () => void load(), disabled: state.loading || busy,
              }, state.loading ? c.generating : c.generate)),
            state.failed === null ? null : h('div', { className: 'sd-error' }, state.failed),
            state.preview === null ? null : h('div', null,
              state.preview.cleanableOverflow === true ? h('div', { className: 'sd-note' }, c.overflowNote) : null,
              h('h3', { className: 'sd-card__title' }, `${c.candidatesTitle} · ${number(state.preview.candidateCount)}`),
              candidates.length === 0
                ? h('p', { className: 'sd-card__hint' }, c.noCandidates)
                : h('div', { className: 'sd-list' },
                  h('div', { className: 'sd-check' },
                    h('span'),
                    h('span', null,
                      h('button', { type: 'button', className: 'sd-button', style: { minHeight: '24px', padding: '0 8px', fontSize: '10px' }, onClick: () => { setArmed(false); setSelected(candidates.map(candidate => candidate.relPath)) } }, c.selectAll),
                      ' ',
                      h('button', { type: 'button', className: 'sd-button', style: { minHeight: '24px', padding: '0 8px', fontSize: '10px' }, onClick: () => { setArmed(false); setSelected([]) } }, c.selectNone)),
                    h('span'), h('span'), h('span')),
                  ...candidates.map(candidate => h('label', { className: 'sd-check', key: candidate.relPath },
                    h('input', {
                      type: 'checkbox', checked: selected.includes(candidate.relPath),
                      onChange: () => toggle(candidate.relPath),
                    }),
                    h('span', { className: 'sd-check__path', title: candidate.relPath }, candidate.relPath),
                    h('span', { className: 'sd-check__title' },
                      h(KindChip, { kind: candidate.kind, c }),
                      candidate.title ? ` ${candidate.title}` : ''),
                    h('span', { className: 'sd-check__bytes' }, bytes(candidate.bytes)),
                    h('span', { className: 'sd-check__time' }, dateTime(candidate.lastActive))))),
              (state.preview.protected ?? []).length === 0 ? null : h('div', { className: 'sd-protected' },
                h('h3', { className: 'sd-card__title' }, `${c.protectedTitle} · ${number(state.preview.protectedCount)}`),
                h('div', { className: 'sd-list' },
                  ...state.preview.protected.map(entry => h('div', { className: 'sd-check', key: entry.relPath },
                    h('span'),
                    h('span', { className: 'sd-check__path', title: entry.relPath }, entry.relPath),
                    h('span', { className: 'sd-check__title' }, entry.title ?? ''),
                    h('span', { className: 'sd-check__bytes' }, bytes(entry.bytes)),
                    h('span', { className: 'sd-reason' },
                      entry.reason === 'live' ? c.reasonLive : entry.reason === 'recent' ? c.reasonRecent : c.reasonOrphan)))))),
            state.preview === null ? null : h('div', { className: 'sd-bar' },
              h('span', { className: 'sd-bar__sum' },
                `${number(chosen.length)} / ${number(candidates.length)} · `,
                h('b', null, bytes(chosenBytes))),
              h('button', {
                type: 'button',
                className: `sd-button ${armed ? 'sd-button--warn' : 'sd-button--primary'}`,
                onClick: () => void clean(),
                disabled: busy || chosen.length === 0,
              }, busy ? c.moving : armed ? c.confirmMove : c.moveToTrash)),
            h('p', { className: 'sd-card__hint' }, c.cleanSafety)))
      }

      function AttachmentGc({ c, say, onCleaned }) {
        const EMPTY_PREVIEW = { loading: false, failed: null, gcPreviewId: null, candidates: [], selected: [], armed: false, busy: false }
        const [days, setDays] = useState('30')
        const [state, setState] = useState({ loading: false, failed: null, report: null })
        const [preview, setPreview] = useState(EMPTY_PREVIEW)

        const dryRun = useCallback(async () => {
          setState(current => ({ ...current, loading: true, failed: null }))
          setPreview(EMPTY_PREVIEW)
          try {
            const response = await fetch(`${API}/gc?${new URLSearchParams({ days })}`)
            const body = await response.json().catch(() => null)
            if (!response.ok) throw new Error(body?.error?.message ?? `HTTP ${response.status}`)
            setState({ loading: false, failed: null, report: body.gc })
          } catch (error) {
            setState({ loading: false, report: null, failed: error instanceof Error ? error.message : String(error) })
          }
        }, [days])

        const buildPreview = useCallback(async () => {
          setPreview(current => ({ ...current, loading: true, failed: null, armed: false }))
          try {
            const response = await fetch(`${API}/gc/preview`, {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ days: days === '' ? undefined : Number(days) }),
            })
            const body = await response.json().catch(() => null)
            if (!response.ok) throw new Error(body?.error?.message ?? `HTTP ${response.status}`)
            const candidates = body.gc?.candidates ?? []
            setPreview({
              loading: false, failed: null, gcPreviewId: body.gcPreviewId, candidates,
              selected: candidates.map(candidate => candidate.relPath), armed: false, busy: false,
            })
          } catch (error) {
            setPreview(current => ({ ...current, loading: false, failed: error instanceof Error ? error.message : String(error) }))
          }
        }, [days])

        const clean = useCallback(async () => {
          if (!preview.armed) { setPreview(current => ({ ...current, armed: true })); return }
          setPreview(current => ({ ...current, busy: true }))
          try {
            const response = await fetch(`${API}/gc/clean`, {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ gcPreviewId: preview.gcPreviewId, selected: preview.selected }),
            })
            const body = await response.json().catch(() => null)
            if (!response.ok) throw new Error(body?.error?.message ?? `HTTP ${response.status}`)
            const skipped = Array.isArray(body.skipped) ? body.skipped.length : 0
            const suffix = skipped > 0 ? ` · ${c.cleanSkipped} ${skipped}` : ''
            say(body.batchId === null ? `${c.gcNothingMoved}${suffix}` : `${c.cleanDone} ${body.batchId}${suffix}`)
            setPreview(EMPTY_PREVIEW)
            setState(current => ({ ...current, report: null }))
            if (body.batchId !== null) onCleaned()
          } catch (error) {
            say(`${c.actionFailed}: ${error.message ?? error}`)
            setPreview(current => ({ ...current, armed: false }))
          } finally {
            setPreview(current => ({ ...current, busy: false }))
          }
        }, [c, onCleaned, preview.armed, preview.gcPreviewId, preview.selected, say])

        const report = state.report
        const candidates = preview.candidates
        const chosen = candidates.filter(candidate => preview.selected.includes(candidate.relPath))
        const chosenBytes = chosen.reduce((sum, candidate) => sum + candidate.bytes, 0)
        const actionable = report !== null && report.enabled === true && report.complete === true

        return h('section', { className: 'sd-card sd-section' },
          h('div', { className: 'sd-card__head' },
            h('div', null,
              h('h2', { className: 'sd-card__title' }, c.gcTitle),
              h('p', { className: 'sd-card__hint' }, c.gcHint))),
          h('div', { className: 'sd-form' },
            h('label', { className: 'sd-field' }, c.gcDays,
              h('input', {
                type: 'number', min: '1', step: '1', value: days,
                onChange: event => setDays(event.target.value),
              })),
            h('button', {
              type: 'button', className: 'sd-button sd-button--primary',
              onClick: () => void dryRun(), disabled: state.loading,
            }, state.loading ? c.generating : c.gcDryRun)),
          state.failed === null ? null : h('div', { className: 'sd-error' }, state.failed),
          report === null ? null : h('div', null,
            h('div', { className: 'sd-note' }, c.gcScope),
            report.enabled === true ? null : h('div', { className: 'sd-note' }, c.gcDisabledNote),
            h('p', { className: 'sd-card__hint' },
              `${c.gcObjectsLine.replace('{n}', number(report.objects?.count ?? 0)).replace('{b}', bytes(report.objects?.bytes ?? 0))} · ${c.gcCorpusLine.replace('{f}', number(report.corpus?.filesScanned ?? 0)).replace('{h}', number(report.corpus?.hashes ?? 0))}`),
            (report.objects?.foreignCount ?? 0) > 0 ? h('p', { className: 'sd-card__hint' },
              c.gcForeignLine.replace('{n}', number(report.objects.foreignCount))) : null,
            report.complete === true
              ? h('p', { className: 'sd-card__hint' },
                  c.gcCandidatesLine.replace('{n}', number(report.candidateCount ?? 0)).replace('{b}', bytes(report.candidateBytes ?? 0)))
              : h('div', { className: 'sd-error' },
                  c.gcIncomplete.replace('{r}', report.incompleteReason ?? '—'),
                  (report.failures ?? []).length === 0 ? null : h('div', null,
                    h('strong', null, c.gcFailuresTitle),
                    h('ul', { style: { margin: '4px 0 0 16px' } },
                      ...report.failures.slice(0, 10).map((failure, index) => h('li', { key: `${failure.path}-${index}` },
                        `${failure.path}: ${failure.reason}`)))))),
          actionable && report.candidateCount > 0 ? h('div', { className: 'sd-form' },
            h('button', {
              type: 'button', className: 'sd-button sd-button--primary',
              onClick: () => void buildPreview(), disabled: preview.loading,
            }, preview.loading ? c.generating : c.gcRunPreview)) : null,
          preview.failed === null ? null : h('div', { className: 'sd-error' }, preview.failed),
          candidates.length === 0 ? null : h('div', null,
            h('div', { className: 'sd-list' },
              ...candidates.map(candidate => h('label', { className: 'sd-check', key: candidate.relPath },
                h('input', {
                  type: 'checkbox', checked: preview.selected.includes(candidate.relPath),
                  onChange: () => setPreview(current => ({
                    ...current,
                    armed: false,
                    selected: current.selected.includes(candidate.relPath)
                      ? current.selected.filter(item => item !== candidate.relPath)
                      : [...current.selected, candidate.relPath],
                  })),
                }),
                h('span', { className: 'sd-check__path', title: candidate.relPath }, candidate.relPath),
                h('span', { className: 'sd-check__title' }, h(KindChip, { kind: 'attachment-object', c })),
                h('span', { className: 'sd-check__bytes' }, bytes(candidate.bytes)),
                h('span', { className: 'sd-check__time' }, dateTime(candidate.mtimeMs)))))),
          candidates.length === 0 ? null : h('div', { className: 'sd-bar' },
            h('span', { className: 'sd-bar__sum' },
              `${number(chosen.length)} / ${number(candidates.length)} · `,
              h('b', null, bytes(chosenBytes))),
            h('button', {
              type: 'button',
              className: `sd-button ${preview.armed ? 'sd-button--warn' : 'sd-button--primary'}`,
              onClick: () => void clean(),
              disabled: preview.busy || chosen.length === 0,
            }, preview.busy ? c.moving : preview.armed ? c.confirmMove : c.moveToTrash)),
          h('p', { className: 'sd-card__hint' }, c.cleanSafety))
      }

      function TrashView({ c, say }) {
        const [state, setState] = useState({ loading: true, failed: null, batches: [] })
        const [purgeText, setPurgeText] = useState({})
        const [busyId, setBusyId] = useState(null)

        const load = useCallback(async () => {
          try {
            const response = await fetch(`${API}/trash`)
            const body = await response.json().catch(() => null)
            if (!response.ok) throw new Error(body?.error?.message ?? `HTTP ${response.status}`)
            setState({ loading: false, failed: null, batches: body.batches ?? [] })
          } catch (error) {
            setState(current => ({
              loading: false, batches: current.batches,
              failed: error instanceof Error ? error.message : String(error),
            }))
          }
        }, [])
        useEffect(() => { void load() }, [load])

        const act = useCallback(async (path, payload, doneMessage) => {
          setBusyId(payload.batchId)
          try {
            const response = await fetch(path, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(payload),
            })
            const body = await response.json().catch(() => null)
            if (!response.ok) throw new Error(body?.error?.message ?? `HTTP ${response.status}`)
            say(doneMessage)
            await load()
          } catch (error) {
            say(`${c.actionFailed}: ${error instanceof Error ? error.message : String(error)}`)
          } finally {
            setBusyId(null)
          }
        }, [c, load, say])

        const statusLabel = status => (status === 'trashed' ? c.statusTrashed
          : status === 'restored' ? c.statusRestored
            : status === 'purged' ? c.statusPurged : c.statusIncomplete)

        const policyText = (policy) => {
          if (policy === null || policy === undefined) return '—'
          if (policy.attachmentGc === true) return c.gcPolicySummary.replace('{d}', policy.attachmentGcDays ?? '—')
          const base = c.policySummary
            .replace('{s}', policy.sessionsDays ?? '—')
            .replace('{l}', policy.logsDays ?? '—')
            .replace('{t}', policy.tmpHours ?? '—')
          return policy.models === 1 ? `${base} · ${c.policyModelsOn}` : base
        }

        return h('section', { className: 'sd-card sd-section' },
          h('div', { className: 'sd-card__head' },
            h('div', null,
              h('h2', { className: 'sd-card__title' }, c.trashTitle),
              h('p', { className: 'sd-card__hint' }, c.trashHint)),
            h('button', { type: 'button', className: 'sd-button', onClick: () => void load(), disabled: state.loading }, c.retry)),
          state.failed === null ? null : h('div', { className: 'sd-error' }, state.failed),
          state.loading
            ? h('div', { className: 'sd-skeleton sd-skeleton--block' })
            : state.failed !== null && state.batches.length === 0
              ? h('p', { className: 'sd-card__hint' }, c.loadFailedNotListed)
              : state.batches.length === 0
                ? h('p', { className: 'sd-card__hint' }, c.noBatches)
              : h('div', null, ...state.batches.map(batch => h('div', { className: 'sd-batch', key: batch.id },
                h('div', null,
                  h('div', { className: 'sd-batch__id' }, batch.id),
                  h('div', { className: 'sd-batch__meta' },
                    h('span', null, dateTime(batch.at)),
                    h('span', null, policyText(batch.policy)),
                    h('span', null, `${c.colItems} `, h('b', null, number(batch.itemCount))),
                    h('span', null, h('b', null, bytes(batch.bytes))),
                    h('span', { className: `sd-status sd-status--${batch.status}` }, statusLabel(batch.status)))),
                h('div', { className: 'sd-batch__actions' },
                  batch.status === 'trashed'
                    ? h('button', {
                      type: 'button', className: 'sd-button',
                      onClick: () => void act(`${API}/restore`, { batchId: batch.id }, c.restoreDone),
                      disabled: busyId === batch.id,
                    }, busyId === batch.id ? c.restoring : c.restore)
                    : null,
                  batch.onDisk === null ? null : h('span', { className: 'sd-purge' },
                    h('input', {
                      type: 'text', placeholder: 'PURGE', value: purgeText[batch.id] ?? '',
                      onChange: event => setPurgeText(current => ({ ...current, [batch.id]: event.target.value })),
                    }),
                    ' ',
                    h('button', {
                      type: 'button', className: 'sd-button sd-button--danger',
                      title: c.purgePrompt,
                      onClick: () => void act(`${API}/purge`, { batchId: batch.id, confirm: 'PURGE' }, c.purgeDone),
                      disabled: busyId === batch.id || (purgeText[batch.id] ?? '') !== 'PURGE',
                    }, busyId === batch.id ? c.purging : c.purge)))))))
      }

      function TrendView({ c }) {
        const [state, setState] = useState({ loading: true, failed: null, trend: [], autoScan: null })
        const load = useCallback(async () => {
          try {
            const response = await fetch(`${API}/trend?limit=400`)
            const body = await response.json().catch(() => null)
            if (!response.ok) throw new Error(body?.error?.message ?? `HTTP ${response.status}`)
            setState({
              loading: false, failed: null,
              trend: Array.isArray(body.trend) ? body.trend : [],
              autoScan: body.autoScan ?? null,
            })
          } catch (error) {
            setState({ loading: false, failed: error instanceof Error ? error.message : String(error), trend: [], autoScan: null })
          }
        }, [])
        useEffect(() => { void load() }, [load])

        const points = state.trend
        const W = 760
        const H = 250
        const L = 66
        const R = 14
        const T = 14
        const B = 30
        const innerW = W - L - R
        const innerH = H - T - B
        const maxBytes = Math.max(1, ...points.map(point => point.totalBytes || 0))
        const xAt = index => (points.length === 1 ? L + innerW / 2 : L + (index * innerW) / (points.length - 1))
        const yOf = value => T + (1 - value / maxBytes) * innerH
        const series = [
          { key: 'total', label: c.seriesTotal, color: 'var(--dsw-alias-brand-primary)', width: 2, pick: point => point.totalBytes || 0 },
          // Distinct, legend-consistent hues: the sessions category color on the
          // overview stack is brand-primary (black), which would collide with the
          // total line here — the chart uses the success/warn state hues instead.
          { key: 'sessions', label: c.seriesSessions, color: 'var(--dsw-alias-state-success-primary)', width: 1.4, pick: point => point.categories?.sessions?.bytes ?? 0 },
          { key: 'plugin', label: c.seriesPlugin, color: 'var(--dsw-alias-state-warn-primary)', width: 1.4, pick: point => point.categories?.pluginData?.bytes ?? 0 },
        ]
        const line = pick => points.map((point, index) => `${xAt(index).toFixed(1)},${yOf(pick(point)).toFixed(1)}`).join(' ')

        const chart = points.length === 0 ? null : h('svg', { className: 'sd-chart', viewBox: `0 0 ${W} ${H}`, role: 'img' },
          ...[0, 0.5, 1].map(fraction => h('g', { key: `grid-${fraction}` },
            h('line', { className: 'sd-chart__grid', x1: L, x2: W - R, y1: yOf(maxBytes * fraction), y2: yOf(maxBytes * fraction) }),
            h('text', { x: L - 8, y: yOf(maxBytes * fraction) + 3, textAnchor: 'end' }, bytes(maxBytes * fraction)))),
          ...series.map(entry => h('polyline', {
            key: entry.key, fill: 'none', stroke: entry.color, strokeWidth: entry.width,
            strokeLinejoin: 'round', points: line(entry.pick),
          })),
          ...points.map((point, index) => h('circle', {
            key: `dot-${point.at}`, cx: xAt(index).toFixed(1), cy: yOf(point.totalBytes || 0).toFixed(1),
            r: 2.4, fill: 'var(--dsw-alias-brand-primary)',
          }, h('title', null, `${dateTime(point.at)} · ${bytes(point.totalBytes)}`))),
          h('text', { x: L, y: H - 8 }, dateTime(points[0].at)),
          points.length > 1 ? h('text', { x: W - R, y: H - 8, textAnchor: 'end' }, dateTime(points[points.length - 1].at)) : null)

        const every = state.autoScan?.intervalHours > 0
          ? c.autoScanEvery.replace('{h}', number(state.autoScan.intervalHours))
          : c.autoScanOff
        const days = state.autoScan?.retentionDays > 0
          ? `${number(state.autoScan.retentionDays)} ${c.unitDays}`
          : c.retentionOff

        return h('section', { className: 'sd-card sd-clean' },
          h('div', { className: 'sd-card__head' },
            h('div', null,
              h('h2', { className: 'sd-card__title' }, c.trendTitle),
              h('p', { className: 'sd-card__hint' }, c.trendHint))),
          state.autoScan ? h('div', { className: 'sd-meta' },
            h('span', null, c.autoScanLine.replace('{every}', every).replace('{days}', days))) : null,
          state.loading ? h('div', { className: 'sd-skeleton sd-skeleton--block' })
            : state.failed !== null
              ? h('div', { className: 'sd-error__body' }, h('strong', null, `${c.loadError}: ${state.failed}`))
              : points.length === 0
                ? h('div', { className: 'sd-empty__body' }, h('p', { className: 'sd-empty__text' }, c.noHistory))
                : h('div', null, chart,
                    h('div', { className: 'sd-chart__legend' },
                      ...series.map(entry => h('span', { key: entry.key },
                        h('i', { style: { background: entry.color } }), entry.label)))))
      }

      function Page() {
        const c = tcopy()
        const [state, setState] = useState({ loading: true, failed: null, body: null })
        const [notice, setNotice] = useState('')
        const noticeTimer = useRef(null)

        const say = useCallback((text) => {
          setNotice(text)
          clearTimeout(noticeTimer.current)
          noticeTimer.current = setTimeout(() => setNotice(''), 4000)
        }, [])
        useEffect(() => () => clearTimeout(noticeTimer.current), [])

        const refresh = useCallback(async () => {
          try {
            const response = await fetch(`${API}/overview`)
            const body = await response.json().catch(() => null)
            if (!response.ok) throw new Error(body?.error?.message ?? `HTTP ${response.status}`)
            setState({ loading: false, failed: null, body })
          } catch (error) {
            setState(current => ({
              loading: false,
              failed: error instanceof Error ? error.message : String(error),
              body: current.body,
            }))
          }
        }, [])

        useEffect(() => { void refresh() }, [refresh])

        const running = state.body?.scan?.running === true
        useEffect(() => {
          if (!running) return undefined
          let disposed = false
          const tick = async () => {
            try {
              const response = await fetch(`${API}/status`)
              const body = await response.json().catch(() => null)
              if (disposed || !response.ok) return
              if (body?.scan?.running === true) {
                setState(current => (current.body === null ? current : { ...current, body: { ...current.body, scan: body.scan } }))
              } else {
                await refresh()
                if (!disposed) say(tcopy().scanDone)
              }
            } catch { /* transient; the next tick retries */ }
          }
          void tick()
          const timer = setInterval(() => void tick(), 1200)
          return () => { disposed = true; clearInterval(timer) }
        }, [running, refresh, say])

        const onScan = useCallback(async () => {
          try {
            const response = await fetch(`${API}/scan`, { method: 'POST' })
            const body = await response.json().catch(() => null)
            if (!response.ok) throw new Error(body?.error?.message ?? `HTTP ${response.status}`)
            say(body?.started ? tcopy().scanStarted : tcopy().alreadyRunning)
            await refresh()
          } catch (error) {
            say(`${tcopy().actionFailed}: ${error instanceof Error ? error.message : String(error)}`)
          }
        }, [refresh, say])

        const scan = state.body?.scan ?? null
        const overview = state.body?.overview ?? null
        const total = overview?.totalBytes ?? 0
        const [tab, setTab] = useState('overview')

        const head = h('header', { className: 'sd-head' },
          h('div', null,
            h('h1', { className: 'sd-title' }, c.title),
            h('p', { className: 'sd-subtitle' }, c.subtitle),
            h('div', { className: 'sd-meta' },
              scan?.home ? h('span', null, `${c.homeLabel} `, h('code', null, scan.home)) : null,
              h('span', null, `${c.lastScan}: `,
                h('b', null, overview?.at ? dateTime(overview.at) : c.never),
                overview?.durationMs !== undefined ? ` · ${c.took} ${duration(overview.durationMs)}` : ''),
              scan?.errorCount > 0
                ? h('span', { className: 'sd-badge sd-badge--warn', title: scan.lastError ?? '' }, `${number(scan.errorCount)} ${c.errorsBadge}`)
                : null)),
          h('div', { className: 'sd-actions' },
            h('span', { className: 'sd-badge' }, c.readOnly),
            h('button', {
              type: 'button', className: 'sd-button sd-button--primary',
              onClick: () => void onScan(), disabled: running || state.loading,
            }, running ? c.scanning : overview ? c.rescan : c.scan)))

        const runningCard = !running || tab !== 'overview' ? null : h('section', { className: 'sd-card sd-running', role: 'status', 'aria-live': 'polite' },
          h('div', null,
            h('div', { className: 'sd-running__title' }, c.runningTitle),
            h('div', { className: 'sd-progress' }, h('span'))),
          h('div', { className: 'sd-running__stat' }, c.runningDirs, h('strong', null, number(scan?.progress?.dirsWalked))),
          h('div', { className: 'sd-running__stat' }, c.runningFiles, h('strong', null, number(scan?.progress?.filesCounted))))

        const persistedNote = overview?.partial !== true || tab !== 'overview' ? null
          : h('div', { className: 'sd-note', role: 'note' }, c.persistedNote)

        const tabsBar = h('div', { className: 'sd-tabs', role: 'tablist' },
          ...[['overview', c.tabOverview], ['clean', c.tabClean], ['trash', c.tabTrash], ['trend', c.tabTrend]].map(([id, label]) =>
            h('button', {
              key: id, type: 'button', role: 'tab', 'aria-selected': tab === id,
              onClick: () => setTab(id),
            }, label)))

        let content
        if (tab === 'trend') {
          content = h(TrendView, { c })
        } else if (tab === 'clean') {
          content = h('div', null,
            h(CleanView, { c, say, onCleaned: () => setTab('trash') }),
            h(AttachmentGc, { c, say, onCleaned: () => setTab('trash') }))
        } else if (tab === 'trash') {
          content = h(TrashView, { c, say })
        } else if (state.failed !== null && overview === null) {
          content = h('div', { className: 'sd-card sd-error' },
            h('div', { className: 'sd-error__body' },
              h('strong', null, `${c.loadError}: ${state.failed}`),
              h('button', { type: 'button', className: 'sd-button', onClick: () => void refresh() }, c.retry)))
        } else if (state.loading) {
          content = h('div', null,
            h('div', { className: 'sd-kpis' }, ...[0, 1, 2, 3].map(index => h('div', { className: 'sd-skeleton sd-skeleton--kpi', key: index }))),
            h('div', { className: 'sd-skeleton sd-skeleton--block' }))
        } else if (overview === null) {
          content = h('div', { className: 'sd-card sd-empty' },
            h('div', { className: 'sd-empty__body' },
              h('span', { className: 'sd-empty__icon' }, h(Icon, { size: 44 })),
              h('h2', { className: 'sd-empty__title' }, c.emptyTitle),
              h('p', { className: 'sd-empty__text' }, c.emptyBody),
              h('button', {
                type: 'button', className: 'sd-button sd-button--primary sd-button--big',
                onClick: () => void onScan(), disabled: running,
              }, running ? c.scanning : c.scan),
              h('p', { className: 'sd-empty__safety' }, c.emptySafety)))
        } else {
          content = h('div', null,
            h('div', { className: 'sd-kpis' },
              h(Kpi, { label: c.total, value: bytes(total), hero: true }),
              h(Kpi, {
                label: c.files, value: number(overview.totalFiles),
                meta: overview.dirsWalked !== undefined ? `${c.dirs}: ${number(overview.dirsWalked)}` : null,
              }),
              h(Kpi, {
                label: c.sessionsBytes, value: bytes(overview.categories?.sessions?.bytes),
                meta: `${c.ofTotal} ${share(overview.categories?.sessions?.bytes, total)}`,
                color: 'var(--sd-c-sessions)',
              }),
              h(Kpi, {
                label: c.pluginBytes, value: bytes(overview.categories?.pluginData?.bytes),
                meta: `${c.ofTotal} ${share(overview.categories?.pluginData?.bytes, total)}`,
                color: 'var(--sd-c-pluginData)',
              })),
            h(Categories, { categories: overview.categories, total, c }),
            h('div', { className: 'sd-grid' },
              h(TopFiles, { files: overview.topFiles, c }),
              h(PluginRank, { plugins: overview.pluginData, c })))
        }

        return h('main', { className: 'sd-page' }, h('div', { className: 'sd-shell' },
          head,
          tabsBar,
          runningCard,
          persistedNote,
          content,
          h('footer', { className: 'sd-foot' }, c.footer),
          notice === '' ? null : h('div', { className: 'sd-toast', role: 'status' }, notice)))
      }

      return {
        inject: ['slots', 'locale'],
        apply(ctx) {
          ctx.effect(() => {
            const style = document.createElement('style')
            // client-modules' HMR bookkeeping (claimStyles/removeOwnedStyles) sweeps
            // every <style> WITHOUT data-plugin at each factory materialization and
            // claims it for that package; a later replace of the claiming package
            // then removes it. Apply-time injection happens after our own
            // materialization, so stamp ownership at creation: only our own
            // replace/unload path may ever remove this tag (and the effect disposer
            // below runs first in that sequence, keeping removal idempotent).
            style.setAttribute('data-plugin', PACKAGE_ID)
            style.dataset.storageDoctor = 'true'
            style.textContent = STYLE
            document.head.append(style)
            return () => style.remove()
          }, 'storage-doctor: styles')
          ctx.effect(() => ctx.locale.register('storageDoctor', {
            zh: { panel: COPY.zh.panel },
            en: { panel: COPY.en.panel },
          }), 'storage-doctor: locale')
          const label = ctx.locale.bind('storageDoctor')
          ctx.slots.inject('main', () => ctx.slots.register({
            name: 'main', key: PANEL_ID, locale: 'storageDoctor',
          }, Page))
          ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
            name: 'sidebar.panellist', id: PANEL_ID, order: 20,
            label: () => label('panel'), locale: 'storageDoctor',
          }, Icon))
        },
      }
    },
  })
})()
