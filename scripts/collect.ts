/**
 * Run one collection for a registered source and print its run report.
 *
 *   npm run collect -- --list
 *   npm run collect -- --source banrep-web [--since 2026-10-17] [--until 2026-11-17] [--dry-run]
 *   npm run collect -- --source banrep-repositorio --since 2026-10-17
 *   npm run collect -- --source bcch-bde [--since …]            (needs BCCH_BDE_TOKEN)
 *   npm run collect -- --source bcch-bde --find cpi [--frequency MONTHLY]
 *   npm run collect -- --source banrep-sdmx [--since …]          (open SDMX API, no token)
 *   npm run collect -- --source banrep-sdmx --find all          (bilingual dataflow search)
 *   npm run collect -- --source bcch-sdmx                       (open SDMX, no token)
 *
 * Defaults: documents look back one month (the backfill target); statistics look back two
 * years of reference periods (releases lag periods). Data in .data/collect.
 * Refuses inactive/blocked sources unless --allow-inactive is given.
 * Exit codes: 0 succeeded/quiet, 2 partial, 3 blocked, 1 failed or usage error.
 * Spend: none beyond outbound requests, which are paced and capped per source.
 */
import {parseArgs} from 'node:util';
import type {Frequency, RunStatus} from '@dottext/contracts';
import {
  BanrepSdmxClient,
  BdeClient,
  createDocumentConnector,
  createObservationFetcher,
  findDataflows,
  findSeries,
  httpClientFor,
  loadConcepts,
  loadRegistry,
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

const STATISTICS_CONNECTORS = new Set(['bcch-bde', 'banrep-sdmx', 'bcch-sdmx']);
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
  // Documents: the window is publication time (default one month, the backfill target).
  // Statistics: the window is reference periods, and releases lag them (Q2 GDP appears in
  // August), so look back two years; only new or revised values are stored.
  const statistics = STATISTICS_CONNECTORS.has(entry.connector.type);
  const defaultDays = statistics ? 730 : 30;
  const since = values.since ? new Date(`${values.since}T00:00:00Z`) : new Date(until.getTime() - defaultDays * 86_400_000);
  if (Number.isNaN(since.getTime()) || Number.isNaN(until.getTime()) || since > until) {
    console.error('invalid --since/--until (use YYYY-MM-DD)');
    return 1;
  }

  if (statistics) {
    const token = entry.connector.type === 'bcch-bde' ? (process.env[entry.connector.tokenEnv] ?? null) : null;
    const http = httpClientFor(entry, {secretValues: token ? [token] : []});

    if (values.find) {
      const concepts = loadConcepts().seriesConcepts.filter((c) => values.find === 'all' || c.id === values.find);
      if (!concepts.length) {
        console.error(`no series concept "${values.find}"; see config/sources/central-bank-concepts.json`);
        return 1;
      }
      let candidates: Array<{id: string; matchedIn: string[]; es: string | null; en: string | null}>[];
      if (entry.connector.type === 'bcch-bde') {
        const catalog = await new BdeClient({http, token, sourceId: entry.id}).searchSeries(values.frequency as Frequency);
        if (!catalog.ok) {
          console.error(JSON.stringify(catalog.problem, null, 2));
          return catalog.problem.kind === 'missing_credential' ? 3 : 1;
        }
        candidates = concepts.map((c) =>
          findSeries(catalog.value, c).map(({record, matchedIn}) => ({id: record.seriesId, matchedIn, es: record.titleEs, en: record.titleEn})),
        );
      } else if (entry.connector.type === 'banrep-sdmx') {
        const flows = await new BanrepSdmxClient({http, sourceId: entry.id, baseUrl: entry.connector.baseUrl}).listDataflows();
        if (!flows.ok) {
          console.error(JSON.stringify(flows.problem, null, 2));
          return flows.problem.kind === 'blocked_by_bot_protection' ? 3 : 1;
        }
        candidates = concepts.map((c) =>
          findDataflows(flows.dataflows, c).map(({record, matchedIn}) => ({id: record.id, matchedIn, es: record.nameEs, en: record.nameEn})),
        );
      } else {
        console.error(`${entry.id}: --find is not available; categories are listed in ${entry.connector.type === 'bcch-sdmx' ? entry.connector.categoriesFile : 'the registry'}`);
        return 1;
      }
      concepts.forEach((concept, i) => {
        const matches = candidates[i] ?? [];
        console.log(`\n# ${concept.id}: ${matches.length} candidates (es: ${concept.es.join(' | ')}; en: ${concept.en.join(' | ')})`);
        for (const m of matches) console.log(`${m.id}\t[${m.matchedIn.join('+')}]\t${m.es ?? '—'}\t/\t${m.en ?? '—'}`);
      });
      return 0;
    }

    const fetcher = createObservationFetcher(entry, http);
    if (!fetcher) return 1;
    const store = new JsonDirStore(values['data-dir']!);
    const report = await runObservationCollection(fetcher, store, {
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
