/**
 * CNY price table and cost helpers.
 *
 * Prices mirror `@local/dsh-runaway-watchdog` so the two plugins never disagree
 * about what a call cost. Built-ins are DeepSeek's published peak-hour rates
 * (off-peak is half; DeepSeek does not bill cache writes separately, so
 * `cacheWritePerM` is 0). Every figure here is an estimate from configuration,
 * never a provider-reported amount: the UI labels it as such.
 */

/** Display currency for all cost figures. */
export const CURRENCY = 'CNY'
/** Prefix used wherever a cost number is rendered. */
export const CURRENCY_SYMBOL = '¥'
/** The four billable buckets, each priced per million tokens. */
export const PRICE_FIELDS = Object.freeze(['inputPerM', 'outputPerM', 'cacheReadPerM', 'cacheWritePerM'])

/** Peak-hour CNY rates per million tokens; `*` is the unknown-model fallback. */
export const BUILTIN_PRICES = Object.freeze({
  'deepseek-flash': Object.freeze({ inputPerM: 2, cacheReadPerM: 0.04, cacheWritePerM: 0, outputPerM: 8 }),
  'deepseek-v4-pro': Object.freeze({ inputPerM: 9, cacheReadPerM: 0.3, cacheWritePerM: 0, outputPerM: 27 }),
  'deepseek-chat': Object.freeze({ inputPerM: 2, cacheReadPerM: 0.5, cacheWritePerM: 2, outputPerM: 8 }),
  'deepseek-reasoner': Object.freeze({ inputPerM: 4, cacheReadPerM: 1, cacheWritePerM: 4, outputPerM: 16 }),
  '*': Object.freeze({ inputPerM: 2, cacheReadPerM: 0.5, cacheWritePerM: 2, outputPerM: 8 }),
})

function isRate(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/**
 * Validate an operator price override.
 * An entry may be keyed by `model`, `provider/model`, or `*`; anything that does
 * not name all four buckets is rejected instead of silently priced at zero.
 * @param value - raw configuration value.
 * @returns the normalized table, or an empty object when nothing was configured.
 * @throws when an entry is not an object of four non-negative finite rates.
 */
export function normalizePricing(value) {
  if (value === undefined || value === null) return {}
  if (typeof value !== 'object' || Array.isArray(value)) throw new TypeError('pricing must be an object of model rates')
  const table = {}
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new TypeError(`pricing.${key} must be an object of four rates`)
    }
    const rates = {}
    for (const field of PRICE_FIELDS) {
      if (!isRate(entry[field])) throw new TypeError(`pricing.${key}.${field} must be a non-negative finite number`)
      rates[field] = entry[field]
    }
    table[key] = rates
  }
  return table
}

/**
 * Resolve the rate row for one call, preferring the most specific entry.
 * @param provider - provider id reported by the harness.
 * @param model - model id reported by the harness.
 * @param pricing - normalized operator overrides.
 * @returns the matching four-rate object plus the key that produced it.
 */
export function priceFor(provider, model, pricing = {}) {
  const candidates = []
  if (typeof model === 'string' && model !== '') {
    if (typeof provider === 'string' && provider !== '') candidates.push(`${provider}/${model}`)
    candidates.push(model)
  }
  if (typeof provider === 'string' && provider !== '') candidates.push(`${provider}/*`)
  for (const key of candidates) {
    if (Object.hasOwn(pricing, key)) return { key, rates: pricing[key], source: 'config' }
  }
  for (const key of candidates) {
    if (Object.hasOwn(BUILTIN_PRICES, key)) return { key, rates: BUILTIN_PRICES[key], source: 'builtin' }
  }
  return { key: '*', rates: BUILTIN_PRICES['*'], source: 'fallback' }
}

function count(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null
}

/**
 * Price one call from its four token buckets.
 * A bucket the provider did not report stays unknown and is excluded, so a
 * partial cost is a lower bound rather than a fabricated zero.
 * @param row - a ledger row carrying the four token columns.
 * @param pricing - normalized operator overrides.
 * @returns per-bucket and total CNY cost plus whether every bucket was known.
 */
export function rowCost(row, pricing = {}) {
  const price = priceFor(row?.provider, row?.model, pricing)
  const buckets = {
    input: count(row?.input_tokens),
    output: count(row?.output_tokens),
    cacheRead: count(row?.cache_read_tokens),
    cacheWrite: count(row?.cache_write_tokens),
  }
  const perBucket = {
    input: buckets.input === null ? null : buckets.input * price.rates.inputPerM / 1e6,
    output: buckets.output === null ? null : buckets.output * price.rates.outputPerM / 1e6,
    cacheRead: buckets.cacheRead === null ? null : buckets.cacheRead * price.rates.cacheReadPerM / 1e6,
    cacheWrite: buckets.cacheWrite === null ? null : buckets.cacheWrite * price.rates.cacheWritePerM / 1e6,
  }
  const known = Object.values(perBucket).filter(value => value !== null)
  const total = known.reduce((sum, value) => sum + value, 0)
  return {
    total,
    ...perBucket,
    complete: known.length === 4,
    priceKey: price.key,
    priceSource: price.source,
  }
}

/**
 * Aggregate cost over a set of rows while keeping coverage honest.
 * @param rows - ledger rows for the selected range.
 * @param pricing - normalized operator overrides.
 * @returns total and bucket sums, complete-coverage flag, and priced-call counts.
 */
export function costSummary(rows, pricing = {}) {
  let total = 0
  let input = 0
  let output = 0
  let cacheRead = 0
  let cacheWrite = 0
  let completeCalls = 0
  for (const row of rows) {
    const cost = rowCost(row, pricing)
    total += cost.total
    input += cost.input ?? 0
    output += cost.output ?? 0
    cacheRead += cost.cacheRead ?? 0
    cacheWrite += cost.cacheWrite ?? 0
    if (cost.complete) completeCalls += 1
  }
  return {
    currency: CURRENCY,
    total,
    input,
    output,
    cacheRead,
    cacheWrite,
    complete: rows.length > 0 && completeCalls === rows.length,
    knownCalls: rows.length,
    completeCalls,
  }
}

/** Attach the priced fields a row exposes to the table, exporters, and charts. */
export function withCost(row, pricing = {}) {
  const cost = rowCost(row, pricing)
  return { ...row, cost_rmb: cost.total, cost_complete: cost.complete ? 1 : 0 }
}
