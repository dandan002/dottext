/**
 * Run one collection for a registered source and print its run report.
 *
 *   npm run collect -- --list
 *   npm run collect -- --source banrep-web [--since 2026-10-17] [--until 2026-11-17] [--dry-run]
 *   npm run collect -- --source banrep-repositorio --since 2026-10-17
 *   npm run collect -- --source bcch-bde [--since …]            (needs BCCH_BDE_TOKEN)
 *   npm run collect -- --source bcch-bde --find cpi [--frequency MONTHLY]
 *
 * Defaults: one-month window ending now (the backfill target), data in .data/collect.
 * Refuses inactive/blocked sources unless --allow-inactive is given.
 * Exit codes: 0 succeeded/quiet, 2 partial, 3 blocked, 1 failed or usage error.
 * Spend: none beyond outbound requests, which are paced and capped per source.
 */
import {parseArgs} from 'node:util';
import type {Frequency, RunStatus} from '@dottext/contracts';
import {
  BdeClient,
  createDocumentConnector,
  findSeries,
  httpClientFor,
  loadConcepts,
  loadRegistry,
  loadSeriesConfig,
} from '@dottext/connectors';
import {JsonDirStore, runDocumentCollection, runObservationCollection} from '@dottext/ingestion';

const {values} = parseArgs({
  options: {
    list: {type: 'boolean', default: false},
    source: {type: 'string'},
    since: {type: 'string'},
    until: {type: 'string'},
    'data-dir': {type: 'string', default: '.data/collect'},
    'dry-run': {type: 'boolean', default: false},
    'allow-inactive': {type: 'boolean', default: false},
    find: {type: 'string'},
    frequency: {type: 'string', default: 'MONTHLY'},
  },
});

const EXIT: Record<RunStatus, number> = {succeeded: 0, succeeded_quiet: 0, partial: 2, blocked: 3, failed: 1};

async function main(): Promise<number> {
  const registry = loadRegistry();
  if (values.list) {
    for (const s of registry) console.log(`${s.id.padEnd(20)} ${s.status.padEnd(11)} ${s.channel.padEnd(15)} ${s.statusReason}`);
    return 0;
  }
  const entry = registry.find((s) => s.id === values.source);
  if (!entry) {
    console.error(`unknown or missing --source; known: ${registry.map((s) => s.id).join(', ')}`);
    return 1;
  }
  if ((entry.status === 'inactive' || entry.status === 'blocked') && !values['allow-inactive'] && entry.connector.type !== 'bcch-bde') {
    console.error(`${entry.id} is ${entry.status}: ${entry.statusReason}\nPass --allow-inactive to run it anyway.`);
    return 1;
  }

  const until = values.until ? endOfDay(values.until) : new Date();
  const since = values.since ? new Date(`${values.since}T00:00:00Z`) : new Date(until.getTime() - 30 * 86_400_000);
  if (Number.isNaN(since.getTime()) || Number.isNaN(until.getTime()) || since > until) {
    console.error('invalid --since/--until (use YYYY-MM-DD)');
    return 1;
  }

  if (entry.connector.type === 'bcch-bde') {
    const token = process.env[entry.connector.tokenEnv] ?? null;
    const http = httpClientFor(entry, {secretValues: token ? [token] : []});
    const client = new BdeClient({http, token, sourceId: entry.id});

    if (values.find) {
      const concepts = loadConcepts().seriesConcepts.filter((c) => values.find === 'all' || c.id === values.find);
      if (!concepts.length) {
        console.error(`no series concept "${values.find}"; see config/sources/central-bank-concepts.json`);
        return 1;
      }
      const catalog = await client.searchSeries(values.frequency as Frequency);
      if (!catalog.ok) {
        console.error(JSON.stringify(catalog.problem, null, 2));
        return catalog.problem.kind === 'missing_credential' ? 3 : 1;
      }
      for (const concept of concepts) {
        const matches = findSeries(catalog.value, concept);
        console.log(`\n# ${concept.id}: ${matches.length} candidates (es terms: ${concept.es.join(' | ')}; en terms: ${concept.en.join(' | ')})`);
        for (const {record, matchedIn} of matches) {
          console.log(`${record.seriesId}\t[${matchedIn.join('+')}]\t${record.titleEs ?? '—'}\t/\t${record.titleEn ?? '—'}`);
        }
      }
      return 0;
    }

    const store = new JsonDirStore(values['data-dir']!);
    const report = await runObservationCollection(client, entry.id, loadSeriesConfig(entry.connector.seriesFile), store, {
      window: {since: since.toISOString().slice(0, 10), until: until.toISOString().slice(0, 10)},
      requestStats: http.stats,
    });
    console.log(JSON.stringify(report, null, 2));
    return EXIT[report.status];
  }

  const http = httpClientFor(entry);
  const connector = createDocumentConnector(entry, http);
  if (!connector) {
    console.error(`${entry.id} has no collectable channel: ${entry.statusReason}`);
    return 3;
  }
  const store = new JsonDirStore(values['data-dir']!);
  const report = await runDocumentCollection(connector, store, {
    window: {since, until},
    requestStats: http.stats,
    dryRun: values['dry-run'],
  });
  console.log(JSON.stringify(report, null, 2));
  return EXIT[report.status];
}

function endOfDay(day: string): Date {
  return new Date(`${day}T23:59:59.999Z`);
}

process.exitCode = await main();
