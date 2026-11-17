# Working defaults and open decisions

No subscriptions, cloud resources, or schedules are created by this scaffold. Record decisions with dates, rationale, sample measurements, and consequences before implementation relies on them. Keep specification defaults distinct from measured outcomes.

| Decision | Current status | Evidence needed |
| --- | --- | --- |
| Runtime/tooling | **Decided 2026-11-17** for packages/scripts: Node ≥ 22.18 runs TypeScript directly (built-in type stripping, erasable syntax only, `.ts` import specifiers); npm workspaces; `node:test` (`npm test`); TypeScript 7 typecheck (`npm run typecheck`); zod 4 contracts; linkedom (HTML) and fast-xml-parser 5.12.0 (XML). Portal keeps Next.js tooling | Lint/format tool still open; revisit type stripping if a dependency needs non-erasable syntax |
| Authentication | Clerk candidate; Firebase alternative | Workspace mapping, cost, session/server validation, private access checks |
| GCP region | Open | User latency, data location requirements, service availability, measured cost |
| Postgres deployment/size | PostgreSQL/pgvector; Cloud SQL sizing open | Smallest viable instance, storage/backup cost, retrieval benchmark against allowance |
| Models | Provider-neutral; OpenRouter candidate and direct support | Explicit model/provider versions, English output fidelity, structured output, cost, fallback behavior |
| Embeddings | Open | English-to-Spanish retrieval, names, legislation, idioms, numerical questions, cost |
| Live-search provider | Open. Bilingual (es + en) search discovery and a `SearchProvider` interface exist (`packages/connectors/src/search.ts`); a provider would also unblock Banco Central de Chile document discovery | Permitted access, provenance/times, retention, results quality, price, Spanish-query quality |
| Source roster/retention | Central bank channels have connectors and onboarding records ([records](../config/sources/records/)); none active. Other sources are candidates | Owner confirmation of storage policy against each publisher's terms; actual history; journalism samples |
| Publisher bot protection | Open. `*.banrep.gov.co` (Radware) challenges after roughly 5–14 requests from one IP; `www.bcentral.cl` HTML (Imperva Incapsula) challenges every non-browser request. We detect and report challenges and never solve or evade them | Challenge rate from deployment egress; responses to allowlisting requests sent to both banks |
| Banco Central de Chile documents | Open: allowlisting vs live-search discovery of open `/documents/` PDFs | Allowlisting response; search-provider choice and cost |
| Banco Central de Chile statistics | Needs a BDE account and API Key Token (`BCCH_BDE_TOKEN` in Secret Manager) | Live validation of units/adjustment for curated series |
| PDF text extraction | Open; needed for reports (Monetary Policy Reports, minutes PDFs) | Library choice, table fidelity, cost; Banco de la República bitstreams are currently captcha-gated |
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
