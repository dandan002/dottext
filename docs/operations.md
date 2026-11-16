# Operations, spending, and recovery

## Collection and scheduling

Hourly discovery is a scheduling target, not instant publisher delivery. Show overdue collection and last-success time. Attempt one-month backfill and report actual oldest/latest coverage and gaps. A successful quiet collection differs from failed collection.

Persist job leases, checkpoints, attempts, errors, and results. Completed stages must be reusable without duplicating stored outputs. Handle concurrent runs and expired leases. Do not assume retries or in-flight failures yield exactly-once provider billing.

Resolve user schedules in their configured timezone, initially America/New_York. Store timestamps in UTC. Test both daylight saving transitions, ambiguous/nonexistent local times, and retries; use a unique execution identity to prevent duplicate scheduled outputs. Choose and document the ambiguous/nonexistent time policy during implementation.

## Budget policy

Target **$50 per calendar month**, including hosting, database, storage/backups, AI, embeddings, observability, and live retrieval. Free sources still incur processing costs. Choose and document the allowance calendar's timezone and reconcile provider billing periods.

| Category | Provisional monthly target |
| --- | ---: |
| Database/storage/backups | $12 |
| Compute/supporting services | $8 |
| AI/embeddings | $20 |
| Live retrieval | $5 |
| Headroom | $5 |
| Total | $50 |

These are measurement targets, not pricing claims. Benchmark the smallest viable Postgres instance before committing to a tier.

Alert at 80% of the configured allowance. Reserve a maximum before dispatch and count in-flight reservations as committed spend. Reject new work if its maximum cannot fit the remaining allowance. Keep baseline infrastructure/storage allowance reserved. Use transactional concurrency protection so requests cannot reserve the same funds.

At the AI/retrieval cap, pause generation, embeddings, paid search, and dependent processing, preserving existing reading where infrastructure remains available. An infrastructure cap may stop portal availability. Show paused work and reasons; never silently reduce evidence quality.

Cloud alerts cannot guarantee an exact invoice ceiling: reporting lag, in-flight work, fixed charges, and provider billing boundaries require headroom. Add provider credit limits and cloud safeguards. Trace usage has its own cap. Subscription upgrades, cloud size increases, and paid sources are never automatic.

## Telemetry and authority

Trace briefings, answers, model calls, retrieval steps, evidence selection, versions, latency, retries, and usage. Sample routine ingestion when needed. Telemetry failures cannot corrupt saved results or disable budget enforcement.

The application database owns authoritative source evidence, assessments, published outputs, and reservations. Export only necessary content; exclude credentials and unnecessary private data. Model judges and evaluation calls count toward the allowance.

## Operational views and checks

Build source-health, coverage/backfill, job/error, correction, and usage views early. Exercise recovery, overlap, provider timeout, reservation reconciliation, trace outage, and allowance exhaustion before deployment. Choose backup, restore, retention, and secret rotation procedures based on permitted retention and measured storage.
