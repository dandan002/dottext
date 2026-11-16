# Storage

Build persistence adapters for PostgreSQL with full-text search and pgvector, plus permitted Google Cloud Storage snapshots. Choose migration/query tooling after the first cost and retrieval benchmark. No database tier is selected.

Implement [record requirements](../../docs/data.md), immutable revisions/passages, saved evidence snapshots, dependency/correction links, stage checkpoints/leases, user schedules, private preferences, usage reservations, and cache identities. Keep authoritative data in our database; tracing is not a persistence substitute.

Add migrations as schema decisions are validated. Model source policies and completeness explicitly. Preserve numerical observation metadata and distinct timestamps. Use transactional uniqueness for completed-stage outputs, schedule executions, and reservation identities. Apply workspace policies to private records and access-aware retrieval.

Benchmark smallest viable database, storage/backups, full-text and vector queries before cloud sizing. Verify migrations, restore behavior, revision preservation, concurrency, and two-workspace isolation. Determine archive retention beyond the first month from measurements and source policies.
