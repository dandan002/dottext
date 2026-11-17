# Working defaults and open decisions

No subscriptions, cloud resources, or schedules are created by this scaffold. Record decisions with dates, rationale, sample measurements, and consequences before implementation relies on them. Keep specification defaults distinct from measured outcomes.

| Decision | Current status | Evidence needed |
| --- | --- | --- |
| Runtime/tooling | TypeScript and Node; private npm workspace manifests are scaffold convention only | Node/framework versions, package manager, build/typecheck/lint/test strategy |
| Authentication | Clerk candidate; Firebase alternative | Workspace mapping, cost, session/server validation, private access checks |
| GCP region | Open | User latency, data location requirements, service availability, measured cost |
| Postgres deployment/size | PostgreSQL/pgvector; Cloud SQL sizing open | Smallest viable instance, storage/backup cost, retrieval benchmark against allowance |
| Models | Provider-neutral; OpenRouter candidate and direct support | Explicit model/provider versions, English output fidelity, structured output, cost, fallback behavior |
| Embeddings | Open | English-to-Spanish retrieval, names, legislation, idioms, numerical questions, cost |
| Live-search provider | Open | Permitted access, provenance/times, retention, results quality, price |
| Source roster/retention | Candidates only | Connector validation, actual history, permitted text/snapshots, duplication/failure behavior |
| Telemetry | LangSmith Developer candidate; Cloud Logging/Monitoring defaults | Redaction, sampling, retention, export failure, independent spend cap |
| Durable dispatch | Cloud Tasks or equivalent | Leases, retry/overlap behavior, execution identity, cost |
| Archive beyond first month | Open | Storage measurements and source policies |
| DST/calendar policies | New York user timezone default | Ambiguous/nonexistent schedule behavior, spend-period timezone, billing reconciliation |
| Operational thresholds | Unmeasured | Latency, source count, DB size, retrieval-quality thresholds from initial sample |

## Working technical references

Links below are inherited from Draft 0.1. They have not been checked or used as current pricing evidence in this scaffold. Verify current authorized documentation when implementing the corresponding decision.

- [Cloud Run pricing](https://cloud.google.com/run/pricing)
- [Cloud SQL pricing](https://cloud.google.com/sql/pricing)
- [Cloud SQL PostgreSQL extensions](https://docs.cloud.google.com/sql/docs/postgres/extensions)
- [Google Cloud spend caps and limitations](https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps)
- [LangGraph overview](https://docs.langchain.com/oss/javascript/langgraph/overview)
- [LangSmith tracing](https://docs.langchain.com/langsmith/observability-quickstart)
- [LangSmith evaluation](https://docs.langchain.com/langsmith/evaluation)
- [LangSmith pricing](https://www.langchain.com/pricing)
- [OpenRouter provider routing](https://openrouter.ai/docs/guides/routing/provider-selection)
