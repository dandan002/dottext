# Shared packages

Packages contain framework-independent logic; application entry points compose them. These manifests are placeholders with no dependencies or runtime exports yet. Define public exports and dependency boundaries when code is added.

| Package | Build responsibility |
| --- | --- |
| [contracts](contracts/README.md) | API schemas, errors, records, job/result contracts |
| [connectors](connectors/README.md) | Validated source discovery and extraction |
| [ingestion](ingestion/README.md) | Resumable processing and revision detection |
| [storage](storage/README.md) | Persistence, migrations, snapshots, cache records |
| [retrieval](retrieval/README.md) | Access-filtered keyword/semantic/hybrid retrieval |
| [research](research/README.md) | Analysts, briefing editor, research synthesis |
| [models](models/README.md) | Structured model access, embeddings, provider accounting |
| [access](access/README.md) | Workspace permissions and service authorization |
| [budget](budget/README.md) | Atomic reservations, limits, reconciliation |
| [observability](observability/README.md) | Traces, metrics, sampling, redaction |
| [evaluation](evaluation/README.md) | Fixed cases, checks, human-review records |

Research consumes the content API through contracts; it must not import connector internals or read the content database to bypass that API. Keep telemetry failures independent of persistence and budget enforcement. No package should assume a cache hit grants access.
