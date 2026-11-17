import {randomUUID} from 'node:crypto';
import {ObservationRunReport, type Observation, type Problem, type RunStatus} from '@dottext/contracts';
import type {BdeClient, SeriesConfig} from '@dottext/connectors';
import type {ObservationStore} from './store.ts';

/**
 * Collect statistical series. A period whose value or status differs from our
 * latest stored vintage is stored again as a revision; earlier vintages remain.
 */
export async function runObservationCollection(
  client: BdeClient,
  sourceId: string,
  series: readonly SeriesConfig[],
  store: ObservationStore,
  options: {
    window: {since: string; until: string};
    requestStats?: {made: number; challenged: number};
    now?: () => Date;
    runId?: string;
  },
): Promise<ObservationRunReport> {
  const now = options.now ?? (() => new Date());
  const startedAt = now().toISOString();
  const problems: Problem[] = [];
  const results: ObservationRunReport['series'] = [];

  for (const config of series) {
    const response = await client.getSeries(
      config.seriesId,
      {firstDate: options.window.since, lastDate: options.window.until},
      config,
      now(),
    );
    if (!response.ok) {
      problems.push(response.problem);
      results.push({seriesId: config.seriesId, received: 0, new: 0, revised: 0, unchanged: 0, failed: true});
      if (response.problem.kind === 'missing_credential') break;
      continue;
    }
    const toStore: Observation[] = [];
    const tally = {new: 0, revised: 0, unchanged: 0};
    for (const observation of response.value.observations) {
      const latest = await store.latestObservation(sourceId, observation.seriesId, observation.referencePeriod);
      if (!latest) tally.new++;
      else if (latest.rawValue !== observation.rawValue || latest.status !== observation.status) tally.revised++;
      else {
        tally.unchanged++;
        continue;
      }
      toStore.push(observation);
    }
    await store.insertObservations(toStore);
    results.push({seriesId: config.seriesId, received: response.value.observations.length, ...tally, failed: false});
  }

  const anySucceeded = results.some((r) => !r.failed);
  const blocked = problems.some((p) => p.kind === 'missing_credential' || p.kind === 'blocked_by_bot_protection');
  const changed = results.reduce((n, r) => n + r.new + r.revised, 0);
  const status: RunStatus = !anySucceeded
    ? blocked
      ? 'blocked'
      : 'failed'
    : problems.length
      ? 'partial'
      : changed
        ? 'succeeded'
        : 'succeeded_quiet';

  const report = ObservationRunReport.parse({
    runId: options.runId ?? randomUUID(),
    sourceId,
    startedAt,
    finishedAt: now().toISOString(),
    status,
    window: options.window,
    series: results,
    requests: options.requestStats ?? {made: 0, challenged: 0},
    problems,
  });
  await store.appendObservationRunReport(report);
  return report;
}
