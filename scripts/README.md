# Development and maintenance utilities

Add scripts only as concrete workflows are implemented: local setup, schema validation/migrations, permitted sample backfill, fixture evaluation, and coverage/cost reports.

Document inputs, environment variables, dry-run behavior, output, idempotency, and any spend before adding a utility. Use shared connector, model, access, and budget packages rather than bypassing them. Keep secrets out of arguments/logs and source control. No utility should silently create cloud resources, activate subscriptions, or install scheduled automations.

## `collect.ts` — one collection run for a registered source

```bash
npm run collect -- --list
npm run collect -- --source banrep-repositorio --since 2026-10-17
npm run collect -- --source banrep-web --dry-run
npm run collect -- --source bcch-bde --find cpi --frequency MONTHLY
npm run collect -- --source banrep-sdmx --since 2026-10-17
npm run collect -- --source banrep-sdmx --find all
```

- **Inputs:** `--source <id>` from `config/sources/registry.json`; `--since`/`--until` (`YYYY-MM-DD`, default: the last 30 days, the backfill target); `--data-dir` (default `.data/collect`, gitignored); `--dry-run` (discovery only); `--allow-inactive` (run a source whose status is inactive/blocked); `--find <concept|all>` (bilingual search of the BDE catalog, with `--frequency`, or of BanRep SDMX dataflow names).
- **Environment:** `BCCH_BDE_TOKEN` for `bcch-bde` (never logged; redacted from reports); optional `DOTTEXT_USER_AGENT`.
- **Output:** the run report as JSON on stdout; revisions, item states, observations, and reports appended under the data dir. Exit 0 succeeded/quiet, 2 partial, 3 blocked, 1 failed.
- **Idempotency:** re-running stores no duplicate revisions; failed items are retried on the next run.
- **Spend:** no paid services. Outbound requests are paced and capped per source (`rateLimit` in the registry).
