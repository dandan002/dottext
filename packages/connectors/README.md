# Connectors

Own publisher-specific discovery, fetch, article/attachment extraction, timestamp parsing, and source capability reporting. Implement a shared connector interface using contracts, with adapters selected by the [source registry](../../config/sources/README.md).

Before activation validate discovery method, extraction, timestamps, historical coverage, permitted access/retention, duplicate patterns, and failure behavior. RSS discovery does not prove full article availability. Respect access terms; do not bypass paywalls or restrictions.

Preserve original text. Remove navigation, related-story widgets, advertising, and publisher-generated summaries when the underlying article is available. Report full text, excerpt, or metadata-only honestly. Keep all time fields distinct; unknown publication time remains unknown.

Begin with official and journalistic samples for both countries. Capture permitted fixtures covering attachments, stale discoveries, missing times, revised content, duplicates, and failures. Do not activate the candidate roster merely because it appears in the specification.

## Implemented (central banks)

| Module | Purpose |
| --- | --- |
| `src/connector.ts` | `DocumentConnector` interface: `discover(window)` → items + coverage + problems; `fetch(item)` → `ExtractedDocument` |
| `src/http/` | `PoliteHttpClient`: per-host spacing, per-run request budget, retries for transient errors only, size limits, credential redaction, bot-challenge detection with a per-host circuit breaker |
| `src/time.ts` | Precision-preserving `TimeValue`s; publisher-zone wall time → UTC (DST gaps return null) |
| `src/bilingual.ts`, `src/search.ts` | Spanish + English query planning, merging, and per-language coverage; `SearchProvider` interface (no provider chosen) |
| `src/classify.ts` | Bilingual central-bank document typing (decision, minutes, reports, speeches, papers, …) |
| `src/banrep/web.ts` | Banco de la República listings (es + en) and Drupal articles; translation groups from node IDs and `hreflang` |
| `src/oai/` | Generic DSpace OAI-PMH (`oai_dc` + ORE files) for Banco de la República and Banco Central de Chile repositories |
| `src/bcch/bde.ts` | Banco Central de Chile BDE statistics API (token-gated) with bilingual catalog search |
| `src/banrep/sdmx.ts` | Banco de la República SDMX 2.1 statistics API (open) with bilingual dataflow search |
| `src/registry.ts` | Loads and validates `config/sources/*.json`; builds connectors and per-run HTTP clients |

Source status and evidence: [`config/sources/records/`](../../config/sources/records/). Tests: `npm test`; fixtures in `test/fixtures/` are synthetic text in real page structure (see its README).
