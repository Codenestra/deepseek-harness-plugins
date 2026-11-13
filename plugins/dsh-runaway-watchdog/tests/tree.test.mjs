import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { depthOf, liveFanout, spawnDecision } from '../lib/tree.js'
import { normalizeConfig } from '../lib/config.js'

describe('depthOf', () => {
  const cases = [
    [undefined, 0],
    [{}, 0],
    [{ delegationDepth: 0 }, 0],
    [{ delegationDepth: 5 }, 5],
    [{ delegationDepth: -3 }, 0],
    [{ delegationDepth: 'x' }, 0],
    [{ delegationDepth: 2.9 }, 2],
  ]
  for (const [header, expected] of cases) {
    test(`depthOf(${JSON.stringify(header)}) = ${expected}`, () => assert.equal(depthOf(header), expected))
  }
})

describe('liveFanout', () => {
  const agent = (parent) => ({ session: { header: { parentSession: parent } } })
  test('counts only live children of the parent', () => {
    const roster = [agent('p1'), agent('p1'), agent('p2'), agent(undefined), {}]
    assert.equal(liveFanout(roster, 'p1'), 2)
    assert.equal(liveFanout(roster, 'p2'), 1)
    assert.equal(liveFanout(roster, 'p3'), 0)
  })
  test('empty roster is zero', () => assert.equal(liveFanout([], 'p1'), 0))
})

describe('spawnDecision', () => {
  const cfg = normalizeConfig({ maxDepth: 3, maxFanout: 2 })
  test('blocks at depth limit', () => {
    assert.equal(spawnDecision({ depth: 3, fanout: 0, isSpawn: true }, cfg).rule, 'depth')
    assert.equal(spawnDecision({ depth: 4, fanout: 0, isSpawn: true }, cfg).rule, 'depth')
  })
  test('blocks at fanout limit', () => {
    assert.equal(spawnDecision({ depth: 0, fanout: 2, isSpawn: true }, cfg).rule, 'fanout')
  })
  test('allows within budget', () => {
    assert.equal(spawnDecision({ depth: 2, fanout: 1, isSpawn: true }, cfg), null)
  })
  test('ignores non-spawn calls even over budget', () => {
    assert.equal(spawnDecision({ depth: 9, fanout: 9, isSpawn: false }, cfg), null)
  })
  test('depth takes precedence over fanout', () => {
    assert.equal(spawnDecision({ depth: 3, fanout: 2, isSpawn: true }, cfg).rule, 'depth')
  })
})