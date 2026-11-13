(() => {
  const PACKAGE_ID = '@local/dsh-usage-center'
  const PANEL_ID = 'usage-center'
  const API = '/api/usage-center'
  const RANGES = ['7', '30', '90', 'all', 'custom']
  const SERIES_SLOTS = 8

  const COPY = {
    zh: {
      panel: '用量中心', title: '用量中心', subtitle: '供应商原始响应与 Harness 持久事件中的精确用量',
      refresh: '刷新', refreshing: '刷新中…', autoRefresh: '自动刷新',
      exportCsv: 'CSV', exportJson: 'JSON', exportPng: 'PNG', copySummary: '复制摘要',
      days7: '7 天', days30: '30 天', days90: '90 天', all: '全部', custom: '自定义',
      from: '开始日期', to: '结束日期', workspace: '工作目录', group: '侧栏分组', sessionState: '会话状态',
      session: '会话', provider: 'Provider', model: '模型',
      search: '搜索', searchPlaceholder: '会话 / 模型 / 目录…',
      totalTokens: '总 Token', uncachedInput: '未缓存输入', output: '输出 Token', reasoning: '推理 Token',
      cost: '花费（估算）', costHint: '按价格表估算，不是供应商账单',
      calls: '模型调用', retries: '重试调用', tokenHit: '缓存 Token 命中率', requestHit: '有缓存命中的请求占比',
      llmDuration: 'LLM 总时长', avgRequest: '平均请求耗时', ttft: 'TTFT P50 / P95', decode: '解码速度 P50 / P95',
      exact: '完整覆盖', reported: '已报告', unknown: '未知', callsUnit: '次',
      cacheFormula: 'cacheRead ÷ (未缓存输入 + cacheRead + cacheWrite)',
      tokenTrend: '按日 Token 趋势', costTrend: '按日花费趋势',
      tokenTrendHint: '实线仅统计供应商已报告字段；缺失调用不会补零。拖动可缩放，双击还原。',
      cacheChart: '缓存命中', routeCompare: 'Provider / 模型对比', requestTrend: '请求与解码速度趋势',
      inputLegend: '未缓存输入', outputLegend: '输出', totalLegend: '已报告总量', callLegend: '调用',
      speedLegend: '解码 Token/s', cacheReadLegend: '缓存读', cacheWriteLegend: '缓存写',
      coveredCalls: '覆盖调用', speedSamples: '速度样本', cacheBase: '缓存统计总输入',
      chartKeyboardHint: '悬停查看明细；聚焦后可用左右方向键切换日期',
      coverage: '数据覆盖', coverageHint: '只有覆盖全部所选调用的汇总才标为精确。可选字段缺失始终显示未知。',
      invalidUsage: '无效 usage', missingUsage: '未报告 usage', timingCoverage: '精确时延', cacheCoverage: '缓存三字段',
      status: '状态', succeeded: '成功', failed: '失败', cancelled: '取消', statusUnknown: '状态未知',
      details: '调用明细', showing: '显示', of: '共', rows: '行', previousPage: '上一页', nextPage: '下一页',
      capturedAt: '时间', attempt: '尝试', duration: 'LLM 时长', copyKey: '复制 call_key', keyCopied: '已复制 call_key',
      metricTokens: 'Token', metricCost: '花费', metricCalls: '调用',
      budget: '预算', dailyBudget: '日预算', monthlyBudget: '月预算', today: '今日', thisMonth: '本月',
      forecast: '按近 7 日均值预计月底', overBudget: '已超预算', nearBudget: '接近预算',
      heatmap: '活跃分布（周 × 小时）', heatmapHint: '按所选时区聚合调用次数，颜色越深调用越多。',
      noData: '当前筛选没有数据', clearFilters: '清除筛选', loadError: '加载失败', retry: '重试',
      updatedAt: '更新于', dataThrough: '数据截止', stale: '数据可能过期', paused: '自动刷新已暂停',
      copied: '已复制到剪贴板', copyFailed: '复制失败', exportFailed: '导出失败', exportDone: '已开始下载',
      costColumn: '花费', hideSeriesHint: '点击图例可隐藏序列',
      shortcuts: '快捷键：1/2/3/0 切范围 · R 刷新 · E 导出 CSV · / 搜索',
      otherModels: '其他', sessionsScanned: '已扫描会话', callsInserted: '新增调用', scanErrors: '读取错误',
      timingSince: '精确时延从启用插件起生效；历史只恢复可验证的 Token。',
      partial: '部分覆盖', unavailable: '—', liveErrors: '实时捕获错误', total: '合计',
      priceNote: '价格档：DeepSeek 高峰价估算', brushHint: '拖动缩放', resetZoom: '还原缩放',
      prevDay: '较前一日', share: '占比', none: '无',
      cumulative: '累计', cumulativeHint: '切换为累计曲线', compare: '对比上期',
      compareHint: '叠加显示上一个等长周期', compareUnavailable: '需要明确的时间范围才能对比',
      previousPeriod: '上期', columns: '列', sessionFilter: '筛选到该会话', clearAll: '清除筛选与日期范围',
      partialBadge: '部分覆盖', fullBadge: '完整覆盖', copyLink: '链接',
    },
    en: {
      panel: 'Usage Center', title: 'Usage Center', subtitle: 'Exact usage from provider responses and durable Harness events',
      refresh: 'Refresh', refreshing: 'Refreshing…', autoRefresh: 'Auto refresh',
      exportCsv: 'CSV', exportJson: 'JSON', exportPng: 'PNG', copySummary: 'Copy summary',
      days7: '7 days', days30: '30 days', days90: '90 days', all: 'All', custom: 'Custom',
      from: 'From', to: 'To', workspace: 'Workspace', group: 'Sidebar group', sessionState: 'Session state',
      session: 'Session', provider: 'Provider', model: 'Model',
      search: 'Search', searchPlaceholder: 'session / model / folder…',
      totalTokens: 'Total tokens', uncachedInput: 'Uncached input', output: 'Output tokens', reasoning: 'Reasoning tokens',
      cost: 'Cost (estimate)', costHint: 'Estimated from the price table, not a provider bill',
      calls: 'Model calls', retries: 'Retry calls', tokenHit: 'Cache token hit rate', requestHit: 'Requests with a cache hit',
      llmDuration: 'LLM total time', avgRequest: 'Avg request time', ttft: 'TTFT P50 / P95', decode: 'Decode speed P50 / P95',
      exact: 'Exact coverage', reported: 'Reported', unknown: 'Unknown', callsUnit: 'calls',
      cacheFormula: 'cacheRead ÷ (uncached input + cacheRead + cacheWrite)',
      tokenTrend: 'Daily token trend', costTrend: 'Daily cost trend',
      tokenTrendHint: 'Lines only add provider-reported fields; missing calls are never zero-filled. Drag to zoom, double-click to reset.',
      cacheChart: 'Cache hit', routeCompare: 'Provider / model comparison', requestTrend: 'Requests and decode speed',
      inputLegend: 'Uncached input', outputLegend: 'Output', totalLegend: 'Reported total', callLegend: 'Calls',
      speedLegend: 'Decode tokens/s', cacheReadLegend: 'Cache read', cacheWriteLegend: 'Cache write',
      coveredCalls: 'Covered calls', speedSamples: 'Speed samples', cacheBase: 'Cache base input',
      chartKeyboardHint: 'Hover for details; after focus use the arrow keys to step through days',
      coverage: 'Data coverage', coverageHint: 'A total is marked exact only when it covers every selected call. Missing optional fields stay unknown.',
      invalidUsage: 'Invalid usage', missingUsage: 'Missing usage', timingCoverage: 'Exact timing', cacheCoverage: 'Cache trio',
      status: 'Status', succeeded: 'Succeeded', failed: 'Failed', cancelled: 'Cancelled', statusUnknown: 'Unknown',
      details: 'Call details', showing: 'Showing', of: 'of', rows: 'rows', previousPage: 'Previous page', nextPage: 'Next page',
      capturedAt: 'Time', attempt: 'Attempt', duration: 'LLM time', copyKey: 'Copy call_key', keyCopied: 'call_key copied',
      metricTokens: 'Tokens', metricCost: 'Cost', metricCalls: 'Calls',
      budget: 'Budget', dailyBudget: 'Daily budget', monthlyBudget: 'Monthly budget', today: 'Today', thisMonth: 'This month',
      forecast: 'Projected month-end from the last 7 days', overBudget: 'Over budget', nearBudget: 'Near budget',
      heatmap: 'Activity (weekday × hour)', heatmapHint: 'Call counts aggregated in the selected time zone; darker means busier.',
      noData: 'No data for these filters', clearFilters: 'Clear filters', loadError: 'Load failed', retry: 'Retry',
      updatedAt: 'Updated', dataThrough: 'Data through', stale: 'Data may be stale', paused: 'Auto refresh paused',
      copied: 'Copied to clipboard', copyFailed: 'Copy failed', exportFailed: 'Export failed', exportDone: 'Download started',
      costColumn: 'Cost', hideSeriesHint: 'Click a legend entry to hide that series',
      shortcuts: 'Shortcuts: 1/2/3/0 range · R refresh · E export CSV · / search',
      otherModels: 'Others', sessionsScanned: 'Sessions scanned', callsInserted: 'Calls added', scanErrors: 'Read errors',
      timingSince: 'Exact timing starts when the plugin is enabled; history restores verifiable tokens only.',
      partial: 'Partial coverage', unavailable: '—', liveErrors: 'Live capture errors', total: 'Total',
      priceNote: 'Price tier: DeepSeek peak-hour estimate', brushHint: 'Drag to zoom', resetZoom: 'Reset zoom',
      prevDay: 'vs previous day', share: 'share', none: '—',
      cumulative: 'Cumulative', cumulativeHint: 'Switch to a running total', compare: 'Compare',
      compareHint: 'Overlay the previous equal-length window', compareUnavailable: 'Needs an explicit date range',
      previousPeriod: 'Previous', columns: 'Columns', sessionFilter: 'Filter to this session',
      clearAll: 'Clear filters and dates', partialBadge: 'Partial coverage', fullBadge: 'Full coverage', copyLink: 'Link',
    },
  }

  function localeKey() {
    const language = document.documentElement.lang || navigator.language || 'en'
    return language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
  }

  const STYLE = `
  .uc-page, .uc-page * { box-sizing: border-box; }
  .uc-page {
    --uc-dur-1:.12s; --uc-dur-2:.25s; --uc-dur-3:.6s;
    --uc-ease-out: cubic-bezier(.22,1,.36,1);
    --uc-series-1: var(--dsw-alias-brand-primary);
    --uc-series-2: var(--dsw-alias-state-success);
    --uc-series-3: var(--dsw-alias-state-business);
    --uc-series-4: var(--dsw-alias-state-warn);
    --uc-series-5: var(--dsw-alias-state-error);
    --uc-series-6: color-mix(in srgb, var(--dsw-alias-brand-primary) 58%, var(--dsw-alias-state-business));
    --uc-series-7: color-mix(in srgb, var(--dsw-alias-state-success) 62%, var(--dsw-alias-brand-primary));
    --uc-series-8: color-mix(in srgb, var(--dsw-alias-state-business) 55%, var(--dsw-alias-state-warn));
    height:100%; min-width:0; min-height:0; overflow:auto;
    padding:calc(26px + var(--dsh-frame-top-clearance, 0px)) 28px 48px;
    background:var(--dsw-alias-bg-base); color:var(--dsw-alias-label-primary); font-family:var(--dsw-font-family, inherit);
  }
  .uc-shell { width:min(1480px, 100%); margin:0 auto; }
  .uc-head { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; margin-bottom:22px; }
  .uc-title { margin:0; font-size:28px; line-height:1.2; letter-spacing:-.02em; }
  .uc-subtitle { margin:8px 0 0; color:var(--dsw-alias-label-secondary); font-size:13px; }
  .uc-stamp { display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-top:9px; color:var(--dsw-alias-label-tertiary); font-size:10px; }
  .uc-stamp b { color:var(--dsw-alias-label-secondary); font-weight:600; }
  .uc-stamp[data-stale='true'] b { color:var(--dsw-alias-state-warn); }
  .uc-dot { width:6px; height:6px; border-radius:50%; background:var(--dsw-alias-state-success); display:inline-block; }
  .uc-dot[data-paused='true'] { background:var(--dsw-alias-label-caption); }
  .uc-actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; }
  .uc-button { min-height:36px; padding:0 13px; border:0.5px solid var(--dsw-alias-border-l2); border-radius:var(--dsw-radius-md, 10px); background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); cursor:pointer; font:inherit; font-size:12px; font-weight:600; transition:background var(--uc-dur-1) ease, transform var(--uc-dur-1) ease; }
  .uc-button:hover { background:var(--dsw-alias-interactive-hover); }
  .uc-button:active { transform:scale(.97); }
  .uc-button:disabled { cursor:not-allowed; opacity:.55; }
  .uc-button--primary { border-color:transparent; background:var(--dsw-alias-brand-primary); color:var(--dsw-alias-label-on-color, white); }
  .uc-button[data-on='true'] { border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, transparent); }
  .uc-ranges { display:flex; gap:4px; padding:4px; border-radius:var(--dsw-radius-md, 10px); background:var(--dsw-alias-bg-layer-1); }
  .uc-range { padding:7px 10px; border:0; border-radius:7px; background:transparent; color:var(--dsw-alias-label-secondary); cursor:pointer; font:inherit; font-size:12px; transition:background var(--uc-dur-1) ease, color var(--uc-dur-1) ease; }
  .uc-range:hover { color:var(--dsw-alias-label-primary); }
  .uc-range[data-active='true'] { background:var(--dsw-alias-bg-layer-3); color:var(--dsw-alias-label-primary); box-shadow:var(--dsw-elevation-1); }
  .uc-filters { display:grid; grid-template-columns:repeat(6, minmax(130px, 1fr)); gap:10px; margin-bottom:16px; }
  .uc-field { display:grid; gap:6px; color:var(--dsw-alias-label-tertiary); font-size:11px; font-weight:600; }
  .uc-select, .uc-date, .uc-input { width:100%; min-width:0; height:36px; padding:0 10px; border:0.5px solid var(--dsw-alias-border-l2); border-radius:var(--dsw-radius-md, 10px); outline:0; background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-primary); font:inherit; font-size:12px; transition:border-color var(--uc-dur-1) ease, box-shadow var(--uc-dur-1) ease; }
  .uc-select:focus, .uc-date:focus, .uc-input:focus { border-color:var(--dsw-alias-brand-primary); box-shadow:0 0 0 3px color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent); }
  .uc-scan { display:grid; grid-template-columns:minmax(210px, 1.3fr) repeat(3, minmax(120px, .6fr)); gap:12px; align-items:center; margin-bottom:16px; padding:13px 15px; border:0.5px solid var(--dsw-alias-border-l3); border-radius:var(--dsw-radius-lg, 14px); background:var(--dsw-alias-bg-layer-1); }
  .uc-scan__title { font-size:12px; font-weight:700; }
  .uc-scan__meta { margin-top:5px; color:var(--dsw-alias-label-tertiary); font-size:11px; }
  .uc-progress { height:4px; margin-top:9px; overflow:hidden; border-radius:99px; background:var(--dsw-alias-bg-layer-3); }
  .uc-progress span { display:block; height:100%; border-radius:inherit; background:var(--dsw-alias-brand-primary); transition:width var(--uc-dur-2) ease; }
  .uc-scan__stat { color:var(--dsw-alias-label-tertiary); font-size:10px; text-transform:uppercase; letter-spacing:.04em; }
  .uc-scan__stat strong { display:block; margin-top:4px; color:var(--dsw-alias-label-primary); font-size:14px; letter-spacing:0; }
  .uc-kpis { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:12px; margin-bottom:16px; }
  .uc-card { min-width:0; border:0.5px solid var(--dsw-alias-border-l3); border-radius:var(--dsw-radius-lg, 14px); background:var(--dsw-alias-bg-layer-1); }
  .uc-kpi { min-height:122px; padding:16px; transition:border-color var(--uc-dur-2) ease, transform var(--uc-dur-2) var(--uc-ease-out); }
  .uc-kpi:hover { border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, var(--dsw-alias-border-l3)); transform:translateY(-1px); }
  .uc-kpi__label { display:flex; align-items:center; gap:6px; color:var(--dsw-alias-label-secondary); font-size:11px; }
  .uc-kpi__label i { width:7px; height:7px; border-radius:2px; background:var(--uc-kpi-color, var(--dsw-alias-brand-primary)); }
  .uc-kpi__value { margin-top:10px; overflow:hidden; color:var(--dsw-alias-label-primary); font-size:25px; font-weight:720; letter-spacing:-.025em; text-overflow:ellipsis; white-space:nowrap; font-variant-numeric:tabular-nums; }
  .uc-kpi__meta { margin-top:8px; color:var(--dsw-alias-label-tertiary); font-size:10px; line-height:1.45; }
  .uc-grid { display:grid; grid-template-columns:minmax(0, 1.65fr) minmax(300px, .8fr); gap:12px; margin-bottom:12px; }
  .uc-grid--even { grid-template-columns:repeat(2, minmax(0, 1fr)); }
  .uc-chart { min-height:280px; padding:17px; }
  .uc-card__head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:13px; }
  .uc-card__title { margin:0; font-size:13px; font-weight:700; }
  .uc-card__hint { margin:5px 0 0; color:var(--dsw-alias-label-tertiary); font-size:10px; line-height:1.4; }
  .uc-seg { display:flex; gap:3px; padding:3px; border-radius:8px; background:var(--dsw-alias-bg-layer-2); }
  .uc-seg button { padding:4px 9px; border:0; border-radius:6px; background:transparent; color:var(--dsw-alias-label-secondary); cursor:pointer; font:inherit; font-size:10px; }
  .uc-seg button[data-active='true'] { background:var(--dsw-alias-bg-layer-3); color:var(--dsw-alias-label-primary); box-shadow:var(--dsw-elevation-1); }
  .uc-legend { display:flex; flex-wrap:wrap; gap:11px; color:var(--dsw-alias-label-tertiary); font-size:10px; }
  .uc-legend button { display:inline-flex; align-items:center; gap:5px; padding:2px 4px; border:0; border-radius:5px; background:transparent; color:inherit; cursor:pointer; font:inherit; transition:opacity var(--uc-dur-1) ease; }
  .uc-legend button[data-hidden='true'] { opacity:.38; text-decoration:line-through; }
  .uc-legend i { display:inline-block; width:9px; height:3px; border-radius:5px; background:currentColor; }
  .uc-chart-plot { position:relative; min-width:0; border-radius:var(--dsw-radius-sm, 8px); outline:none; touch-action:pan-y; }
  .uc-chart-plot:focus-visible, .uc-donut-wrap:focus-visible, .uc-bar__row:focus-visible { outline:2px solid var(--dsw-alias-brand-primary); outline-offset:3px; }
  .uc-svg { display:block; width:100%; height:210px; overflow:visible; }
  .uc-gridline { stroke:var(--dsw-alias-border-l4); stroke-width:.7; stroke-dasharray:3 4; }
  .uc-tick { fill:var(--dsw-alias-label-caption); font-size:9px; font-variant-numeric:tabular-nums; }
  .uc-line { fill:none; stroke-width:2.4; stroke-linecap:round; stroke-linejoin:round; }
  .uc-line[data-anim='true'] { stroke-dasharray:1; stroke-dashoffset:1; animation:uc-draw var(--uc-dur-3) var(--uc-ease-out) forwards; }
  .uc-area { opacity:0; animation:uc-fade .7s var(--uc-ease-out) .12s forwards; }
  .uc-hit-zone { fill:transparent; pointer-events:all; cursor:crosshair; }
  .uc-hover-line { stroke:var(--dsw-alias-label-secondary); stroke-width:1; stroke-dasharray:3 3; pointer-events:none; animation:uc-fade var(--uc-dur-1) ease forwards; }
  .uc-point { stroke:var(--dsw-alias-bg-layer-1); stroke-width:1.5; opacity:.55; pointer-events:none; transition:opacity var(--uc-dur-1) ease, transform var(--uc-dur-1) var(--uc-ease-out); transform-box:fill-box; transform-origin:center; }
  .uc-point[data-active='true'] { opacity:1; transform:scale(1.9); }
  .uc-bar { transform-box:fill-box; transform-origin:bottom; animation:uc-grow .5s var(--uc-ease-out) backwards; animation-delay:calc(var(--uc-i, 0) * 18ms); }
  .uc-brush { fill:color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent); stroke:color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, transparent); stroke-width:1; }
  .uc-tooltip { position:absolute; z-index:5; top:8px; left:50%; width:max-content; min-width:196px; max-width:min(290px, calc(100% - 16px)); padding:10px 11px; transform:translateX(-50%); border:0.5px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, var(--dsw-alias-border-l2)); border-radius:var(--dsw-radius-md, 10px); background:color-mix(in srgb, var(--dsw-alias-bg-layer-1) 95%, transparent); box-shadow:var(--dsw-elevation-2, 0 10px 28px rgba(0,0,0,.24)); color:var(--dsw-alias-label-primary); pointer-events:none; backdrop-filter:blur(12px); animation:uc-pop-in .14s var(--uc-ease-out); }
  .uc-tooltip[data-align='left'] { transform:none; }
  .uc-tooltip[data-align='right'] { transform:translateX(-100%); }
  .uc-tooltip__title { display:block; margin-bottom:7px; overflow:hidden; font-size:11px; font-weight:720; text-overflow:ellipsis; white-space:nowrap; }
  .uc-tooltip__row { display:grid; grid-template-columns:auto minmax(0, 1fr) auto; gap:7px; align-items:baseline; margin-top:4px; color:var(--dsw-alias-label-tertiary); font-size:10px; }
  .uc-tooltip__row i { width:7px; height:7px; border-radius:2px; background:currentColor; }
  .uc-tooltip__row span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .uc-tooltip__row strong { color:var(--dsw-alias-label-primary); font-size:11px; font-variant-numeric:tabular-nums; }
  .uc-tooltip__row em { font-style:normal; color:var(--dsw-alias-label-tertiary); font-variant-numeric:tabular-nums; }
  .uc-tooltip--reveal { visibility:hidden; opacity:0; transition:opacity var(--uc-dur-1) ease, visibility var(--uc-dur-1) ease; }
  .uc-tooltip-host:hover > .uc-tooltip--reveal, .uc-tooltip-host:focus > .uc-tooltip--reveal, .uc-tooltip-host:focus-within > .uc-tooltip--reveal { visibility:visible; opacity:1; }
  .uc-donut-wrap { position:relative; display:grid; min-height:214px; place-items:center; border-radius:var(--dsw-radius-sm, 8px); outline:none; cursor:help; }
  .uc-donut { width:172px; height:172px; transform:rotate(-90deg); }
  .uc-donut circle { fill:none; stroke-width:13; transition:stroke-dasharray var(--uc-dur-2) var(--uc-ease-out), stroke-dashoffset var(--uc-dur-2) var(--uc-ease-out); }
  .uc-donut__track { stroke:var(--dsw-alias-bg-layer-3); }
  .uc-donut__center { position:absolute; text-align:center; }
  .uc-donut__center strong { display:block; font-size:26px; font-variant-numeric:tabular-nums; }
  .uc-donut__center span { color:var(--dsw-alias-label-tertiary); font-size:10px; }
  .uc-bars { display:grid; gap:11px; }
  .uc-bar__row { position:relative; display:grid; grid-template-columns:minmax(110px, .7fr) minmax(120px, 1.4fr) auto; gap:10px; align-items:center; border-radius:6px; outline:none; font-size:11px; cursor:pointer; padding:1px 0; transition:background var(--uc-dur-1) ease; }
  .uc-bar__row:hover { background:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 60%, transparent); }
  .uc-bar__label { display:flex; align-items:center; gap:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .uc-bar__label i { flex:none; width:7px; height:7px; border-radius:2px; background:currentColor; }
  .uc-bar__track { height:8px; overflow:hidden; border-radius:20px; background:var(--dsw-alias-bg-layer-3); }
  .uc-bar__fill { display:block; height:100%; border-radius:inherit; background:currentColor; animation:uc-widen .55s var(--uc-ease-out) backwards; animation-delay:calc(var(--uc-i, 0) * 30ms); }
  .uc-bar__value { color:var(--dsw-alias-label-secondary); font-variant-numeric:tabular-nums; white-space:nowrap; }
  .uc-bar__row > .uc-tooltip { top:calc(100% + 6px); right:0; left:auto; transform:none; }
  .uc-heat { display:grid; grid-template-columns:auto repeat(24, minmax(0, 1fr)); gap:3px; align-items:center; }
  .uc-heat__label { width:26px; color:var(--dsw-alias-label-tertiary); font-size:9px; }
  .uc-heat__cell { position:relative; aspect-ratio:1 / 1; min-height:9px; border-radius:2px; background:var(--dsw-alias-bg-layer-3); cursor:default; transition:transform var(--uc-dur-1) ease; }
  .uc-heat__cell:hover { outline:1.5px solid var(--dsw-alias-brand-primary); transform:scale(1.15); }
  .uc-heat__axis { color:var(--dsw-alias-label-caption); font-size:8px; }
  .uc-budget { display:grid; gap:10px; }
  .uc-budget__row { display:grid; grid-template-columns:auto minmax(0, 1fr) auto; gap:10px; align-items:center; font-size:11px; }
  .uc-budget__track { height:6px; overflow:hidden; border-radius:99px; background:var(--dsw-alias-bg-layer-3); }
  .uc-budget__fill { display:block; height:100%; border-radius:inherit; background:var(--dsw-alias-brand-primary); transition:width var(--uc-dur-2) ease, background var(--uc-dur-2) ease; }
  .uc-budget__fill[data-level='warn'] { background:var(--dsw-alias-state-warn); }
  .uc-budget__fill[data-level='over'] { background:var(--dsw-alias-state-error); }
  .uc-budget__forecast { color:var(--dsw-alias-label-tertiary); font-size:10px; }
  .uc-coverage { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:10px; }
  .uc-coverage__item { padding:12px; border-radius:var(--dsw-radius-md, 10px); background:var(--dsw-alias-bg-layer-2); }
  .uc-coverage__item span { color:var(--dsw-alias-label-tertiary); font-size:10px; }
  .uc-coverage__item strong { display:block; margin-top:5px; font-size:14px; font-variant-numeric:tabular-nums; }
  .uc-table-card { margin-top:12px; overflow:hidden; }
  .uc-table-head { align-items:center; padding:16px 17px 12px; flex-wrap:wrap; }
  .uc-table-tools { display:flex; align-items:center; justify-content:flex-end; gap:10px; min-width:0; flex-wrap:wrap; }
  .uc-table-tools .uc-card__hint { margin:0; white-space:nowrap; }
  .uc-table-search { width:170px; height:30px; font-size:11px; }
  .uc-table-pagination { display:flex; align-items:center; gap:7px; color:var(--dsw-alias-label-tertiary); font-size:10px; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .uc-table-page-button { display:grid; width:28px; height:28px; padding:0; place-items:center; border:0.5px solid var(--dsw-alias-border-l2); border-radius:8px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); cursor:pointer; font:inherit; font-size:16px; line-height:1; transition:background var(--uc-dur-1) ease; }
  .uc-table-page-button:hover:not(:disabled) { background:var(--dsw-alias-interactive-hover); }
  .uc-table-page-button:focus-visible { outline:2px solid var(--dsw-alias-brand-primary); outline-offset:2px; }
  .uc-table-page-button:disabled { cursor:not-allowed; opacity:.35; }
  .uc-table-wrap { height:clamp(340px, 52vh, 560px); overflow:auto; border-top:0.5px solid var(--dsw-alias-border-l4); scrollbar-gutter:stable; }
  .uc-table-wrap:focus-visible { outline:2px solid var(--dsw-alias-brand-primary); outline-offset:-2px; }
  .uc-table { width:100%; min-width:1320px; border-collapse:collapse; font-size:11px; }
  .uc-table th { position:sticky; z-index:1; top:0; padding:9px 11px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-tertiary); font-weight:650; text-align:left; white-space:nowrap; }
  .uc-table th button { display:inline-flex; align-items:center; gap:4px; padding:0; border:0; background:transparent; color:inherit; cursor:pointer; font:inherit; font-weight:650; }
  .uc-table th button:hover { color:var(--dsw-alias-label-primary); }
  .uc-table th span { font-size:9px; color:var(--dsw-alias-brand-primary); }
  .uc-table td { max-width:220px; padding:9px 11px; border-top:0.5px solid var(--dsw-alias-border-l4); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-variant-numeric:tabular-nums; }
  .uc-table tbody tr { transition:background var(--uc-dur-1) ease; }
  .uc-table tbody tr:hover { background:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 65%, transparent); }
  .uc-copy { width:22px; height:22px; padding:0; border:0; border-radius:6px; background:transparent; color:var(--dsw-alias-label-tertiary); cursor:pointer; font-size:11px; opacity:0; transition:opacity var(--uc-dur-1) ease, background var(--uc-dur-1) ease; }
  .uc-table tbody tr:hover .uc-copy, .uc-copy:focus-visible { opacity:1; }
  .uc-copy:hover { background:var(--dsw-alias-bg-layer-3); color:var(--dsw-alias-label-primary); }
  .uc-status { display:inline-flex; align-items:center; gap:5px; }
  .uc-status::before { width:6px; height:6px; border-radius:50%; background:var(--dsw-alias-label-caption); content:''; }
  .uc-status[data-status='succeeded']::before { background:var(--dsw-alias-state-success); }
  .uc-status[data-status='failed']::before { background:var(--dsw-alias-state-error); }
  .uc-status[data-status='cancelled']::before { background:var(--dsw-alias-state-warn); }
  .uc-empty, .uc-error { display:grid; min-height:220px; padding:30px; place-items:center; color:var(--dsw-alias-label-tertiary); text-align:center; }
  .uc-empty__body { display:grid; gap:10px; justify-items:center; }
  .uc-error { color:var(--dsw-alias-state-error); }
  .uc-skeleton { position:relative; overflow:hidden; border-radius:8px; background:var(--dsw-alias-bg-layer-2); }
  .uc-skeleton::after { position:absolute; inset:0; background:linear-gradient(90deg, transparent, color-mix(in srgb, var(--dsw-alias-bg-layer-3) 80%, transparent), transparent); animation:uc-shimmer 1.4s infinite; content:''; }
  .uc-skeleton--kpi { min-height:122px; }
  .uc-skeleton--chart { min-height:280px; }
  .uc-skeletons { display:grid; gap:12px; }
  .uc-skeletons__row { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:12px; }
  .uc-toast { position:fixed; right:24px; bottom:24px; z-index:20; padding:9px 14px; border-radius:10px; background:var(--dsw-alias-bg-layer-3); color:var(--dsw-alias-label-primary); font-size:12px; box-shadow:var(--dsw-elevation-2); animation:uc-pop-in .18s var(--uc-ease-out); }
  .uc-line--ghost { stroke-dasharray:5 5; opacity:.42; }
  .uc-line--flat { stroke-dasharray:1; stroke-dashoffset:0; animation:none; }
  .uc-badge { display:inline-flex; align-items:center; gap:4px; margin-left:8px; padding:1px 6px; border-radius:99px; background:var(--dsw-alias-bg-layer-3); color:var(--dsw-alias-label-tertiary); font-size:9px; font-weight:600; vertical-align:middle; }
  .uc-badge[data-partial='true'] { background:color-mix(in srgb, var(--dsw-alias-state-warn) 18%, transparent); color:var(--dsw-alias-state-warn); }
  .uc-toggles { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
  .uc-toggle { padding:3px 8px; border:0.5px solid var(--dsw-alias-border-l2); border-radius:7px; background:transparent; color:var(--dsw-alias-label-secondary); cursor:pointer; font:inherit; font-size:10px; transition:background var(--uc-dur-1) ease, color var(--uc-dur-1) ease; }
  .uc-toggle[data-on='true'] { border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, transparent); background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); }
  .uc-toggle:disabled { opacity:.4; cursor:not-allowed; }
  .uc-empty__actions { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; }
  .uc-menu { position:relative; }
  .uc-menu > summary { display:inline-flex; align-items:center; gap:5px; padding:4px 9px; border:0.5px solid var(--dsw-alias-border-l2); border-radius:7px; background:transparent; color:var(--dsw-alias-label-secondary); cursor:pointer; font-size:10px; list-style:none; }
  .uc-menu > summary::-webkit-details-marker { display:none; }
  .uc-menu[open] > summary { background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); }
  .uc-menu__panel { position:absolute; z-index:6; top:calc(100% + 6px); right:0; display:grid; gap:4px; min-width:150px; max-height:260px; overflow:auto; padding:8px; border:0.5px solid var(--dsw-alias-border-l2); border-radius:10px; background:var(--dsw-alias-bg-layer-1); box-shadow:var(--dsw-elevation-2); }
  .uc-menu__item { display:flex; align-items:center; gap:7px; padding:3px 4px; border-radius:5px; color:var(--dsw-alias-label-secondary); font-size:10px; cursor:pointer; }
  .uc-menu__item:hover { background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); }
  .uc-sr { position:absolute; width:1px; height:1px; padding:0; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; border:0; }
  .uc-icon { display:block; }
  @keyframes uc-draw { to { stroke-dashoffset: 0; } }
  @keyframes uc-fade { from { opacity:0; } to { opacity:1; } }
  @keyframes uc-grow { from { transform:scaleY(0); } to { transform:scaleY(1); } }
  @keyframes uc-widen { from { transform:scaleX(0); transform-origin:left; } to { transform:scaleX(1); transform-origin:left; } }
  @keyframes uc-pop-in { from { opacity:0; transform:translateY(4px) scale(.98); } to { opacity:1; transform:none; } }
  @keyframes uc-shimmer { from { transform:translateX(-100%); } to { transform:translateX(100%); } }
  @media (prefers-reduced-motion: reduce) {
    .uc-line[data-anim='true'], .uc-area, .uc-bar, .uc-bar__fill, .uc-tooltip, .uc-toast, .uc-hover-line { animation:none !important; }
    .uc-line[data-anim='true'] { stroke-dasharray:none; stroke-dashoffset:0; }
    .uc-area { opacity:1; }
    .uc-progress span, .uc-donut circle, .uc-budget__fill, .uc-point { transition:none; }
  }
  @media (max-width:1100px) { .uc-filters { grid-template-columns:repeat(3, minmax(130px, 1fr)); } .uc-kpis { grid-template-columns:repeat(2, minmax(0, 1fr)); } .uc-grid, .uc-grid--even { grid-template-columns:1fr; } }
  @media (max-width:680px) {
    .uc-page { padding-left:14px; padding-right:14px; }
    .uc-head { display:grid; } .uc-actions { justify-content:flex-start; }
    .uc-filters { grid-template-columns:1fr 1fr; } .uc-scan { grid-template-columns:1fr 1fr; } .uc-scan > :first-child { grid-column:1 / -1; }
    .uc-kpis, .uc-skeletons__row { grid-template-columns:1fr 1fr; gap:8px; } .uc-kpi { padding:13px; } .uc-kpi__value { font-size:21px; }
    .uc-coverage { grid-template-columns:1fr 1fr; } .uc-table-head { align-items:flex-start; } .uc-table-tools { align-items:flex-end; flex-direction:column; gap:7px; }
    .uc-table-wrap { height:min(480px, 58vh); }
  }
  `

  window.__ModuleLoader__.load({
    id: PACKAGE_ID,
    factory(require) {
      const React = require('react')
      const { useCallback, useEffect, useId, useMemo, useRef, useState } = React
      const h = React.createElement

      const reducedMotion = () => typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches

      function tcopy() { return COPY[localeKey()] }

      function number(value, maximumFractionDigits = 0) {
        return typeof value === 'number' && Number.isFinite(value)
          ? new Intl.NumberFormat(localeKey() === 'zh' ? 'zh-CN' : 'en-US', { maximumFractionDigits }).format(value)
          : '—'
      }

      function exactNumber(value, maximumFractionDigits = 0) {
        return typeof value === 'number' && Number.isFinite(value) ? number(value, maximumFractionDigits) : '—'
      }

      function compactNumber(value) {
        if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
        const absolute = Math.abs(value)
        if (absolute >= 1e9) return `${(value / 1e9).toFixed(1)}B`
        if (absolute >= 1e6) return `${(value / 1e6).toFixed(1)}M`
        if (absolute >= 1e4) return `${(value / 1e3).toFixed(1)}k`
        return number(value)
      }

      function percent(value) {
        return typeof value === 'number' && Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '—'
      }

      function money(value) {
        return typeof value === 'number' && Number.isFinite(value)
          ? `¥${new Intl.NumberFormat(localeKey() === 'zh' ? 'zh-CN' : 'en-US', { maximumFractionDigits: 2 }).format(value)}`
          : '—'
      }

      function milliseconds(value) {
        if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
        if (value < 1000) return `${Math.round(value)} ms`
        return `${(value / 1000).toFixed(value < 10000 ? 2 : 1)} s`
      }

      function dateTime(value) {
        if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
        return new Intl.DateTimeFormat(localeKey() === 'zh' ? 'zh-CN' : 'en-US', {
          year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
        }).format(new Date(value))
      }

      function clock(value) {
        if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
        return new Intl.DateTimeFormat(localeKey() === 'zh' ? 'zh-CN' : 'en-US', {
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        }).format(new Date(value))
      }

      function coverage(field, total) {
        if (!total) return '—'
        const known = field?.knownCalls || 0
        return `${known}/${total}`
      }

      function seriesVar(key) {
        let hash = 0
        const text = String(key ?? '')
        for (let index = 0; index < text.length; index += 1) hash = (hash * 31 + text.charCodeAt(index)) % 100000
        return `var(--uc-series-${hash % SERIES_SLOTS + 1})`
      }

      function paramsOf(filters, detail) {
        const parameters = new URLSearchParams()
        for (const [key, value] of Object.entries(filters)) {
          if (value !== undefined && value !== null && value !== '') parameters.set(key, String(value))
        }
        for (const [key, value] of Object.entries(detail ?? {})) {
          if (value !== undefined && value !== null && value !== '') parameters.set(key, String(value))
        }
        return parameters.toString()
      }

      function startOfDay(date) {
        const copy = new Date(date)
        copy.setHours(0, 0, 0, 0)
        return copy.getTime()
      }

      /** Small persisted state helper: localStorage JSON with a safe fallback. */
      function usePersisted(key, initial) {
        const [value, setValue] = useState(() => {
          try {
            const raw = window.localStorage?.getItem(key)
            return raw === null || raw === undefined ? initial : JSON.parse(raw)
          } catch {
            return initial
          }
        })
        useEffect(() => {
          try { window.localStorage?.setItem(key, JSON.stringify(value)) } catch { /* private mode */ }
        }, [value])
        return [value, setValue]
      }

      /** One-shot read of the panel state kept in the address bar (shareable links). */
      function urlState() {
        try {
          const parameters = new URL(window.location?.href ?? 'http://local/').searchParams
          const range = parameters.get('ucRange')
          return {
            range: ['7', '30', '90', 'all', 'custom'].includes(range) ? range : null,
            from: parameters.get('ucFrom') || '',
            to: parameters.get('ucTo') || '',
            metric: parameters.get('ucMetric') === 'cost' ? 'cost' : parameters.has('ucMetric') ? 'tokens' : null,
            barMetric: parameters.get('ucBar') === 'cost' ? 'cost' : parameters.has('ucBar') ? 'tokens' : null,
            compare: parameters.get('ucCmp') === '1' ? true : parameters.get('ucCmp') === '0' ? false : null,
            cumulative: parameters.get('ucCum') === '1' ? true : parameters.get('ucCum') === '0' ? false : null,
            dimensions: {
              workspace: parameters.get('workspace') ?? '',
              group: parameters.get('group') ?? '',
              sessionState: parameters.get('sessionState') ?? '',
              session: parameters.get('session') ?? '',
              provider: parameters.get('provider') ?? '',
              model: parameters.get('model') ?? '',
            },
          }
        } catch {
          return { range: null, from: '', to: '', metric: null, barMetric: null, compare: null, cumulative: null, dimensions: null }
        }
      }

      /** Fill the fields a v1 host cannot send yet, so a version skew degrades instead of crashing. */
      function normalizePayload(body) {
        if (body === null || typeof body !== 'object') return body
        const summary = body.summary === undefined ? body.summary : {
          ...body.summary,
          cost: body.summary.cost ?? {
            currency: 'CNY', total: 0, complete: false, completeCalls: 0, knownCalls: body.summary.calls ?? 0,
          },
        }
        const withCost = item => (item?.cost === undefined ? { ...item, cost: { total: 0, input: 0, output: 0, cacheRead: 0 } } : item)
        return {
          ...body,
          summary,
          daily: (body.daily ?? []).map(withCost),
          previous: body.previous ?? null,
          byModel: (body.byModel ?? []).map(withCost),
          byProvider: (body.byProvider ?? []).map(withCost),
          heatmap: body.heatmap ?? [],
          budget: body.budget ?? null,
          pricing: body.pricing ?? { currency: 'CNY' },
          detail: body.detail ?? {
            offset: 0,
            limit: 30,
            sort: 'captured_at',
            dir: 'desc',
            search: '',
            total: body.detailTotal ?? (body.details?.length ?? 0),
            filtered: body.details?.length ?? 0,
          },
        }
      }

      function dayKey(time) {
        const date = new Date(time)
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      }

      function fieldValue(field) {
        return (field?.knownCalls || 0) > 0 && Number.isFinite(field?.knownSum) ? field.knownSum : null
      }

      function Icon({ size = 20 }) {
        return h('svg', {
          className: 'uc-icon', width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
          stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true',
        },
        h('path', { d: 'M4 19V9M10 19V5M16 19v-6M22 19H2' }))
      }

      /** Animate a metric into place without touching the DOM outside this component. */
      function useCountUp(value) {
        const target = typeof value === 'number' && Number.isFinite(value) ? value : null
        const [display, setDisplay] = useState(target)
        const fromRef = useRef(target)
        useEffect(() => {
          if (target === null) {
            fromRef.current = null
            setDisplay(null)
            return undefined
          }
          const from = fromRef.current ?? target
          fromRef.current = target
          setDisplay(target)
          if (reducedMotion() || from === target || typeof requestAnimationFrame !== 'function') return undefined
          let frame = 0
          let elapsed = 0
          setDisplay(from)
          const started = performance.now()
          const step = (now) => {
            elapsed = Math.min(1, (now - started) / 480)
            const eased = 1 - (1 - elapsed) ** 3
            setDisplay(from + (target - from) * eased)
            if (elapsed < 1) frame = requestAnimationFrame(step)
          }
          frame = requestAnimationFrame(step)
          return () => cancelAnimationFrame(frame)
        }, [target])
        return display
      }

      function Kpi({ label, value, text, meta, color }) {
        const animated = useCountUp(value)
        return h('article', { className: 'uc-kpi uc-card', style: color ? { '--uc-kpi-color': color } : undefined },
          h('div', { className: 'uc-kpi__label' }, h('i'), label),
          h('div', { className: 'uc-kpi__value' }, text ?? exactNumber(animated)),
          meta ? h('div', { className: 'uc-kpi__meta' }, meta) : null,
        )
      }

      function SelectField({ label, value, onChange, options }) {
        return h('label', { className: 'uc-field' }, label,
          h('select', { className: 'uc-select', value, onChange: event => onChange(event.target.value) },
            h('option', { value: '' }, tcopy().all),
            ...options.map(item => h('option', { key: item.value, value: item.value }, item.label)),
          ),
        )
      }

      function ScanProgress({ scan }) {
        const c = tcopy()
        if (!scan) return null
        const running = scan.phase === 'listing' || scan.phase === 'scanning'
        const total = scan.totalSessions || 0
        const done = scan.scannedSessions || 0
        const ratio = total > 0 ? Math.min(1, done / total) : (running ? 0 : 1)
        const title = running
          ? (localeKey() === 'zh' ? '正在扫描历史会话…' : 'Scanning history…')
          : scan.phase === 'failed' || scan.phase === 'cancelled' ? c.scanErrors
            : (localeKey() === 'zh' ? '历史回填已完成' : 'History backfill complete')
        const errors = (scan.errorCount || 0) + (scan.liveErrorCount || 0)
        return h('section', { className: 'uc-scan' },
          h('div', null,
            h('div', { className: 'uc-scan__title' }, title),
            h('div', { className: 'uc-scan__meta' }, c.timingSince),
            h('div', { className: 'uc-progress' }, h('span', { style: { width: `${Math.round(ratio * 100)}%` } })),
          ),
          h('div', { className: 'uc-scan__stat' }, c.sessionsScanned, h('strong', null, number(done))),
          h('div', { className: 'uc-scan__stat' }, c.callsInserted, h('strong', null, number(scan.insertedCalls || 0))),
          h('div', { className: 'uc-scan__stat' }, c.scanErrors, h('strong', null, number(errors))),
        )
      }

      function ChartTooltip({ title, rows, left, top, align = 'center', reveal = false }) {
        return h('div', {
          className: `uc-tooltip${reveal ? ' uc-tooltip--reveal' : ''}`,
          ...(typeof left === 'number' ? { style: { left: `${left}%`, ...(typeof top === 'number' ? { top } : {}) } } : {}),
          'data-align': align,
          role: 'tooltip',
          ...(reveal ? {} : { 'aria-live': 'polite' }),
        },
        h('strong', { className: 'uc-tooltip__title', title }, title),
        ...rows.map((row, index) => h('div', { className: 'uc-tooltip__row', key: `${row.label}-${index}`, style: row.color ? { color: row.color } : undefined },
          h('i'), h('span', null, row.label), h('strong', null, row.value),
          row.extra === undefined ? null : h('em', null, row.extra),
        )))
      }

      function usePlotInteraction(length) {
        const [hoverIndex, setHoverIndex] = useState(null)
        const [focusIndex, setFocusIndex] = useState(null)
        useEffect(() => {
          setHoverIndex(null)
          setFocusIndex(current => current === null || length === 0 ? null : Math.min(current, length - 1))
        }, [length])
        const onFocus = () => setFocusIndex(current => current ?? Math.max(0, length - 1))
        const onBlur = (event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocusIndex(null)
        }
        const onKeyDown = (event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || length === 0) return
          event.preventDefault()
          setHoverIndex(null)
          setFocusIndex((current) => {
            const active = current ?? length - 1
            if (event.key === 'Home') return 0
            if (event.key === 'End') return length - 1
            if (event.key === 'ArrowLeft') return Math.max(0, active - 1)
            return Math.min(length - 1, active + 1)
          })
        }
        return { activeIndex: hoverIndex ?? focusIndex, setHoverIndex, onFocus, onBlur, onKeyDown }
      }

      function lineX(index, length, width, pad) {
        return pad + (length === 1 ? (width - pad * 2) / 2 : index * (width - pad * 2) / (length - 1))
      }

      function bandX(index, length, width, pad) {
        return pad + (index + .5) * (width - pad * 2) / length
      }

      function yFor(value, height, pad, maximum) {
        return height - pad - value / maximum * (height - pad * 2)
      }

      function coordinates(values, xValues, height, pad, maximum) {
        return values.map((value, index) => Number.isFinite(value) && value !== null
          ? { x: xValues[index], y: yFor(value, height, pad, maximum), value }
          : null)
      }

      function lineSegments(values) {
        const segments = []
        let current = []
        for (const value of values) {
          if (value === null) {
            if (current.length > 0) segments.push(current)
            current = []
          } else current.push(value)
        }
        if (current.length > 0) segments.push(current)
        return segments
      }

      function pointString(values) {
        return values.map(value => `${value.x.toFixed(1)},${value.y.toFixed(1)}`).join(' ')
      }

      function hitBounds(xValues, index, width) {
        return {
          from: index === 0 ? 0 : (xValues[index - 1] + xValues[index]) / 2,
          to: index === xValues.length - 1 ? width : (xValues[index] + xValues[index + 1]) / 2,
        }
      }

      function tooltipAlign(index, length) {
        if (index === 0) return 'left'
        if (index === length - 1) return 'right'
        return 'center'
      }

      function delta(previous, current) {
        if (typeof previous !== 'number' || !Number.isFinite(previous) || previous === 0) return undefined
        if (typeof current !== 'number' || !Number.isFinite(current)) return undefined
        const change = (current - previous) / previous
        if (!Number.isFinite(change)) return undefined
        const arrow = change > 0 ? '▲' : change < 0 ? '▼' : '■'
        return `${arrow} ${Math.abs(change * 100).toFixed(0)}%`
      }

      /** Drag a horizontal range over the plot and report the day indices it covers. */
      function useBrush({ width, pad, length, onRange }) {
        const [drag, setDrag] = useState(null)
        const point = (event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          return Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width))) * width
        }
        const indexAt = svgX => Math.max(0, Math.min(length - 1, Math.round((svgX - pad) / Math.max(1, (width - pad * 2) / Math.max(1, length - 1)))))
        const onPointerDown = (event) => {
          if (length === 0 || event.button !== 0) return
          const x = point(event)
          setDrag({ from: x, to: x })
          event.currentTarget.setPointerCapture?.(event.pointerId)
        }
        const onPointerMove = (event) => {
          if (drag === null) return
          const x = point(event)
          setDrag(current => current === null ? null : { ...current, to: x })
        }
        const finish = (event) => {
          if (drag === null) return
          const from = Math.min(drag.from, drag.to)
          const to = Math.max(drag.from, drag.to)
          setDrag(null)
          if (to - from < 8) {
            onRange?.(null, null, indexAt(from))
            return
          }
          const first = indexAt(from)
          const last = indexAt(to)
          onRange?.(null, null, null, first, last)
        }
        return { drag, onPointerDown, onPointerMove, onPointerUp: finish, onPointerCancel: () => setDrag(null) }
      }

      function BrushOverlay({ drag }) {
        if (drag === null) return null
        const from = Math.min(drag.from, drag.to)
        const to = Math.max(drag.from, drag.to)
        return h('rect', { className: 'uc-brush', x: from, y: 0, width: Math.max(1, to - from), height: 210 })
      }

      function TrendChart({
        daily, previous, metric, hidden, onToggle, onBrushRange,
        cumulative, compare, onToggleCompare, onToggleCumulative, hasPrevious, coverage,
      }) {
        const c = tcopy()
        const gradientId = `uc-grad-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
        const descriptionId = `uc-desc-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
        const width = 760, height = 210, pad = 34
        const interaction = usePlotInteraction(daily.length)
        const brush = useBrush({ width, pad, length: daily.length, onRange: onBrushRange })
        const metricOf = day => metric === 'cost' ? day.cost?.total ?? null : fieldValue(day.tokens.total_tokens)
        const outputOf = day => metric === 'cost' ? day.cost?.output ?? null : fieldValue(day.tokens.output_tokens)
        const running = (values) => {
          let sum = 0
          return values.map((value) => {
            if (typeof value === 'number' && Number.isFinite(value)) sum += value
            return sum
          })
        }
        let primary = daily.map(metricOf)
        let secondary = daily.map(outputOf)
        const previousByDate = new Map((previous ?? []).map(day => [day.date, metricOf(day)]))
        let ghost = compare && hasPrevious ? daily.map(day => previousByDate.get(day.date) ?? null) : []
        if (cumulative) {
          primary = running(primary)
          secondary = running(secondary)
          if (ghost.length > 0) ghost = running(ghost)
        }
        const maximum = Math.max(1, ...primary.filter(Number.isFinite), ...secondary.filter(Number.isFinite), ...ghost.filter(Number.isFinite))
        const xValues = daily.map((_, index) => lineX(index, daily.length, width, pad))
        const primaryPoints = coordinates(primary, xValues, height, pad, maximum)
        const secondaryPoints = coordinates(secondary, xValues, height, pad, maximum)
        const ghostPoints = coordinates(ghost, xValues, height, pad, maximum)
        const activeIndex = interaction.activeIndex
        const activeDay = activeIndex === null ? null : daily[activeIndex]
        const activeX = activeIndex === null ? null : xValues[activeIndex]
        const format = value => metric === 'cost' ? money(value) : compactNumber(value)
        const primaryHidden = hidden.includes(metric === 'cost' ? 'cost' : 'total')
        const secondaryHidden = hidden.includes(metric === 'cost' ? 'costOutput' : 'output')
        const ticks = [0, .25, .5, .75, 1]
        const labelCount = Math.min(5, Math.max(2, Math.floor(daily.length / 4)))
        const area = primaryHidden || primaryPoints.some(point => point === null)
          ? null
          : `${xValues[0]},${height - pad} ${pointString(primaryPoints)} ${xValues.at(-1)},${height - pad}`
        const previousDay = activeIndex !== null && activeIndex > 0 ? daily[activeIndex - 1] : null
        const colourA = metric === 'cost' ? 'var(--uc-series-3)' : 'var(--uc-series-1)'
        const colourB = metric === 'cost' ? 'var(--uc-series-4)' : 'var(--uc-series-2)'
        const colourGhost = 'var(--uc-series-5)'
        const legend = metric === 'cost'
          ? [{ key: 'cost', label: c.cost, color: colourA }, { key: 'costOutput', label: c.output, color: colourB }]
          : [{ key: 'total', label: c.totalLegend, color: colourA }, { key: 'output', label: c.outputLegend, color: colourB }]
        const ghostValue = activeIndex === null ? null : ghost[activeIndex] ?? null
        const activePrimary = activeIndex === null ? null : primary[activeIndex] ?? null
        return h(React.Fragment, null,
          h('div', { className: 'uc-legend' },
            ...legend.map(entry => h('button', {
              key: entry.key, type: 'button', 'data-hidden': hidden.includes(entry.key),
              style: { color: entry.color }, onClick: () => onToggle?.(entry.key), title: c.hideSeriesHint,
            }, h('i'), entry.label)),
            h('span', { style: { marginLeft: 'auto', display: 'flex', gap: 6 } },
              h('button', {
                type: 'button', className: 'uc-toggle', 'data-on': cumulative,
                onClick: () => onToggleCumulative?.(!cumulative), title: c.cumulativeHint,
              }, c.cumulative),
              h('button', {
                type: 'button', className: 'uc-toggle', 'data-on': compare, disabled: !hasPrevious,
                onClick: () => onToggleCompare?.(!compare), title: hasPrevious ? c.compareHint : c.compareUnavailable,
              }, c.compare),
            ),
          ),
          h('div', {
            className: 'uc-chart-plot', tabIndex: 0, role: 'group',
            'aria-label': `${metric === 'cost' ? c.costTrend : c.tokenTrend}. ${c.chartKeyboardHint}`,
            'aria-describedby': descriptionId,
            onFocus: interaction.onFocus, onBlur: interaction.onBlur, onKeyDown: interaction.onKeyDown,
            onPointerLeave: () => interaction.setHoverIndex(null),
            onPointerDown: brush.onPointerDown, onPointerMove: brush.onPointerMove,
            onPointerUp: brush.onPointerUp, onPointerCancel: brush.onPointerCancel,
            onDoubleClick: () => onBrushRange?.(null, null, null, 0, daily.length - 1),
          },
            h('svg', { className: 'uc-svg', viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': metric === 'cost' ? c.costTrend : c.tokenTrend },
              h('defs', null,
                h('linearGradient', { id: gradientId, x1: 0, y1: 0, x2: 0, y2: 1 },
                  h('stop', { offset: '0', stopColor: colourA, stopOpacity: .3 }),
                  h('stop', { offset: '1', stopColor: colourA, stopOpacity: 0 }),
                ),
              ),
              ...ticks.map(tick => h('line', {
                key: tick, className: 'uc-gridline', x1: pad, x2: width - pad,
                y1: pad + tick * (height - pad * 2), y2: pad + tick * (height - pad * 2),
              })),
              ...ticks.map(tick => h('text', {
                key: `ty-${tick}`, className: 'uc-tick', x: 2,
                y: pad + tick * (height - pad * 2) + 3,
              }, format(maximum * (1 - tick)))),
              area ? h('polygon', { className: 'uc-area', points: area, fill: `url(#${gradientId})` }) : null,
              ghostPoints.some(Boolean) ? lineSegments(ghostPoints).map((segment, index) => h('polyline', {
                key: `ghost-${index}`, className: 'uc-line uc-line--ghost', 'data-anim': 'true', pathLength: 1,
                points: pointString(segment), stroke: colourGhost,
              })) : null,
              primaryHidden ? null : lineSegments(primaryPoints).map((segment, index) => h('polyline', {
                key: `primary-${index}`, className: 'uc-line', 'data-anim': 'true', pathLength: 1,
                points: pointString(segment), stroke: colourA,
              })),
              secondaryHidden ? null : lineSegments(secondaryPoints).map((segment, index) => h('polyline', {
                key: `secondary-${index}`, className: 'uc-line', 'data-anim': 'true', pathLength: 1,
                points: pointString(segment), stroke: colourB,
              })),
              primaryHidden ? null : primaryPoints.map((point, index) => point
                ? h('circle', {
                  key: `primary-point-${index}`, className: 'uc-point', 'data-active': activeIndex === index,
                  cx: point.x, cy: point.y, r: 2.6, fill: colourA,
                })
                : null),
              secondaryHidden ? null : secondaryPoints.map((point, index) => point
                ? h('circle', {
                  key: `secondary-point-${index}`, className: 'uc-point', 'data-active': activeIndex === index,
                  cx: point.x, cy: point.y, r: 2.4, fill: colourB,
                })
                : null),
              activeX === null ? null : h('line', { className: 'uc-hover-line', x1: activeX, x2: activeX, y1: pad, y2: height - pad }),
              h(BrushOverlay, { drag: brush.drag }),
              ...daily.map((day, index) => {
                const bounds = hitBounds(xValues, index, width)
                return h('rect', {
                  key: `hit-${day.date}`, className: 'uc-hit-zone', x: bounds.from, y: 0, width: bounds.to - bounds.from, height,
                  onPointerEnter: () => interaction.setHoverIndex(index),
                  onFocus: () => interaction.setHoverIndex(index),
                })
              }),
              ...Array.from({ length: labelCount }, (_, step) => {
                const index = Math.round(step * (daily.length - 1) / Math.max(1, labelCount - 1))
                const anchor = index === 0 ? 'start' : index === daily.length - 1 ? 'end' : 'middle'
                return h('text', {
                  key: `tx-${index}`, className: 'uc-tick', x: xValues[index], y: height - 6, textAnchor: anchor,
                }, (daily[index]?.date ?? '').slice(5))
              }),
            ),
            activeDay ? h(ChartTooltip, {
              title: activeDay.date,
              left: activeX / width * 100,
              align: tooltipAlign(activeIndex, daily.length),
              rows: [
                {
                  label: metric === 'cost' ? c.cost : c.totalLegend,
                  value: format(activePrimary),
                  extra: previousDay ? delta(metricOf(previousDay), activePrimary) : undefined,
                  color: colourA,
                },
                {
                  label: metric === 'cost' ? c.output : c.outputLegend,
                  value: format(secondary[activeIndex] ?? null),
                  extra: previousDay ? delta(outputOf(previousDay), secondary[activeIndex]) : undefined,
                  color: colourB,
                },
                ...(compare && hasPrevious && ghostValue !== null
                  ? [{
                    label: c.previousPeriod,
                    value: format(ghostValue),
                    extra: delta(ghostValue, activePrimary),
                    color: colourGhost,
                  }]
                  : []),
                { label: c.callLegend, value: exactNumber(activeDay.calls) },
                ...(metric === 'cost'
                  ? [{ label: c.cacheReadLegend, value: money(activeDay.cost?.cacheRead ?? 0) }]
                  : [{ label: c.coveredCalls, value: `${activeDay.tokens.total_tokens.knownCalls}/${activeDay.calls}` }]),
              ],
            }) : null,
            h('table', { className: 'uc-sr', id: descriptionId },
              h('caption', null, c.tokenTrend),
              h('thead', null, h('tr', null,
                h('th', { scope: 'col' }, c.date),
                h('th', { scope: 'col' }, metric === 'cost' ? c.cost : c.totalLegend),
                h('th', { scope: 'col' }, metric === 'cost' ? c.output : c.outputLegend),
                ...(compare && hasPrevious ? [h('th', { scope: 'col' }, c.previousPeriod)] : []),
              )),
              h('tbody', null, ...daily.map((day, index) => h('tr', { key: `sr-${day.date}` },
                h('th', { scope: 'row' }, day.date),
                h('td', null, format(primary[index])),
                h('td', null, format(secondary[index])),
                ...(compare && hasPrevious ? [h('td', null, format(ghost[index] ?? null))] : []),
              ))),
            ),
            coverage ? h('span', { className: 'uc-badge', 'data-partial': coverage.partial }, coverage.label) : null,
          ),
        )
      }

      function CacheDonut({ summary }) {
        const c = tcopy(), radius = 58, circumference = 2 * Math.PI * radius
        const rate = summary?.cache?.tokenHitRate
        const read = summary?.tokens?.cache_read_tokens?.exactSum
        const write = summary?.tokens?.cache_write_tokens?.exactSum
        const uncached = summary?.tokens?.input_tokens?.exactSum
        const exact = [read, write, uncached].every(value => typeof value === 'number' && Number.isFinite(value))
        const total = exact ? read + write + uncached : 0
        const segments = exact && total > 0
          ? [
            { key: 'read', label: c.cacheReadLegend, value: read / total, amount: read, color: 'var(--uc-series-1)' },
            { key: 'write', label: c.cacheWriteLegend, value: write / total, amount: write, color: 'var(--uc-series-3)' },
            { key: 'uncached', label: c.inputLegend, value: uncached / total, amount: uncached, color: 'var(--uc-series-4)' },
          ]
          : []
        const single = typeof rate === 'number' ? rate : null
        const rows = segments.length > 0
          ? segments.map(segment => ({ label: segment.label, value: percent(segment.value), color: segment.color }))
          : [
            { label: c.tokenHit, value: percent(single) },
            { label: c.cacheRead, value: exactNumber(read) },
            { label: c.cacheBase, value: exactNumber(total || null) },
          ]
        let offset = 0
        return h('div', {
          className: 'uc-donut-wrap uc-tooltip-host', tabIndex: 0, role: 'img',
          'aria-label': rows.map(row => `${row.label}: ${row.value}`).join('; '),
        },
          h('svg', { className: 'uc-donut', viewBox: '0 0 160 160', 'aria-hidden': 'true' },
            h('circle', { className: 'uc-donut__track', cx: 80, cy: 80, r: radius }),
            segments.length > 0
              ? segments.map((segment) => {
                const length = circumference * segment.value
                const node = h('circle', {
                  key: segment.key, cx: 80, cy: 80, r: radius, stroke: segment.color,
                  strokeDasharray: `${length} ${circumference - length}`,
                  strokeDashoffset: -offset,
                  strokeLinecap: 'butt',
                })
                offset += length
                return node
              })
              : (single === null ? null : h('circle', {
                className: 'uc-donut__value', cx: 80, cy: 80, r: radius,
                strokeDasharray: `${circumference * single} ${circumference * (1 - single)}`,
              })),
          ),
          h('div', { className: 'uc-donut__center' },
            h('strong', null, percent(single)),
            h('span', null, `${summary?.cache?.knownCalls || 0}/${(summary?.cache?.knownCalls || 0) + (summary?.cache?.unknownCalls || 0)} ${c.reported}`),
          ),
          h(ChartTooltip, { title: c.cacheChart, rows, reveal: true }),
        )
      }

      function RouteBars({ data, metric, onDrill, currency }) {
        const c = tcopy()
        if (!data.length) return h('div', { className: 'uc-empty' }, c.noData)
        const valueOf = item => metric === 'cost' ? item.cost?.total ?? null : fieldValue(item.tokens.total_tokens)
        const ranked = [...data].sort((left, right) => {
          const leftValue = valueOf(left)
          const rightValue = valueOf(right)
          if (leftValue === null && rightValue !== null) return 1
          if (leftValue !== null && rightValue === null) return -1
          return (rightValue || 0) - (leftValue || 0) || right.calls - left.calls || left.key.localeCompare(right.key)
        })
        const visible = ranked.slice(0, 8)
        const rest = ranked.slice(8)
        const maximum = Math.max(1, ...visible.map(valueOf).filter(Number.isFinite))
        const row = (item, index, labelOverride, keyOverride) => {
          const value = valueOf(item)
          const color = seriesVar(keyOverride ?? item.key)
          const rows = metric === 'cost'
            ? [
              { label: c.cost, value: money(item.cost?.total), color },
              { label: c.callLegend, value: exactNumber(item.calls) },
              { label: c.totalLegend, value: exactNumber(fieldValue(item.tokens.total_tokens)) },
            ]
            : [
              { label: c.totalLegend, value: exactNumber(value), color },
              { label: c.callLegend, value: exactNumber(item.calls) },
              { label: c.coveredCalls, value: `${item.tokens.total_tokens.knownCalls}/${item.calls}` },
            ]
          return h('div', {
            className: 'uc-bar__row uc-tooltip-host', key: keyOverride ?? item.key, tabIndex: 0,
            role: 'button', 'aria-label': `${labelOverride ?? item.key}; ${rows.map(entry => `${entry.label}: ${entry.value}`).join('; ')}`,
            style: { color }, 'data-drill': keyOverride ?? item.key,
            onClick: () => onDrill?.(item),
            onKeyDown: event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onDrill?.(item) } },
          },
            h('span', { className: 'uc-bar__label' }, h('i'), labelOverride ?? item.key),
            h('span', { className: 'uc-bar__track' },
              value === null ? null : h('span', { className: 'uc-bar__fill', style: { width: `${value / maximum * 100}%`, '--uc-i': index } }),
            ),
            h('span', { className: 'uc-bar__value' }, metric === 'cost' ? money(value) : `${number(value)} · ${item.calls}`),
            h(ChartTooltip, { title: labelOverride ?? item.key, rows, reveal: true }),
          )
        }
        const others = rest.length === 0 ? null : (() => {
          const tokens = rest.reduce((sum, item) => sum + (fieldValue(item.tokens.total_tokens) ?? 0), 0)
          const calls = rest.reduce((sum, item) => sum + item.calls, 0)
          const cost = rest.reduce((sum, item) => sum + (item.cost?.total ?? 0), 0)
          const merged = { key: '__others__', calls, tokens: { total_tokens: { knownCalls: calls, knownSum: tokens } }, cost: { total: cost } }
          return row(merged, visible.length, `${c.otherModels} (${rest.length})`, '__others__')
        })()
        return h('div', { className: 'uc-bars' }, ...visible.map((item, index) => row(item, index)), others)
      }

      function RequestTrend({ daily }) {
        const c = tcopy(), width = 760, height = 210, pad = 34
        const interaction = usePlotInteraction(daily.length)
        if (!daily.length) return h('div', { className: 'uc-empty' }, c.noData)
        const calls = daily.map(day => day.calls)
        const speed = daily.map(day => Number.isFinite(day.timing.decodeTokensPerSecond.average) ? day.timing.decodeTokensPerSecond.average : null)
        const maxCalls = Math.max(1, ...calls), maxSpeed = Math.max(1, ...speed.filter(Number.isFinite))
        const barWidth = Math.max(3, (width - pad * 2) / daily.length * .48)
        const xValues = daily.map((_, index) => bandX(index, daily.length, width, pad))
        const speedPoints = coordinates(speed, xValues, height, pad, maxSpeed)
        const activeIndex = interaction.activeIndex
        const activeDay = activeIndex === null ? null : daily[activeIndex]
        const activeX = activeIndex === null ? null : xValues[activeIndex]
        return h(React.Fragment, null,
          h('div', { className: 'uc-legend' },
            h('span', { style: { color: 'var(--uc-series-1)' } }, h('i'), c.callLegend),
            h('span', { style: { color: 'var(--uc-series-3)' } }, h('i'), c.speedLegend),
          ),
          h('div', {
            className: 'uc-chart-plot', tabIndex: 0, role: 'group',
            'aria-label': `${c.requestTrend}. ${c.chartKeyboardHint}`,
            onFocus: interaction.onFocus, onBlur: interaction.onBlur, onKeyDown: interaction.onKeyDown,
            onPointerLeave: () => interaction.setHoverIndex(null),
          },
            h('svg', { className: 'uc-svg', viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': c.requestTrend },
              ...[0, .25, .5, .75, 1].map(tick => h('line', {
                key: tick, className: 'uc-gridline', x1: pad, x2: width - pad,
                y1: pad + tick * (height - pad * 2), y2: pad + tick * (height - pad * 2),
              })),
              ...calls.map((value, index) => {
                const barHeight = value / maxCalls * (height - pad * 2)
                return h('rect', {
                  key: `bar-${daily[index].date}`, className: 'uc-bar',
                  x: xValues[index] - barWidth / 2, y: height - pad - barHeight, width: barWidth, height: Math.max(0, barHeight), rx: 2,
                  fill: 'var(--uc-series-1)', opacity: activeIndex === index ? .95 : .62, style: { '--uc-i': index },
                })
              }),
              ...lineSegments(speedPoints).map((segment, index) => h('polyline', {
                key: `speed-${index}`, className: 'uc-line', 'data-anim': 'true', pathLength: 1,
                points: pointString(segment), stroke: 'var(--uc-series-3)', strokeWidth: 2.1,
              })),
              ...speedPoints.map((point, index) => point
                ? h('circle', {
                  key: `speed-point-${index}`, className: 'uc-point', 'data-active': activeIndex === index,
                  cx: point.x, cy: point.y, r: 2.4, fill: 'var(--uc-series-3)',
                })
                : null),
              activeX === null ? null : h('line', { className: 'uc-hover-line', x1: activeX, x2: activeX, y1: pad, y2: height - pad }),
              ...daily.map((day, index) => {
                const from = pad + index * (width - pad * 2) / daily.length
                const to = pad + (index + 1) * (width - pad * 2) / daily.length
                return h('rect', {
                  key: `hit-${day.date}`, className: 'uc-hit-zone', x: from, y: 0, width: to - from, height,
                  onPointerEnter: () => interaction.setHoverIndex(index),
                })
              }),
            ),
            activeDay ? h(ChartTooltip, {
              title: activeDay.date,
              left: activeX / width * 100,
              align: tooltipAlign(activeIndex, daily.length),
              rows: [
                { label: c.callLegend, value: exactNumber(activeDay.calls), color: 'var(--uc-series-1)' },
                { label: c.speedLegend, value: exactNumber(activeDay.timing.decodeTokensPerSecond.average, 1), color: 'var(--uc-series-3)' },
                {
                  label: c.speedSamples,
                  value: `${activeDay.timing.decodeTokensPerSecond.knownCalls}/${activeDay.timing.decodeTokensPerSecond.knownCalls + activeDay.timing.decodeTokensPerSecond.unknownCalls}`,
                },
              ],
            }) : null,
          ),
        )
      }

      function Heatmap({ cells }) {
        const c = tcopy()
        if (!cells?.length) return h('div', { className: 'uc-empty' }, c.noData)
        const lookup = new Map(cells.map(cell => [`${cell.weekday}:${cell.hour}`, cell]))
        const maximum = Math.max(1, ...cells.map(cell => cell.calls))
        const labels = localeKey() === 'zh'
          ? ['日', '一', '二', '三', '四', '五', '六']
          : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const [active, setActive] = useState(null)
        return h('div', { className: 'uc-chart-plot', onPointerLeave: () => setActive(null) },
          h('div', { className: 'uc-heat', role: 'img', 'aria-label': c.heatmap },
            h('span', { className: 'uc-heat__axis' }, ''),
            ...Array.from({ length: 24 }, (_, hour) => h('span', { key: `h-${hour}`, className: 'uc-heat__axis', style: { textAlign: 'center' } },
              hour % 6 === 0 ? String(hour).padStart(2, '0') : '')),
            ...labels.flatMap((label, weekday) => [
              h('span', { key: `l-${weekday}`, className: 'uc-heat__label' }, label),
              ...Array.from({ length: 24 }, (_, hour) => {
                const cell = lookup.get(`${weekday}:${hour}`)
                const intensity = cell ? Math.max(.08, cell.calls / maximum) : 0
                return h('span', {
                  key: `c-${weekday}-${hour}`, className: 'uc-heat__cell',
                  style: cell ? { background: `color-mix(in srgb, var(--uc-series-1) ${Math.round(intensity * 100)}%, var(--dsw-alias-bg-layer-3))` } : undefined,
                  onPointerEnter: () => setActive({ weekday, hour, cell }),
                  title: cell ? `${label} ${String(hour).padStart(2, '0')}:00 · ${cell.calls} ${c.callsUnit}` : undefined,
                })
              }),
            ]),
          ),
          active?.cell ? h(ChartTooltip, {
            title: `${labels[active.weekday]} ${String(active.hour).padStart(2, '0')}:00`,
            left: 40 + active.hour * 2.4,
            rows: [
              { label: c.calls, value: exactNumber(active.cell.calls), color: 'var(--uc-series-1)' },
              { label: c.totalLegend, value: exactNumber(active.cell.tokens) },
              { label: c.cost, value: money(active.cell.cost) },
            ],
          }) : null,
        )
      }

      function BudgetCard({ budget, daily, currency }) {
        const c = tcopy()
        if (!budget) return null
        const today = dayKey(Date.now())
        const monthPrefix = today.slice(0, 7)
        const todayCost = daily.filter(day => day.date === today).reduce((sum, day) => sum + (day.cost?.total ?? 0), 0)
        const monthCost = daily.filter(day => day.date.startsWith(monthPrefix)).reduce((sum, day) => sum + (day.cost?.total ?? 0), 0)
        const recent = daily.slice(-7)
        const average = recent.length === 0 ? 0 : recent.reduce((sum, day) => sum + (day.cost?.total ?? 0), 0) / recent.length
        const now = new Date()
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        const remaining = daysInMonth - now.getDate()
        const forecast = monthCost + average * remaining
        const bar = (label, used, limit) => {
          if (!limit) return null
          const ratio = used / limit
          const level = ratio >= 1 ? 'over' : ratio >= .8 ? 'warn' : 'ok'
          return h('div', { className: 'uc-budget__row', key: label },
            h('span', { style: { color: 'var(--dsw-alias-label-secondary)' } }, label),
            h('span', { className: 'uc-budget__track' },
              h('span', { className: 'uc-budget__fill', 'data-level': level, style: { width: `${Math.min(100, ratio * 100)}%` } }),
            ),
            h('span', { style: { color: level === 'over' ? 'var(--dsw-alias-state-error)' : 'var(--dsw-alias-label-secondary)' } },
              `${money(used)} / ${money(limit)}`),
          )
        }
        const overDaily = budget.daily ? todayCost > budget.daily : false
        const overMonthly = budget.monthly ? forecast > budget.monthly : false
        return h('section', { className: 'uc-card uc-chart', style: { minHeight: 0 } },
          h('div', { className: 'uc-card__head' },
            h('div', null, h('h2', { className: 'uc-card__title' }, c.budget),
              h('p', { className: 'uc-card__hint' }, `${c.priceNote} · ${c.costHint}`)),
            h('span', {
              style: { color: overDaily || overMonthly ? 'var(--dsw-alias-state-error)' : 'var(--dsw-alias-state-success)', fontSize: 10 },
            }, overDaily || overMonthly ? c.overBudget : c.nearBudget),
          ),
          h('div', { className: 'uc-budget' },
            bar(c.dailyBudget, todayCost, budget.daily),
            bar(c.monthlyBudget, monthCost, budget.monthly),
            h('div', { className: 'uc-budget__forecast' },
              `${c.forecast}：${money(forecast)}${budget.monthly ? ` / ${money(budget.monthly)}` : ''}`),
          ),
        )
      }

      function Coverage({ summary }) {
        const c = tcopy(), total = summary.calls
        const item = (label, value) => h('div', { className: 'uc-coverage__item', key: label }, h('span', null, label), h('strong', null, value))
        return h('section', { className: 'uc-card uc-chart' },
          h('div', { className: 'uc-card__head' }, h('div', null,
            h('h2', { className: 'uc-card__title' }, c.coverage),
            h('p', { className: 'uc-card__hint' }, c.coverageHint))),
          h('div', { className: 'uc-coverage' },
            item(c.totalTokens, coverage(summary.tokens.total_tokens, total)),
            item(c.cacheCoverage, `${summary.cache.knownCalls}/${total}`),
            item(c.timingCoverage, coverage(summary.timing.llmMs, total)),
            item(c.reasoning, coverage(summary.tokens.reasoning_tokens, total)),
            item(c.invalidUsage, number(summary.invalidUsageCalls)),
            item(c.missingUsage, number(summary.missingUsageCalls)),
            item(c.failed, number(summary.statuses.failed)),
            item(c.cancelled, number(summary.statuses.cancelled)),
            item(c.costColumn, `${summary.cost?.completeCalls || 0}/${total}`),
          ),
        )
      }

      function statusLabel(value) {
        const c = tcopy()
        return ({ succeeded: c.succeeded, failed: c.failed, cancelled: c.cancelled, unknown: c.statusUnknown })[value] || c.statusUnknown
      }

      const DETAIL_COLUMNS = [
        { key: 'captured_at', label: 'capturedAt', sortable: true, render: row => dateTime(row.captured_at) },
        { key: 'provider', label: 'provider', sortable: true, render: row => row.provider || '—' },
        { key: 'model', label: 'model', sortable: true, render: row => row.model || '—' },
        { key: 'workspace', label: 'workspace', sortable: false, render: row => row.workspace || '—' },
        { key: 'session_id', label: 'session', sortable: true, render: row => row.session_id || '—' },
        { key: 'purpose', label: 'purpose', sortable: false, render: row => row.purpose || '—' },
        { key: 'attempt_index', label: 'attempt', sortable: false, render: row => row.attempt_index === null ? '—' : String(row.attempt_index + 1) },
        { key: 'status', label: 'status', sortable: true, render: row => h('span', { className: 'uc-status', 'data-status': row.status }, statusLabel(row.status)) },
        { key: 'input_tokens', label: 'uncachedInput', sortable: true, render: row => number(row.input_tokens) },
        { key: 'output_tokens', label: 'output', sortable: true, render: row => number(row.output_tokens) },
        { key: 'cache_read_tokens', label: 'cacheReadLegend', sortable: true, render: row => number(row.cache_read_tokens) },
        { key: 'cache_write_tokens', label: 'cacheWriteLegend', sortable: true, render: row => number(row.cache_write_tokens) },
        { key: 'total_tokens', label: 'totalLegend', sortable: true, render: row => number(row.total_tokens) },
        { key: 'cost_rmb', label: 'costColumn', sortable: true, render: row => money(row.cost_rmb) },
        { key: 'llm_ms', label: 'duration', sortable: true, render: row => milliseconds(row.llm_ms) },
        { key: 'ttft_ms', label: 'ttft', sortable: true, render: row => milliseconds(row.ttft_ms) },
        { key: 'decode_tokens_per_second', label: 'speedLegend', sortable: true, render: row => number(row.decode_tokens_per_second, 1) },
      ]

      function DetailTable({ rows, detail, columns, onToggleColumn, onQuery, onCopy, onFilterSession }) {
        const c = tcopy()
        const [search, setSearch] = useState(detail.search)
        useEffect(() => { setSearch(detail.search) }, [detail.search])
        useEffect(() => {
          if (search === detail.search) return undefined
          const timer = setTimeout(() => onQuery({ search, offset: 0 }), 320)
          return () => clearTimeout(timer)
        }, [search])
        const page = Math.floor(detail.offset / detail.limit) + 1
        const pages = Math.max(1, Math.ceil(detail.total / detail.limit))
        const rangeStart = detail.total === 0 ? 0 : detail.offset + 1
        const rangeEnd = Math.min(detail.total, detail.offset + rows.length)
        const sortBy = (key) => {
          const dir = detail.sort === key && detail.dir === 'desc' ? 'asc' : 'desc'
          onQuery({ sort: key, dir, offset: 0 })
        }
        const visible = DETAIL_COLUMNS.filter(column => !columns.includes(column.key))
        return h('section', { className: 'uc-card uc-table-card' },
          h('div', { className: 'uc-card__head uc-table-head' },
            h('h2', { className: 'uc-card__title' }, c.details),
            h('div', { className: 'uc-table-tools' },
              h('input', {
                className: 'uc-input uc-table-search', type: 'search', value: search,
                placeholder: c.searchPlaceholder, 'aria-label': c.search,
                onChange: event => setSearch(event.target.value),
              }),
              h('details', { className: 'uc-menu' },
                h('summary', { 'aria-label': c.columns }, c.columns),
                h('div', { className: 'uc-menu__panel' }, ...DETAIL_COLUMNS.map(column => h('label', { className: 'uc-menu__item', key: column.key },
                  h('input', {
                    type: 'checkbox', checked: !columns.includes(column.key),
                    onChange: () => onToggleColumn?.(column.key),
                  }),
                  c[column.label],
                ))),
              ),
              h('div', { className: 'uc-card__hint' }, `${c.showing} ${rangeStart}–${rangeEnd} ${c.of} ${detail.total} ${c.rows}`),
              h('nav', { className: 'uc-table-pagination', 'aria-label': c.details },
                h('button', {
                  className: 'uc-table-page-button', type: 'button', disabled: page <= 1,
                  onClick: () => onQuery({ offset: Math.max(0, detail.offset - detail.limit) }),
                  title: c.previousPage, 'aria-label': c.previousPage,
                }, '‹'),
                h('span', null, `${page} / ${pages}`),
                h('button', {
                  className: 'uc-table-page-button', type: 'button', disabled: page >= pages,
                  onClick: () => onQuery({ offset: detail.offset + detail.limit }),
                  title: c.nextPage, 'aria-label': c.nextPage,
                }, '›'),
              ),
            ),
          ),
          rows.length === 0 ? h('div', { className: 'uc-empty' }, c.noData) : h('div', { className: 'uc-table-wrap', role: 'region', tabIndex: 0, 'aria-label': c.details },
            h('table', { className: 'uc-table' },
              h('caption', { className: 'uc-sr' }, c.details),
              h('thead', null, h('tr', null,
                ...visible.map(column => h('th', { key: column.key, scope: 'col' },
                  column.sortable
                    ? h('button', { type: 'button', onClick: () => sortBy(column.key) },
                      c[column.label],
                      detail.sort === column.key ? h('span', null, detail.dir === 'asc' ? '↑' : '↓') : null)
                    : c[column.label])),
                h('th', { scope: 'col' }, ''),
              )),
              h('tbody', null, ...rows.map(row => h('tr', { key: row.call_key },
                ...visible.map(column => h('td', {
                  key: column.key,
                  title: column.key === 'session_id' ? row.session_id || '' : undefined,
                  ...(column.key === 'session_id' && row.session_id
                    ? {
                      style: { cursor: 'pointer', color: 'var(--dsw-alias-brand-primary)' },
                      onClick: () => onFilterSession?.(row.session_id),
                      title: c.sessionFilter,
                    }
                    : {}),
                }, column.render(row))),
                h('td', null, h('button', {
                  className: 'uc-copy', type: 'button', title: c.copyKey, 'aria-label': c.copyKey,
                  onClick: () => onCopy?.(row.call_key),
                }, '⧉')),
              ))),
            ),
          ),
        )
      }

      function Skeleton() {
        return h('div', { className: 'uc-skeletons', 'aria-hidden': 'true' },
          h('div', { className: 'uc-skeletons__row' },
            ...Array.from({ length: 4 }, (_, index) => h('div', { key: index, className: 'uc-skeleton uc-skeleton--kpi' }))),
          h('div', { className: 'uc-skeletons__row' },
            h('div', { className: 'uc-skeleton uc-skeleton--chart' }),
            h('div', { className: 'uc-skeleton uc-skeleton--chart' })),
        )
      }

      function Page() {
        const c = tcopy()
        const initial = useMemo(() => urlState(), [])
        const [range, setRange] = useState(initial.range ?? '30')
        const [customFrom, setCustomFrom] = useState(initial.from)
        const [customTo, setCustomTo] = useState(initial.to)
        const [metric, setMetric] = useState(initial.metric ?? 'tokens')
        const [barMetric, setBarMetric] = useState(initial.barMetric ?? 'tokens')
        const [hidden, setHidden] = usePersisted('usageCenter.hidden', [])
        const [hiddenColumns, setHiddenColumns] = usePersisted('usageCenter.columns', [])
        const [compare, setCompare] = usePersisted('usageCenter.compare', initial.compare ?? true)
        const [cumulative, setCumulative] = usePersisted('usageCenter.cumulative', initial.cumulative ?? false)
        const [autoRefresh, setAutoRefresh] = usePersisted('usageCenter.auto', true)
        const [detail, setDetail] = useState({ offset: 0, limit: 30, sort: 'captured_at', dir: 'desc', search: '' })
        const [dimensions, setDimensions] = useState(initial.dimensions ?? {
          workspace: '', group: '', sessionState: '', session: '', provider: '', model: '',
        })
        const [state, setState] = useState({ phase: 'loading', data: null, error: '', updatedAt: null })
        const [notice, setNotice] = useState('')
        const etagRef = useRef(null)
        const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', [])

        const filters = useMemo(() => {
          const value = { ...dimensions, timeZone }
          if (range !== 'all' && range !== 'custom') value.from = Date.now() - Number(range) * 86400000
          if (range === 'custom') {
            if (customFrom) value.from = new Date(`${customFrom}T00:00:00`).getTime()
            if (customTo) value.to = new Date(`${customTo}T23:59:59.999`).getTime()
          }
          return value
        }, [range, customFrom, customTo, dimensions, timeZone])

        const query = useMemo(() => paramsOf(filters, detail), [filters, detail])

        const load = useCallback((quiet = false) => {
          if (!quiet) setState(previous => ({ ...previous, phase: 'loading', error: '' }))
          const headers = { accept: 'application/json' }
          if (etagRef.current) headers['if-none-match'] = etagRef.current
          void fetch(`${API}/query?${query}`, { headers }).then(async (response) => {
            if (response.status === 304) {
              setState(previous => ({ ...previous, phase: 'ready', updatedAt: Date.now() }))
              return
            }
            const body = await response.json()
            if (!response.ok) throw new Error(body?.error?.message || `${response.status}`)
            etagRef.current = response.headers.get('etag') || null
            setState({ phase: 'ready', data: normalizePayload(body), error: '', updatedAt: Date.now() })
          }).catch(error => setState(previous => ({
            ...previous, phase: 'error', error: error instanceof Error ? error.message : String(error),
          })))
        }, [query])

        useEffect(() => { etagRef.current = null; load() }, [load])

        useEffect(() => {
          if (!autoRefresh) return undefined
          const timer = setInterval(() => {
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
            load(true)
          }, 15000)
          const onVisible = () => { if (document.visibilityState === 'visible') load(true) }
          document.addEventListener('visibilitychange', onVisible)
          return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible) }
        }, [load, autoRefresh])

        useEffect(() => {
          try { window.localStorage?.setItem('usageCenter.auto', autoRefresh ? 'on' : 'off') } catch { /* private mode */ }
        }, [autoRefresh])

        // Keep the shareable state in the address bar: filters, range, and view
        // toggles survive a reload and can be pasted into another window.
        useEffect(() => {
          try {
            const parameters = new URLSearchParams()
            if (range !== '30') parameters.set('ucRange', range)
            if (range === 'custom') {
              if (customFrom) parameters.set('ucFrom', customFrom)
              if (customTo) parameters.set('ucTo', customTo)
            }
            if (metric !== 'tokens') parameters.set('ucMetric', metric)
            if (barMetric !== 'tokens') parameters.set('ucBar', barMetric)
            parameters.set('ucCmp', compare ? '1' : '0')
            if (cumulative) parameters.set('ucCum', '1')
            for (const [key, value] of Object.entries(dimensions)) if (value) parameters.set(key, value)
            const search = parameters.toString()
            const location = window.location
            if (location?.pathname === undefined || window.history?.replaceState === undefined) return
            // Keep the app's route intact: only the query string is ours, the hash
            // (which several hosts use for routing) is carried through untouched.
            const next = `${location.pathname}${search === '' ? '' : `?${search}`}${location.hash ?? ''}`
            if (next !== `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`) {
              window.history.replaceState(null, '', next)
            }
          } catch { /* hosts without history ignore the shareable state */ }
        }, [range, customFrom, customTo, metric, barMetric, compare, cumulative, dimensions])

        useEffect(() => {
          if (notice === '') return undefined
          const timer = setTimeout(() => setNotice(''), 2200)
          return () => clearTimeout(timer)
        }, [notice])

        const download = (extension) => {
          const link = document.createElement('a')
          link.href = `${API}/export.${extension}?${query}`
          link.download = `usage-center.${extension}`
          document.body.append(link); link.click(); link.remove()
        }

        const copy = async (text, message) => {
          try {
            await navigator.clipboard.writeText(text)
            setNotice(message)
          } catch {
            setNotice(c.copyFailed)
          }
        }

        const exportPng = () => {
          const svg = document.querySelector('.uc-chart .uc-svg')
          if (!svg) { setNotice(c.exportFailed); return }
          const serialized = new XMLSerializer().serializeToString(svg)
          const image = new Image()
          const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`
          image.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = 1520; canvas.height = 420
            const context = canvas.getContext('2d')
            if (context === null) { setNotice(c.exportFailed); return }
            context.fillStyle = getComputedStyle(document.body).backgroundColor || '#fff'
            context.fillRect(0, 0, canvas.width, canvas.height)
            context.drawImage(image, 0, 0, canvas.width, canvas.height)
            const link = document.createElement('a')
            link.href = canvas.toDataURL('image/png')
            link.download = 'usage-center.png'
            document.body.append(link); link.click(); link.remove()
            setNotice(c.exportDone)
          }
          image.onerror = () => setNotice(c.exportFailed)
          image.src = source
        }

        const copySummary = () => {
          const summary = state.data?.summary
          if (!summary) return
          const lines = [
            `${c.title} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
            `${c.totalTokens}: ${number(summary.tokens.total_tokens.exactSum)}`,
            `${c.uncachedInput}: ${number(summary.tokens.input_tokens.exactSum)}`,
            `${c.output}: ${number(summary.tokens.output_tokens.exactSum)}`,
            `${c.cost}: ${money(summary.cost?.total)}`,
            `${c.calls}: ${number(summary.calls)} (${c.failed} ${summary.statuses.failed})`,
            `${c.tokenHit}: ${percent(summary.cache.tokenHitRate)}`,
            `${c.llmDuration}: ${milliseconds(summary.timing.llmMs.total)}`,
          ]
          void copy(lines.join('\n'), c.copied)
        }

        const copyLink = () => {
          try {
            const href = window.location?.href
            if (typeof href !== 'string') { setNotice(c.copyFailed); return }
            void copy(href, c.copied)
          } catch {
            setNotice(c.copyFailed)
          }
        }

        const option = (key, value) => setDimensions(previous => ({ ...previous, [key]: value }))
        const rangeValues = useMemo(() => Object.fromEntries(RANGES.map(key => [key, ({ 7: c.days7, 30: c.days30, 90: c.days90, all: c.all, custom: c.custom })[key]])), [c])

        useEffect(() => {
          const onKeyDown = (event) => {
            const target = event.target
            if (target instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return
            if (event.metaKey || event.ctrlKey || event.altKey) return
            const map = { 1: '7', 2: '30', 3: '90', 0: 'all' }
            if (map[event.key] !== undefined) { setRange(map[event.key]); return }
            if (event.key === 'r' || event.key === 'R') { load(); return }
            if (event.key === 'e' || event.key === 'E') { download('csv'); return }
            if (event.key === 'p' || event.key === 'P') { exportPng(); return }
            if (event.key === '/') {
              const input = document.querySelector('.uc-table-search')
              if (input instanceof HTMLInputElement) { event.preventDefault(); input.focus() }
            }
          }
          window.addEventListener('keydown', onKeyDown)
          return () => window.removeEventListener('keydown', onKeyDown)
        }, [load])

        const toggleSeries = (key) => setHidden(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key])
        const toggleColumn = (key) => setHiddenColumns(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key])
        const clearFilters = () => {
          setDimensions({ workspace: '', group: '', sessionState: '', session: '', provider: '', model: '' })
          setRange('30')
          setCustomFrom('')
          setCustomTo('')
          setDetail(current => ({ ...current, offset: 0, search: '' }))
        }
        const brushRange = (fromMs, toMs, clickIndex, firstIndex, lastIndex) => {
          const daily = state.data?.daily ?? []
          if (firstIndex !== undefined && lastIndex !== undefined) {
            const start = daily[Math.min(firstIndex, lastIndex)]?.date
            const end = daily[Math.max(firstIndex, lastIndex)]?.date
            if (start === undefined || end === undefined) return
            setCustomFrom(start); setCustomTo(end); setRange('custom')
            return
          }
          if (clickIndex !== undefined) {
            const day = daily[clickIndex]?.date
            if (day !== undefined) { setCustomFrom(day); setCustomTo(day); setRange('custom') }
          }
        }
        const coverageBadge = (partial, known, total) => ({
          partial,
          label: partial ? `${known}/${total} ${c.partialBadge}` : c.fullBadge,
        })

        const data = state.data
        const summary = data?.summary
        const groupOptions = (data?.filterOptions?.groups || []).map(item => ({
          ...item,
          label: item.kind === 'ungrouped' ? c.ungrouped : item.kind === 'no-session' ? c.noSession : item.label,
        }))
        const sessionStateOptions = [
          { value: 'active', label: c.activeSessions },
          { value: 'archived', label: c.archivedSessions },
        ]
        const exactMeta = field => summary?.calls === 0
          ? c.unavailable
          : field?.unknownCalls === 0
            ? c.exact
            : `${c.reported} ${field?.knownCalls || 0}/${summary.calls} · ${c.unknown} ${field?.unknownCalls || 0}`
        const stale = state.updatedAt !== null && Date.now() - state.updatedAt > 60000

        return h('main', { className: 'uc-page' }, h('div', { className: 'uc-shell' },
          h('header', { className: 'uc-head' },
            h('div', null,
              h('h1', { className: 'uc-title' }, c.title),
              h('p', { className: 'uc-subtitle' }, c.subtitle),
              h('div', { className: 'uc-stamp' },
                h('span', { className: 'uc-dot', 'data-paused': !autoRefresh || stale }),
                h('span', null, `${c.updatedAt} `, h('b', null, state.updatedAt === null ? '—' : clock(state.updatedAt))),
                h('span', null, `${c.dataThrough} `, h('b', null, data?.daily?.at(-1)?.date ?? '—')),
                autoRefresh ? null : h('span', { style: { color: 'var(--dsw-alias-label-caption)' } }, c.paused),
                stale ? h('span', { style: { color: 'var(--dsw-alias-state-warn)' } }, c.stale) : null,
              ),
            ),
            h('div', { className: 'uc-actions' },
              h('div', { className: 'uc-ranges' },
                ...RANGES.map(key => h('button', {
                  key, className: 'uc-range', type: 'button', 'data-active': range === key, onClick: () => setRange(key),
                }, rangeValues[key])),
              ),
              h('button', {
                className: 'uc-button', type: 'button', 'data-on': autoRefresh,
                onClick: () => setAutoRefresh(value => !value), title: c.autoRefresh,
              }, `${c.autoRefresh}${autoRefresh ? ' ·' : ''}`),
              h('button', { className: 'uc-button', type: 'button', onClick: () => load(), disabled: state.phase === 'loading' },
                state.phase === 'loading' ? c.refreshing : c.refresh),
              h('button', { className: 'uc-button', type: 'button', onClick: copySummary }, c.copySummary),
              h('button', { className: 'uc-button', type: 'button', onClick: copyLink, title: c.copyLink }, c.copyLink),
              h('button', { className: 'uc-button', type: 'button', onClick: () => download('csv') }, c.exportCsv),
              h('button', { className: 'uc-button', type: 'button', onClick: exportPng }, c.exportPng),
              h('button', { className: 'uc-button uc-button--primary', type: 'button', onClick: () => download('json') }, c.exportJson),
            ),
          ),
          h('section', { className: 'uc-filters' },
            range === 'custom' ? h('label', { className: 'uc-field' }, c.from, h('input', { className: 'uc-date', type: 'date', value: customFrom, onChange: event => setCustomFrom(event.target.value) })) : null,
            range === 'custom' ? h('label', { className: 'uc-field' }, c.to, h('input', { className: 'uc-date', type: 'date', value: customTo, onChange: event => setCustomTo(event.target.value) })) : null,
            h(SelectField, { label: c.workspace, value: dimensions.workspace, onChange: value => option('workspace', value), options: data?.filterOptions?.workspaces || [] }),
            h(SelectField, { label: c.group, value: dimensions.group, onChange: value => option('group', value), options: groupOptions }),
            h(SelectField, { label: c.sessionState, value: dimensions.sessionState, onChange: value => option('sessionState', value), options: sessionStateOptions }),
            h(SelectField, { label: c.session, value: dimensions.session, onChange: value => option('session', value), options: data?.filterOptions?.sessions || [] }),
            h(SelectField, { label: c.provider, value: dimensions.provider, onChange: value => option('provider', value), options: data?.filterOptions?.providers || [] }),
            h(SelectField, { label: c.model, value: dimensions.model, onChange: value => option('model', value), options: data?.filterOptions?.models || [] }),
          ),
          state.phase === 'error' && !data
            ? h('div', { className: 'uc-card uc-error' }, h('div', null,
              h('p', null, `${c.loadError}: ${state.error}`),
              h('button', { className: 'uc-button', onClick: () => load() }, c.retry)))
            : null,
          data === null ? h(Skeleton) : null,
          data ? h(React.Fragment, null,
            h(ScanProgress, { scan: data.scan }),
            summary.calls === 0
              ? h('div', { className: 'uc-card uc-empty' }, h('div', { className: 'uc-empty__body' },
                h('p', null, c.noData),
                h('div', { className: 'uc-empty__actions' },
                  h('button', { className: 'uc-button uc-button--primary', type: 'button', onClick: clearFilters }, c.clearAll),
                  h('button', { className: 'uc-button', type: 'button', onClick: () => load() }, c.refresh),
                )))
              : null,
            h(BudgetCard, { budget: data.budget, daily: data.daily, currency: data.pricing?.currency }),
            h('section', { className: 'uc-kpis' },
              h(Kpi, { label: c.totalTokens, value: summary.tokens.total_tokens.exactSum, meta: exactMeta(summary.tokens.total_tokens), color: 'var(--uc-series-1)' }),
              h(Kpi, { label: c.uncachedInput, value: summary.tokens.input_tokens.exactSum, meta: exactMeta(summary.tokens.input_tokens), color: 'var(--uc-series-4)' }),
              h(Kpi, { label: c.output, value: summary.tokens.output_tokens.exactSum, meta: exactMeta(summary.tokens.output_tokens), color: 'var(--uc-series-2)' }),
              h(Kpi, { label: c.cost, value: summary.cost?.total, text: money(summary.cost?.total), meta: `${c.priceNote} · ${c.coverage} ${summary.cost?.completeCalls || 0}/${summary.calls}`, color: 'var(--uc-series-3)' }),
              h(Kpi, { label: c.calls, value: summary.calls, meta: `${c.retries}: ${number(summary.retryCalls)} · ${c.failed}: ${number(summary.statuses.failed)}`, color: 'var(--uc-series-6)' }),
              h(Kpi, { label: c.tokenHit, value: summary.cache.tokenHitRate, text: percent(summary.cache.tokenHitRate), meta: `${c.cacheFormula} · ${summary.cache.knownCalls}/${summary.calls}`, color: 'var(--uc-series-7)' }),
              h(Kpi, { label: c.requestHit, value: summary.cache.requestHitRate, text: percent(summary.cache.requestHitRate), meta: `${c.reported} ${summary.cache.requestHitKnownCalls}/${summary.calls}`, color: 'var(--uc-series-8)' }),
              h(Kpi, { label: c.llmDuration, value: summary.timing.llmMs.total, text: milliseconds(summary.timing.llmMs.total), meta: `${c.avgRequest}: ${milliseconds(summary.timing.llmMs.average)} · ${coverage(summary.timing.llmMs, summary.calls)}`, color: 'var(--uc-series-3)' }),
              h(Kpi, { label: c.ttft, value: summary.timing.ttftMs.p50, text: `${milliseconds(summary.timing.ttftMs.p50)} / ${milliseconds(summary.timing.ttftMs.p95)}`, meta: `${c.decode}: ${number(summary.timing.decodeTokensPerSecond.p50, 1)} / ${number(summary.timing.decodeTokensPerSecond.p95, 1)}`, color: 'var(--uc-series-5)' }),
              summary.tokens.reasoning_tokens.knownCalls > 0
                ? h(Kpi, { label: c.reasoning, value: summary.tokens.reasoning_tokens.exactSum, meta: exactMeta(summary.tokens.reasoning_tokens), color: 'var(--uc-series-4)' })
                : null,
            ),
            h('div', { className: 'uc-grid' },
              h('section', { className: 'uc-card uc-chart' },
                h('div', { className: 'uc-card__head' },
                  h('div', null,
                    h('h2', { className: 'uc-card__title' }, metric === 'cost' ? c.costTrend : c.tokenTrend),
                    h('p', { className: 'uc-card__hint' }, c.tokenTrendHint)),
                  h('div', { className: 'uc-seg' },
                    h('button', { type: 'button', 'data-active': metric === 'tokens', onClick: () => setMetric('tokens') }, c.metricTokens),
                    h('button', { type: 'button', 'data-active': metric === 'cost', onClick: () => setMetric('cost') }, c.metricCost),
                  ),
                ),
                h(TrendChart, {
                  key: `trend-${query}-${metric}-${cumulative}-${compare}`,
                  daily: data.daily,
                  previous: data.previous?.daily ?? null,
                  hasPrevious: data.previous !== null && data.previous !== undefined,
                  metric,
                  hidden,
                  cumulative,
                  compare: compare && data.previous !== null && data.previous !== undefined,
                  onToggle: toggleSeries,
                  onToggleCumulative: setCumulative,
                  onToggleCompare: setCompare,
                  onBrushRange: brushRange,
                  coverage: metric === 'cost'
                    ? coverageBadge((summary.cost?.completeCalls ?? 0) < summary.calls, summary.cost?.completeCalls ?? 0, summary.calls)
                    : coverageBadge(summary.tokens.total_tokens.knownCalls < summary.calls, summary.tokens.total_tokens.knownCalls, summary.calls),
                }),
              ),
              h('section', { className: 'uc-card uc-chart' },
                h('div', { className: 'uc-card__head' }, h('div', null,
                  h('h2', { className: 'uc-card__title' }, c.cacheChart),
                  h('p', { className: 'uc-card__hint' }, c.cacheFormula))),
                h(CacheDonut, { summary }),
              ),
            ),
            h('div', { className: 'uc-grid uc-grid--even' },
              h('section', { className: 'uc-card uc-chart' },
                h('div', { className: 'uc-card__head' }, h('div', null,
                  h('h2', { className: 'uc-card__title' }, c.requestTrend))),
                h(RequestTrend, { daily: data.daily }),
              ),
              h('section', { className: 'uc-card uc-chart' },
                h('div', { className: 'uc-card__head' },
                  h('div', null, h('h2', { className: 'uc-card__title' }, c.routeCompare)),
                  h('div', { className: 'uc-seg' },
                    h('button', { type: 'button', 'data-active': barMetric === 'tokens', onClick: () => setBarMetric('tokens') }, c.metricTokens),
                    h('button', { type: 'button', 'data-active': barMetric === 'cost', onClick: () => setBarMetric('cost') }, c.metricCost),
                  ),
                ),
                h(RouteBars, {
                  data: data.byModel, metric: barMetric, currency: data.pricing?.currency,
                  onDrill: item => {
                    const model = String(item.key).split(' / ').at(-1)
                    if (model && item.key !== '__others__') option('model', model)
                  },
                }),
              ),
            ),
            h('div', { className: 'uc-grid uc-grid--even' },
              h('section', { className: 'uc-card uc-chart' },
                h('div', { className: 'uc-card__head' }, h('div', null,
                  h('h2', { className: 'uc-card__title' }, c.heatmap),
                  h('p', { className: 'uc-card__hint' }, c.heatmapHint))),
                h(Heatmap, { cells: data.heatmap }),
              ),
              h(Coverage, { summary }),
            ),
            h(DetailTable, {
              rows: data.details,
              detail: data.detail,
              columns: hiddenColumns,
              onToggleColumn: toggleColumn,
              onQuery: patch => setDetail(current => ({ ...current, ...patch })),
              onCopy: key => void copy(key, c.keyCopied),
              onFilterSession: session => option('session', session),
            }),
          ) : null,
          notice === '' ? null : h('div', { className: 'uc-toast', role: 'status' }, notice),
        ))
      }

      return {
        inject: ['slots', 'locale'],
        apply(ctx) {
          ctx.effect(() => {
            const style = document.createElement('style')
            style.dataset.usageCenter = 'true'
            style.textContent = STYLE
            document.head.append(style)
            return () => style.remove()
          }, 'usage-center: styles')
          ctx.effect(() => ctx.locale.register('usageCenter', {
            zh: { panel: COPY.zh.panel },
            en: { panel: COPY.en.panel },
          }), 'usage-center: locale')
          const label = ctx.locale.bind('usageCenter')
          ctx.slots.inject('main', () => ctx.slots.register({
            name: 'main', key: PANEL_ID, locale: 'usageCenter',
          }, Page))
          ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
            name: 'sidebar.panellist', id: PANEL_ID, order: 18,
            label: () => label('panel'), locale: 'usageCenter',
          }, Icon))
        },
      }
    },
  })
})()
