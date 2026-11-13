/**
 * Client render smoke test. Loads the real client.js bundle with a mocked
 * module loader + a minimal React (seeded hooks), renders the dashboard Page
 * with populated data, and asserts the pricing UI and the locale plumbing:
 * the RMB "estimated saved" card, the per-session model/cost columns, the
 * editable model-price panel, and copy selected from the HOST locale service
 * snapshot (not localStorage). This catches render-path defects headlessly.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

// ---- Minimal DOM / loader globals the IIFE touches at import time ----
const registered = {}
let capturedFactory = null
globalThis.window = {
  addEventListener: () => {}, removeEventListener: () => {},
  setInterval: () => 0, clearInterval: () => {},
  __ModuleLoader__: { load: ({ factory }) => { capturedFactory = factory } },
}
globalThis.document = {
  createElement: () => ({ dataset: {}, textContent: '' }),
  head: { append: () => {} },
}

await import('../client.js')
assert.ok(capturedFactory, 'client.js must register a factory with the module loader')

test('every design-token reference carries a fallback (a bare var() voids the declaration)', async () => {
  // Regression: the panel used invented token names (--dsw-alias-border-primary,
  // -bg-page, -radius-md, …) with no fallback. An undefined custom property voids
  // the WHOLE declaration, so borders/backgrounds vanished and the price input
  // rendered as plain text — reported live as "the add-model button does nothing".
  const { readFileSync } = await import('node:fs')
  const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  const bare = [...source.matchAll(/var\((--dsw-alias-[a-z0-9-]+)\)/g)].map(m => m[1])
  assert.deepEqual([...new Set(bare)], [], `these token references lack a fallback: ${[...new Set(bare)].join(', ')}`)
})

test('rate cells are text inputs and convert to numbers only on save', async () => {
  // Regression: `type="number"` + a controlled numeric value keeps a glued leading
  // zero ("0" then typing "2" → DOM "02", and React skips the repair because
  // "02" == 2 loosely). The live panel showed 02 / 08 / 00.04 — ugly, and it made
  // decimal entry awkward. Cells are strings now; savePrices does the conversion.
  const { readFileSync } = await import('node:fs')
  const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  assert.ok(!/type:\s*'number'/.test(source), 'rate cells must not be type="number"')
  assert.ok(source.includes("type: 'text', inputMode: 'decimal'"), 'rate cells must be decimal text inputs')
  assert.ok(source.includes('seedDraft('), 'the editor draft must be seeded through seedDraft (numbers → strings)')
  assert.ok(/for \(const field of priceFields\)/.test(source) && source.includes('converted[field] = numeric'),
    'savePrices must convert the string draft into numbers before the POST')
})

// ---- Seed the Page hook state (in declaration order) with populated data ----
const statusData = {
  mode: 'enforce',
  currency: 'CNY', currencySymbol: '¥', usdToCny: 7.2,
  config: { mode: 'enforce', currency: 'CNY', spendVelocityLimit: 30, pricing: { '*': { inputPerM: 2 } } },
  stats: { interventions: 3, blocks: 2, circuits: 1, estimatedTokensPrevented: 12345, estimatedCostPrevented: 0.0864, distinctSessions: 1, total: 4 },
  sessions: [{
    sessionId: 'sess-12345678', title: 'demo', depth: 0, fanout: 0, repeat: 0,
    lastTool: 'read', lastModel: 'deepseek/deepseek-chat', lastError: false, calls: 5, errors: 0,
    errorRate: 0, totalTokens: 900000, tokensPerMinute: 140, spendPerMinute: 0.0011, totalCost: 0.018, currency: 'CNY',
    models: [{ key: 'deepseek/deepseek-chat', provider: 'deepseek', model: 'deepseek-chat', calls: 3, inputTokens: 100000, outputTokens: 2000, cacheReadTokens: 800000, cacheWriteTokens: 0, cost: 0.018, price: { inputPerM: 2, outputPerM: 8, cacheReadPerM: 0.5, cacheWritePerM: 2 }, priceSource: 'builtin', priceMatch: 'deepseek-chat' }],
    circuit: null,
  }],
}
const auditData = { entries: [{ id: 'e1', time: 1700000000000, sessionId: 'sess-12345678', rule: 'repeat', severity: 'block', action: 'blocked', detail: { tool: 'read', count: 5 }, estimatedTokensPrevented: 12345, estimatedCostPrevented: 0.0864 }], stats: {} }
const pricesData = { currency: 'CNY', currencySymbol: '¥', usdToCny: 7.2, fields: ['inputPerM', 'outputPerM', 'cacheReadPerM', 'cacheWritePerM'], builtin: { 'deepseek-chat': { inputPerM: 2, outputPerM: 8, cacheReadPerM: 0.5, cacheWritePerM: 2 }, '*': { inputPerM: 2, outputPerM: 8, cacheReadPerM: 0.5, cacheWritePerM: 2 } }, user: { '*': { inputPerM: 2, outputPerM: 8, cacheReadPerM: 0.5, cacheWritePerM: 2 } } }
const draftSeed = { '*': { inputPerM: 2, outputPerM: 8, cacheReadPerM: 0.5, cacheWritePerM: 2 }, 'deepseek-chat': { inputPerM: 2, outputPerM: 8, cacheReadPerM: 0.5, cacheWritePerM: 2 } }

/** The Page's hook order starts with the locale-revision state, then load state. */
const seedsFor = ({ audit = auditData } = {}) => [0, statusData, audit, null, false, false, null, false, null, pricesData, draftSeed, '', false, null]

function makeReact(seeds) {
  let i = 0
  return {
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children: children.flat(Infinity) }),
    useState: (init) => { const v = i < seeds.length ? seeds[i] : (typeof init === 'function' ? init() : init); i += 1; return [v, () => {}] },
    useEffect: () => {},
    useCallback: (fn) => fn,
  }
}

function renderPage({ seeds, active = 'zh', registeredNamespaces = {} } = {}) {
  const React = makeReact(seeds ?? seedsFor())
  const mod = capturedFactory((name) => { if (name === 'react') return React; throw new Error(`unexpected require ${name}`) })
  const captured = {}
  const ctx = {
    effect: (fn) => { const d = fn(); return d },
    locale: {
      register: (ns, dict) => { registeredNamespaces[ns] = dict; return () => {} },
      bind: (ns) => (k) => registeredNamespaces[ns]?.zh?.[k] ?? k,
      getSnapshot: () => ({ active }),
      subscribe: () => () => {},
    },
    slots: { inject: (_n, fn) => fn(), register: (desc, Comp) => { captured[desc.name] = Comp } },
  }
  mod.apply(ctx)
  const Page = captured['main']
  assert.ok(Page, 'main slot must register the Page component')
  return { tree: Page(), namespaces: registeredNamespaces, ctx }
}

function collect(node, out = { text: [], classes: [] }) {
  if (node == null || node === false) return out
  if (typeof node === 'string' || typeof node === 'number') { out.text.push(String(node)); return out }
  if (Array.isArray(node)) { for (const n of node) collect(n, out); return out }
  if (node.props?.className) out.classes.push(node.props.className)
  for (const c of node.children ?? []) collect(c, out)
  return out
}

test('dashboard renders the RMB saved card, model/cost columns, and price editor', () => {
  const { tree } = renderPage()
  const { text, classes } = collect(tree)
  const all = text.join(' | ')
  // New top metric beside estimated tokens prevented.
  assert.ok(all.includes('预估省下 (¥)'), 'RMB saved card label must render')
  assert.ok(all.includes('¥0.0864'), `RMB saved value must render, got: ${all.slice(0, 400)}`)
  assert.ok(classes.some(c => c.includes('ww-card-money')), 'money card must carry the accent class')
  // Per-session model + categorized cost.
  assert.ok(all.includes('deepseek-chat'), 'detected model id must render')
  assert.ok(all.includes('累计花费'), 'total cost column must render')
  // Price editor panel + editable rows + detected-model chip.
  assert.ok(all.includes('模型价格设置'), 'price panel title must render')
  assert.ok(all.includes('缓存命中'), 'cache-read price field must render')
  assert.ok(classes.some(c => c.includes('ww-price-input')), 'price inputs must render')
  assert.ok(classes.some(c => c.includes('ww-detected-chip')), 'detected model chip must render')
  assert.ok(all.includes('保存价格'), 'save button must render')
})

test('dashboard renders safely with empty data (no sessions/prices yet)', () => {
  const empty = { mode: 'monitor', currency: 'CNY', currencySymbol: '¥', usdToCny: 7.2, config: {}, stats: {}, sessions: [] }
  const seeds = [0, empty, { entries: [] }, null, false, false, null, false, null, { fields: ['inputPerM', 'outputPerM', 'cacheReadPerM', 'cacheWritePerM'], user: {} }, {}, '', false, null]
  const { tree } = renderPage({ seeds })
  const { text } = collect(tree)
  const all = text.join(' | ')
  assert.ok(all.includes('当前没有活跃会话'), 'empty session state must render')
  assert.ok(all.includes('预估省下 (¥)'), 'RMB card still renders at zero')
  assert.ok(all.includes('¥0.00'), 'zero money must format cleanly')
})

test('a session with no usage in the window shows a dash, not a measured zero', () => {
  // Regression: 0 tok/min next to ¥0.8740 of cumulative cost reads as "broken".
  // velocitySamples === 0 means "no sample in the window", which is not 0/min.
  const idle = {
    ...statusData,
    sessions: [{ ...statusData.sessions[0], tokensPerMinute: 0, spendPerMinute: 0, velocitySamples: 0, totalCost: 0.874 }],
  }
  const { tree } = renderPage({ seeds: [0, idle, auditData, null, false, false, null, false, null, pricesData, draftSeed, '', false, null] })
  const { text } = collect(tree)
  const all = text.join(' | ')
  assert.ok(!all.includes('¥0.0000'), `an empty window must not render ¥0.0000, got: ${all.slice(0, 200)}`)
  assert.ok(all.includes('—'), 'an empty window renders a dash')
  assert.ok(all.includes('¥0.874'), 'the cumulative cost still renders')
})
test('copy follows the HOST locale service snapshot (en), not localStorage', () => {
  const { tree, namespaces } = renderPage({ seeds: seedsFor(), active: 'en' })
  const { text } = collect(tree)
  const all = text.join(' | ')
  assert.ok(all.includes('Est. saved (¥)'), `English card label must render when the host locale is en, got: ${all.slice(0, 300)}`)
  assert.ok(all.includes('Total cost'), 'English column header must render')
  assert.ok(!all.includes('累计花费'), 'Chinese copy must not leak into the English render')
  // The whole copy table is registered under the panel namespace for bind() consumers.
  assert.ok(namespaces['runawayWatchdog']?.en?.panel === 'Runaway Watchdog', 'en dictionary must be registered')
  assert.ok(namespaces['runawayWatchdog']?.zh?.panel === '失控看门狗', 'zh dictionary must be registered')
})

test('a monitor-mode would-trip audit row renders with its own label', () => {
  const wouldTrip = { entries: [{ id: 'e2', time: 1700000000000, sessionId: 'sess-12345678', rule: 'error-rate', severity: 'circuit', action: 'would-trip', detail: { rate: 1 }, estimatedTokensPrevented: 10 }], stats: {} }
  const { tree } = renderPage({ seeds: seedsFor({ audit: wouldTrip }) })
  const { text } = collect(tree)
  const all = text.join(' | ')
  assert.ok(all.includes('将熔断（仅监测）'), `would-trip action must be labelled, got: ${all.slice(0, 300)}`)
})
