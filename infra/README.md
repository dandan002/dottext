# Infrastructure plan

This directory is reserved for infrastructure definitions after deployment decisions and cost benchmarks. No resources are provisioned.

Working targets: independent Cloud Run portal/content services, Cloud Run Jobs for workers, Cloud Scheduler for collection and application schedule dispatch, Cloud Tasks or equivalent durable on-demand delivery, PostgreSQL/pgvector, Google Cloud Storage, Secret Manager, and Cloud Logging/Monitoring. Exact region, sizing, infrastructure-as-code tooling, identities, and auth remain open.

Before deployment, measure the smallest viable database, storage/backups, compute, dispatch, and telemetry against [budget targets](../docs/operations.md). Define service-to-service identities, restricted database/bucket access, secret injection, migrations, backup/restore, retention, alert thresholds with headroom, and controlled pause behavior.

Never treat a cloud budget alert as a guaranteed invoice ceiling. Application reservations and provider limits are complementary. Do not automatically upgrade subscriptions or resource sizes. Validate recovery and two-workspace access before pilot launch; record decisions in [open decisions](../docs/decisions.md).
