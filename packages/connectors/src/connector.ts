import type {DiscoveredItem, ExtractedDocument, Problem, SourceDefinition, TimeValue} from '@dottext/contracts';
import type {HttpFailure} from './http/client.ts';

export interface CollectionWindow {
  since: Date;
  until: Date;
}

export interface DiscoveryResult {
  /** Items that may fall inside the window (or carry no listing date). */
  items: DiscoveredItem[];
  pagesAttempted: number;
  pagesSucceeded: number;
  /** All rows seen on successfully parsed pages, inside or outside the window. */
  itemsListed: number;
  oldestListed: TimeValue | null;
  newestListed: TimeValue | null;
  /** True only when every planned listing paged back past `window.since`. */
  reachedWindowStart: boolean;
  problems: Problem[];
  /** Observations that are not failures (e.g. upstream records skipped as incomplete). */
  notes: string[];
}

export type FetchOutcome = {ok: true; document: ExtractedDocument; collectedAt: string} | {ok: false; problem: Problem};

/**
 * Publisher-specific discovery and fetch+extract. Connectors never store anything;
 * the ingestion pipeline owns windows, revisions, policy, and persistence.
 */
export interface DocumentConnector {
  readonly source: SourceDefinition;
  /**
   * True when an item appears in discovery only because it changed (e.g. OAI
   * `from=` harvests). False for listings that show the same items every run, where
   * known items are refetched only while recent enough to plausibly be corrected.
   */
  readonly discoverySignalsChange: boolean;
  discover(window: CollectionWindow): Promise<DiscoveryResult>;
  fetch(item: DiscoveredItem): Promise<FetchOutcome>;
}

export function problemFromHttp(stage: Problem['stage'], failure: HttpFailure): Problem {
  return {stage, kind: failure.kind, url: failure.url, httpStatus: failure.status, message: failure.message};
}
