# Observability

Build tracing/metrics adapters with LangSmith Developer as candidate and Cloud Logging/Monitoring as infrastructure defaults. Keep adapters replaceable and telemetry non-authoritative.

Trace research/briefing runs, model calls, retrieval/evidence selection, versions, latency, retries, and usage with request/job/run references. Sample routine ingestion as needed. Redact credentials and unnecessary private content; send only necessary evidence to external providers.

Use an independent telemetry cap; no automatic subscription upgrades. Preserve authoritative reservations, evidence, assessments, and outputs in our database. Export failure must neither corrupt a saved result nor disable budget enforcement.

Validate trace outage, redaction, workspace identifiers, sampling, and spend limits. Expose enough source/job health for the portal to distinguish quiet coverage from failed collection. See [operations](../../docs/operations.md).
