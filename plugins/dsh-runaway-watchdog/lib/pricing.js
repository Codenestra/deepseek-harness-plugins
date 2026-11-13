/**
 * Categorized model pricing — pure, dependency-free.
 *
 * Spend is computed from the model-reported usage buckets (input / output /
 * cache-read / cache-write), each priced separately, in CNY per million tokens.
 * The model identity comes from the assistant message source (`provider`/`model`),
 * so every message is priced against the exact model that produced it.
 *
 * Price resolution order: user table (config / UI overrides) → built-in reference
 * table → `*` fallback. The resolved `source` lets the UI flag models that are
 * still on a fallback price so the operator knows to set a real rate.
 *
 * Built-in numbers are DeepSeek regular-rate references (CNY / 1e6 tokens).
 * DeepSeek applies peak/valley pricing, so operators should override with their
 * actual settlement rates. Nothing here is a measured bill — it is an estimate
 * from reported token counts × configured rates.
 *
 * @module @local/dsh-runaway-watchdog/lib/pricing
 */

/** Display currency for all spend figures. */
export const CURRENCY = 'CNY'
export const CURRENCY_SYMBOL = '¥'

/** The four disjoint usage buckets priced independently. */
export const PRICE_FIELDS = Object.freeze(['inputPerM', 'outputPerM', 'cacheReadPerM', 'cacheWritePerM'])

/**
 * Built-in reference price table (CNY per million tokens, regular rates).
 * Keys are model ids or wildcard patterns; `*` is the fallback.
 *
 * `deepseek-flash` / `deepseek-v4-pro` are the published **peak-hour** rates from
 * the official price page (https://api-docs.deepseek.com/zh-cn/quick_start/pricing,
 * read 2026-11-12): off-peak is exactly half, and DeepSeek does not bill cache
 * writes separately, so `cacheWritePerM` is 0 for both. Peak rates are chosen
 * deliberately: for a SPEND guard, over-reporting trips early, while
 * under-reporting (using off-peak) would let real spend run past the circuit.
 * Override in the dashboard with your actual settlement rate if you prefer
 * off-peak figures — a per-model row always wins over these built-ins.
 *
 * `deepseek-chat` / `deepseek-reasoner` are kept as legacy references for models
 * that no longer appear on that page; `*` stays a generic DeepSeek-like fallback.
 */
export const BUILTIN_PRICES = Object.freeze({
  'deepseek-flash': Object.freeze({ inputPerM: 2, cacheReadPerM: 0.04, cacheWritePerM: 0, outputPerM: 8 }),
  'deepseek-v4-pro': Object.freeze({ inputPerM: 9, cacheReadPerM: 0.3, cacheWritePerM: 0, outputPerM: 27 }),
  'deepseek-chat': Object.freeze({ inputPerM: 2, cacheReadPerM: 0.5, cacheWritePerM: 2, outputPerM: 8 }),
  'deepseek-reasoner': Object.freeze({ inputPerM: 4, cacheReadPerM: 1, cacheWritePerM: 4, outputPerM: 16 }),
  '*': Object.freeze({ inputPerM: 2, cacheReadPerM: 0.5, cacheWritePerM: 2, outputPerM: 8 }),
})

/**
 * Validate and freeze one price entry. Missing buckets default to 0.
 * @param {object} raw - raw entry with optional per-million rates.
 * @param {string} label - model key (for error messages).
 * @returns {object} frozen normalized entry.
 * @throws {TypeError} on a non-object or a negative / non-finite rate.
 */
export function normalizePriceEntry(raw, label) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new TypeError(`runaway-watchdog: pricing["${label}"] must be an object`)
  }
  const entry = {}
  for (const field of PRICE_FIELDS) {
    const value = raw[field] === undefined ? 0 : raw[field]
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new TypeError(`runaway-watchdog: pricing["${label}"].${field} must be a non-negative finite number`)
    }
    entry[field] = value
  }
  return Object.freeze(entry)
}

/**
 * Validate and freeze a whole price table (model key → entry). Ensures a `*`
 * fallback exists (defaults to the built-in fallback when absent).
 * @param {object|undefined|null} raw - raw table.
 * @returns {object} frozen normalized table.
 * @throws {TypeError} on any invalid key or entry.
 */
export function normalizePricing(raw) {
  if (raw === undefined || raw === null) raw = {}
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new TypeError('runaway-watchdog: pricing must be an object keyed by model')
  }
  const table = {}
  for (const [key, value] of Object.entries(raw)) {
    if (typeof key !== 'string' || key.length === 0) {
      throw new TypeError('runaway-watchdog: pricing keys must be non-empty strings')
    }
    table[key] = normalizePriceEntry(value, key)
  }
  if (!table['*']) table['*'] = BUILTIN_PRICES['*']
  return Object.freeze(table)
}

/**
 * Merge price tables left-to-right (later keys win). Each table is model→entry.
 * @param {...object} tables - normalized or raw tables.
 * @returns {object} a new merged table (entries normalized).
 */
export function mergePricing(...tables) {
  const merged = {}
  for (const table of tables) {
    if (!table || typeof table !== 'object') continue
    for (const [key, value] of Object.entries(table)) merged[key] = value
  }
  return normalizePricing(merged)
}

/**
 * Whether a pattern matches a model id or a `provider/model` route. Supports `*`
 * wildcards; comparison is case-insensitive. A bare pattern matches the model id
 * (and also the full route); `provider/model` matches the full route only.
 * @param {string} pattern - price-table key.
 * @param {string} provider - provider route id.
 * @param {string} model - model id.
 * @returns {boolean} whether the pattern matches.
 */
export function matchPattern(pattern, provider, model) {
  const p = String(provider ?? '').toLowerCase()
  const m = String(model ?? '').toLowerCase()
  const route = `${p}/${m}`
  const pat = String(pattern).toLowerCase()
  const toRegExp = (glob) => new RegExp(`^${glob.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`)
  if (pat.includes('/')) return toRegExp(pat).test(route)
  return toRegExp(pat).test(m) || toRegExp(pat).test(route)
}

/**
 * Find the best-matching key in a table for a model route. Priority: exact model
 * id → exact `provider/model` → non-`*` wildcard → `*`. Exact keys are preferred
 * over wildcards; among wildcards the first declared wins.
 * @param {string} provider - provider route id.
 * @param {string} model - model id.
 * @param {object} table - price table.
 * @returns {string|null} the matched key, or null when nothing matches.
 */
export function findMatch(provider, model, table) {
  const m = String(model ?? '').toLowerCase()
  const route = `${String(provider ?? '').toLowerCase()}/${m}`
  const keys = Object.keys(table)
  const exact = keys.find(k => k.toLowerCase() === m)
  if (exact !== undefined) return exact
  const exactRoute = keys.find(k => k.toLowerCase() === route)
  if (exactRoute !== undefined) return exactRoute
  const wildcard = keys.find(k => k !== '*' && k.includes('*') && matchPattern(k, provider, model))
  if (wildcard !== undefined) return wildcard
  if (keys.includes('*')) return '*'
  return null
}

/**
 * Resolve the price for a model route, tracking where the rate came from.
 * @param {string} provider - provider route id.
 * @param {string} model - model id.
 * @param {object} userPricing - user overrides (config + UI), normalized.
 * @param {object} [builtinPricing] - built-in reference table.
 * @returns {{price: object, source: 'user'|'builtin'|'fallback', match: string}} resolved rate.
 */
export function resolvePrice(provider, model, userPricing, builtinPricing = BUILTIN_PRICES) {
  const userMatch = findMatch(provider, model, userPricing)
  if (userMatch !== null && userMatch !== '*') {
    return { price: userPricing[userMatch], source: 'user', match: userMatch }
  }
  const builtinMatch = findMatch(provider, model, builtinPricing)
  if (builtinMatch !== null && builtinMatch !== '*') {
    return { price: builtinPricing[builtinMatch], source: 'builtin', match: builtinMatch }
  }
  const fallback = (userMatch === '*' && userPricing['*']) || builtinPricing['*'] || BUILTIN_PRICES['*']
  return { price: fallback, source: 'fallback', match: '*' }
}

/**
 * Categorized cost of one assistant message in CNY. The four usage buckets are
 * disjoint (reasoning tokens are already inside outputTokens), so each is priced
 * once. Missing buckets count as 0.
 * @param {object|undefined} usage - model-reported TokenUsage.
 * @param {object} price - normalized price entry (per-million rates).
 * @returns {number} non-negative cost in CNY.
 */
export function messageCost(usage, price) {
  if (!usage || typeof usage !== 'object' || !price) return 0
  const n = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0)
  const cost = n(usage.inputTokens) * price.inputPerM
    + n(usage.outputTokens) * price.outputPerM
    + n(usage.cacheReadTokens) * price.cacheReadPerM
    + n(usage.cacheWriteTokens) * price.cacheWritePerM
  return cost / 1e6
}