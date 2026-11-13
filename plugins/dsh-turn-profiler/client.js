(() => {
  const PACKAGE_ID = '@local/dsh-turn-profiler'
  const PANEL_ID = 'turn-profiler'
  const API = '/api/turn-profiler'

  const COPY = {
    zh: {
      panel: '性能剖析', title: '性能剖析',
      subtitle: '每轮对话的延迟瀑布图 · token 去向 · 缓存诊断',
      refresh: '刷新',
      scanning: '正在回填历史会话…', backfillDone: '历史回填完成', backfillErrors: '回填完成（有读取错误）',
      backfillFailed: '回填失败', backfillCancelled: '回填已取消', backfillIdle: '等待回填…',
      progress: '进度', scanned: '已扫描', skipped: '未变更', readErrors: '读取错误',
      ledgerTurns: '累计轮次', ledgerSessions: '累计会话', liveErrors: '实时错误',
      workspace: '工作区', allWorkspaces: '全部工作区',
      session: '会话', selectSession: '选择会话…', untitled: '（无标题）',
      turnsTitle: '轮次列表', turn: '轮', startedAt: '开始', wall: '时长', reason: '结束原因',
      steps: '步', retries: '重试', llm: 'LLM', tools: '工具',
      inputTokens: '输入', outputTokens: '输出', cacheRead: '缓存读', cacheHit: '命中率', model: '模型',
      openTurn: '进行中', waterfall: '延迟瀑布图',
      reasons: {
        completed: '完成', aborted: '已中止', blocked: '被阻塞', error: '错误',
        'max-tokens': '达到上限', interrupted: '被中断', forked: '分叉', unknown: '未知',
      },
      sumLlm: 'LLM', sumTool: '工具', sumOther: '其他/间隙',
      waitSeg: '等待首 token', genSeg: '生成', toolSeg: '工具',
      stepLabel: '步', tokensLabel: 'tokens',
      reconstructedNote: '虚线边框 = 历史重建值；实线 = 插件运行期间的实时精确捕获。',
      toolNote: '工具耗时包含等待/审批时间；并行工具的时间段会重叠。',
      noTurnSelected: '在轮次列表中点击一轮，查看它的瀑布图。',
      noData: '暂无数据', noSessions: '还没有已回填的会话数据', loading: '加载中…',
      loadError: '加载失败', retryBtn: '重试',
      of: '共', rows: '轮', prevPage: '上一页', nextPage: '下一页',
      sort: '排序', asc: '升序', desc: '降序',
      unknownValue: '—', totalWall: '整轮',
      ghostTools: '个未配对工具结果未显示',
      overview: '总览', sessionView: '会话视图',
      kpiWall: '轮时长 P50 / P95', kpiTtft: 'TTFT P50 / P95',
      kpiHit: '缓存命中率', kpiRetry: '重试率', kpiToolShare: '工具耗时占比',
      topTools: '最慢工具 Top10', topTurns: '最慢轮 Top10',
      dailyTrend: '按日趋势（LLM / 工具 / 其他 堆叠）',
      calls: '次', from: '从', to: '至', provider: '提供商',
      allProviders: '全部提供商', allModels: '全部模型',
      clickToOpen: '点击查看该轮瀑布图',
      retrySeg: '重试尝试', cacheBreak: '缓存边界（请求头变更）',
      live: '实时', liveHint: '开启后每 1.5 秒自动刷新当前会话（ETag 条件请求）',
      exportBtn: '导出 JSON',
      exactBadge: '精确计时', mixedBadge: '部分精确', reconBadge: '重建计时',
      settingsTitle: '显示设置', slowLabel: '慢轮阈值（秒）', langLabel: '语言',
      langAuto: '跟随系统', langZh: '中文', langEn: 'English',
      settingsHint: '设置仅保存在本浏览器本地；超过阈值的轮在轮次表中以橙色底纹高亮。',
    },
    en: {
      panel: 'Turn Profiler', title: 'Turn Profiler',
      subtitle: 'Per-turn latency waterfall · token flow · cache diagnostics',
      refresh: 'Refresh',
      scanning: 'Backfilling session history…', backfillDone: 'History backfill complete',
      backfillErrors: 'Backfill complete (with read errors)', backfillFailed: 'Backfill failed',
      backfillCancelled: 'Backfill cancelled', backfillIdle: 'Waiting for backfill…',
      progress: 'Progress', scanned: 'Scanned', skipped: 'Unchanged', readErrors: 'Read errors',
      ledgerTurns: 'Turns stored', ledgerSessions: 'Sessions stored', liveErrors: 'Live errors',
      workspace: 'Workspace', allWorkspaces: 'All workspaces',
      session: 'Session', selectSession: 'Select a session…', untitled: '(untitled)',
      turnsTitle: 'Turns', turn: 'Turn', startedAt: 'Started', wall: 'Duration', reason: 'End reason',
      steps: 'Steps', retries: 'Retries', llm: 'LLM', tools: 'Tools',
      inputTokens: 'Input', outputTokens: 'Output', cacheRead: 'Cache read', cacheHit: 'Hit rate', model: 'Model',
      openTurn: 'Running', waterfall: 'Latency waterfall',
      reasons: {
        completed: 'completed', aborted: 'aborted', blocked: 'blocked', error: 'error',
        'max-tokens': 'max tokens', interrupted: 'interrupted', forked: 'forked', unknown: 'unknown',
      },
      sumLlm: 'LLM', sumTool: 'Tools', sumOther: 'Other/gap',
      waitSeg: 'Waiting for first token', genSeg: 'Generating', toolSeg: 'Tool',
      stepLabel: 'Step', tokensLabel: 'tokens',
      reconstructedNote: 'Dashed borders = reconstructed from history; solid = exact live capture while the plugin runs.',
      toolNote: 'Tool durations include waiting/approval time; parallel tools overlap.',
      noTurnSelected: 'Click a turn above to inspect its waterfall.',
      noData: 'No data', noSessions: 'No backfilled session data yet', loading: 'Loading…',
      loadError: 'Load failed', retryBtn: 'Retry',
      of: 'of', rows: 'turns', prevPage: 'Previous', nextPage: 'Next',
      sort: 'Sort', asc: 'Ascending', desc: 'Descending',
      unknownValue: '—', totalWall: 'Turn',
      ghostTools: 'unmatched tool results not shown',
      overview: 'Overview', sessionView: 'Sessions',
      kpiWall: 'Turn wall P50 / P95', kpiTtft: 'TTFT P50 / P95',
      kpiHit: 'Cache hit rate', kpiRetry: 'Retry rate', kpiToolShare: 'Tool time share',
      topTools: 'Slowest tools Top10', topTurns: 'Slowest turns Top10',
      dailyTrend: 'Daily trend (LLM / tool / other stacked)',
      calls: 'calls', from: 'From', to: 'To', provider: 'Provider',
      allProviders: 'All providers', allModels: 'All models',
      clickToOpen: 'Click to open this turn’s waterfall',
      retrySeg: 'Retry attempt', cacheBreak: 'Cache boundary (request header changed)',
      live: 'Live', liveHint: 'Auto-refresh the current session every 1.5s (conditional requests)',
      exportBtn: 'Export JSON',
      exactBadge: 'exact timing', mixedBadge: 'partly exact', reconBadge: 'reconstructed',
      settingsTitle: 'Display settings', slowLabel: 'Slow-turn threshold (s)', langLabel: 'Language',
      langAuto: 'Follow system', langZh: '中文', langEn: 'English',
      settingsHint: 'Stored in this browser only; turns over the threshold are tinted in the turn table.',
    },
  }

  const SETTINGS_KEY = 'turn-profiler.settings.v1'
  const DEFAULT_SETTINGS = { slowSeconds: 60, live: false, lang: 'auto' }
  // M4: manual language override lives at module scope so every formatter
  // (number/clock/copy) sees it; Page owns the persisted value.
  let langOverride = 'auto'

  function readSettings() {
    try {
      const raw = window.localStorage?.getItem(SETTINGS_KEY)
      if (!raw) return { ...DEFAULT_SETTINGS }
      const parsed = JSON.parse(raw)
      const slowSeconds = Number(parsed?.slowSeconds)
      return {
        slowSeconds: Number.isFinite(slowSeconds) && slowSeconds > 0 ? slowSeconds : DEFAULT_SETTINGS.slowSeconds,
        live: parsed?.live === true,
        lang: parsed?.lang === 'zh' || parsed?.lang === 'en' ? parsed.lang : 'auto',
      }
    } catch {
      return { ...DEFAULT_SETTINGS }
    }
  }

  function writeSettings(settings) {
    try {
      window.localStorage?.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      // storage can be unavailable (private mode); settings stay in-memory
    }
  }

  // Apply the persisted language before the first render so copy is correct
  // from the very first paint.
  langOverride = readSettings().lang

  function localeKey() {
    if (langOverride === 'zh' || langOverride === 'en') return langOverride
    const language = document.documentElement.lang || navigator.language || 'en'
    return language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
  }

  const STYLE = `
  .tp-page, .tp-page * { box-sizing: border-box; }
  .tp-page {
    height:100%; min-width:0; min-height:0; overflow:auto;
    padding:calc(26px + var(--dsh-frame-top-clearance, 0px)) 28px 48px;
    background:var(--dsw-alias-bg-base); color:var(--dsw-alias-label-primary);
    font-family:var(--dsw-font-family, inherit);
  }
  .tp-shell { width:min(1280px, 100%); margin:0 auto; }
  .tp-head { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; margin-bottom:18px; }
  .tp-title { margin:0; font-size:26px; line-height:1.2; letter-spacing:-.02em; }
  .tp-subtitle { margin:7px 0 0; color:var(--dsw-alias-label-secondary); font-size:12px; }
  .tp-button { min-height:34px; padding:0 13px; border:0.5px solid var(--dsw-alias-border-l2); border-radius:var(--dsw-radius-md, 10px); background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); cursor:pointer; font:inherit; font-size:12px; font-weight:600; transition:background .12s ease, transform .12s ease; }
  .tp-button:hover { background:var(--dsw-alias-interactive-hover); }
  .tp-button:active { transform:scale(.97); }
  .tp-button:disabled { cursor:not-allowed; opacity:.55; }
  .tp-scan { display:grid; grid-template-columns:minmax(220px, 1.4fr) repeat(4, minmax(96px, .55fr)); gap:12px; align-items:center; margin-bottom:14px; padding:12px 15px; border:0.5px solid var(--dsw-alias-border-l3); border-radius:var(--dsw-radius-lg, 14px); background:var(--dsw-alias-bg-layer-1); }
  .tp-scan__title { font-size:12px; font-weight:700; }
  .tp-scan__meta { margin-top:4px; color:var(--dsw-alias-label-tertiary); font-size:10px; }
  .tp-progress { height:4px; margin-top:8px; overflow:hidden; border-radius:99px; background:var(--dsw-alias-bg-layer-3); }
  .tp-progress span { display:block; height:100%; border-radius:inherit; background:var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4176e6); transition:width .25s ease; }
  .tp-scan__stat { color:var(--dsw-alias-label-tertiary); font-size:10px; text-transform:uppercase; letter-spacing:.04em; }
  .tp-scan__stat strong { display:block; margin-top:4px; color:var(--dsw-alias-label-primary); font-size:14px; letter-spacing:0; font-variant-numeric:tabular-nums; }
  .tp-scan__stat strong[data-bad='true'] { color:var(--dsw-alias-state-error-primary, #d54941); }
  .tp-filters { display:grid; grid-template-columns:minmax(180px, 1fr) minmax(260px, 1.6fr) auto auto auto; gap:10px; align-items:end; margin-bottom:14px; }
  .tp-ov-actions { display:flex; justify-content:flex-end; margin:-4px 0 12px; }
  .tp-settings { display:flex; flex-wrap:wrap; gap:16px; align-items:end; margin:-6px 0 14px; padding:10px 14px; border:0.5px solid var(--dsw-alias-border-l3); border-radius:var(--dsw-radius-lg, 14px); background:var(--dsw-alias-bg-layer-1); }
  .tp-settings__title { margin:0; font-size:11px; font-weight:700; color:var(--dsw-alias-label-secondary); text-transform:uppercase; letter-spacing:.04em; align-self:center; }
  .tp-settings__hint { margin:0; flex:1 1 240px; color:var(--dsw-alias-label-tertiary); font-size:10px; line-height:1.5; align-self:center; }
  .tp-input { height:34px; width:92px; padding:0 9px; border:0.5px solid var(--dsw-alias-border-l2); border-radius:var(--dsw-radius-md, 10px); outline:0; background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-primary); font:inherit; font-size:12px; font-variant-numeric:tabular-nums; }
  .tp-input:focus { border-color:var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4176e6); }
  .tp-table tbody tr[data-slow='true'] { background:color-mix(in srgb, var(--dsw-alias-state-warn-primary, #d97706) 9%, transparent); }
  .tp-table tbody tr[data-slow='true']:hover { background:color-mix(in srgb, var(--dsw-alias-state-warn-primary, #d97706) 15%, transparent); }
  .tp-field { display:grid; gap:6px; color:var(--dsw-alias-label-tertiary); font-size:11px; font-weight:600; }
  .tp-select { width:100%; min-width:0; height:34px; padding:0 10px; border:0.5px solid var(--dsw-alias-border-l2); border-radius:var(--dsw-radius-md, 10px); outline:0; background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-primary); font:inherit; font-size:12px; }
  .tp-select:focus { border-color:var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4176e6); box-shadow:0 0 0 3px color-mix(in srgb, var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4176e6) 18%, transparent); }
  .tp-card { min-width:0; margin-bottom:14px; border:0.5px solid var(--dsw-alias-border-l3); border-radius:var(--dsw-radius-lg, 14px); background:var(--dsw-alias-bg-layer-1); }
  .tp-card__head { display:flex; align-items:baseline; justify-content:space-between; gap:12px; padding:14px 16px 0; }
  .tp-card__title { margin:0; font-size:13px; font-weight:700; }
  .tp-card__hint { margin:4px 0 0; color:var(--dsw-alias-label-tertiary); font-size:10px; line-height:1.45; }
  .tp-table-wrap { max-height:min(420px, 46vh); overflow:auto; margin-top:12px; border-top:0.5px solid var(--dsw-alias-border-l4); scrollbar-gutter:stable; }
  .tp-table { width:100%; min-width:1080px; border-collapse:separate; border-spacing:0; font-size:11px; }
  .tp-table th { padding:8px 10px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-tertiary); font-weight:650; text-align:left; white-space:nowrap; }
  .tp-table td { max-width:220px; padding:8px 10px; border-top:0.5px solid var(--dsw-alias-border-l4); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-variant-numeric:tabular-nums; }
  .tp-table tbody tr { cursor:pointer; transition:background .12s ease; }
  .tp-table tbody tr:hover { background:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 65%, transparent); }
  .tp-table tbody tr[data-selected='true'] { background:color-mix(in srgb, var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4176e6) 12%, transparent); box-shadow:inset 2px 0 0 var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4176e6); }
  .tp-durbar { display:flex; align-items:center; gap:7px; }
  .tp-durbar__track { width:70px; height:6px; overflow:hidden; border-radius:99px; background:var(--dsw-alias-bg-layer-3); flex:none; }
  .tp-durbar__fill { display:block; height:100%; border-radius:inherit; background:var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4176e6); }
  .tp-badge { display:inline-flex; align-items:center; gap:4px; padding:1px 7px; border-radius:99px; background:var(--dsw-alias-bg-layer-3); color:var(--dsw-alias-label-secondary); font-size:9px; font-weight:650; white-space:nowrap; }
  .tp-badge::before { width:5px; height:5px; border-radius:50%; background:currentColor; content:''; }
  .tp-badge[data-reason='completed'] { background:color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 15%, transparent); color:var(--dsw-alias-state-success-primary, #16a34a); }
  .tp-badge[data-reason='error'] { background:color-mix(in srgb, var(--dsw-alias-state-error-primary, #d54941) 15%, transparent); color:var(--dsw-alias-state-error-primary, #d54941); }
  .tp-badge[data-reason='max-tokens'], .tp-badge[data-reason='interrupted'], .tp-badge[data-reason='blocked'] { background:color-mix(in srgb, var(--dsw-alias-state-warn-primary, #d97706) 15%, transparent); color:var(--dsw-alias-state-warn-primary, #d97706); }
  .tp-badge[data-reason='open'] { background:color-mix(in srgb, var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4176e6) 15%, transparent); color:var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4176e6); }
  .tp-badge[data-reason='open']::before { animation:tp-pulse 1.6s ease-in-out infinite; }
  .tp-pager { display:flex; align-items:center; justify-content:flex-end; gap:8px; padding:10px 16px; color:var(--dsw-alias-label-tertiary); font-size:10px; font-variant-numeric:tabular-nums; }
  .tp-pager button { padding:4px 9px; border:0.5px solid var(--dsw-alias-border-l2); border-radius:7px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); cursor:pointer; font:inherit; font-size:10px; }
  .tp-pager button:disabled { cursor:not-allowed; opacity:.4; }
  .tp-wf { padding:14px 16px 16px; }
  .tp-wf-summary { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
  .tp-wf-summary__bar { display:flex; flex:1; height:12px; overflow:hidden; border-radius:99px; background:var(--dsw-alias-bg-layer-3); }
  .tp-wf-summary__seg { height:100%; }
  .tp-wf-summary__seg[data-kind='llm'] { background:var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4176e6); }
  .tp-wf-summary__seg[data-kind='tool'] { background:var(--dsw-alias-state-success-primary, #16a34a); }
  .tp-wf-summary__seg[data-kind='other'] { background:var(--dsw-alias-bg-layer-3); outline:0.5px solid var(--dsw-alias-border-l2); }
  .tp-wf-summary__total { color:var(--dsw-alias-label-secondary); font-size:11px; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .tp-legend { display:flex; flex-wrap:wrap; gap:12px; margin-bottom:12px; color:var(--dsw-alias-label-tertiary); font-size:10px; }
  .tp-legend span { display:inline-flex; align-items:center; gap:5px; }
  .tp-legend i { width:10px; height:10px; border-radius:3px; }
  .tp-legend i[data-kind='wait'] { background:var(--dsw-alias-bg-layer-3); outline:0.5px solid var(--dsw-alias-border-l2); }
  .tp-legend i[data-kind='gen'] { background:var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4176e6); }
  .tp-legend i[data-kind='ok'] { background:var(--dsw-alias-state-success-primary, #16a34a); }
  .tp-legend i[data-kind='err'] { background:var(--dsw-alias-state-error-primary, #d54941); }
  .tp-wf-axis { position:relative; height:16px; margin-left:64px; border-bottom:0.5px solid var(--dsw-alias-border-l4); }
  .tp-wf-tick { position:absolute; top:0; transform:translateX(-50%); color:var(--dsw-alias-label-caption); font-size:9px; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .tp-wf-lane { display:flex; gap:8px; align-items:stretch; margin-top:8px; }
  .tp-wf-lane__label { flex:none; width:56px; padding-top:5px; color:var(--dsw-alias-label-tertiary); font-size:10px; text-align:right; font-variant-numeric:tabular-nums; }
  .tp-wf-lane__label strong { display:block; color:var(--dsw-alias-label-secondary); font-size:11px; }
  .tp-wf-track { position:relative; flex:1; min-width:0; border-radius:6px; background:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 45%, transparent); }
  .tp-wf-row { position:relative; height:20px; }
  .tp-wf-row + .tp-wf-row { margin-top:3px; }
  .tp-seg { position:absolute; top:2px; bottom:2px; min-width:2px; overflow:hidden; border-radius:4px; color:var(--dsw-alias-label-on-color, white); font-size:9px; line-height:16px; white-space:nowrap; padding:0 5px; cursor:default; }
  .tp-seg[data-kind='wait'] { background:var(--dsw-alias-bg-layer-3); outline:0.5px solid var(--dsw-alias-border-l2); color:var(--dsw-alias-label-tertiary); }
  .tp-seg[data-kind='gen'] { background:var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4176e6); }
  .tp-seg[data-kind='ok'] { background:var(--dsw-alias-state-success-primary, #16a34a); }
  .tp-seg[data-kind='err'] { background:var(--dsw-alias-state-error-primary, #d54941); }
  .tp-seg[data-exact='false'] { outline:1px dashed color-mix(in srgb, currentColor 65%, transparent); outline-offset:-1px; }
  .tp-seg[data-kind='wait'][data-exact='false'] { outline:1px dashed var(--dsw-alias-border-l2); outline-offset:-1px; }
  .tp-seg[data-kind='retry'] { background:var(--dsw-alias-state-warn-primary, #d97706); }
  .tp-legend i[data-kind='retry'] { background:var(--dsw-alias-state-warn-primary, #d97706); }
  .tp-legend i[data-kind='cache'] { width:0; height:12px; border-radius:0; background:none; border-left:1.5px dashed var(--dsw-alias-state-warn-primary, #d97706); }
  .tp-wf-marker { position:absolute; top:-2px; bottom:-2px; left:0; width:0; border-left:1.5px dashed var(--dsw-alias-state-warn-primary, #d97706); opacity:.9; z-index:2; cursor:help; }
  .tp-tbadge { display:inline-block; margin-left:8px; padding:2px 7px; border-radius:99px; font-size:9px; font-weight:700; letter-spacing:.03em; vertical-align:middle; }
  .tp-tbadge[data-kind='exact'] { background:color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 18%, transparent); color:var(--dsw-alias-state-success-primary, #16a34a); }
  .tp-tbadge[data-kind='mixed'] { background:color-mix(in srgb, var(--dsw-alias-state-warn-primary, #d97706) 18%, transparent); color:var(--dsw-alias-state-warn-primary, #d97706); }
  .tp-tbadge[data-kind='recon'] { background:var(--dsw-alias-bg-layer-3); color:var(--dsw-alias-label-tertiary); }
  .tp-button[data-on='true'] { border-color:var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4176e6); color:var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4176e6); background:color-mix(in srgb, var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4176e6) 10%, var(--dsw-alias-bg-layer-2)); }
  a.tp-button { display:inline-flex; align-items:center; justify-content:center; text-decoration:none; }
  .tp-tabs { display:flex; gap:8px; margin:0 0 14px; }
  .tp-tab { border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-secondary); border-radius:999px; padding:6px 14px; font-size:12px; font-weight:600; cursor:pointer; }
  .tp-tab--on { background:var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4176e6); border-color:var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4176e6); color:var(--dsw-alias-bg-layer-1, #fff); }
  .tp-kpis { display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:10px; margin:0 0 10px; }
  .tp-kpi { background:var(--dsw-alias-bg-layer-2); border:1px solid var(--dsw-alias-border-l1); border-radius:10px; padding:10px 12px; display:flex; flex-direction:column; gap:4px; }
  .tp-kpi__label { font-size:11px; color:var(--dsw-alias-label-secondary); }
  .tp-kpi__value { font-size:16px; font-weight:700; font-variant-numeric:tabular-nums; }
  .tp-duo { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:12px 0; }
  .tp-bars { display:flex; flex-direction:column; gap:6px; padding:10px 12px 14px; }
  .tp-bar { display:grid; grid-template-columns:150px 1fr 70px; align-items:center; gap:8px; font-size:11px; background:none; border:0; padding:0; color:inherit; text-align:left; font-family:inherit; }
  .tp-bar--click { cursor:pointer; }
  .tp-bar--click:hover .tp-bar__name { color:var(--dsw-alias-label-primary); }
  .tp-bar__name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--dsw-alias-label-secondary); }
  .tp-bar__track { height:8px; border-radius:4px; background:var(--dsw-alias-bg-layer-3); overflow:hidden; display:block; }
  .tp-bar__fill { display:block; height:100%; background:var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4176e6); border-radius:4px; }
  .tp-bar__value { text-align:right; font-variant-numeric:tabular-nums; }
  .tp-trend { display:flex; align-items:stretch; gap:6px; height:170px; padding:12px 12px 8px; overflow-x:auto; }
  .tp-trend__day { display:flex; flex-direction:column; justify-content:flex-end; align-items:center; gap:4px; flex:1 0 34px; }
  .tp-trend__col { display:flex; flex-direction:column-reverse; width:100%; max-width:34px; border-radius:4px; overflow:hidden; }
  .tp-trend__seg { display:block; background:var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4176e6); }
  .tp-trend__seg--tool { background:var(--dsw-alias-state-success-primary, #16a34a); }
  .tp-trend__seg--other { background:var(--dsw-alias-bg-layer-3); }
  .tp-trend__label { font-size:10px; color:var(--dsw-alias-label-tertiary); }
  .tp-wf-notes { margin-top:12px; color:var(--dsw-alias-label-tertiary); font-size:10px; line-height:1.55; }
  .tp-empty, .tp-error { display:grid; min-height:140px; padding:26px; place-items:center; color:var(--dsw-alias-label-tertiary); text-align:center; font-size:12px; }
  .tp-error { color:var(--dsw-alias-state-error-primary, #d54941); }
  .tp-error button { margin-top:10px; }
  .tp-sr { position:absolute; width:1px; height:1px; padding:0; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; border:0; }
  .tp-icon { display:block; }
  @keyframes tp-pulse { 0%,100% { opacity:1; } 50% { opacity:.35; } }
  @media (prefers-reduced-motion: reduce) {
    .tp-badge[data-reason='open']::before { animation:none; }
    .tp-progress span { transition:none; }
  }
  @media (max-width:900px) {
    .tp-page { padding-left:14px; padding-right:14px; }
    .tp-filters { grid-template-columns:1fr 1fr; }
    .tp-scan { grid-template-columns:1fr 1fr; }
    .tp-scan > :first-child { grid-column:1 / -1; }
  }
  `

  window.__ModuleLoader__.load({
    id: PACKAGE_ID,
    factory(require) {
      const React = require('react')
      const { useCallback, useEffect, useMemo, useRef, useState } = React
      const h = React.createElement

      function tcopy() { return COPY[localeKey()] }

      function number(value, digits = 0) {
        return typeof value === 'number' && Number.isFinite(value)
          ? new Intl.NumberFormat(localeKey() === 'zh' ? 'zh-CN' : 'en-US', { maximumFractionDigits: digits }).format(value)
          : '—'
      }

      function compactNumber(value) {
        if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
        const absolute = Math.abs(value)
        if (absolute >= 1e9) return `${(value / 1e9).toFixed(1)}B`
        if (absolute >= 1e6) return `${(value / 1e6).toFixed(1)}M`
        if (absolute >= 1e4) return `${(value / 1e3).toFixed(1)}k`
        return number(value)
      }

      function milliseconds(value) {
        if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
        if (value < 1000) return `${Math.round(value)} ms`
        return `${(value / 1000).toFixed(value < 10000 ? 2 : 1)} s`
      }

      function clock(value) {
        if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
        return new Intl.DateTimeFormat(localeKey() === 'zh' ? 'zh-CN' : 'en-US', {
          month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
        }).format(new Date(value))
      }

      function hitRate(row) {
        // Fail-open on the write side (real usage often omits cacheWriteTokens,
        // which folds to null), fail-closed when the read count is unknown.
        const read = row?.cache_read_tokens
        if (typeof read !== 'number') return null
        const input = typeof row?.input_tokens === 'number' ? row.input_tokens : 0
        const write = typeof row?.cache_write_tokens === 'number' ? row.cache_write_tokens : 0
        const denominator = input + read + write
        return denominator > 0 ? read / denominator : null
      }

      function percent(value) {
        return typeof value === 'number' && Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '—'
      }

      function query(parameters) {
        const search = new URLSearchParams()
        for (const [key, value] of Object.entries(parameters)) {
          if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
        }
        const text = search.toString()
        return text === '' ? '' : `?${text}`
      }

      /** Conditional GET; a 304 reuses the payload stored beside the etag ref. */
      async function fetchApi(url, etagRef) {
        const headers = { accept: 'application/json' }
        if (etagRef && etagRef.current) headers['if-none-match'] = etagRef.current
        const response = await fetch(url, { headers })
        if (response.status === 304) return { notModified: true }
        const body = await response.json()
        if (!response.ok) throw new Error(body?.error?.message || `HTTP ${response.status}`)
        if (etagRef) etagRef.current = response.headers.get('etag') || null
        return { notModified: false, body }
      }

      function reasonLabel(reason, copy) {
        if (reason === null || reason === undefined) return copy.openTurn
        return copy.reasons[reason] ?? reason
      }

      function ReasonBadge({ reason }) {
        const copy = tcopy()
        return h('span', {
          className: 'tp-badge',
          'data-reason': reason ?? 'open',
        }, reasonLabel(reason, copy))
      }

      function Icon({ size = 20 }) {
        return h('svg', {
          className: 'tp-icon', width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
          stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', 'aria-hidden': 'true',
        },
        h('path', { d: 'M3 6h7M3 12h12M3 18h5' }),
        h('rect', { x: 12, y: 4, width: 6, height: 4, rx: 1.2, fill: 'currentColor', stroke: 'none', opacity: .55 }),
        h('rect', { x: 17, y: 10, width: 4.5, height: 4, rx: 1.2, fill: 'currentColor', stroke: 'none' }),
        h('rect', { x: 10, y: 16, width: 7, height: 4, rx: 1.2, fill: 'currentColor', stroke: 'none', opacity: .55 }))
      }

      function ScanStrip({ status }) {
        const c = tcopy()
        const scan = status?.scan
        const ledger = status?.ledger
        if (!scan) return null
        const running = scan.phase === 'listing' || scan.phase === 'scanning'
        const total = scan.totalSessions || 0
        const done = (scan.scannedSessions || 0) + (scan.skippedSessions || 0)
        const ratio = total > 0 ? Math.min(1, done / total) : (running ? 0 : 1)
        const title = running ? c.scanning
          : scan.phase === 'complete' ? c.backfillDone
            : scan.phase === 'complete-with-errors' ? c.backfillErrors
              : scan.phase === 'failed' ? c.backfillFailed
                : scan.phase === 'cancelled' ? c.backfillCancelled
                  : c.backfillIdle
        const errors = (scan.errorCount || 0) + (status?.liveErrorCount || 0)
        return h('section', { className: 'tp-scan' },
          h('div', null,
            h('div', { className: 'tp-scan__title' }, title),
            h('div', { className: 'tp-scan__meta' }, `${c.progress} ${number(done)} / ${number(total)}`),
            h('div', { className: 'tp-progress' }, h('span', { style: { width: `${Math.round(ratio * 100)}%` } }))),
          h('div', { className: 'tp-scan__stat' }, c.scanned, h('strong', null, number(scan.scannedSessions || 0))),
          h('div', { className: 'tp-scan__stat' }, c.skipped, h('strong', null, number(scan.skippedSessions || 0))),
          h('div', { className: 'tp-scan__stat' }, c.ledgerTurns, h('strong', null, compactNumber(ledger?.turns))),
          h('div', { className: 'tp-scan__stat' }, c.readErrors,
            h('strong', { 'data-bad': errors > 0 ? 'true' : undefined }, number(errors))))
      }

      /** The core differentiator: one lane per step, LLM wait/gen + tool segments on a shared time axis. */
      function kpiCard(label, value) {
        return h('div', { className: 'tp-kpi' },
          h('span', { className: 'tp-kpi__label' }, label),
          h('span', { className: 'tp-kpi__value' }, value))
      }

      function Overview({ c, state, filters, setFilters, facets, onOpenTurn, exportHref }) {
        if (state.phase === 'error') {
          return h('section', { className: 'tp-card' }, h('div', { className: 'tp-error' }, state.error))
        }
        const payload = state.payload
        if (payload === null) {
          return h('section', { className: 'tp-card' },
            h('div', { className: 'tp-empty' }, state.phase === 'loading' ? c.loading : c.noData))
        }
        const { kpi, totals, topTools, topTurns, daily } = payload
        const maxTool = Math.max(1, ...topTools.map(row => row.total_ms ?? 0))
        const maxTurn = Math.max(1, ...topTurns.map(row => row.wall_ms ?? 0))
        const maxDay = Math.max(1, ...daily.map(row => row.wall_ms ?? 0))
        return h('div', { className: 'tp-overview' },
          h('div', { className: 'tp-filters' },
            h('label', { className: 'tp-field' }, c.from,
              h('input', {
                className: 'tp-select', type: 'date', value: filters.from,
                onChange: event => setFilters(previous => ({ ...previous, from: event.target.value })),
              })),
            h('label', { className: 'tp-field' }, c.to,
              h('input', {
                className: 'tp-select', type: 'date', value: filters.to,
                onChange: event => setFilters(previous => ({ ...previous, to: event.target.value })),
              })),
            h('label', { className: 'tp-field' }, c.provider,
              h('select', {
                className: 'tp-select', value: filters.provider,
                onChange: event => setFilters(previous => ({ ...previous, provider: event.target.value })),
              },
              h('option', { value: '' }, c.allProviders),
              ...facets.providers.map(name => h('option', { key: name, value: name }, name)))),
            h('label', { className: 'tp-field' }, c.model,
              h('select', {
                className: 'tp-select', value: filters.model,
                onChange: event => setFilters(previous => ({ ...previous, model: event.target.value })),
              },
              h('option', { value: '' }, c.allModels),
              ...facets.models.map(name => h('option', { key: name, value: name }, name))))),
          h('div', { className: 'tp-ov-actions' },
            h('a', {
              className: 'tp-button', href: exportHref, download: 'turn-profiler.json',
            }, c.exportBtn)),
          h('div', { className: 'tp-kpis' },
            kpiCard(c.kpiWall, `${milliseconds(kpi.turnWallP50Ms)} / ${milliseconds(kpi.turnWallP95Ms)}`),
            kpiCard(c.kpiTtft, `${milliseconds(kpi.ttftP50Ms)} / ${milliseconds(kpi.ttftP95Ms)}`),
            kpiCard(c.kpiHit, percent(kpi.cacheHitRate)),
            kpiCard(c.kpiRetry, percent(kpi.retryRate)),
            kpiCard(c.kpiToolShare, percent(kpi.toolShare))),
          h('p', { className: 'tp-card__hint' },
            `${totals.turns} ${c.rows} · ${c.sumLlm} ${milliseconds(totals.llmMs)} · ${c.sumTool} ${milliseconds(totals.toolMs)} · ${compactNumber(totals.inputTokens + totals.outputTokens)} ${c.tokensLabel}`),
          h('div', { className: 'tp-duo' },
            h('section', { className: 'tp-card' },
              h('div', { className: 'tp-card__head' }, h('h2', { className: 'tp-card__title' }, c.topTools)),
              topTools.length === 0
                ? h('div', { className: 'tp-empty' }, c.noData)
                : h('div', { className: 'tp-bars' },
                  ...topTools.map(row => h('div', {
                    key: row.name, className: 'tp-bar',
                    title: `${row.name}: ${milliseconds(row.total_ms)} · ${row.calls} ${c.calls} · err ${row.errors}`,
                  },
                  h('span', { className: 'tp-bar__name' }, row.name),
                  h('span', { className: 'tp-bar__track' },
                    h('span', { className: 'tp-bar__fill', style: { width: `${(row.total_ms ?? 0) / maxTool * 100}%` } })),
                  h('span', { className: 'tp-bar__value' }, milliseconds(row.total_ms)))))),
            h('section', { className: 'tp-card' },
              h('div', { className: 'tp-card__head' }, h('h2', { className: 'tp-card__title' }, c.topTurns)),
              topTurns.length === 0
                ? h('div', { className: 'tp-empty' }, c.noData)
                : h('div', { className: 'tp-bars' },
                  ...topTurns.map(row => h('button', {
                    key: `${row.session_id}:${row.turn}`, type: 'button',
                    className: 'tp-bar tp-bar--click', title: c.clickToOpen,
                    onClick: () => onOpenTurn(row.session_id, row.turn),
                  },
                  h('span', { className: 'tp-bar__name' }, `#${row.turn} · ${String(row.session_id).slice(-8)} · ${clock(row.started_at)}`),
                  h('span', { className: 'tp-bar__track' },
                    h('span', { className: 'tp-bar__fill', style: { width: `${(row.wall_ms ?? 0) / maxTurn * 100}%` } })),
                  h('span', { className: 'tp-bar__value' }, milliseconds(row.wall_ms))))))),
          h('section', { className: 'tp-card' },
            h('div', { className: 'tp-card__head' }, h('h2', { className: 'tp-card__title' }, c.dailyTrend)),
            daily.length === 0
              ? h('div', { className: 'tp-empty' }, c.noData)
              : h('div', { className: 'tp-trend' },
                ...daily.map(row => {
                  const wall = row.wall_ms ?? 0
                  const llm = row.llm_ms ?? 0
                  const tool = row.tool_ms ?? 0
                  const other = Math.max(0, wall - llm - tool)
                  return h('div', {
                    key: row.day, className: 'tp-trend__day',
                    title: `${row.day}: ${milliseconds(wall)} · ${compactNumber((row.input_tokens ?? 0) + (row.output_tokens ?? 0))} ${c.tokensLabel} · ${row.turns} ${c.rows}`,
                  },
                  h('div', { className: 'tp-trend__col', style: { height: `${Math.max(2, wall / maxDay * 82)}%` } },
                    h('span', { className: 'tp-trend__seg', style: { flexGrow: llm } }),
                    h('span', { className: 'tp-trend__seg tp-trend__seg--tool', style: { flexGrow: tool } }),
                    h('span', { className: 'tp-trend__seg tp-trend__seg--other', style: { flexGrow: other } })),
                  h('span', { className: 'tp-trend__label' }, String(row.day).slice(5)))
                }))))
      }

      function Waterfall({ view }) {
        const c = tcopy()
        const turn = view?.turn
        const steps = view?.steps ?? []
        const toolCalls = view?.toolCalls ?? []
        const attempts = view?.attempts ?? []
        const bounds = useMemo(() => {
          const starts = [turn?.started_at, ...steps.map(step => step.started_at), ...attempts.map(item => item.started_at)]
            .filter(value => typeof value === 'number')
          const ends = [
            turn?.ended_at,
            ...steps.map(step => step.ended_at),
            ...steps.map(step => typeof step.started_at === 'number' && typeof step.llm_ms === 'number'
              ? step.started_at + step.llm_ms : null),
            ...toolCalls.map(tool => tool.ended_at ?? tool.started_at),
            ...attempts.map(item => item.ended_at),
          ].filter(value => typeof value === 'number')
          if (starts.length === 0 || ends.length === 0) return null
          const t0 = Math.min(...starts)
          const t1 = Math.max(...ends, t0 + 1)
          return { t0, span: Math.max(1, t1 - t0) }
        }, [turn, steps, toolCalls, attempts])

        if (!turn) return h('div', { className: 'tp-empty' }, c.noData)
        if (!bounds) return h('div', { className: 'tp-empty' }, c.noData)

        const { t0, span } = bounds
        const left = time => `${Math.max(0, Math.min(100, (time - t0) / span * 100))}%`
        const width = (from, to) => `${Math.max(0.15, Math.min(100, (to - from) / span * 100))}%`

        const lanes = steps.map((step) => {
          const tools = toolCalls
            .filter(tool => tool.step === step.step && typeof tool.started_at === 'number' && typeof tool.ended_at === 'number')
            .sort((a, b) => a.started_at - b.started_at)
          const rowEnds = []
          const placed = tools.map((tool) => {
            let row = rowEnds.findIndex(end => tool.started_at >= end)
            if (row === -1) { row = rowEnds.length; rowEnds.push(0) }
            rowEnds[row] = tool.ended_at
            return { tool, row }
          })
          return { step, placed, toolRows: Math.max(rowEnds.length, 0) }
        })
        const knownStepNumbers = new Set(steps.map(step => step.step))
        const ghostTools = toolCalls.filter(tool => tool.ended_at !== null && (tool.step === null || !knownStepNumbers.has(tool.step))).length

        const llmTotal = typeof turn.llm_ms === 'number' ? turn.llm_ms : 0
        const toolTotal = typeof turn.tool_ms === 'number' ? turn.tool_ms : 0
        const wall = typeof turn.wall_ms === 'number' ? turn.wall_ms : null
        const other = wall === null ? null : Math.max(0, wall - llmTotal - toolTotal)
        const denominator = wall === null ? llmTotal + toolTotal : wall
        const ticks = [0, 0.25, 0.5, 0.75, 1]

        const exact = turn.timing_source === 'exact'
        const sourceKind = turn.timing_source === 'exact' ? 'exact' : turn.timing_source === 'mixed' ? 'mixed' : 'recon'
        const sourceLabel = turn.timing_source === 'exact' ? c.exactBadge : turn.timing_source === 'mixed' ? c.mixedBadge : c.reconBadge
        const segmentTitle = (step) => {
          const parts = [`${c.stepLabel} ${step.step}`]
          if (step.ttft_ms !== null) parts.push(`TTFT ${milliseconds(step.ttft_ms)}`)
          if (step.llm_ms !== null) parts.push(`${c.llm} ${milliseconds(step.llm_ms)}`)
          if (step.decode_ms !== null && step.output_tokens !== null) {
            parts.push(`${c.genSeg} ${milliseconds(step.decode_ms)} · ${number(step.output_tokens / Math.max(step.decode_ms, 1) * 1000, 1)} tok/s`)
          }
          if (step.input_tokens !== null) parts.push(`${c.inputTokens} ${number(step.input_tokens)}`)
          if (step.cache_read_tokens !== null) parts.push(`${c.cacheRead} ${number(step.cache_read_tokens)}`)
          if (step.attempt_count > 0) parts.push(`${c.retries} ×${step.attempt_count}`)
          if (step.header_reason) parts.push(`header: ${step.header_reason}`)
          return parts.join('\n')
        }

        return h('div', { className: 'tp-wf' },
          // summary bar: wall composition
          h('div', { className: 'tp-wf-summary' },
            h('span', { className: 'tp-wf-summary__total' }, `${c.totalWall} ${milliseconds(wall ?? span)}`,
              turn.timing_source !== null && turn.timing_source !== undefined
                ? h('span', { className: 'tp-tbadge', 'data-kind': sourceKind }, sourceLabel) : null),
            h('div', {
              className: 'tp-wf-summary__bar', role: 'img',
              'aria-label': `${c.sumLlm} ${milliseconds(llmTotal)} / ${c.sumTool} ${milliseconds(toolTotal)}`,
            },
            denominator > 0 ? h('div', { className: 'tp-wf-summary__seg', 'data-kind': 'llm', style: { width: `${llmTotal / denominator * 100}%` }, title: `${c.sumLlm} ${milliseconds(llmTotal)}` }) : null,
            denominator > 0 ? h('div', { className: 'tp-wf-summary__seg', 'data-kind': 'tool', style: { width: `${toolTotal / denominator * 100}%` }, title: `${c.sumTool} ${milliseconds(toolTotal)}` }) : null,
            other !== null && other > 0 ? h('div', { className: 'tp-wf-summary__seg', 'data-kind': 'other', style: { width: `${other / denominator * 100}%` }, title: `${c.sumOther} ${milliseconds(other)}` }) : null)),
          // legend
          h('div', { className: 'tp-legend' },
            h('span', null, h('i', { 'data-kind': 'wait' }), c.waitSeg),
            h('span', null, h('i', { 'data-kind': 'gen' }), c.genSeg),
            h('span', null, h('i', { 'data-kind': 'ok' }), `${c.toolSeg} OK`),
            h('span', null, h('i', { 'data-kind': 'err' }), `${c.toolSeg} error`),
            attempts.length > 0 ? h('span', null, h('i', { 'data-kind': 'retry' }), c.retrySeg) : null,
            steps.some(step => step.header_reason && step.header_reason !== 'initial')
              ? h('span', null, h('i', { 'data-kind': 'cache' }), c.cacheBreak) : null),
          // axis
          h('div', { className: 'tp-wf-axis', 'aria-hidden': 'true' },
            ...ticks.map(fraction => h('span', {
              className: 'tp-wf-tick', key: fraction,
              style: { left: `${fraction * 100}%` },
            }, milliseconds(span * fraction)))),
          // lanes
          ...lanes.map(({ step, placed, toolRows }) => {
            const rows = 1 + toolRows
            const llmStart = typeof step.started_at === 'number' ? step.started_at : null
            const llmEnd = llmStart !== null && typeof step.llm_ms === 'number' ? llmStart + step.llm_ms : null
            const ttftEnd = llmStart !== null && typeof step.ttft_ms === 'number' ? llmStart + step.ttft_ms : null
            const stepExact = step.timing_source === 'exact'
            const laneAttempts = attempts.filter(item => item.step === step.step && item.kind === 'attempt'
              && typeof item.started_at === 'number' && typeof item.ended_at === 'number')
            const markerReason = typeof step.header_reason === 'string' && step.header_reason !== '' && step.header_reason !== 'initial'
              ? step.header_reason : null
            return h('div', { className: 'tp-wf-lane', key: step.step },
              h('div', { className: 'tp-wf-lane__label' },
                h('strong', null, `${c.stepLabel} ${step.step}`),
                step.llm_ms !== null ? milliseconds(step.llm_ms) : ''),
              h('div', { className: 'tp-wf-track', style: { minHeight: `${rows * 23}px` } },
                h('div', { className: 'tp-wf-row' },
                  // wait segment: step start → first token
                  llmStart !== null && ttftEnd !== null && ttftEnd > llmStart
                    ? h('div', {
                      className: 'tp-seg', 'data-kind': 'wait', 'data-exact': String(stepExact),
                      key: 'wait', style: { left: left(llmStart), width: width(llmStart, ttftEnd) },
                      title: `${c.waitSeg}: ${milliseconds(step.ttft_ms)}`,
                    }) : null,
                  // generation segment: first token → last stream chunk
                  llmStart !== null && llmEnd !== null
                    ? h('div', {
                      className: 'tp-seg', 'data-kind': 'gen', 'data-exact': String(stepExact),
                      key: 'gen',
                      style: { left: left(ttftEnd !== null && ttftEnd > llmStart ? ttftEnd : llmStart), width: width(ttftEnd !== null && ttftEnd > llmStart ? ttftEnd : llmStart, llmEnd) },
                      title: segmentTitle(step),
                    }, (llmEnd - (ttftEnd !== null && ttftEnd > llmStart ? ttftEnd : llmStart)) / span > 0.08 && step.output_tokens !== null ? `${compactNumber(step.output_tokens)} ${c.tokensLabel}` : '')
                    : null,
                  // retry attempts (exact live captures only): orange segments
                  ...laneAttempts.map(item => h('div', {
                    className: 'tp-seg', 'data-kind': 'retry', 'data-exact': 'true',
                    key: `retry-${item.attempt_index}`,
                    style: { left: left(item.started_at), width: width(item.started_at, Math.max(item.ended_at, item.started_at + 1)) },
                    title: `${c.retrySeg} #${item.attempt_index + 1}${item.llm_ms !== null ? ` · ${milliseconds(item.llm_ms)}` : ''}${item.ttft_ms !== null ? `\nTTFT ${milliseconds(item.ttft_ms)}` : ''}`,
                  }))),
                markerReason !== null && llmStart !== null
                  ? h('div', {
                    className: 'tp-wf-marker', style: { left: left(llmStart) },
                    title: `${c.cacheBreak}: ${markerReason}`,
                  }) : null,
                ...Array.from({ length: toolRows }, (_, rowIndex) => h('div', { className: 'tp-wf-row', key: `tools-${rowIndex}` },
                  ...placed.filter(item => item.row === rowIndex).map(({ tool }) => h('div', {
                    className: 'tp-seg',
                    'data-kind': tool.is_error === 1 ? 'err' : 'ok',
                    'data-exact': 'true',
                    key: tool.call_id,
                    style: { left: left(tool.started_at), width: width(tool.started_at, Math.max(tool.ended_at, tool.started_at + 1)) },
                    title: [
                      `${tool.name ?? '?'} · ${milliseconds(tool.ms)}`,
                      tool.is_error === 1 ? `error: ${tool.error_code ?? 'unknown'}` : null,
                      tool.args_summary ?? null,
                      c.toolNote,
                    ].filter(Boolean).join('\n'),
                  }, (Math.max(tool.ended_at, tool.started_at + 1) - tool.started_at) / span > 0.08 ? (tool.name ?? '') : ''))))))
          }),
          h('div', { className: 'tp-wf-notes' },
            h('div', null, c.reconstructedNote),
            h('div', null, c.toolNote),
            ghostTools > 0 ? h('div', null, `${ghostTools} ${c.ghostTools}`) : null))
      }

      function Page() {
        const c = tcopy()
        const [status, setStatus] = useState(null)
        const [workspace, setWorkspace] = useState('')
        const [sessionsState, setSessionsState] = useState({ phase: 'loading', sessions: [], workspaces: [], error: '' })
        const [sessionId, setSessionId] = useState('')
        const [turnsState, setTurnsState] = useState({ phase: 'idle', payload: null, error: '' })
        const [page, setPage] = useState({ offset: 0, limit: 50, sort: 'started_at', dir: 'desc' })
        const [selectedTurn, setSelectedTurn] = useState(null)
        const [viewState, setViewState] = useState({ phase: 'idle', view: null, error: '' })
        const [mode, setMode] = useState('overview')
        const [settings, setSettings] = useState(readSettings)
        const [live, setLive] = useState(() => readSettings().live)
        const [summaryState, setSummaryState] = useState({ phase: 'idle', payload: null, error: '' })
        const [ovFilters, setOvFilters] = useState({ from: '', to: '', provider: '', model: '' })

        const statusEtag = useRef(null)
        const sessionsEtag = useRef(null)
        const turnsEtag = useRef(null)
        const viewEtag = useRef(null)
        const summaryEtag = useRef(null)

        const updateSettings = useCallback((patch) => {
          // TP-R4-01: langOverride must flip BEFORE React re-renders Page.
          // The setSettings updater only runs when the render pass reaches the
          // settings useState, i.e. after `const c = tcopy()` at the top of the
          // body already captured the old language — leaving Page-owned static
          // nodes one render behind child components that call tcopy() later.
          if (patch.lang !== undefined) langOverride = patch.lang
          setSettings(previous => {
            const next = { ...previous, ...patch }
            langOverride = next.lang
            writeSettings(next)
            return next
          })
        }, [])

        const loadStatus = useCallback(async () => {
          try {
            const result = await fetchApi(`${API}/status`, statusEtag)
            if (!result.notModified) setStatus(result.body)
          } catch { /* the status strip is cosmetic; keep the last good value */ }
        }, [])

        const loadSessions = useCallback(async (options = {}) => {
          if (!options.silent) setSessionsState(previous => ({ ...previous, phase: 'loading', error: '' }))
          try {
            const result = await fetchApi(`${API}/sessions${query({ workspace })}`, sessionsEtag)
            if (result.notModified) {
              setSessionsState(previous => ({ ...previous, phase: 'ready' }))
              return
            }
            setSessionsState({
              phase: 'ready',
              sessions: result.body.sessions ?? [],
              workspaces: result.body.workspaces ?? [],
              error: '',
            })
          } catch (error) {
            setSessionsState(previous => ({
              ...previous, phase: 'error', error: error instanceof Error ? error.message : String(error),
            }))
          }
        }, [workspace])

        const loadTurns = useCallback(async (options = {}) => {
          if (!sessionId) {
            setTurnsState({ phase: 'idle', payload: null, error: '' })
            return
          }
          if (!options.silent) setTurnsState(previous => ({ ...previous, phase: 'loading', error: '' }))
          try {
            const result = await fetchApi(`${API}/turns${query({ session: sessionId, ...page })}`, turnsEtag)
            if (result.notModified) {
              setTurnsState(previous => ({ ...previous, phase: 'ready' }))
              return
            }
            setTurnsState({ phase: 'ready', payload: result.body, error: '' })
          } catch (error) {
            setTurnsState(previous => ({
              ...previous, phase: 'error', error: error instanceof Error ? error.message : String(error),
            }))
          }
        }, [sessionId, page])

        const loadWaterfall = useCallback(async (options = {}) => {
          if (!sessionId || selectedTurn === null) {
            setViewState({ phase: 'idle', view: null, error: '' })
            return
          }
          if (!options.silent) setViewState({ phase: 'loading', view: null, error: '' })
          try {
            const result = await fetchApi(`${API}/waterfall${query({ session: sessionId, turn: selectedTurn })}`, viewEtag)
            if (result.notModified) {
              setViewState(previous => ({ ...previous, phase: 'ready' }))
              return
            }
            setViewState({ phase: 'ready', view: result.body, error: '' })
          } catch (error) {
            setViewState({ phase: 'error', view: null, error: error instanceof Error ? error.message : String(error) })
          }
        }, [sessionId, selectedTurn])

        const loadSummary = useCallback(async () => {
          setSummaryState(previous => ({ ...previous, phase: 'loading', error: '' }))
          try {
            const fromMs = ovFilters.from === '' ? undefined : Date.parse(`${ovFilters.from}T00:00:00`)
            const toMs = ovFilters.to === '' ? undefined : Date.parse(`${ovFilters.to}T23:59:59.999`)
            const result = await fetchApi(`${API}/summary${query({
              workspace,
              from: Number.isFinite(fromMs) ? fromMs : undefined,
              to: Number.isFinite(toMs) ? toMs : undefined,
              provider: ovFilters.provider === '' ? undefined : ovFilters.provider,
              model: ovFilters.model === '' ? undefined : ovFilters.model,
            })}`, summaryEtag)
            if (result.notModified) {
              setSummaryState(previous => ({ ...previous, phase: 'ready' }))
              return
            }
            setSummaryState({ phase: 'ready', payload: result.body, error: '' })
          } catch (error) {
            setSummaryState(previous => ({
              ...previous, phase: 'error', error: error instanceof Error ? error.message : String(error),
            }))
          }
        }, [workspace, ovFilters])

        const openTurn = useCallback((nextSessionId, turn) => {
          setSessionId(nextSessionId)
          setSelectedTurn(turn)
          setMode('session')
        }, [])

        // Initial + poll while the backfill runs; refresh data when it completes.
        const scanPhase = status?.scan?.phase
        useEffect(() => {
          void loadStatus()
        }, [loadStatus])
        const previousPhase = useRef(scanPhase)
        useEffect(() => {
          const running = scanPhase === 'listing' || scanPhase === 'scanning'
          if (previousPhase.current !== scanPhase
            && (scanPhase === 'complete' || scanPhase === 'complete-with-errors')) {
            sessionsEtag.current = null
            turnsEtag.current = null
            void loadSessions()
            void loadTurns()
          }
          previousPhase.current = scanPhase
          if (!running) return undefined
          const timer = setInterval(() => { void loadStatus() }, 5000)
          return () => clearInterval(timer)
        }, [scanPhase, loadStatus, loadSessions, loadTurns])

        useEffect(() => {
          sessionsEtag.current = null
          void loadSessions()
        }, [loadSessions])

        useEffect(() => {
          turnsEtag.current = null
          void loadTurns()
        }, [loadTurns])

        useEffect(() => {
          viewEtag.current = null
          void loadWaterfall()
        }, [loadWaterfall])

        useEffect(() => {
          if (mode !== 'overview') return
          summaryEtag.current = null
          void loadSummary()
        }, [mode, loadSummary])

        // Realtime mode (M3): poll the selected session every 1.5s with
        // silent ETag-conditional loads so settled turns/steps appear as they land.
        // Sessions are polled too (TP-R2-02): the dropdown's turn_count and
        // last_active_at must track the table instead of going stale.
        useEffect(() => {
          if (!live || mode !== 'session' || sessionId === '') return undefined
          const timer = setInterval(() => {
            void loadStatus()
            void loadSessions({ silent: true })
            void loadTurns({ silent: true })
            void loadWaterfall({ silent: true })
          }, 1500)
          return () => clearInterval(timer)
        }, [live, mode, sessionId, loadStatus, loadSessions, loadTurns, loadWaterfall])

        // Auto-select the newest session once the list arrives.
        useEffect(() => {
          if (sessionId === '' && sessionsState.phase === 'ready' && sessionsState.sessions.length > 0) {
            setSessionId(sessionsState.sessions[0].session_id)
          }
        }, [sessionsState, sessionId])

        const refreshAll = useCallback(() => {
          statusEtag.current = null
          sessionsEtag.current = null
          turnsEtag.current = null
          viewEtag.current = null
          summaryEtag.current = null
          void loadStatus()
          void loadSessions()
          void loadTurns()
          void loadWaterfall()
          void loadSummary()
        }, [loadStatus, loadSessions, loadTurns, loadWaterfall, loadSummary])

        const turns = turnsState.payload?.turns ?? []
        const total = turnsState.payload?.total ?? 0
        const maxWall = Math.max(1, ...turns.map(row => row.wall_ms ?? 0))
        const view = viewState.view

        const exportFromMs = ovFilters.from === '' ? undefined : Date.parse(`${ovFilters.from}T00:00:00`)
        const exportToMs = ovFilters.to === '' ? undefined : Date.parse(`${ovFilters.to}T23:59:59.999`)
        const exportHref = `${API}/export.json${query({
          workspace,
          from: Number.isFinite(exportFromMs) ? exportFromMs : undefined,
          to: Number.isFinite(exportToMs) ? exportToMs : undefined,
          provider: ovFilters.provider === '' ? undefined : ovFilters.provider,
          model: ovFilters.model === '' ? undefined : ovFilters.model,
        })}`

        const sortOptions = [
          ['started_at', c.startedAt],
          ['wall_ms', c.wall],
          ['llm_ms', c.llm],
          ['tool_ms', c.tools],
          ['input_tokens', c.inputTokens],
          ['output_tokens', c.outputTokens],
        ]
        const headerLabels = [
          c.turn, c.startedAt, c.wall, c.reason, c.steps, c.llm, c.tools,
          c.inputTokens, c.outputTokens, c.cacheRead, c.cacheHit, c.model,
        ]

        return h('div', { className: 'tp-page' }, h('div', { className: 'tp-shell' },
          h('header', { className: 'tp-head' },
            h('div', null,
              h('h1', { className: 'tp-title' }, c.title),
              h('p', { className: 'tp-subtitle' }, c.subtitle)),
            h('button', { type: 'button', className: 'tp-button', onClick: refreshAll }, c.refresh)),
          h(ScanStrip, { status }),
          h('section', { className: 'tp-settings' },
            h('p', { className: 'tp-settings__title' }, c.settingsTitle),
            h('label', { className: 'tp-field' }, c.slowLabel,
              h('input', {
                className: 'tp-input', type: 'number', min: '1', step: '1',
                value: settings.slowSeconds,
                onChange: event => {
                  const parsed = Number(event.target.value)
                  updateSettings({
                    slowSeconds: Number.isFinite(parsed) && parsed > 0
                      ? Math.round(parsed)
                      : DEFAULT_SETTINGS.slowSeconds,
                  })
                },
              })),
            h('label', { className: 'tp-field' }, c.langLabel,
              h('select', {
                className: 'tp-select', value: settings.lang,
                onChange: event => updateSettings({ lang: event.target.value }),
              },
              h('option', { value: 'auto' }, c.langAuto),
              h('option', { value: 'zh' }, c.langZh),
              h('option', { value: 'en' }, c.langEn))),
            h('p', { className: 'tp-settings__hint' }, c.settingsHint)),
          h('div', { className: 'tp-tabs' },
            h('button', {
              type: 'button', className: mode === 'overview' ? 'tp-tab tp-tab--on' : 'tp-tab',
              onClick: () => setMode('overview'),
            }, c.overview),
            h('button', {
              type: 'button', className: mode === 'session' ? 'tp-tab tp-tab--on' : 'tp-tab',
              onClick: () => setMode('session'),
            }, c.sessionView)),
          mode === 'overview'
            ? h(Overview, {
              c,
              state: summaryState,
              filters: ovFilters,
              setFilters: setOvFilters,
              facets: summaryState.payload?.facets ?? { providers: [], models: [] },
              onOpenTurn: openTurn,
              exportHref,
            })
            : h('div', { className: 'tp-view' },
          h('div', { className: 'tp-filters' },
            h('label', { className: 'tp-field' }, c.workspace,
              h('select', {
                className: 'tp-select', value: workspace,
                onChange: event => { setWorkspace(event.target.value); setSessionId('') },
              },
              h('option', { value: '' }, c.allWorkspaces),
              ...(sessionsState.workspaces ?? []).map(item => h('option', {
                key: item.id, value: item.path ?? item.id,
              }, item.title ?? item.path ?? item.id)))),
            h('label', { className: 'tp-field' }, c.session,
              h('select', {
                className: 'tp-select', value: sessionId,
                onChange: event => { setSessionId(event.target.value); setSelectedTurn(null) },
              },
              h('option', { value: '' }, c.selectSession),
              ...sessionsState.sessions.map(item => h('option', {
                key: item.session_id, value: item.session_id,
              }, `${item.title ?? c.untitled} · ${number(item.turn_count)} ${c.turn} · ${clock(item.last_active_at)}`)))),
            h('label', { className: 'tp-field' }, c.sort,
              h('select', {
                className: 'tp-select', value: page.sort,
                onChange: event => setPage(previous => ({ ...previous, sort: event.target.value, offset: 0 })),
              }, ...sortOptions.map(([value, label]) => h('option', { key: value, value }, label)))),
            h('button', {
              type: 'button', className: 'tp-button',
              title: page.dir === 'desc' ? c.desc : c.asc,
              onClick: () => setPage(previous => ({ ...previous, dir: previous.dir === 'desc' ? 'asc' : 'desc', offset: 0 })),
            }, page.dir === 'desc' ? '↓' : '↑')),
            h('button', {
              type: 'button', className: 'tp-button',
              'data-on': live ? 'true' : undefined,
              title: c.liveHint,
              onClick: () => {
                const next = !live
                setLive(next)
                updateSettings({ live: next })
              },
            }, `${live ? '● ' : '○ '}${c.live}`),

          // turns table
          h('section', { className: 'tp-card' },
            h('div', { className: 'tp-card__head' },
              h('div', null,
                h('h2', { className: 'tp-card__title' }, c.turnsTitle),
                h('p', { className: 'tp-card__hint' }, `${total} ${c.rows}`))),
            sessionsState.phase === 'error'
              ? h('div', { className: 'tp-error' }, sessionsState.error)
              : turnsState.phase === 'error'
                ? h('div', { className: 'tp-error' }, turnsState.error,
                  h('button', { type: 'button', className: 'tp-button', onClick: refreshAll }, c.retryBtn))
                : turns.length === 0
                  ? h('div', { className: 'tp-empty' },
                    sessionsState.sessions.length === 0 && sessionsState.phase === 'ready' ? c.noSessions : c.noData)
                  : h('div', { className: 'tp-table-wrap' },
                    h('table', { className: 'tp-table' },
                      h('thead', null,
                        h('tr', null, ...headerLabels.map(label => h('th', { key: label, scope: 'col' }, label)))),
                      h('tbody', null, ...turns.map(row => {
                        const hit = hitRate(row)
                        return h('tr', {
                          key: `${row.session_id}:${row.turn}`,
                          'data-selected': selectedTurn === row.turn ? 'true' : undefined,
                          'data-slow': row.wall_ms !== null && row.wall_ms > settings.slowSeconds * 1000
                            ? 'true'
                            : undefined,
                          onClick: () => setSelectedTurn(row.turn),
                        },
                        h('td', null, `#${row.turn}`),
                        h('td', null, clock(row.started_at)),
                        h('td', null, h('div', { className: 'tp-durbar' },
                          h('div', { className: 'tp-durbar__track' },
                            h('span', { className: 'tp-durbar__fill', style: { width: `${Math.min(100, (row.wall_ms ?? 0) / maxWall * 100)}%` } })),
                          row.wall_ms === null ? c.openTurn : milliseconds(row.wall_ms))),
                        h('td', null, h(ReasonBadge, { reason: row.reason })),
                        h('td', null, row.retry_count > 0 ? `${row.step_count} (↻${row.retry_count})` : String(row.step_count)),
                        h('td', null, milliseconds(row.llm_ms)),
                        h('td', null, milliseconds(row.tool_ms)),
                        h('td', null, compactNumber(row.input_tokens)),
                        h('td', null, compactNumber(row.output_tokens)),
                        h('td', null, compactNumber(row.cache_read_tokens)),
                        h('td', null, percent(hit)),
                        h('td', { title: row.model ?? '' }, row.model ?? '—'))
                      })))),
            total > page.limit
              ? h('div', { className: 'tp-pager' },
                h('span', null, `${page.offset + 1}–${Math.min(total, page.offset + page.limit)} ${c.of} ${total}`),
                h('button', {
                  type: 'button', disabled: page.offset === 0,
                  onClick: () => setPage(previous => ({ ...previous, offset: Math.max(0, previous.offset - previous.limit) })),
                }, c.prevPage),
                h('button', {
                  type: 'button', disabled: page.offset + page.limit >= total,
                  onClick: () => setPage(previous => ({ ...previous, offset: previous.offset + previous.limit })),
                }, c.nextPage))
              : null),

          // waterfall
          h('section', { className: 'tp-card' },
            h('div', { className: 'tp-card__head' },
              h('div', null,
                h('h2', { className: 'tp-card__title' },
                  `${c.waterfall}${selectedTurn !== null ? ` · ${c.turn} #${selectedTurn}` : ''}`))),
            viewState.phase === 'error'
              ? h('div', { className: 'tp-error' }, viewState.error,
                h('button', { type: 'button', className: 'tp-button', onClick: refreshAll }, c.retryBtn))
              : selectedTurn === null || viewState.phase === 'idle'
                ? h('div', { className: 'tp-empty' }, c.noTurnSelected)
                : viewState.phase === 'loading' && !view
                  ? h('div', { className: 'tp-empty' }, c.loading)
                  : h(Waterfall, { view }))))
        )
      }

      return {
        inject: ['slots', 'locale'],
        apply(ctx) {
          ctx.effect(() => {
            const style = document.createElement('style')
            // Platform ownership contract (client system.ts claimStyles): any
            // <style> without data-plugin is claimed by whichever plugin
            // materializes next, and removed when that plugin hot-swaps.
            // Our injection runs in ctx.effect, i.e. after our own
            // materialization, so we must tag it explicitly.
            style.setAttribute('data-plugin', PACKAGE_ID)
            style.dataset.turnProfiler = 'true'
            style.textContent = STYLE
            document.head.append(style)
            return () => style.remove()
          }, 'turn-profiler: styles')
          ctx.effect(() => ctx.locale.register('turnProfiler', {
            zh: { panel: COPY.zh.panel },
            en: { panel: COPY.en.panel },
          }), 'turn-profiler: locale')
          const label = ctx.locale.bind('turnProfiler')
          ctx.slots.inject('main', () => ctx.slots.register({
            name: 'main', key: PANEL_ID, locale: 'turnProfiler',
          }, Page))
          ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
            name: 'sidebar.panellist', id: PANEL_ID, order: 19,
            label: () => label('panel'), locale: 'turnProfiler',
          }, Icon))
        },
      }
    },
  })
})()
