# Ingestion

Own stage orchestration independent of queue/hosting frameworks:

1. Discover source candidates.
2. Fetch permitted content and attachments.
3. Extract source text and timestamps.
4. Detect revisions and exact duplicates.
5. Classify and produce structured English summaries/entities/topics/attributed claims.
6. Create stable passages.
7. Embed eligible new/revised passages.
8. Index for retrieval.

Use ordinary code for discovery, extraction, dates, hashes, and storage. Call `models` directly with validated structured outputs for derived content. Never summarize a full document from a headline alone. Store source text/snapshots only under source policy.

Every stage records status, version, attempts, errors, and durable outputs so it can resume independently. Share exact duplicate work only where permitted. Group related articles into stories without erasing source differences. Corrections produce new revisions; old evidence remains inspectable.

Validate replay without duplicate stored outputs, lease overlap, partial failure recovery, revision identity, changed passage embeddings, and paused dependent processing at budget exhaustion. Retrying a provider call may still incur another charge.

## Implemented: stages 1–4

`runDocumentCollection(connector, store, {window})` runs discover → retry pending → fetch+extract → contract validation → access policy → revision detection → store, and appends a `CollectionRunReport` whose status separates `succeeded`, `succeeded_quiet` (nothing new), `partial`, `blocked`, and `failed`.

- **Revisions:** immutable, keyed by content hash over title + standfirst + text; a change links `previousRevisionId`; reverting to earlier wording is its own revision. Replaying a run stores nothing twice.
- **Refetch policy:** listing connectors recheck known items listed within 7 days for corrections, at most once per 24 hours each; OAI connectors process every item they rediscover (the datestamp moved).
- **Retries:** failed items stay pending and are retried in later runs even after leaving the listing, up to 6 consecutive failures; contract-validation failures are not retried.
- **Policy:** text beyond the source's `maxStoredText` is dropped and `textReducedByPolicy` set.
- `runObservationCollection` works with any `ObservationFetcher` (BCCh BDE, BCCh SDMX, BanRep SDMX). Its window is a range of **reference periods**, not release times; callers look back far enough to catch late releases and revisions, and only new or changed values are stored, keeping earlier vintages.

`MemoryStore` and `JsonDirStore` (local JSON Lines) implement the `DocumentStore`/`ObservationStore` boundary until the database is chosen. Not yet built: leases/concurrency, stages 5–8, PDF text extraction.
