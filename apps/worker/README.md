# Worker

Build Node.js execution entry points for collection, resumable ingestion, and analyst jobs. Cloud Run Jobs and durable dispatch are working defaults; business logic belongs in packages.

## Build sequence

1. Wire broad hourly discovery to validated connectors and record every run's success, failure, and last-success time.
2. Run leased, independently resumable ingestion stages. Backfill approximately one month where available and report actual coverage.
3. Add durable on-demand research/live-retrieval/briefing execution with authenticated job payloads, workspace scope, reservations, and persisted results.
4. Add application-managed user schedules, daily or requested assessment checks, correction propagation, and retry-safe execution identities.

Processing order: discovery → fetch → extraction → revision detection → classification/English summary → passages → embeddings → indexing. Record stage version, status, attempts, and errors. Persist successful steps for reuse.

Do not run all analyst branches hourly for every article. Generate/update syntheses when requested or scheduled, reuse valid prior work, and apply evidence and budget limits. LangGraph checkpoints support resumption; dispatch handles execution/delivery. Exactly-once provider billing is not guaranteed.

Validate overlap, leases, retries, crashes after provider calls, completed-stage replay, source corrections, allowance exhaustion, and New York daylight saving schedule behavior. See [operations](../../docs/operations.md).
