# Content API

Build a TypeScript/Hono service exposing the reusable content platform. Use validated versioned schemas from `packages/contracts`, persistence from `storage`, permission rules from `access`, and retrieval from `retrieval`. This service must remain usable without the portal or analyst workflows.

## Routes to implement

| Route | Contract |
| --- | --- |
| `GET /v1/sources` | Sources accessible to caller |
| `GET /v1/sources/status` | Freshness, collection health, backfill coverage |
| `GET /v1/documents` | Filtered metadata and summaries |
| `GET /v1/documents/{id}` | Details and accessible revisions |
| `GET /v1/documents/{id}/passages` | Stable passages and source references |
| `POST /v1/search` | Keyword, semantic, or hybrid retrieval with filters |
| `POST /v1/retrieval-jobs` | Explicitly user-authorized live retrieval request |
| `GET /v1/jobs/{id}` | Progress, state, errors, result references |

Apply authentication where applicable, workspace permissions, request IDs, list pagination, and documented errors. Search returns document/revision/passage IDs, original URL, publisher, dates, language, passage text, extraction completeness, retrieval scores, and access scope. Relevance scores are not factual confidence.

## Build and validation

Start with document/passage contracts and source-health/metadata reads, then keyword retrieval, then hybrid retrieval and durable live jobs. Keep internal connector/ingestion routes separately service-authenticated. Do not expose ingestion privileges through user endpoints.

Enforce permissions before returning evidence, including semantic matches, caches, and job results. Validate inaccessible revision/passage requests, cross-workspace queries, pagination, filters, unknown timestamps, failed processing, and live jobs without explicit authorization. Keep research-generation routes with their separate owner in the portal.
