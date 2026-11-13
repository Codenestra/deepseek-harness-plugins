import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { createLedger, makeId } from '../lib/ledger.js'

function fakeDomain(initial = []) {
  const map = new Map(initial)
  const table = {
    get: k => map.get(k),
    put: async (k, v) => { map.set(k, v) },
    delete: async k => { map.delete(k) },
    entries: () => [...map.entries()],
    keys: () => [...map.keys()],
  }
  return { table: () => table, close: () => {}, _map: map }
}

const entry = (over = {}) => ({ time: Date.now(), sessionId: 's1', rule: 'repeat', severity: 'warn', action: 'advised', detail: {}, tokensAtBreach: 0, estimatedTokensPrevented: 0, ...over })

describe('makeId', () => {
  test('ids are unique and time-sortable', () => {
    const a = makeId(1000)
    const b = makeId(1000)
    const c = makeId(2000)
    assert.notEqual(a, b)
    assert.ok(a < c)
  })
})

describe('ledger: record / query', () => {
  test('record assigns id and is queryable', async () => {
    const ledger = createLedger(fakeDomain(), 100)
    const e = await ledger.record(entry())
    assert.ok(e.id)
    assert.equal(ledger.size, 1)
    const found = ledger.query({})
    assert.equal(found.length, 1)
    assert.equal(found[0].id, e.id)
  })
  test('query is newest-first', async () => {
    const ledger = createLedger(fakeDomain(), 100)
    await ledger.record(entry({ time: 1000, rule: 'repeat' }))
    await ledger.record(entry({ time: 2000, rule: 'error-rate' }))
    await ledger.record(entry({ time: 3000, rule: 'depth' }))
    const q = ledger.query({})
    assert.deepEqual(q.map(e => e.time), [3000, 2000, 1000])
  })
  test('query filters by session and rule', async () => {
    const ledger = createLedger(fakeDomain(), 100)
    await ledger.record(entry({ sessionId: 'a', rule: 'repeat' }))
    await ledger.record(entry({ sessionId: 'b', rule: 'repeat' }))
    await ledger.record(entry({ sessionId: 'a', rule: 'depth' }))
    assert.equal(ledger.query({ session: 'a' }).length, 2)
    assert.equal(ledger.query({ rule: 'repeat' }).length, 2)
    assert.equal(ledger.query({ session: 'a', rule: 'depth' }).length, 1)
  })
  test('query respects limit', async () => {
    const ledger = createLedger(fakeDomain(), 100)
    for (let i = 0; i < 10; i += 1) await ledger.record(entry({ time: i }))
    assert.equal(ledger.query({ limit: 3 }).length, 3)
  })
})

describe('ledger: retention eviction', () => {
  test('oldest entries evicted beyond retention', async () => {
    const domain = fakeDomain()
    const ledger = createLedger(domain, 3)
    for (let i = 1; i <= 5; i += 1) await ledger.record(entry({ time: i * 1000 }))
    assert.equal(ledger.size, 3)
    const times = ledger.query({}).map(e => e.time)
    assert.deepEqual(times, [5000, 4000, 3000])
    assert.equal(domain._map.size, 3)
  })
})

describe('ledger: stats', () => {
  test('aggregates counts, blocks, circuits, prevented tokens', async () => {
    const ledger = createLedger(fakeDomain(), 100)
    await ledger.record(entry({ action: 'advised', rule: 'repeat', severity: 'warn' }))
    await ledger.record(entry({ action: 'blocked', rule: 'repeat', severity: 'block', estimatedTokensPrevented: 500 }))
    await ledger.record(entry({ action: 'circuit-opened', rule: 'token-velocity', severity: 'circuit', estimatedTokensPrevented: 1000, sessionId: 's2' }))
    await ledger.record(entry({ action: 'spawn-blocked', rule: 'depth', severity: 'block' }))
    await ledger.record(entry({ action: 'reset', rule: 'manual', severity: 'warn' }))
    const s = ledger.stats()
    assert.equal(s.total, 5)
    assert.equal(s.blocks, 2)
    assert.equal(s.circuits, 1)
    assert.equal(s.interventions, 3)
    assert.equal(s.estimatedTokensPrevented, 1500)
    assert.equal(s.distinctSessions, 2)
    assert.equal(s.byRule.repeat, 2)
    assert.equal(s.byAction.blocked, 1)
  })
})

describe('ledger: monitor-mode observations', () => {
  test('would-trip entries are recorded but never counted as interventions', async () => {
    const ledger = createLedger(fakeDomain(), 100)
    await ledger.record(entry({ action: 'would-trip', rule: 'error-rate', severity: 'circuit' }))
    await ledger.record(entry({ action: 'blocked', rule: 'repeat', severity: 'block' }))
    const s = ledger.stats()
    assert.equal(s.total, 2)
    assert.equal(s.interventions, 1, 'a would-trip is an observation, not an intervention')
    assert.equal(s.circuits, 0, 'monitor mode must report no circuits')
    assert.equal(s.byAction['would-trip'], 1)
  })

  test('one circuit episode counts once, not again when its cooldown closes it', async () => {
    const ledger = createLedger(fakeDomain(), 100)
    await ledger.record(entry({ action: 'circuit-opened', rule: 'token-velocity', severity: 'circuit' }))
    await ledger.record(entry({ action: 'circuit-closed', rule: 'token-velocity', severity: 'circuit' }))
    await ledger.record(entry({ action: 'reset', rule: 'manual', severity: 'warn' }))
    const s = ledger.stats()
    assert.equal(s.total, 3)
    assert.equal(s.interventions, 1, 'opening is the intervention; closing and reset are bookkeeping')
    assert.equal(s.circuits, 1)
  })
})

describe('ledger: selftest bookkeeping', () => {
  test('the synthetic selftest owner does not inflate distinctSessions', async () => {
    const ledger = createLedger(fakeDomain(), 100)
    await ledger.record(entry({ sessionId: 'real-session', action: 'blocked', rule: 'repeat', severity: 'block' }))
    await ledger.record(entry({ sessionId: 'selftest', action: 'advised', rule: 'repeat', severity: 'warn' }))
    const s = ledger.stats()
    assert.equal(s.total, 2)
    assert.equal(s.distinctSessions, 1, 'selftest is a probe, not a conversation')
  })
})
describe('ledger: durable rebuild', () => {
  test('rebuilds chronological index from pre-existing records', async () => {
    const pre = [
      ['id-b', entry({ time: 2000, rule: 'error-rate' })],
      ['id-a', entry({ time: 1000, rule: 'repeat' })],
      ['id-c', entry({ time: 3000, rule: 'depth' })],
    ]
    const ledger = createLedger(fakeDomain(pre), 100)
    assert.equal(ledger.size, 3)
    assert.deepEqual(ledger.query({}).map(e => e.time), [3000, 2000, 1000])
    const s = ledger.stats()
    assert.equal(s.total, 3)
  })
})