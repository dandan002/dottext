# Contracts

Build schema-validated TypeScript contracts before handlers and consumers. Choose the schema library with the toolchain; no library is pinned yet.

Define versioned content routes from [content API](../../apps/content-api/README.md), separate research control routes from [portal](../../apps/portal/README.md), and the [data records](../../docs/data.md). Include pagination, request IDs, errors, workspace/access scope, asynchronous job references, stage states, and correction relationships.

Preserve unknown timestamp values and known precision/timezone. Distinguish revision IDs from document IDs, full text from excerpt/metadata-only, retrieval relevance from confidence, reported values from forecasts, and evidence snapshots from mutable current state.

Search contracts must expose provenance and extraction completeness. Model output schemas include attributed claims and quotation passage references. Validate incoming requests and all model outputs independently of provider assertions. Add contract compatibility and invalid-payload checks as concrete endpoints are implemented.
