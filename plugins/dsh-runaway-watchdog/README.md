# Runaway Watchdog · Spend Circuit Breaker

A Harness-level safety plugin for DeepSeek Harness that **detects runaway agent
behavior and deterministically stops it** — before it burns your token budget.

Unlike advisory "you seem to be looping" reminders, the watchdog **enforces**:
a synchronous tool guard blocks the offending call, and a spend/error circuit
breaker pauses tool execution until the situation is resolved.

## What it detects

| Rule | Signal | Action |
| --- | --- | --- |
| `repeat` | N consecutive identical tool calls (name + canonical arguments) | advisory → hard block |
| `error-rate` | error fraction over the recent tool-result window | open circuit |
| `token-velocity` | newly-generated **output** tokens / minute over a sliding window (excludes context re-send input/cache, avoiding long-conversation false positives) | open circuit |
| `spend-velocity` | categorized CNY / minute (per-model input/output/cache-read/cache-write rates) | open circuit |
| `depth` | subagent delegation depth ≥ `maxDepth` | block spawn |
| `fanout` | live children per parent ≥ `maxFanout` | block spawn |

Detection is a **pure incremental fold** of committed session events
(`tool/call`, `tool/result`, `assistant/message`, `user/message`), driven by the
global `session/event` feed and maintained per live session. The fold core is a
pure function (unit-tested in isolation); no new session event type is ever
appended and no deprecated synchronous session-log reader is used. Delegation
depth is read from the durable `SessionHeader.delegationDepth`.

## Categorized per-model pricing (CNY)

Spend is not a blended "one price × total tokens" guess; it is computed **per model
and per usage bucket**:

- **Model identity** comes from each `assistant/message` event's
  `message.source.{provider, model}` — the exact route that produced the message —
  so the watchdog knows which provider/model every call used, no matter how many
  you have configured.
- **Disjoint usage buckets**: model-reported `usage` carries `inputTokens`
  (cache-miss input), `outputTokens` (output, already includes reasoning),
  `cacheReadTokens` (cache hit), `cacheWriteTokens` (cache write). Each is priced
  once at its own rate; nothing is double-counted.
- **Price matching** priority: `model id → provider/model → wildcard (deepseek-*) → *`.
  Source tiers: `user` (your panel overrides) > `builtin` (DeepSeek reference rates)
  > `fallback` (`*`).
- **Real-time effect**: the fold stores only **raw buckets + model name**; cost is
  derived on read against the **current** price table. Saving a price in the panel
  writes `prices.json` and updates memory, so the very next status/fold uses the new
  rate — **no restart**.
- **Currency**: CNY (¥ per million tokens) by default; set `currency: USD` to display
  via the `usdToCny` rate.

> Built-ins (CNY per million tokens, `input / cache-read / cache-write / output`):
> **deepseek-flash 2 / 0.04 / 0 / 8** and **deepseek-v4-pro 9 / 0.30 / 0 / 27** are
> the published **peak-hour** rates (off-peak is half; DeepSeek does not bill cache
> writes separately). Peak is the deliberate default for a spend guard —
> over-reporting trips early, under-reporting would let spend run past the circuit.
> `deepseek-chat` / `deepseek-reasoner` stay as legacy references and `*` is a
> generic fallback. Prices change: verify the official page and override in the
> panel (a per-model row always beats a built-in). Spend and "estimated saved" are
> **estimates** (usage × rate); enforcement decisions rely only on exact counts,
> never on estimates.

The dashboard adds a **Model pricing** panel (detected-model chips with source
badges, an editable per-model rate table, add/delete, and a Save button that applies
live), a top **Est. saved (¥)** card beside Est. tokens prevented, per-session
**Model** / **Total cost** columns, and ¥ amounts in the audit ledger.

## How enforcement works

- **Synchronous tool guard** (`ctx.tools.guard`) reads the folded state and denies
  the N+1th identical failing call, blocks spawns over budget, and blocks every
  tool while a circuit is open. The guard never blocks the watchdog's own tools,
  so you can always inspect status and reset.
- **Global listener** ranks breaches, trips circuits (with a cooldown), and writes
  a durable audit entry per episode (deduplicated **per rule and severity**, so two
  co-firing rules cannot re-audit each other).
- **Advisory context** is attached at the warn threshold and again at the block
  threshold — never on every call, so a loop does not inflate its own context.
- **A denial is not a tool error.** The guard records the call ids it denied; the
  fold keeps those results out of the error-rate window entirely (no observed tool
  outcome). Without this a single identical-call loop would inflate the error rate
  and escalate itself into a full circuit, making the dashboard's 100% error rate a
  measurement of the watchdog rather than of the tools.
- A **repeat block clears only on a different call or a human interjection** —
  resetting does not un-block an ongoing identical loop (that would defeat the
  purpose). `watchdog_reset` closes a tripped spend/error circuit.

### Monitor mode semantics

`mode: 'monitor'` detects and records, and never blocks:

| What the fold finds | `enforce` | `monitor` |
| --- | --- | --- |
| repeat / error spike over the block threshold | guard denies; audit `blocked` | audit `advised` (severity stays `block`) |
| a velocity / error-rate circuit condition | circuit opens (cooldown), audit `circuit-opened` | **no circuit is armed**; audit `would-trip` |
| advisory crossing | injected at warn + block | same |

A circuit is never *armed* in monitor mode: a dashboard showing "circuit OPEN" in a
mode that cannot block would be a lie, so the observation is recorded as
`would-trip` and `would-trip` is not counted as an intervention.

## Architecture

```
lib/detection.js   pure fold + breach ranking + guard decision + categorized cost (no deps)
lib/pricing.js     pure pricing: table matching + source resolution + four-bucket cost (no deps)
lib/config.js      defaults + fail-loud normalization (no deps)
lib/ledger.js      durable audit ledger over a table interface (no deps)
lib/file-domain.js atomic JSON-file table backing the ledger (Node builtins)
lib/tree.js        pure depth / fan-out decisions (no deps)
lib/tool-schema.js minimal JSON-Schema compiler to register tools (no deps)
index.js           incremental detector + guard + listener + 5 tools + routes + service
client.js          dashboard (sidebar entry + main page), theme tokens only
```

**Zero external package imports** — only Node builtins and the plugin's own pure
lib modules. This deliberately avoids the bare-package resolution limits of a
profile-local plain-JS bundle (`zod` / `schemastery` / `dsh-tools` are not
reliably resolvable there). Host services used: `tools`, `connection`,
`profileContext`, and optionally `agents`. Global data reaches the dashboard via
authenticated `connection.fetch` routes (`/api/runaway-watchdog/*`).

## Tools

- `watchdog_status` — live counters, circuit state, and aggregate stats.
- `watchdog_audit` — read the audit ledger (filter by session / rule).
- `watchdog_reset` — close a tripped circuit for the calling session.
- `watchdog_selftest` — run the in-process scientific self-test (see below).
- `watchdog_test_fail` — *(only when `enableTestTools: true`)* a deterministic
  failing tool used to drive a real loop and prove the block fires.

## Configuration

Every field is optional; see `lib/config.js` `DEFAULTS`. Key options:

- `mode`: `enforce` (default) or `monitor` (detect + audit + advise, no blocking).
- `repeatWarnThreshold` (3), `repeatBlockThreshold` (5), `blockSuccessRepeats` (false).
- `errorWindow` (12), `errorMinSamples` (6), `errorRateThreshold` (0.8).
- `velocityWindowMs` (60000), `tokenVelocityLimit` (200000), `spendVelocityLimit` (30,
  in `currency`/min), `circuitCooldownMs` (60000).
- `currency` (`CNY`), `usdToCny` (7.2), `pricing` (per-model rate overrides merged over
  built-ins; also editable live in the dashboard, persisted to `prices.json`).
- `maxDepth` (8), `maxFanout` (16).
- `include` / `exclude` tool-name wildcards; `enableTestTools` (false); `auditRetention` (2000).

Invalid config throws at load (never a silent fallback).

## Scientific verification

Five independent layers, all reproducible (see `TEST_REPORT.md` and `AUDIT.md`):

1. **Unit + integration tests** (`node --test tests/*.test.mjs`, **148 cases, all
   passing**): table-driven coverage of every rule, threshold boundary, window
   edge, chain reset, retention eviction, durable rebuild, config validation, the
   input/cache-tokens-do-not-inflate-velocity regression, **self-denials do not
   count as tool errors**, **monitor-mode auditing + would-trip**, **prices-route
   rejection without data loss**, **bounded advisory injection**, **session-log
   repair that preserves the event envelope**, and **client render / locale smoke
   tests**; plus integration tests that drive the *real* `apply()` against a
   faithful mock context.
2. **In-process self-test** (`watchdog_selftest` tool or `GET /api/runaway-watchdog/selftest`):
   exercises the *real* detector, guard registration, detection core, categorized
   pricing (model identity + four-bucket cost + live override), and a durable audit
   write/read round-trip against the live services; returns a pass/fail report
   (live: 11/11).
3. **Real-host end-to-end regression** (`node tests/e2e/real-host.e2e.mjs`,
   **28 assertions, all passing**): boots the *production* DSH spine — real cordis,
   the real `mountAgentLoopTestDependencies` services, the production `AgentLoop`,
   the real `ToolRuntime` guard layer, real committed session events — with a
   scripted model (no network). Proves blocking, folding, auditing, circuits,
   metering, depth budget, route behaviour and the self-test *in the real runtime*,
   not against a mock event bus.
4. **End-to-end behavioral test**: with `enableTestTools: true`, call
   `watchdog_test_fail` repeatedly with identical arguments. The first
   `repeatBlockThreshold` calls fail normally; the next call is **blocked by the
   guard** with a "Runaway Watchdog blocked repeated call" reason, and a `blocked`
   audit entry appears in the dashboard.
5. **Live host end-to-end + user on-site review**: every feature confirmed inside
   the real desktop host (see `TEST_REPORT.md` §8 expected↔actual table).

## Troubleshooting

**Symptom**: every turn fails with
`Failed to deserialize the JSON body into the target type: messages[n]: missing field 'role'`
and `INVALID_REQUEST`, retrying never helps.

**Cause (1.1.0 and earlier)**: the repeat advisory was handed to the host as
`{source, content}`; the host appends that verbatim as a `user/message` event and
replays it straight into the provider request, where the absent `role` key makes
the whole body invalid. 1.1.1 fixes the producer (`id` + `role: 'user'`) — restart
the host to load it. Sessions that were already poisoned are repaired with:

```pwsh
node tools/repair-role-less-context.mjs           # report only
node tools/repair-role-less-context.mjs --apply   # rewrite (backup, only affected frames)
```

## Known boundaries

- **The fold is in-memory.** `states`/`live` are rebuilt from `session/event` as
  events commit; a host restart mid-loop starts a fresh chain. Persisted session
  history feeds the fold only through the events that replay through that feed —
  the watchdog deliberately does not append events or read the session log directly.
- **Per-session tracking is bounded** (256 sessions) and idle sessions are evicted
  oldest-first; the live roster is never evicted. `GET /status` reports
  `tracked: {sessions, live, cap}`.
- **Fan-out counts in-process children only** (`agents.list()`), so subagents
  driven by ACP / remote / CLI subprocess drivers are invisible to the `fanout`
  budget. `depth` is unaffected — it reads the durable `SessionHeader.delegationDepth`.
- **Panel copy follows the host locale service** (`ctx.locale` snapshot), like
  shipping panels. `locale/*.json` are package-catalog metadata (title/description),
  not UI strings.

## Deployment

- After install, **restart the host once** to load the code (HMR ignores
  `node_modules`); **refresh the GUI window once** (Ctrl+R / F5) to load the client
  panel.
- All host registrations are wrapped in `ctx.effect`, `apply()` is synchronous, and
  the guard returns `string` (deny) / `undefined` (allow) — the key to registrations
  landing in the global layer (see `TEST_REPORT.md` §4, §7).

## Safety notes

- The watchdog only ever *denies* tool calls; it never executes anything itself.
- Audit data is plugin-owned, stored in its own atomic JSON document
  (`<profile>/runaway-watchdog/audit.json`), and disposable (a corrupt file is
  rebuilt fresh, never bricking the plugin).
- `watchdog_test_fail` is a harmless diagnostic; set `enableTestTools: false` to
  hide it from the model in production.