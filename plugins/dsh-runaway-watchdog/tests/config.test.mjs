import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULTS, normalizeConfig } from '../lib/config.js'

describe('normalizeConfig: defaults', () => {
  test('empty config takes all defaults', () => {
    const c = normalizeConfig({})
    for (const key of Object.keys(DEFAULTS)) assert.deepEqual(c[key], DEFAULTS[key], key)
  })
  test('undefined and null take defaults', () => {
    assert.deepEqual(normalizeConfig(undefined), normalizeConfig({}))
    assert.deepEqual(normalizeConfig(null), normalizeConfig({}))
  })
  test('result is frozen', () => {
    assert.ok(Object.isFrozen(normalizeConfig({})))
  })
  test('valid overrides apply', () => {
    const c = normalizeConfig({ mode: 'monitor', repeatBlockThreshold: 9, include: ['bash'], blockSuccessRepeats: true })
    assert.equal(c.mode, 'monitor')
    assert.equal(c.repeatBlockThreshold, 9)
    assert.deepEqual(c.include, ['bash'])
    assert.equal(c.blockSuccessRepeats, true)
  })
})

describe('normalizeConfig: fail-loud validation', () => {
  const bad = [
    [{ mode: 'bogus' }, /mode/],
    [{ mode: 1 }, /mode/],
    [{ repeatWarnThreshold: 'x' }, /repeatWarnThreshold/],
    [{ repeatWarnThreshold: 1 }, /repeatWarnThreshold/],
    [{ repeatWarnThreshold: 2.5 }, /integer/],
    [{ errorRateThreshold: 1.5 }, /errorRateThreshold/],
    [{ errorRateThreshold: -0.1 }, /errorRateThreshold/],
    [{ velocityWindowMs: 10 }, /velocityWindowMs/],
    [{ maxDepth: 0 }, /maxDepth/],
    [{ blockSuccessRepeats: 'yes' }, /blockSuccessRepeats/],
    [{ include: 'bash' }, /include/],
    [{ include: [1] }, /include/],
    [{ exclude: [null] }, /exclude/],
    [{ repeatWarnThreshold: 5, repeatBlockThreshold: 3 }, /repeatBlockThreshold/],
    [{ errorWindow: 5, errorMinSamples: 6 }, /errorMinSamples/],
    ['not-an-object', /object/],
    [[], /object/],
  ]
  for (const [input, re] of bad) {
    test(`rejects ${JSON.stringify(input)}`, () => assert.throws(() => normalizeConfig(input), re))
  }
  test('accepts boundary values', () => {
    assert.doesNotThrow(() => normalizeConfig({ errorRateThreshold: 0 }))
    assert.doesNotThrow(() => normalizeConfig({ errorRateThreshold: 1 }))
    assert.doesNotThrow(() => normalizeConfig({ tokenVelocityLimit: 0 }))
    assert.doesNotThrow(() => normalizeConfig({ repeatWarnThreshold: 2, repeatBlockThreshold: 2 }))
  })
})