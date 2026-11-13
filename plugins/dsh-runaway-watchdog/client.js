(() => {
  const PACKAGE_ID = '@local/dsh-runaway-watchdog'
  const PANEL_ID = 'runaway-watchdog'
  const API = '/api/runaway-watchdog'
  const LOCALE_NS = 'runawayWatchdog'
  /** Host client context captured in apply(); the Page reads the live locale from it. */
  let hostCtx = null

  const COPY = {
    zh: {
      panel: '失控看门狗', title: '失控看门狗 · 花费熔断器',
      subtitle: '在 Harness 层检测死循环 / 错误风暴 / Token·花费速率 / 子代理递归，并确定性地熔断。',
      refresh: '刷新', refreshing: '刷新中…', selftest: '运行自检', selftesting: '自检中…',
      mode: '模式', monitor: '仅监测', enforce: '强制执行',
      interventions: '干预次数', blocks: '阻断次数', circuits: '熔断触发', prevented: '预估省下 Token', sessions: '涉及会话', totalAudit: '审计记录',
      liveSessions: '实时会话', noSessions: '当前没有活跃会话', session: '会话', depth: '深度', fanout: '扇出',
      repeat: '重复', lastTool: '最近工具', errorRate: '错误率', tokensMin: 'Token/分', spendMin: '花费/分', circuit: '熔断',
      open: '开启', closed: '关闭', reset: '重置', resetDone: '已重置',
      audit: '审计账本', noAudit: '暂无干预记录', time: '时间', rule: '规则', severity: '级别', action: '动作', detail: '详情', est: '预估省下',
      config: '当前配置', selftestTitle: '科学自检报告', passed: '通过', failed: '失败', total: '总计',
      loadError: '无法加载看门狗数据', retry: '重试', autoRefresh: '自动刷新',
      ruleRepeat: '重复调用', ruleError: '错误风暴', ruleToken: 'Token 速率', ruleSpend: '花费速率', ruleDepth: '递归深度', ruleFanout: '扇出', ruleManual: '手动',
      sevWarn: '警告', sevBlock: '阻断', sevCircuit: '熔断',
      actAdvised: '已提醒', actBlocked: '已阻断', actCircuitOpen: '熔断开启', actCircuitClose: '熔断关闭', actSpawn: '已阻止派生', actReset: '已重置', actWouldTrip: '将熔断（仅监测）',
      hint: '阻断由同步工具守卫执行；熔断在冷却后自动关闭，也可手动重置。重复阻断需改用不同调用或用户介入才会清除。',
      preventedMoney: '预估省下 (¥)', model: '模型', totalCost: '累计花费',
      pricePanel: '模型价格设置', priceSub: '按会话实际使用的模型匹配价格，修改后立即生效（无需重启）。单位：元 / 每百万 Token。',
      priceInput: '输入', priceOutput: '输出', priceCacheRead: '缓存命中', priceCacheWrite: '缓存写', priceSource: '来源',
      srcUser: '自定义', srcBuiltin: '内置', srcFallback: '回退', priceSave: '保存价格', priceSaving: '保存中…', priceSaved: '已保存 · 实时生效',
      priceAdd: '添加模型', priceKeyPh: '模型 ID 或通配符（如 deepseek-*）', priceDelete: '删除', priceEdit: '设置',
      priceKeyRequired: '请先在上面的输入框填写模型 ID（如 deepseek-flash 或 deepseek-*），再点「添加模型」',
      rateIdle: '最近 1 分钟没有新的模型调用；这两列是滑动窗口速率，不是平均值',
      detectedModels: '检测到的模型', priceHint: '内置为 DeepSeek 常规费率参考；峰谷定价请按实际结算覆盖。未匹配的模型使用 * 回退价。',
      priceEmpty: '尚无自定义价格，使用内置参考价', priceModel: '模型', priceSaveErr: '保存失败', priceBuiltin: '内置参考价',
    },
    en: {
      panel: 'Runaway Watchdog', title: 'Runaway Watchdog · Spend Circuit Breaker',
      subtitle: 'Harness-level detection of loops, error storms, token/spend velocity and subagent recursion, with deterministic enforcement.',
      refresh: 'Refresh', refreshing: 'Refreshing…', selftest: 'Run self-test', selftesting: 'Testing…',
      mode: 'Mode', monitor: 'Monitor', enforce: 'Enforce',
      interventions: 'Interventions', blocks: 'Blocks', circuits: 'Circuits tripped', prevented: 'Est. tokens prevented', sessions: 'Sessions', totalAudit: 'Audit records',
      liveSessions: 'Live sessions', noSessions: 'No active sessions', session: 'Session', depth: 'Depth', fanout: 'Fan-out',
      repeat: 'Repeat', lastTool: 'Last tool', errorRate: 'Error rate', tokensMin: 'Tokens/min', spendMin: 'Spend/min', circuit: 'Circuit',
      open: 'OPEN', closed: 'closed', reset: 'Reset', resetDone: 'Reset',
      audit: 'Audit ledger', noAudit: 'No interventions yet', time: 'Time', rule: 'Rule', severity: 'Severity', action: 'Action', detail: 'Detail', est: 'Est. prevented',
      config: 'Configuration', selftestTitle: 'Scientific self-test report', passed: 'Passed', failed: 'Failed', total: 'Total',
      loadError: 'Could not load watchdog data', retry: 'Retry', autoRefresh: 'Auto-refresh',
      ruleRepeat: 'Repeat', ruleError: 'Error storm', ruleToken: 'Token velocity', ruleSpend: 'Spend velocity', ruleDepth: 'Depth', ruleFanout: 'Fan-out', ruleManual: 'Manual',
      sevWarn: 'warn', sevBlock: 'block', sevCircuit: 'circuit',
      actAdvised: 'advised', actBlocked: 'blocked', actCircuitOpen: 'circuit opened', actCircuitClose: 'circuit closed', actSpawn: 'spawn blocked', actReset: 'reset', actWouldTrip: 'would trip (monitor)',
      hint: 'Blocks are enforced by the synchronous tool guard; circuits auto-close after cooldown or via reset. A repeat block clears only on a different call or user interjection.',
      preventedMoney: 'Est. saved (¥)', model: 'Model', totalCost: 'Total cost',
      pricePanel: 'Model pricing', priceSub: 'Prices are matched to the model each session actually uses; edits apply immediately (no restart). Unit: CNY per million tokens.',
      priceInput: 'Input', priceOutput: 'Output', priceCacheRead: 'Cache read', priceCacheWrite: 'Cache write', priceSource: 'Source',
      srcUser: 'Custom', srcBuiltin: 'Built-in', srcFallback: 'Fallback', priceSave: 'Save prices', priceSaving: 'Saving…', priceSaved: 'Saved · live',
      priceAdd: 'Add model', priceKeyPh: 'Model id or pattern (e.g. deepseek-*)', priceDelete: 'Delete', priceEdit: 'Set',
      priceKeyRequired: 'Type a model id (e.g. deepseek-flash or deepseek-*) in the field above, then press Add model',
      rateIdle: 'No model call in the last minute; these columns are a sliding-window rate, not an average',
      detectedModels: 'Detected models', priceHint: 'Built-ins are DeepSeek regular-rate references; override with your settlement rates for peak/valley pricing. Unmatched models use the * fallback.',
      priceEmpty: 'No custom prices yet; using built-in references', priceModel: 'Model', priceSaveErr: 'Save failed', priceBuiltin: 'Built-in reference',
    },
  }

  const STYLE = `
/* Every token carries a fallback: a theme that does not define --dsw-alias-* would
   otherwise void the whole declaration (no border, no background) and controls
   would render as plain text — the exact reason the price input looked untypeable. */
.ww-page { --ww-gap: 16px; --ww-ink: var(--dsw-alias-label-primary, #16161a); --ww-ink-2: var(--dsw-alias-label-secondary, #5c5c66); --ww-ink-3: var(--dsw-alias-label-tertiary, #8a8a94); --ww-line: var(--dsw-alias-border-l2, #d6d6dd); --ww-line-soft: var(--dsw-alias-border-l1, #ececf1); --ww-surface: var(--dsw-alias-bg-layer-1, #ffffff); --ww-accent: var(--dsw-alias-state-business-primary, #2b6cf6); --ww-error: var(--dsw-alias-state-error-primary, #d92d20); --ww-warn: var(--dsw-alias-state-warn-primary, #b54708); --ww-ok: #067647; box-sizing: border-box; height: 100%; overflow: auto; padding: 24px clamp(16px, 3vw, 36px) 48px; color: var(--ww-ink); background: var(--dsw-alias-bg-base, #ffffff); font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
.ww-page * { box-sizing: border-box; }
.ww-inner { width: min(1280px, 100%); margin: 0 auto; display: grid; gap: var(--ww-gap); }
.ww-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.ww-title { margin: 0; font-size: 22px; font-weight: 650; letter-spacing: -0.01em; }
.ww-sub { margin: 6px 0 0; max-width: 760px; color: var(--ww-ink-2); font-size: 13px; line-height: 1.5; }
.ww-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.ww-btn { min-height: 34px; padding: 7px 13px; border: 1px solid var(--ww-line); border-radius: 8px; background: var(--ww-surface); color: var(--ww-ink); font: inherit; font-size: 13px; line-height: 1.2; cursor: pointer; transition: background .15s ease, border-color .15s ease; }
.ww-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, #f2f2f5); }
.ww-btn:active:not(:disabled) { border-color: var(--ww-accent); }
.ww-btn:disabled { opacity: .5; cursor: default; }
.ww-btn-primary { border-color: var(--dsw-alias-button-primary, #2b6cf6); background: var(--dsw-alias-button-primary, #2b6cf6); color: #ffffff; }
.ww-btn-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary, #2b6cf6); filter: brightness(1.05); }
.ww-mode { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; border: 1px solid var(--ww-line); background: var(--ww-surface); color: var(--ww-ink-2); }
.ww-mode-enforce { color: var(--ww-ok); border-color: var(--ww-ok); }
.ww-cards { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 12px; }
.ww-card { padding: 14px 16px; border: 1px solid var(--ww-line-soft); border-radius: 12px; background: var(--ww-surface); }
.ww-card-label { color: var(--ww-ink-3); font-size: 12px; }
.ww-card-value { margin-top: 6px; font-size: 20px; font-weight: 650; font-variant-numeric: tabular-nums; }
.ww-panel { border: 1px solid var(--ww-line-soft); border-radius: 12px; background: var(--ww-surface); overflow: hidden; }
.ww-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--ww-line-soft); }
.ww-panel-title { margin: 0; font-size: 14px; font-weight: 620; }
.ww-table-wrap { overflow: auto; }
.ww-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ww-table th { padding: 9px 12px; text-align: left; color: var(--ww-ink-3); font-weight: 550; font-size: 12px; border-bottom: 1px solid var(--ww-line-soft); white-space: nowrap; }
.ww-table td { padding: 9px 12px; border-bottom: 1px solid var(--ww-line-soft); vertical-align: middle; }
.ww-table tr:last-child td { border-bottom: 0; }
.ww-num { font-variant-numeric: tabular-nums; white-space: nowrap; }
.ww-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
.ww-muted { color: var(--ww-ink-3); }
.ww-empty { padding: 28px 16px; text-align: center; color: var(--ww-ink-3); font-size: 13px; }
.ww-badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; white-space: nowrap; }
.ww-sev-warn { background: rgba(181, 71, 8, .12); color: var(--ww-warn); }
.ww-sev-block, .ww-sev-circuit { background: rgba(217, 45, 32, .10); color: var(--ww-error); }
.ww-circuit-open { background: rgba(217, 45, 32, .10); color: var(--ww-error); }
.ww-circuit-closed { background: rgba(6, 118, 71, .10); color: var(--ww-ok); }
.ww-detail { max-width: 360px; color: var(--ww-ink-2); font-size: 12px; word-break: break-word; }
.ww-config { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px 16px; padding: 14px 16px; }
.ww-config-item { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; padding: 4px 0; border-bottom: 1px dashed var(--ww-line-soft); }
.ww-config-key { color: var(--ww-ink-3); }
.ww-config-val { font-variant-numeric: tabular-nums; font-weight: 550; }
.ww-test-summary { display: flex; gap: 16px; padding: 12px 16px; font-size: 13px; border-bottom: 1px solid var(--ww-line-soft); }
.ww-test-pass { color: var(--ww-ok); font-weight: 650; }
.ww-test-fail { color: var(--ww-error); font-weight: 650; }
.ww-test-row { display: flex; gap: 10px; padding: 8px 16px; border-bottom: 1px solid var(--ww-line-soft); font-size: 12px; }
.ww-test-row:last-child { border-bottom: 0; }
.ww-test-name { flex: 0 0 280px; font-weight: 550; }
.ww-test-detail { color: var(--ww-ink-2); word-break: break-word; }
.ww-error { padding: 16px; border: 1px solid rgba(217, 45, 32, .35); border-radius: 8px; background: rgba(217, 45, 32, .08); color: var(--ww-error); display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.ww-hint { color: var(--ww-ink-3); font-size: 12px; line-height: 1.5; padding: 0 2px; }
.ww-toggle { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ww-ink-2); cursor: pointer; }
.ww-card-money { border-color: rgba(6, 118, 71, .35); }
.ww-card-money .ww-card-value { color: var(--ww-ok); }
.ww-price-sub { padding: 0 16px 12px; color: var(--ww-ink-3); font-size: 12px; line-height: 1.5; }
.ww-detected { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 16px; border-bottom: 1px solid var(--ww-line-soft); align-items: center; }
.ww-detected-label { color: var(--ww-ink-3); font-size: 12px; }
.ww-detected-chip { display: inline-flex; align-items: center; gap: 8px; padding: 5px 10px; border: 1px solid var(--ww-line); border-radius: 999px; font-size: 12px; background: var(--ww-surface); }
.ww-price-input { width: 84px; height: 32px; padding: 4px 8px; border: 1px solid var(--ww-line); border-radius: 6px; background: var(--ww-surface); color: var(--ww-ink); font: inherit; font-size: 12px; font-variant-numeric: tabular-nums; }
.ww-price-input:focus { outline: 2px solid var(--ww-accent); outline-offset: -1px; }
.ww-price-key { width: 240px; height: 34px; padding: 6px 10px; border: 1px solid var(--ww-line); border-radius: 6px; background: var(--ww-surface); color: var(--ww-ink); font: inherit; font-size: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.ww-price-key::placeholder { color: var(--ww-ink-3); }
.ww-price-key:focus { outline: 2px solid var(--ww-accent); outline-offset: -1px; }
.ww-src-user { background: rgba(6, 118, 71, .10); color: var(--ww-ok); }
.ww-src-builtin { background: rgba(43, 108, 246, .10); color: var(--ww-accent); }
.ww-src-fallback { background: rgba(181, 71, 8, .12); color: var(--ww-warn); }
.ww-price-actions { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-top: 1px solid var(--ww-line-soft); flex-wrap: wrap; }
.ww-price-msg { font-size: 12px; }
.ww-price-msg-ok { color: var(--ww-ok); }
.ww-price-msg-err { color: var(--ww-error); }
.ww-link-btn { border: 1px solid var(--ww-line); background: var(--ww-surface); color: var(--ww-accent); cursor: pointer; font: inherit; font-size: 12px; padding: 3px 10px; border-radius: 6px; }
.ww-link-btn:hover { background: var(--dsw-alias-interactive-bg-hover, #f2f2f5); }
.ww-del-btn { border: 1px solid var(--ww-line); background: var(--ww-surface); color: var(--ww-error); cursor: pointer; font: inherit; font-size: 12px; padding: 3px 10px; border-radius: 6px; }
.ww-del-btn:hover { background: var(--dsw-alias-interactive-bg-hover, #f2f2f5); }
@media (max-width: 1200px) { .ww-cards { grid-template-columns: repeat(4, 1fr); } }
@media (max-width: 760px) { .ww-cards { grid-template-columns: repeat(2, 1fr); } .ww-test-name { flex-basis: 160px; } }
`

  const RULE_KEYS = { 'repeat': 'ruleRepeat', 'error-rate': 'ruleError', 'token-velocity': 'ruleToken', 'spend-velocity': 'ruleSpend', 'depth': 'ruleDepth', 'fanout': 'ruleFanout', 'manual': 'ruleManual' }
  const SEV_KEYS = { warn: 'sevWarn', block: 'sevBlock', circuit: 'sevCircuit' }
  const ACT_KEYS = { advised: 'actAdvised', blocked: 'actBlocked', 'circuit-opened': 'actCircuitOpen', 'circuit-closed': 'actCircuitClose', 'spawn-blocked': 'actSpawn', 'would-trip': 'actWouldTrip', reset: 'actReset' }

  window.__ModuleLoader__.load({
    id: PACKAGE_ID,
    factory(require) {
      const React = require('react')
      const h = React.createElement

      function Icon() {
        return h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
          h('path', { d: 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z' }),
          h('path', { d: 'M9 12l2 2 4-4' }),
        )
      }

      function detailText(detail, sym = '¥') {
        if (!detail || typeof detail !== 'object') return ''
        const parts = []
        if (detail.tool) parts.push(detail.tool)
        if (detail.count !== undefined) parts.push(`×${detail.count}`)
        if (detail.rate !== undefined) parts.push(`rate=${detail.rate}`)
        if (detail.tokensPerMinute !== undefined) parts.push(`${detail.tokensPerMinute} tok/min`)
        if (detail.spendPerMinute !== undefined) parts.push(`${sym}${detail.spendPerMinute}/min`)
        if (detail.depth !== undefined) parts.push(`depth=${detail.depth}/${detail.maxDepth}`)
        if (detail.fanout !== undefined) parts.push(`fanout=${detail.fanout}/${detail.maxFanout}`)
        if (detail.preview) parts.push(detail.preview)
        return parts.join(' · ')
      }

      /** The four priced usage buckets, in display order. */
      const RATE_FIELDS = ['inputPerM', 'outputPerM', 'cacheReadPerM', 'cacheWritePerM']
      /** Render a stored rate as the editable text (never "02": String(2) is "2"). */
      const textOfRate = (value) => (typeof value === 'number' && Number.isFinite(value) ? String(value) : String(value ?? '0'))
      /** A blank editable row: draft cells are STRINGS so decimals type cleanly. */
      const emptyDraftRow = () => ({ inputPerM: '0', outputPerM: '0', cacheReadPerM: '0', cacheWritePerM: '0' })
      /** Seed the editor draft from a server price table (numbers → strings). */
      const seedDraft = (table) => {
        const out = {}
        for (const [key, row] of Object.entries(table ?? {})) {
          out[key] = emptyDraftRow()
          for (const field of RATE_FIELDS) out[key][field] = textOfRate(row?.[field])
        }
        return out
      }

      /**
       * The host's active locale id. Read from the real locale service snapshot —
       * DSH stores the preference in Host user settings, never in localStorage.
       * @returns {'zh'|'en'} the copy table to render.
       */
      function activeLocale() {
        try {
          return hostCtx?.locale?.getSnapshot?.()?.active === 'en' ? 'en' : 'zh'
        } catch { return 'zh' }
      }

      function Page() {
        const [, setLocaleRevision] = React.useState(0)
        React.useEffect(() => {
          const locale = hostCtx?.locale
          if (typeof locale?.subscribe !== 'function') return undefined
          return locale.subscribe(() => setLocaleRevision(revision => revision + 1))
        }, [])
        const t = COPY[activeLocale()]
        const [data, setData] = React.useState(null)
        const [audit, setAudit] = React.useState(null)
        const [report, setReport] = React.useState(null)
        const [loading, setLoading] = React.useState(true)
        const [testing, setTesting] = React.useState(false)
        const [error, setError] = React.useState(null)
        const [auto, setAuto] = React.useState(true)
        const [resetting, setResetting] = React.useState(null)
        const [prices, setPrices] = React.useState(null)
        const [draft, setDraft] = React.useState({})
        const [newKey, setNewKey] = React.useState('')
        const [saving, setSaving] = React.useState(false)
        const [priceMsg, setPriceMsg] = React.useState(null)

        const load = React.useCallback(async () => {
          setLoading(true)
          try {
            const [s, a, p] = await Promise.all([
              fetch(`${API}/status`, { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
              fetch(`${API}/audit?limit=200`, { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
              fetch(`${API}/prices`, { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
            ])
            setData(s); setAudit(a); setPrices(p); setError(null)
            // Preserve in-progress edits across auto-refresh; seed only once.
            setDraft(prev => (Object.keys(prev).length > 0 ? prev : seedDraft(p.user)))
          } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
          finally { setLoading(false) }
        }, [])

        React.useEffect(() => { void load() }, [load])
        React.useEffect(() => {
          if (!auto) return undefined
          const id = window.setInterval(() => { void load() }, 5000)
          return () => window.clearInterval(id)
        }, [auto, load])

        const runSelftest = async () => {
          setTesting(true)
          try {
            const r = await fetch(`${API}/selftest`, { cache: 'no-store' }).then(x => { if (!x.ok) throw new Error(`HTTP ${x.status}`); return x.json() })
            setReport(r)
          } catch (e) { setReport({ passed: 0, failed: 1, total: 1, tests: [{ name: 'self-test request', ok: false, detail: String(e) }] }) }
          finally { setTesting(false); void load() }
        }

        const resetSession = async (sessionId) => {
          setResetting(sessionId)
          try {
            await fetch(`${API}/reset`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session: sessionId }) })
            await load()
          } catch { /* surfaced on next load */ }
          finally { setResetting(null) }
        }

        const savePrices = async () => {
          setSaving(true); setPriceMsg(null)
          try {
            // Draft cells are strings while editing (a type="number" input keeps
            // a leading zero from "0" + "2" and React skips the DOM repair because
            // "02" == 2 loosely); convert once, here, before the POST.
            const pricing = {}
            for (const [key, row] of Object.entries(draft)) {
              const converted = {}
              for (const field of priceFields) {
                const textValue = String(row?.[field] ?? '').trim()
                const numeric = textValue === '' ? 0 : Number(textValue)
                if (!Number.isFinite(numeric) || numeric < 0) {
                  setPriceMsg({ ok: false, text: `${t.priceSaveErr}: ${key}.${field}` })
                  return
                }
                converted[field] = numeric
              }
              pricing[key] = converted
            }
            const r = await fetch(`${API}/prices`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pricing }) })
            const j = await r.json()
            if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`)
            setDraft(seedDraft(j.user ?? {}))
            setPriceMsg({ ok: true, text: t.priceSaved })
            await load()
          } catch (e) { setPriceMsg({ ok: false, text: `${t.priceSaveErr}: ${e instanceof Error ? e.message : String(e)}` }) }
          finally { setSaving(false) }
        }
        const setRate = (key, field, value) => {
          // Keep the raw typing (so "0.04" can be entered left to right); only
          // digits and one dot survive, and savePrices converts to a number.
          const textValue = String(value ?? '').replace(/[^\d.]/g, '')
          setDraft(prev => ({ ...prev, [key]: { ...emptyDraftRow(), ...(prev[key] ?? {}), [field]: textValue } }))
        }
        const addModel = (key, preset) => {
          const k = String(key ?? '').trim()
          if (!k) {
            // Silent no-ops read as a broken button — say what is missing.
            setPriceMsg({ ok: false, text: t.priceKeyRequired })
            return
          }
          const seeded = preset === undefined ? {} : {
            inputPerM: textOfRate(preset.inputPerM),
            outputPerM: textOfRate(preset.outputPerM),
            cacheReadPerM: textOfRate(preset.cacheReadPerM),
            cacheWritePerM: textOfRate(preset.cacheWritePerM),
          }
          setDraft(prev => ({ ...prev, [k]: { ...emptyDraftRow(), ...seeded, ...(prev[k] ?? {}) } }))
          setNewKey('')
          setPriceMsg(null)
        }
        const removeModel = (key) => setDraft(prev => { const n = { ...prev }; delete n[key]; return n })

        const stats = data?.stats ?? {}
        const sessions = data?.sessions ?? []
        const entries = audit?.entries ?? []
        const cfg = data?.config ?? {}
        const localeId = activeLocale()
        const nf = (n) => Number(n ?? 0).toLocaleString(localeId === 'zh' ? 'zh-CN' : 'en-US')
        const shortId = (id) => id ? `${String(id).slice(0, 8)}…` : '—'
        const timeStr = (ms) => ms ? new Date(ms).toLocaleTimeString(localeId === 'zh' ? 'zh-CN' : 'en-US', { hour12: false }) : '—'
        const sym = data?.currencySymbol ?? '¥'
        const usdToCny = data?.usdToCny ?? 7.2
        const isUsd = data?.currency === 'USD'
        const money = (cny, dec) => {
          const v = isUsd ? Number(cny ?? 0) / usdToCny : Number(cny ?? 0)
          const s = isUsd ? '$' : sym
          return `${s}${v.toFixed(dec ?? (Math.abs(v) < 1 ? 4 : 2))}`
        }
        const detected = []
        const seen = new Set()
        for (const s of sessions) for (const m of (s.models ?? [])) {
          if (seen.has(m.key)) continue
          seen.add(m.key); detected.push(m)
        }
        const SRC_KEY = { user: 'srcUser', builtin: 'srcBuiltin', fallback: 'srcFallback' }
        const priceFields = prices?.fields ?? ['inputPerM', 'outputPerM', 'cacheReadPerM', 'cacheWritePerM']
        const FIELD_KEY = { inputPerM: 'priceInput', outputPerM: 'priceOutput', cacheReadPerM: 'priceCacheRead', cacheWritePerM: 'priceCacheWrite' }

        const cards = [
          [t.interventions, nf(stats.interventions), ''],
          [t.blocks, nf(stats.blocks), ''],
          [t.circuits, nf(stats.circuits), ''],
          [t.prevented, nf(stats.estimatedTokensPrevented), ''],
          [t.preventedMoney, money(stats.estimatedCostPrevented), 'ww-card-money'],
          [t.sessions, nf(stats.distinctSessions), ''],
          [t.totalAudit, nf(stats.total), ''],
        ]

        return h('div', { className: 'ww-page' },
          h('div', { className: 'ww-inner' },
            h('div', { className: 'ww-head' },
              h('div', null,
                h('h1', { className: 'ww-title' }, t.title),
                h('p', { className: 'ww-sub' }, t.subtitle),
              ),
              h('div', { className: 'ww-actions' },
                h('span', { className: `ww-mode ${data?.mode === 'enforce' ? 'ww-mode-enforce' : ''}` }, `${t.mode}: ${data?.mode === 'enforce' ? t.enforce : t.monitor}`),
                h('label', { className: 'ww-toggle' }, h('input', { type: 'checkbox', checked: auto, onChange: e => setAuto(e.target.checked) }), t.autoRefresh),
                h('button', { className: 'ww-btn', disabled: loading, onClick: () => void load() }, loading ? t.refreshing : t.refresh),
                h('button', { className: 'ww-btn ww-btn-primary', disabled: testing, onClick: () => void runSelftest() }, testing ? t.selftesting : t.selftest),
              ),
            ),

            error ? h('div', { className: 'ww-error' }, h('span', null, `${t.loadError}: ${error}`), h('button', { className: 'ww-btn', onClick: () => void load() }, t.retry)) : null,

            h('div', { className: 'ww-cards' }, cards.map(([label, value, cls]) =>
              h('div', { className: `ww-card ${cls}`.trim(), key: label }, h('div', { className: 'ww-card-label' }, label), h('div', { className: 'ww-card-value' }, value)))),

            report ? h('section', { className: 'ww-panel' },
              h('div', { className: 'ww-panel-head' }, h('h2', { className: 'ww-panel-title' }, t.selftestTitle)),
              h('div', { className: 'ww-test-summary' },
                h('span', { className: 'ww-test-pass' }, `${t.passed}: ${report.passed}`),
                h('span', { className: report.failed > 0 ? 'ww-test-fail' : 'ww-muted' }, `${t.failed}: ${report.failed}`),
                h('span', { className: 'ww-muted' }, `${t.total}: ${report.total}`)),
              (report.tests ?? []).map((test, i) => h('div', { className: 'ww-test-row', key: i },
                h('span', { className: 'ww-test-name' }, `${test.ok ? '✓' : '✗'} ${test.name}`),
                h('span', { className: 'ww-test-detail' }, typeof test.detail === 'string' ? test.detail : JSON.stringify(test.detail)))),
            ) : null,

            h('section', { className: 'ww-panel' },
              h('div', { className: 'ww-panel-head' }, h('h2', { className: 'ww-panel-title' }, t.liveSessions), h('span', { className: 'ww-muted' }, nf(sessions.length))),
              sessions.length === 0 ? h('div', { className: 'ww-empty' }, t.noSessions) :
              h('div', { className: 'ww-table-wrap' }, h('table', { className: 'ww-table' },
                h('thead', null, h('tr', null, [t.session, t.model, t.depth, t.fanout, t.repeat, t.lastTool, t.errorRate, t.tokensMin, t.spendMin, t.totalCost, t.circuit, ''].map((x, i) => h('th', { key: i }, x)))),
                h('tbody', null, sessions.map(s => h('tr', { key: s.sessionId },
                  h('td', null, h('div', { className: 'ww-mono' }, shortId(s.sessionId)), s.title ? h('div', { className: 'ww-muted' }, s.title) : null),
                  h('td', { className: 'ww-mono', title: s.lastModel ?? '' }, s.lastModel ? String(s.lastModel).split('/').pop() : '—'),
                  h('td', { className: 'ww-num' }, s.depth),
                  h('td', { className: 'ww-num' }, s.fanout),
                  h('td', { className: 'ww-num' }, s.repeat > 0 ? h('strong', null, s.repeat) : s.repeat),
                  h('td', { className: 'ww-mono' }, s.lastTool ?? '—'),
                  h('td', { className: 'ww-num' }, `${Math.round(s.errorRate * 100)}%`),
                  h('td', { className: 'ww-num', title: s.velocitySamples === 0 ? t.rateIdle : undefined }, s.velocitySamples === 0 ? '—' : nf(s.tokensPerMinute)),
                  h('td', { className: 'ww-num', title: s.velocitySamples === 0 ? t.rateIdle : undefined }, s.velocitySamples === 0 ? '—' : money(s.spendPerMinute)),
                  h('td', { className: 'ww-num' }, money(s.totalCost)),
                  h('td', null, h('span', { className: `ww-badge ${s.circuit ? 'ww-circuit-open' : 'ww-circuit-closed'}` }, s.circuit ? `${t.open} · ${s.circuit.rule}` : t.closed)),
                  h('td', null, s.circuit ? h('button', { className: 'ww-btn', disabled: resetting === s.sessionId, onClick: () => void resetSession(s.sessionId) }, resetting === s.sessionId ? '…' : t.reset) : null),
                ))))),
            ),

            h('section', { className: 'ww-panel' },
              h('div', { className: 'ww-panel-head' },
                h('h2', { className: 'ww-panel-title' }, t.pricePanel),
                h('button', { className: 'ww-btn ww-btn-primary', disabled: saving, onClick: () => void savePrices() }, saving ? t.priceSaving : t.priceSave)),
              h('p', { className: 'ww-price-sub' }, t.priceSub),
              detected.length > 0 ? h('div', { className: 'ww-detected' },
                h('span', { className: 'ww-detected-label' }, `${t.detectedModels}:`),
                detected.map(m => h('span', { className: 'ww-detected-chip', key: m.key },
                  h('span', { className: 'ww-mono' }, m.model || m.key),
                  h('span', { className: `ww-badge ww-src-${m.priceSource}` }, t[SRC_KEY[m.priceSource]] ?? m.priceSource),
                  h('span', { className: 'ww-muted ww-num' }, money(m.cost)),
                  draft[m.model || m.key] === undefined
                    ? h('button', { className: 'ww-link-btn', onClick: () => addModel(m.model || m.key, m.price) }, t.priceEdit)
                    : null))) : null,
              h('div', { className: 'ww-table-wrap' }, h('table', { className: 'ww-table' },
                h('thead', null, h('tr', null, [t.priceModel, ...priceFields.map(f => t[FIELD_KEY[f]]), t.priceSource, ''].map((x, i) => h('th', { key: i }, x)))),
                h('tbody', null, Object.keys(draft).length === 0
                  ? h('tr', null, h('td', { colSpan: priceFields.length + 3 }, h('div', { className: 'ww-empty' }, t.priceEmpty)))
                  : Object.entries(draft).map(([key, entry]) => h('tr', { key },
                      h('td', { className: 'ww-mono' }, key),
                      priceFields.map(f => h('td', { key: f }, h('input', { className: 'ww-price-input', type: 'text', inputMode: 'decimal', value: entry?.[f] ?? '0', 'aria-label': t[FIELD_KEY[f]], onChange: e => setRate(key, f, e.target.value) }))),
                      h('td', null, h('span', { className: `ww-badge ww-src-${key === '*' ? 'fallback' : 'user'}` }, key === '*' ? t.srcFallback : t.srcUser)),
                      h('td', null, key === '*' ? null : h('button', { className: 'ww-del-btn', onClick: () => removeModel(key) }, t.priceDelete))))))),
              h('div', { className: 'ww-price-actions' },
                h('input', { className: 'ww-price-key', type: 'text', placeholder: t.priceKeyPh, value: newKey, onChange: e => setNewKey(e.target.value), onKeyDown: e => { if (e.key === 'Enter') addModel(newKey) } }),
                h('button', { className: 'ww-btn', onClick: () => addModel(newKey) }, t.priceAdd),
                priceMsg ? h('span', { className: `ww-price-msg ${priceMsg.ok ? 'ww-price-msg-ok' : 'ww-price-msg-err'}` }, priceMsg.text) : null),
              h('p', { className: 'ww-price-sub' }, t.priceHint),
            ),

            h('section', { className: 'ww-panel' },
              h('div', { className: 'ww-panel-head' }, h('h2', { className: 'ww-panel-title' }, t.audit), h('span', { className: 'ww-muted' }, nf(entries.length))),
              entries.length === 0 ? h('div', { className: 'ww-empty' }, t.noAudit) :
              h('div', { className: 'ww-table-wrap' }, h('table', { className: 'ww-table' },
                h('thead', null, h('tr', null, [t.time, t.session, t.rule, t.severity, t.action, t.detail, t.est].map((x, i) => h('th', { key: i }, x)))),
                h('tbody', null, entries.map(e => h('tr', { key: e.id },
                  h('td', { className: 'ww-num ww-muted' }, timeStr(e.time)),
                  h('td', { className: 'ww-mono' }, shortId(e.sessionId)),
                  h('td', null, t[RULE_KEYS[e.rule]] ?? e.rule),
                  h('td', null, h('span', { className: `ww-badge ww-sev-${e.severity}` }, t[SEV_KEYS[e.severity]] ?? e.severity)),
                  h('td', null, t[ACT_KEYS[e.action]] ?? e.action),
                  h('td', { className: 'ww-detail' }, detailText(e.detail, isUsd ? '$' : sym)),
                  h('td', { className: 'ww-num' },
                    h('div', null, e.estimatedTokensPrevented ? nf(e.estimatedTokensPrevented) : '—'),
                    e.estimatedCostPrevented ? h('div', { className: 'ww-muted' }, money(e.estimatedCostPrevented)) : null),
                ))))),
            ),

            h('section', { className: 'ww-panel' },
              h('div', { className: 'ww-panel-head' }, h('h2', { className: 'ww-panel-title' }, t.config)),
              h('div', { className: 'ww-config' }, Object.entries(cfg).filter(([key]) => key !== 'pricing').map(([key, value]) =>
                h('div', { className: 'ww-config-item', key }, h('span', { className: 'ww-config-key' }, key), h('span', { className: 'ww-config-val' }, Array.isArray(value) ? (value.join(', ') || '—') : (value && typeof value === 'object' ? JSON.stringify(value) : String(value)))))),
            ),

            h('p', { className: 'ww-hint' }, t.hint),
          ),
        )
      }

      return {
        inject: ['slots', 'locale'],
        apply(ctx) {
          hostCtx = ctx
          ctx.effect(() => {
            const style = document.createElement('style')
            style.dataset.runawayWatchdog = 'true'
            style.textContent = STYLE
            document.head.append(style)
            return () => style.remove()
          }, 'runaway-watchdog: styles')
          // The whole copy table is registered so `ctx.locale.bind()` consumers
          // (side bar label, nested panels) and the Page itself share one source.
          ctx.effect(() => ctx.locale.register(LOCALE_NS, COPY), 'runaway-watchdog: locale')
          const label = ctx.locale.bind(LOCALE_NS)
          ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID, locale: LOCALE_NS }, Page))
          ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: PANEL_ID, order: 19, label: () => label('panel'), locale: LOCALE_NS }, Icon))
        },
      }
    },
  })
})()