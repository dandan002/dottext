# dottext

Private emerging markets research portal for sales and trading professionals. The pilot covers Chile and Colombia for one initial user, with a $50 monthly operating target. It complements Bloomberg and Refinitiv with English summaries of local sources, searchable evidence, and connected local color, macroeconomic outlook, and political analysis.

**Specification:** Draft 0.1, Nov. 13, 2026. **Repository status:** documentation and directory scaffold only; no applications, connectors, infrastructure, tests, or measured capabilities are implemented.

## Read first

1. [Product scope and experience](docs/product.md)
2. [Architecture and boundaries](docs/architecture.md)
3. [Delivery sequence](docs/delivery.md)
4. [Open decisions and benchmarks](docs/decisions.md)
5. [Pilot acceptance criteria](docs/pilot.md)

Each directory has a README describing its responsibility, build steps, boundaries, and validation requirements. Shared requirements live in [docs](docs/README.md). Follow the delivery sequence rather than interpreting the directory tree as an implementation order.

## Repository map

```text
apps/
  portal/          Private Next.js portal and workspace research routes
  content-api/     Versioned Hono content service
  worker/          Collection, processing, and durable workflow execution
packages/
  contracts/       Validated API schemas and shared record contracts
  connectors/      Source-specific discovery and extraction
  ingestion/       Resumable processing stages and revision detection
  storage/         Database, object storage, and persistence boundaries
  retrieval/       Access-filtered keyword and multilingual hybrid search
  research/        Analyst workflows, briefing editor, and saved outputs
  models/          Provider-neutral model and embedding adapter
  access/          Workspace permissions and service identities
  budget/          Reservations, accounting, alerts, and stop controls
  observability/   Tracing, metrics, and redaction
  evaluation/      Evaluation runners and fixed-case definitions
config/
  countries/       Editable Chile and Colombia coverage profiles
  sources/         Candidate roster and connector activation requirements
  editorial/       AP style policy and market-notation exception register
fixtures/          Evaluation evidence and adversarial scenario placeholders
infra/             Infrastructure plan; no provisioned resources
scripts/           Future local development and maintenance utilities
docs/              Cross-cutting product, data, operations, and delivery requirements
```

## Working locally

The root and component manifests declare a private npm workspace skeleton. No dependencies, scripts, lockfile, or Node version have been selected. There is nothing to run yet. Choose and record the supported toolchain before installing framework dependencies; see [open decisions](docs/decisions.md). `src/.gitkeep` files preserve future source directories.

Working defaults are TypeScript, Next.js, Hono, Node workers, PostgreSQL/pgvector, GCP, LangGraph, and LangSmith. These are subject to validation. Model versions, auth, region, database size, live search, source permissions, and telemetry remain open. This scaffold creates no cloud resources, subscriptions, or scheduled automations.

## Implementation guardrails

- Preserve original evidence, revisions, timestamps, numerical precision, and saved evidence snapshots.
- Enforce workspace access before evidence, caches, artifacts, or job results are returned.
- Reserve budget before dispatching cost-incurring work; include in-flight work.
- Require explicit user action for live retrieval.
- Keep publisher-specific logic behind the content platform; research consumes its API.
- Report evidence gaps, failed collection, paused work, and unmeasured results honestly.
