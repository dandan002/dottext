# Development and maintenance utilities

Add scripts only as concrete workflows are implemented: local setup, schema validation/migrations, permitted sample backfill, fixture evaluation, and coverage/cost reports. No scripts currently exist.

Document inputs, environment variables, dry-run behavior, output, idempotency, and any spend before adding a utility. Use shared connector, model, access, and budget packages rather than bypassing them. Keep secrets out of arguments/logs and source control. No utility should silently create cloud resources, activate subscriptions, or install scheduled automations.
