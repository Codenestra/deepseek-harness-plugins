# DeepSeek Harness Usage Center

[中文安装与使用说明](INSTALL.zh.md) · [Download 1.1.0](https://github.com/Codenestra/deepseek-harness-plugins/releases/tag/dsh-usage-center-v1.1.0)

An independent DeepSeek Harness plugin for exact, provider-reported LLM usage. It uses public Cordis, LLM waterfall, Session Query, Connection Fetch, and Client Slots extension points and does not modify Harness source.

It reports uncached input, output, cache-read, cache-write, total, and provider-reported reasoning tokens; distinct cache-token and request-hit rates; calls, retries, reliable terminal states; exact live timing; field coverage; cold-session backfill; fork-prefix deduplication; and CSV/JSON export. Every chart exposes exact hover/focus details, local-time daily buckets, and separate filters for working directories, Harness sidebar groups (including Ungrouped), and archived sessions.

Since 1.1.0 the panel also carries:

- **Cost in CNY** priced from a configurable table (same built-ins as the runaway watchdog), with per-bucket detail in the charts, the table, and the exports.
- **Budget and forecast**: daily/monthly bars plus a month-end projection from the last seven days.
- **Chart interaction**: hover tooltips with share and day-over-day delta, keyboard stepping, legend toggling, drag-to-zoom with double-click reset, cumulative mode, an overlay of the previous equal-length window, and click-to-drill into a day or a model.
- **Motion**: line draw, area fade, bar growth, point scale, number count-up, and tooltip fade — all disabled under `prefers-reduced-motion`.
- **A server-paged detail table** (sort, search, column visibility, click a session id to filter by it, copy `call_key`) instead of a 500-row cut, plus PNG, Markdown, and shareable-link exports, range/refresh shortcuts, and a hidden data table behind every chart for screen readers.
- **Conditional polling**: the query route answers `304` on an unchanged payload, and polling pauses while the panel is hidden.

Calls with no usable provider-reported token data are skipped and never estimated. Valid partial usage is retained with absent fields left unknown; malformed or contradictory samples are skipped without affecting other calls.

Missing optional fields remain unknown. No character- or context-based estimation is performed. A final durable usage sample overrides the same attempt's stream sample, while every settled retry remains a separate call.

See [README.zh.md](./README.zh.md) for the complete metric contract, installation, storage, pricing/budget configuration, and API documentation.

```powershell
npm test
npm run check
npm pack
```
