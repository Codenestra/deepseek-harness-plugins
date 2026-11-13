import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { constants, zstdCompressSync, zstdDecompressSync } from 'node:zlib'
import {
  repairArtifact, repairRecord, verifyRepaired,
} from '../tools/repair-role-less-context.mjs'

const CHECKSUM = { params: { [constants.ZSTD_c_checksumFlag]: 1 } }
const frame = text => zstdCompressSync(Buffer.from(text, 'utf8'), CHECKSUM)
/** The first frame holds exactly the header record; `before` lists every record, header included. */
const HEADER = '{"type":"session","version":4,"id":"test-session","createdAt":1}'

/** Write one session artifact: header frame, then one frame holding the given records. */
function writeLog(dir, records) {
  const path = join(dir, 'session.v4.jsonl.zstd')
  writeFileSync(path, Buffer.concat([frame(`${HEADER}\n`), frame(records.map(r => `${r}\n`).join(''))]))
  return path
}

/** Read every JSONL record back out of a concatenated-frame artifact, header first. */
function readRecords(path) {
  return zstdDecompressSync(readFileSync(path)).toString('utf8').split('\n').filter(line => line.trim() !== '')
}

const assistant = seq => JSON.stringify({
  type: 'assistant/message', seq, time: 2, data: { message: { id: `a-${seq}`, role: 'assistant', source: { kind: 'model', provider: 'p', model: 'm' }, content: [{ type: 'text', text: 'ok' }] } },
})
const user = seq => JSON.stringify({
  type: 'user/message', seq, time: 3, data: { id: `u-${seq}`, role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: 'hi' }] },
})
/** The shape a producer that omits identity and role emits. */
const roleless = seq => JSON.stringify({
  type: 'user/message', seq, time: 4, data: { source: { kind: 'runaway-watchdog', form: 'notice', summary: 'Watchdog: 3× repeated read' }, content: [{ type: 'text', text: 'advisory' }] },
})

/** Build a whole artifact buffer from record lines. */
const artifact = records => Buffer.concat([frame(`${HEADER}\n`), frame(records.map(r => `${r}\n`).join(''))])

function withTempDir(run) {
  const dir = mkdtempSync(join(tmpdir(), 'watchdog-repair-'))
  try {
    return run(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe('repairRecord', () => {
  test('rewrites the payload but keeps the event envelope', () => {
    const line = roleless(2131)
    const repaired = JSON.parse(repairRecord(line, 'seed').text)
    const original = JSON.parse(line)
    assert.equal(repaired.type, 'user/message', 'the event type must survive: losing it corrupts the log row')
    assert.equal(repaired.seq, original.seq)
    assert.equal(repaired.time, original.time)
    assert.equal(repaired.data.role, 'user')
    assert.match(repaired.data.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    assert.deepEqual(repaired.data.source, original.data.source)
    assert.deepEqual(repaired.data.content, original.data.content)
  })

  test('is deterministic, so a repeated repair is byte-identical', () => {
    assert.equal(repairRecord(roleless(7), 'seed').text, repairRecord(roleless(7), 'seed').text)
  })

  test('leaves canonical messages alone', () => {
    assert.equal(repairRecord(user(3), 'seed'), null)
    assert.equal(repairRecord(assistant(4), 'seed'), null)
  })

  test('reports an explicit foreign role instead of guessing', () => {
    const line = JSON.stringify({ type: 'user/message', seq: 5, time: 5, data: { id: 'x', role: 'system', source: { kind: 'p' }, content: [] } })
    assert.deepEqual(repairRecord(line, 'seed'), { unsupported: 'role "system"' })
  })
})

describe('repairArtifact', () => {
  test('repairs one injected context and leaves every other row byte-identical', () => withTempDir((dir) => {
    const before = [HEADER, assistant(1), roleless(2), user(3), assistant(4)]
    const path = writeLog(dir, before.slice(1))
    const result = repairArtifact(path, { apply: true, force: true, quiet: true })

    assert.equal(result.applied, true)
    assert.deepEqual(result.verified, { records: before.length, edited: 1 })
    const after = readRecords(path)
    assert.equal(after.length, before.length, 'record count must not change')
    for (const index of [0, 1, 3, 4]) assert.equal(after[index], before[index], `row ${index} must stay byte-identical`)
    const repaired = JSON.parse(after[2])
    assert.equal(repaired.type, 'user/message')
    assert.equal(repaired.seq, 2)
    assert.equal(repaired.data.role, 'user')
    assert.equal(typeof repaired.data.id, 'string')
  }))

  test('writes a backup holding the original bytes before replacing the log', () => withTempDir((dir) => {
    const path = writeLog(dir, [roleless(1), user(2)])
    const before = readFileSync(path)
    repairArtifact(path, { apply: true, force: true, quiet: true })
    const backups = readdirSync(dir).filter(name => name.startsWith('session.v4.jsonl.zstd.bak-'))
    assert.equal(backups.length, 1, 'exactly one timestamped backup must be written')
    assert.deepEqual(readFileSync(join(dir, backups[0])), before, 'the backup must be byte-identical to the original')
    assert.notDeepEqual(readFileSync(path), before, 'the repaired log must differ from the original')
  }))

  test('a clean log is reported clean and never rewritten', () => withTempDir((dir) => {
    const path = writeLog(dir, [assistant(1), user(2)])
    const before = readFileSync(path)
    const result = repairArtifact(path, { apply: true, force: true, quiet: true })
    assert.equal(result.needsRepair, false)
    assert.equal(result.applied, false)
    assert.deepEqual(readFileSync(path), before)
    assert.deepEqual(readdirSync(dir), ['session.v4.jsonl.zstd'], 'no backup is written for a clean log')
  }))
})

describe('verifyRepaired', () => {
  test('rejects a rebuild that overwrote the event envelope', () => {
    // The exact regression this tool shipped once: the message replaced the event.
    const before = [HEADER, user(1), roleless(2)]
    const broken = artifact([before[1], JSON.stringify(JSON.parse(before[2]).data)])
    assert.throws(() => verifyRepaired(broken, true, before), /lost its event type/)
  })

  test('rejects a rebuild that drops or adds a record', () => {
    const before = [HEADER, user(1), roleless(2)]
    assert.throws(() => verifyRepaired(artifact([before[1]]), true, before), /record count changed/)
  })

  test('rejects a rebuild that changes a row identity', () => {
    const before = [HEADER, roleless(2)]
    const forged = JSON.stringify({ ...JSON.parse(before[1]), seq: 99, data: { ...JSON.parse(before[1]).data, id: 'x', role: 'user' } })
    assert.throws(() => verifyRepaired(artifact([forged]), true, before), /changed identity/)
  })

  test('accepts a correctly repaired rebuild', () => {
    const before = [HEADER, user(1), roleless(2)]
    const repaired = repairRecord(before[2], 'seed').text
    assert.deepEqual(verifyRepaired(artifact([before[1], repaired]), true, before), { records: 3, edited: 1 })
  })
})
