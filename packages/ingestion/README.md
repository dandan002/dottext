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
