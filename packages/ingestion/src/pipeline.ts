import {randomUUID} from 'node:crypto';
import {
  CollectionRunReport,
  DocumentRevision,
  ExtractedDocument,
  type DiscoveredItem,
  type FailureKind,
  type Problem,
  type RunStatus,
} from '@dottext/contracts';
import {mayFallInWindow, type DocumentConnector} from '@dottext/connectors';
import {applyAccessPolicy, contentHash, documentIdFor} from './revision.ts';
import type {DocumentStore, ItemState} from './store.ts';

export interface DocumentRunOptions {
  window: {since: Date; until: Date};
  /** Request counters of the run's HTTP client, copied into the report. */
  requestStats?: {made: number; challenged: number};
  /**
   * For listing connectors, refetch already-stored items whose listed publication
   * time is within this many days, to catch silent corrections. Default 7.
   */
  refetchKnownWithinDays?: number;
  /** Stop retrying an item after this many consecutive failures. Default 6. */
  maxConsecutiveFailures?: number;
  /** Discovery only: no fetches, no writes except the run report. */
  dryRun?: boolean;
  now?: () => Date;
  runId?: string;
}

const BLOCKING_KINDS = new Set<FailureKind>(['blocked_by_bot_protection', 'skipped_after_challenges', 'missing_credential']);

/**
 * discover → (retry pending) → fetch+extract → validate → access policy →
 * revision detection → store. Every run appends a report that distinguishes
 * quiet success from blocked and failed collection.
 */
export async function runDocumentCollection(
  connector: DocumentConnector,
  store: DocumentStore,
  options: DocumentRunOptions,
): Promise<CollectionRunReport> {
  const now = options.now ?? (() => new Date());
  const startedAt = now().toISOString();
  const source = connector.source;
  const refetchDays = options.refetchKnownWithinDays ?? 7;
  const maxFailures = options.maxConsecutiveFailures ?? 6;
  const problems: Problem[] = [];
  const counts = {new: 0, revised: 0, unchanged: 0, skippedKnown: 0, failed: 0, retriedFromEarlierRuns: 0};

  const discovery = await connector.discover(options.window);
  problems.push(...discovery.problems);

  const queue: Array<{item: DiscoveredItem; retry: boolean}> = discovery.items.map((item) => ({item, retry: false}));
  const queued = new Set(discovery.items.map((i) => i.url));
  for (const state of await store.listPendingItems(source.id)) {
    if (state.pending && !queued.has(state.url)) {
      queue.push({item: state.pending, retry: true});
      queued.add(state.url);
    }
  }

  if (!options.dryRun) {
    for (const {item, retry} of queue) {
      const at = now().toISOString();
      const state: ItemState = (await store.getItemState(source.id, item.url)) ?? {
        sourceId: source.id,
        url: item.url,
        firstSeenAt: at,
        lastAttemptAt: at,
        lastSuccessAt: null,
        documentId: null,
        latestRevisionId: null,
        consecutiveFailures: 0,
        lastFailureKind: null,
        pending: null,
      };

      if (state.latestRevisionId && !state.pending && !connector.discoverySignalsChange && !isRecent(item, now(), refetchDays)) {
        counts.skippedKnown++;
        continue;
      }
      if (retry) counts.retriedFromEarlierRuns++;

      state.lastAttemptAt = at;
      const outcome = await connector.fetch(item);
      if (!outcome.ok) {
        counts.failed++;
        problems.push(outcome.problem);
        state.consecutiveFailures++;
        state.lastFailureKind = outcome.problem.kind;
        state.pending = state.consecutiveFailures < maxFailures ? item : null;
        await store.putItemState(state);
        continue;
      }

      const validated = ExtractedDocument.safeParse(outcome.document);
      if (!validated.success) {
        counts.failed++;
        problems.push({
          stage: 'extract',
          kind: 'parse_error',
          url: item.url,
          httpStatus: null,
          message: `extracted document failed contract validation: ${validated.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
        });
        state.consecutiveFailures++;
        state.lastFailureKind = 'parse_error';
        state.pending = null; // a parser bug will not fix itself on retry
        await store.putItemState(state);
        continue;
      }

      const {document, reduced} = applyAccessPolicy(validated.data, source.accessPolicy);
      const documentId = documentIdFor(source.id, document.canonicalUrl);
      const hash = contentHash(document);
      const previous = state.latestRevisionId ? await store.getRevision(state.latestRevisionId) : null;

      if (previous && previous.contentHash === hash) {
        counts.unchanged++;
      } else {
        let revisionId = `${documentId}@${hash.slice(0, 16)}`;
        if (await store.getRevision(revisionId)) {
          // Content reverted to an earlier revision: record the reversion as its own revision.
          revisionId = `${revisionId}-${outcome.collectedAt.replace(/\D/g, '').slice(0, 14)}`;
        }
        const revision = DocumentRevision.parse({
          revisionId,
          documentId,
          previousRevisionId: previous?.revisionId ?? null,
          contentHash: hash,
          firstSeenAt: previous?.firstSeenAt ?? state.firstSeenAt,
          collectedAt: outcome.collectedAt,
          textReducedByPolicy: reduced,
          document,
        });
        if (await store.insertRevision(revision)) {
          if (previous) counts.revised++;
          else counts.new++;
          state.latestRevisionId = revision.revisionId;
        } else {
          counts.unchanged++;
        }
      }
      state.documentId = documentId;
      state.lastSuccessAt = outcome.collectedAt;
      state.consecutiveFailures = 0;
      state.lastFailureKind = null;
      state.pending = null;
      await store.putItemState(state);
    }
  }

  const report = CollectionRunReport.parse({
    runId: options.runId ?? randomUUID(),
    sourceId: source.id,
    startedAt,
    finishedAt: now().toISOString(),
    status: runStatus(discovery.pagesAttempted, discovery.pagesSucceeded, discovery.reachedWindowStart, problems, counts),
    window: {since: options.window.since.toISOString(), until: options.window.until.toISOString()},
    discovery: {
      pagesAttempted: discovery.pagesAttempted,
      pagesSucceeded: discovery.pagesSucceeded,
      itemsListed: discovery.itemsListed,
      itemsInWindow: discovery.items.length,
      oldestListed: discovery.oldestListed,
      newestListed: discovery.newestListed,
      reachedWindowStart: discovery.reachedWindowStart,
    },
    documents: counts,
    requests: options.requestStats ?? {made: 0, challenged: 0},
    problems,
    notes: discovery.notes,
  });
  await store.appendRunReport(report);
  return report;
}

function runStatus(
  pagesAttempted: number,
  pagesSucceeded: number,
  reachedWindowStart: boolean,
  problems: readonly Problem[],
  counts: {new: number; revised: number},
): RunStatus {
  if (pagesAttempted > 0 && pagesSucceeded === 0) {
    return problems.some((p) => BLOCKING_KINDS.has(p.kind)) ? 'blocked' : 'failed';
  }
  if (problems.length > 0 || !reachedWindowStart) return 'partial';
  return counts.new + counts.revised > 0 ? 'succeeded' : 'succeeded_quiet';
}

function isRecent(item: DiscoveredItem, now: Date, days: number): boolean {
  if (!item.listedPublished) return false;
  return mayFallInWindow(item.listedPublished, new Date(now.getTime() - days * 86_400_000), now);
}
