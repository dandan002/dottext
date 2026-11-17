import {z} from 'zod';
import {TimeValue} from './time.ts';

export const FailureKind = z.enum([
  /** A bot-protection challenge (Radware/ShieldSquare, Imperva/Incapsula, …) answered instead of content. */
  'blocked_by_bot_protection',
  /** Our own circuit breaker skipped the request after repeated challenges. */
  'skipped_after_challenges',
  'request_budget_exhausted',
  'http_error',
  'network_error',
  'timeout',
  'too_large',
  'unexpected_content',
  'parse_error',
  'publisher_error',
  'missing_credential',
]);
export type FailureKind = z.infer<typeof FailureKind>;

export const Problem = z.object({
  stage: z.enum(['discover', 'fetch', 'extract', 'store']),
  kind: FailureKind,
  /** Secrets are redacted from URLs before they reach a Problem. */
  url: z.string().nullable(),
  httpStatus: z.number().int().nullable(),
  message: z.string(),
});
export type Problem = z.infer<typeof Problem>;

/**
 * - `succeeded`: every planned step completed and stored new or revised material.
 * - `succeeded_quiet`: every planned step completed; nothing new — not a failure.
 * - `partial`: some steps failed; what succeeded is stored.
 * - `blocked`: bot protection or a missing credential prevented collection.
 * - `failed`: collection did not complete for other reasons.
 */
export const RunStatus = z.enum(['succeeded', 'succeeded_quiet', 'partial', 'blocked', 'failed']);
export type RunStatus = z.infer<typeof RunStatus>;

export const CollectionRunReport = z.object({
  runId: z.string(),
  sourceId: z.string(),
  startedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime(),
  status: RunStatus,
  window: z.object({since: z.iso.datetime(), until: z.iso.datetime()}),
  discovery: z.object({
    pagesAttempted: z.number().int().nonnegative(),
    pagesSucceeded: z.number().int().nonnegative(),
    itemsListed: z.number().int().nonnegative(),
    itemsInWindow: z.number().int().nonnegative(),
    oldestListed: TimeValue.nullable(),
    newestListed: TimeValue.nullable(),
    /** True when discovery paged back past `window.since`, so the window is covered. */
    reachedWindowStart: z.boolean(),
  }),
  documents: z.object({
    new: z.number().int().nonnegative(),
    revised: z.number().int().nonnegative(),
    unchanged: z.number().int().nonnegative(),
    skippedKnown: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    retriedFromEarlierRuns: z.number().int().nonnegative(),
  }),
  requests: z.object({
    made: z.number().int().nonnegative(),
    challenged: z.number().int().nonnegative(),
  }),
  problems: z.array(Problem),
  /** Non-failure observations worth surfacing (e.g. incomplete upstream records skipped). */
  notes: z.array(z.string()),
});
export type CollectionRunReport = z.infer<typeof CollectionRunReport>;

export const ObservationRunReport = z.object({
  runId: z.string(),
  sourceId: z.string(),
  startedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime(),
  status: RunStatus,
  window: z.object({since: z.iso.date(), until: z.iso.date()}),
  series: z.array(
    z.object({
      /** The configured item: a single series (BDE) or a dataflow that may hold several (SDMX). */
      seriesId: z.string(),
      received: z.number().int().nonnegative(),
      new: z.number().int().nonnegative(),
      /** A stored period whose value or status changed since our last retrieval. */
      revised: z.number().int().nonnegative(),
      unchanged: z.number().int().nonnegative(),
      failed: z.boolean(),
    }),
  ),
  requests: z.object({made: z.number().int().nonnegative(), challenged: z.number().int().nonnegative()}),
  problems: z.array(Problem),
});
export type ObservationRunReport = z.infer<typeof ObservationRunReport>;
