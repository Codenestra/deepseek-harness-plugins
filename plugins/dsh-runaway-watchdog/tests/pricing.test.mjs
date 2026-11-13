/**
 * Unit tests for the categorized pricing core (lib/pricing.js). Pure functions,
 * fixed inputs — proves model matching, price-source resolution, and the
 * disjoint-bucket cost formula that the live spend figures rely on.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BUILTIN_PRICES, PRICE_FIELDS, normalizePriceEntry, normalizePricing, mergePricing,
  matchPattern, findMatch, resolvePrice, messageCost,
} from '../lib/pricing.js'

test('normalizePriceEntry defaults missing buckets to 0 and freezes', () => {
  const e = normalizePriceEntry({ inputPerM: 2, outputPerM: 8 }, 'x')
  assert.equal(e.inputPerM, 2)
  assert.equal(e.outputPerM, 8)
  assert.equal(e.cacheReadPerM, 0)
  assert.equal(e.cacheWritePerM, 0)
  assert.ok(Object.isFrozen(e))
})

test('normalizePriceEntry rejects invalid rates', () => {
  assert.throws(() => normalizePriceEntry(null, 'x'), /must be an object/)
  assert.throws(() => normalizePriceEntry({ inputPerM: -1 }, 'x'), /non-negative/)
  assert.throws(() => normalizePriceEntry({ outputPerM: NaN }, 'x'), /non-negative/)
  assert.throws(() => normalizePriceEntry({ outputPerM: '8' }, 'x'), /non-negative/)
})

test('normalizePricing ensures a * fallback and rejects bad tables', () => {
  const t = normalizePricing({ 'deepseek-chat': { inputPerM: 2, outputPerM: 8 } })
  assert.ok(t['*'], 'fallback must exist')
  assert.throws(() => normalizePricing([]), /keyed by model/)
  assert.throws(() => normalizePricing({ '': { inputPerM: 1 } }), /non-empty/)
})

test('matchPattern: exact, wildcard, route, case-insensitive', () => {
  assert.ok(matchPattern('deepseek-chat', 'deepseek', 'deepseek-chat'))
  assert.ok(matchPattern('DEEPSEEK-CHAT', 'deepseek', 'deepseek-chat'))
  assert.ok(matchPattern('deepseek-*', 'deepseek', 'deepseek-reasoner'))
  assert.ok(matchPattern('*', 'any', 'any-model'))
  assert.ok(matchPattern('deepseek/deepseek-chat', 'deepseek', 'deepseek-chat'))
  assert.ok(!matchPattern('deepseek/deepseek-chat', 'other', 'deepseek-chat'))
  assert.ok(!matchPattern('gpt-4*', 'openai', 'gpt-3.5'))
  assert.ok(matchPattern('gpt-4*', 'openai', 'gpt-4o'))
})

test('findMatch priority: exact model > exact route > wildcard > *', () => {
  const table = { '*': {}, 'deepseek-*': {}, 'deepseek-chat': {}, 'deepseek/deepseek-chat': {} }
  assert.equal(findMatch('deepseek', 'deepseek-chat', table), 'deepseek-chat')
  assert.equal(findMatch('deepseek', 'deepseek-reasoner', table), 'deepseek-*')
  assert.equal(findMatch('other', 'unknown', table), '*')
  assert.equal(findMatch('other', 'unknown', { 'deepseek-chat': {} }), null)
})

test('resolvePrice tracks source: user > builtin > fallback', () => {
  const user = normalizePricing({ 'deepseek-chat': { inputPerM: 4, outputPerM: 16, cacheReadPerM: 1, cacheWritePerM: 4 } })
  const u = resolvePrice('deepseek', 'deepseek-chat', user)
  assert.equal(u.source, 'user')
  assert.equal(u.price.outputPerM, 16)
  const b = resolvePrice('deepseek', 'deepseek-reasoner', normalizePricing({}))
  assert.equal(b.source, 'builtin')
  assert.equal(b.price.outputPerM, 16)
  const f = resolvePrice('openai', 'gpt-4o', normalizePricing({}))
  assert.equal(f.source, 'fallback')
  assert.equal(f.match, '*')
})

test('the shipping flash/pro models resolve to official peak built-ins (not the generic fallback)', () => {
  // Regression: `deepseek-flash` is the default model route of the desktop profile.
  // Without an exact entry it fell back to `*`, whose cache-read rate (0.5) is ~12x
  // the official 0.04 and overstated a real session cost by ~7x.
  const flash = resolvePrice('deepseek-official', 'deepseek-flash', normalizePricing({}))
  assert.equal(flash.source, 'builtin')
  assert.equal(flash.match, 'deepseek-flash')
  assert.deepEqual({ ...flash.price }, { inputPerM: 2, outputPerM: 8, cacheReadPerM: 0.04, cacheWritePerM: 0 })
  const pro = resolvePrice('deepseek-official', 'deepseek-v4-pro', normalizePricing({}))
  assert.equal(pro.source, 'builtin')
  assert.equal(pro.price.outputPerM, 27)
  // A user override still wins over the built-in.
  const user = resolvePrice('deepseek-official', 'deepseek-flash', normalizePricing({
    'deepseek-flash': { inputPerM: 1, outputPerM: 4, cacheReadPerM: 0.02, cacheWritePerM: 0 },
  }))
  assert.equal(user.source, 'user')
  assert.equal(user.price.outputPerM, 4)
})

test('messageCost prices the four disjoint buckets once each', () => {
  const price = BUILTIN_PRICES['deepseek-chat'] // 2 / 8 / 0.5 / 2
  const usage = { inputTokens: 1e6, outputTokens: 1e6, cacheReadTokens: 1e6, cacheWriteTokens: 1e6 }
  assert.equal(messageCost(usage, price), 2 + 8 + 0.5 + 2)
  // reasoningTokens are inside outputTokens — never added again.
  assert.equal(messageCost({ outputTokens: 1e6, reasoningTokens: 1e6 }, price), 8)
  assert.equal(messageCost(undefined, price), 0)
  assert.equal(messageCost({ inputTokens: -5 }, price), 0)
})

test('mergePricing: later tables win, fallback preserved', () => {
  const merged = mergePricing({ 'deepseek-chat': { inputPerM: 2, outputPerM: 8 } }, { 'deepseek-chat': { outputPerM: 99 } })
  assert.equal(merged['deepseek-chat'].outputPerM, 99)
  assert.equal(merged['deepseek-chat'].inputPerM, 0) // whole-entry replacement
  assert.ok(merged['*'])
})

test('PRICE_FIELDS are the four disjoint buckets', () => {
  assert.deepEqual([...PRICE_FIELDS], ['inputPerM', 'outputPerM', 'cacheReadPerM', 'cacheWritePerM'])
})