import {appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import type {
  CollectionRunReport,
  DiscoveredItem,
  DocumentRevision,
  FailureKind,
  Observation,
  ObservationRunReport,
} from '@dottext/contracts';

/** Per (source, discovered URL) progress, so failed items are retried and known items are not refetched needlessly. */
export interface ItemState {
  sourceId: string;
  url: string;
  firstSeenAt: string;
  lastAttemptAt: string;
  lastSuccessAt: string | null;
  documentId: string | null;
  latestRevisionId: string | null;
  consecutiveFailures: number;
  lastFailureKind: FailureKind | null;
  /** Kept while the item still needs a successful fetch; retried even after it leaves the listing window. */
  pending: DiscoveredItem | null;
}

/**
 * Persistence boundary for collection. Methods are async so a Postgres adapter can
 * replace these local implementations without changing the pipeline.
 */
export interface DocumentStore {
  getItemState(sourceId: string, url: string): Promise<ItemState | null>;
  putItemState(state: ItemState): Promise<void>;
  listPendingItems(sourceId: string): Promise<ItemState[]>;
  getRevision(revisionId: string): Promise<DocumentRevision | null>;
  /** Insert-if-absent. Returns false when the revision ID already exists (replay-safe). */
  insertRevision(revision: DocumentRevision): Promise<boolean>;
  listRevisions(documentId: string): Promise<DocumentRevision[]>;
  appendRunReport(report: CollectionRunReport): Promise<void>;
}

export interface ObservationStore {
  /** Most recently retrieved vintage for one series period. */
  latestObservation(sourceId: string, seriesId: string, referencePeriod: string): Promise<Observation | null>;
  insertObservations(observations: readonly Observation[]): Promise<void>;
  appendObservationRunReport(report: ObservationRunReport): Promise<void>;
}

const itemKey = (sourceId: string, url: string) => `${sourceId}\n${url}`;
const periodKey = (o: Pick<Observation, 'sourceId' | 'seriesId' | 'referencePeriod'>) =>
  `${o.sourceId}\n${o.seriesId}\n${o.referencePeriod}`;

export class MemoryStore implements DocumentStore, ObservationStore {
  readonly itemStates = new Map<string, ItemState>();
  readonly revisions = new Map<string, DocumentRevision>();
  readonly runReports: CollectionRunReport[] = [];
  readonly observations = new Map<string, Observation[]>();
  readonly observationRunReports: ObservationRunReport[] = [];

  async getItemState(sourceId: string, url: string) {
    return structuredClone(this.itemStates.get(itemKey(sourceId, url)) ?? null);
  }
  async putItemState(state: ItemState) {
    this.itemStates.set(itemKey(state.sourceId, state.url), structuredClone(state));
  }
  async listPendingItems(sourceId: string) {
    return [...this.itemStates.values()].filter((s) => s.sourceId === sourceId && s.pending).map((s) => structuredClone(s));
  }
  async getRevision(revisionId: string) {
    return structuredClone(this.revisions.get(revisionId) ?? null);
  }
  async insertRevision(revision: DocumentRevision) {
    if (this.revisions.has(revision.revisionId)) return false;
    this.revisions.set(revision.revisionId, structuredClone(revision));
    return true;
  }
  async listRevisions(documentId: string) {
    return [...this.revisions.values()]
      .filter((r) => r.documentId === documentId)
      .sort((a, b) => a.collectedAt.localeCompare(b.collectedAt))
      .map((r) => structuredClone(r));
  }
  async appendRunReport(report: CollectionRunReport) {
    this.runReports.push(structuredClone(report));
  }
  async latestObservation(sourceId: string, seriesId: string, referencePeriod: string) {
    return structuredClone(this.observations.get(periodKey({sourceId, seriesId, referencePeriod}))?.at(-1) ?? null);
  }
  async insertObservations(observations: readonly Observation[]) {
    for (const o of observations) {
      const key = periodKey(o);
      this.observations.set(key, [...(this.observations.get(key) ?? []), structuredClone(o)]);
    }
  }
  async appendObservationRunReport(report: ObservationRunReport) {
    this.observationRunReports.push(structuredClone(report));
  }
}

/**
 * Local development store: JSON Lines in a directory. Not for deployment — the
 * database decision is open (docs/decisions.md). Single-process use only.
 */
export class JsonDirStore extends MemoryStore {
  readonly dir: string;

  constructor(dir: string) {
    super();
    this.dir = dir;
    mkdirSync(dir, {recursive: true});
    for (const revision of readJsonLines<DocumentRevision>(join(dir, 'revisions.jsonl'))) {
      this.revisions.set(revision.revisionId, revision);
    }
    for (const observation of readJsonLines<Observation>(join(dir, 'observations.jsonl'))) {
      const key = periodKey(observation);
      this.observations.set(key, [...(this.observations.get(key) ?? []), observation]);
    }
    const states = join(dir, 'item-states.json');
    if (existsSync(states)) {
      for (const state of JSON.parse(readFileSync(states, 'utf8')) as ItemState[]) {
        this.itemStates.set(itemKey(state.sourceId, state.url), state);
      }
    }
  }

  override async putItemState(state: ItemState) {
    await super.putItemState(state);
    const path = join(this.dir, 'item-states.json');
    writeFileSync(`${path}.tmp`, JSON.stringify([...this.itemStates.values()], null, 1));
    renameSync(`${path}.tmp`, path);
  }
  override async insertRevision(revision: DocumentRevision) {
    const inserted = await super.insertRevision(revision);
    if (inserted) appendFileSync(join(this.dir, 'revisions.jsonl'), `${JSON.stringify(revision)}\n`);
    return inserted;
  }
  override async appendRunReport(report: CollectionRunReport) {
    await super.appendRunReport(report);
    appendFileSync(join(this.dir, 'runs.jsonl'), `${JSON.stringify(report)}\n`);
  }
  override async insertObservations(observations: readonly Observation[]) {
    await super.insertObservations(observations);
    if (observations.length) {
      appendFileSync(join(this.dir, 'observations.jsonl'), observations.map((o) => JSON.stringify(o)).join('\n') + '\n');
    }
  }
  override async appendObservationRunReport(report: ObservationRunReport) {
    await super.appendObservationRunReport(report);
    appendFileSync(join(this.dir, 'observation-runs.jsonl'), `${JSON.stringify(report)}\n`);
  }
}

function readJsonLines<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as T);
}
