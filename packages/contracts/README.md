# Contracts

Build schema-validated TypeScript contracts before handlers and consumers. Choose the schema library with the toolchain; no library is pinned yet.

Define versioned content routes from [content API](../../apps/content-api/README.md), separate research control routes from [portal](../../apps/portal/README.md), and the [data records](../../docs/data.md). Include pagination, request IDs, errors, workspace/access scope, asynchronous job references, stage states, and correction relationships.

Preserve unknown timestamp values and known precision/timezone. Distinguish revision IDs from document IDs, full text from excerpt/metadata-only, retrieval relevance from confidence, reported values from forecasts, and evidence snapshots from mutable current state.

Search contracts must expose provenance and extraction completeness. Model output schemas include attributed claims and quotation passage references. Validate incoming requests and all model outputs independently of provider assertions. Add contract compatibility and invalid-payload checks as concrete endpoints are implemented.

## Implemented

zod 4 schemas in `src/`: `TimeValue` (explicit precision, zone basis, UTC only when resolvable) and `DocumentTimes`; `SourceDefinition` with `AccessPolicy` and `RateLimit`; `DiscoveredItem`, `ExtractedDocument` (standfirst vs text, completeness, translation groups, alternate titles, attachments), and immutable `DocumentRevision`; `SeriesDescriptor` and `Observation` (reference period, unit, adjustment, reported vs forecast, retrieval vintage); `CollectionRunReport` and `ObservationRunReport` with `Problem` kinds that separate bot-protection blocks, missing credentials, and ordinary failures. API routes, pagination, and workspace scope are not defined yet.
