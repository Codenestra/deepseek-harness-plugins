/**
 * Configuration defaults and fail-loud normalization for the Runaway Watchdog.
 *
 * This module is intentionally dependency-free so the node:test unit suite can
 * import it outside the Harness. The host half additionally mirrors these
 * defaults as a schemastery `Config` schema for load-time validation.
 *
 * @module @local/dsh-runaway-watchdog/lib/config
 */

import { BUILTIN_PRICES, normalizePricing } from './pricing.js'

/** Default configuration. Every field is optional in the row config. */
export const DEFAULTS = Object.freeze({
  /** 'monitor' = detect + audit + advise only; 'enforce' = also block/trip. */
  mode: 'enforce',
  /** Consecutive identical completed calls that trigger an advisory warning. */
  repeatWarnThreshold: 3,
  /** Consecutive identical completed calls that trigger a hard block. */
  repeatBlockThreshold: 5,
  /** Also block identical SUCCESS repeats (polling loops); default only errors. */
  blockSuccessRepeats: false,
  /** Max characters of canonical arguments quoted in reminders/audit. */
  argumentsPreviewChars: 300,
  /** Number of recent tool results in the error-rate window. */
  errorWindow: 12,
  /** Minimum samples before the error-rate rule may fire. */
  errorMinSamples: 6,
  /** Error fraction (0..1) that trips the error circuit. */
  errorRateThreshold: 0.8,
  /** Velocity window length in milliseconds. */
  velocityWindowMs: 60000,
  /** Tokens-per-minute that trips the token circuit (0 disables). */
  tokenVelocityLimit: 200000,
  /** Estimated spend-per-minute (in `currency`) that trips the spend circuit (0 disables). */
  spendVelocityLimit: 30,
  /** Display currency for spend figures ('CNY' or 'USD'). Prices are stored in CNY. */
  currency: 'CNY',
  /** CNY→USD display conversion rate (used only when currency is 'USD'). */
  usdToCny: 7.2,
  /** Categorized price overrides (model → per-million rates); merged over built-in references. */
  pricing: {},
  /** How long a tripped circuit stays open before auto-closing (ms). */
  circuitCooldownMs: 60000,
  /** Maximum subagent delegation depth before spawn calls are blocked. */
  maxDepth: 8,
  /** Maximum concurrent live children per parent before spawn calls block. */
  maxFanout: 16,
  /** Tool-name wildcard patterns to track; empty means every tool. */
  include: [],
  /** Tool-name wildcard patterns transparent to detection (wins over include). */
  exclude: [],
  /** Register the deterministic test-failure tool (for verification only). */
  enableTestTools: false,
  /** Maximum retained audit entries (oldest evicted). */
  auditRetention: 2000,
})

/** Fields that must be finite numbers, with their inclusive sane ranges. */
const NUMBER_FIELDS = Object.freeze({
  repeatWarnThreshold: [2, 1000],
  repeatBlockThreshold: [2, 10000],
  argumentsPreviewChars: [16, 100000],
  errorWindow: [2, 1000],
  errorMinSamples: [2, 1000],
  errorRateThreshold: [0, 1],
  velocityWindowMs: [1000, 3600000],
  tokenVelocityLimit: [0, 1e9],
  spendVelocityLimit: [0, 1e6],
  usdToCny: [0.01, 1000],
  circuitCooldownMs: [0, 3600000],
  maxDepth: [1, 256],
  maxFanout: [1, 4096],
  auditRetention: [10, 1000000],
})

const INTEGER_FIELDS = new Set([
  'repeatWarnThreshold', 'repeatBlockThreshold', 'argumentsPreviewChars',
  'errorWindow', 'errorMinSamples', 'velocityWindowMs', 'tokenVelocityLimit',
  'circuitCooldownMs', 'maxDepth', 'maxFanout', 'auditRetention',
])

/**
 * Normalize and validate a raw row config. Missing fields take defaults; wrong
 * types or out-of-range values throw at load (never a silent fallback).
 * @param {object|undefined|null} raw - the row config.
 * @returns {object} a frozen normalized config.
 * @throws {TypeError} on any invalid field.
 */
export function normalizeConfig(raw) {
  if (raw === undefined || raw === null) raw = {}
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new TypeError('runaway-watchdog: config must be an object')
  }
  const cfg = { ...DEFAULTS }

  if (raw.mode !== undefined) {
    if (raw.mode !== 'monitor' && raw.mode !== 'enforce') {
      throw new TypeError("runaway-watchdog: mode must be 'monitor' or 'enforce'")
    }
    cfg.mode = raw.mode
  }

  for (const [field, [min, max]] of Object.entries(NUMBER_FIELDS)) {
    if (raw[field] === undefined) continue
    const value = raw[field]
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError(`runaway-watchdog: ${field} must be a finite number`)
    }
    if (INTEGER_FIELDS.has(field) && !Number.isInteger(value)) {
      throw new TypeError(`runaway-watchdog: ${field} must be an integer`)
    }
    if (value < min || value > max) {
      throw new TypeError(`runaway-watchdog: ${field} must be within [${min}, ${max}]`)
    }
    cfg[field] = value
  }

  for (const field of ['blockSuccessRepeats', 'enableTestTools']) {
    if (raw[field] === undefined) continue
    if (typeof raw[field] !== 'boolean') {
      throw new TypeError(`runaway-watchdog: ${field} must be a boolean`)
    }
    cfg[field] = raw[field]
  }

  for (const field of ['include', 'exclude']) {
    if (raw[field] === undefined) continue
    if (!Array.isArray(raw[field]) || raw[field].some(p => typeof p !== 'string')) {
      throw new TypeError(`runaway-watchdog: ${field} must be an array of strings`)
    }
    cfg[field] = Object.freeze([...raw[field]])
  }

  if (raw.currency !== undefined) {
    if (raw.currency !== 'CNY' && raw.currency !== 'USD') {
      throw new TypeError("runaway-watchdog: currency must be 'CNY' or 'USD'")
    }
    cfg.currency = raw.currency
  }
  if (raw.pricing !== undefined) {
    cfg.pricing = normalizePricing(raw.pricing)
  }

  if (cfg.repeatBlockThreshold < cfg.repeatWarnThreshold) {
    throw new TypeError('runaway-watchdog: repeatBlockThreshold must be >= repeatWarnThreshold')
  }
  if (cfg.errorMinSamples > cfg.errorWindow) {
    throw new TypeError('runaway-watchdog: errorMinSamples must be <= errorWindow')
  }

  cfg.include = Object.freeze([...cfg.include])
  cfg.exclude = Object.freeze([...cfg.exclude])
  return Object.freeze(cfg)
}