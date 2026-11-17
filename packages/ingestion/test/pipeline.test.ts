import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import type {DiscoveredItem, ExtractedDocument, Problem} from '@dottext/contracts';
import {BanrepWebConnector, type CollectionWindow, type DiscoveryResult, type DocumentConnector, type FetchOutcome} from '@dottext/connectors';
import {fakeFetch, fixture, html, testHttp, testSource} from '../../connectors/test/helpers.ts';
import {runDocumentCollection} from '../src/pipeline.ts';
import {MemoryStore} from '../src/store.ts';

const WINDOW = {since: new Date('2026-10-17T00:00:00Z'), until: new Date('2026-11-17T23:59:59Z')};
const NOW = () => new Date('2026-11-17T14:00:00Z');

function item(url: string, published = '2026-11-16'): DiscoveredItem {
  return {
    sourceId: 'banrep-web',
    url,
    language: 'es',
    listedTitle: 'SYNTHETIC',
    listedPublished: {local: published, precision: 'day', timeZone: null, timeZoneBasis: 'not_applicable', utc: null, source: 'test'},
    discoveredVia: 'test',
    hints: {},
  };
}

function doc(url: string, text: string): ExtractedDocument {
  return {
    sourceId: 'banrep-web',
    canonicalUrl: url,
    language: 'es',
    title: 'SYNTHETIC title',
    alternateTitles: [],
    documentType: 'press_release',
    standfirst: 'SYNTHETIC lead',
    text,
    completeness: 'full_text',
    times: {published: null, modified: null, event: null, other: []},
    authors: [],
    subjects: [],
    attachments: [],
    translationGroup: null,
    alternates: [],
    relatedUrls: [],
    publisherIds: {},
    extractorVersion: 'test/1',
  };
}

/** Programmable connector: set what discovery lists and what each URL returns. */
class FakeConnector implements DocumentConnector {
  readonly source = testSource();
  readonly discoverySignalsChange = false;
  listed: DiscoveredItem[] = [];
  discoveryProblems: Problem[] = [];
  pagesSucceeded = 1;
  reachedWindowStart = true;
  responses = new Map<string, FetchOutcome>();
  fetched: string[] = [];

  async discover(_window: CollectionWindow): Promise<DiscoveryResult> {
    return {
      items: this.listed,
      pagesAttempted: 1,
      pagesSucceeded: this.pagesSucceeded,
      itemsListed: this.listed.length,
      oldestListed: null,
      newestListed: null,
      reachedWindowStart: this.reachedWindowStart,
      problems: this.discoveryProblems,
      notes: [],
    };
  }
  async fetch(i: DiscoveredItem): Promise<FetchOutcome> {
    this.fetched.push(i.url);
    return this.responses.get(i.url) ?? {ok: false, problem: {stage: 'fetch', kind: 'http_error', url: i.url, httpStatus: 404, message: 'HTTP 404'}};
  }
  serve(url: string, text: string) {
    this.responses.set(url, {ok: true, document: doc(url, text), collectedAt: NOW().toISOString()});
  }
}

const A = 'https://www.banrep.gov.co/es/noticias/a';
const B = 'https://www.banrep.gov.co/es/noticias/b';
const blocked: FetchOutcome = {
  ok: false,
  problem: {stage: 'fetch', kind: 'blocked_by_bot_protection', url: A, httpStatus: 200, message: 'challenge'},
};

describe('runDocumentCollection', () => {
  test('stores new documents, then reports a quiet run when nothing changed', async () => {
    const store = new MemoryStore();
    const connector = new FakeConnector();
    connector.listed = [item(A), item(B)];
    connector.serve(A, 'SYNTHETIC body A');
    connector.serve(B, 'SYNTHETIC body B');

    const first = await runDocumentCollection(connector, store, {window: WINDOW, now: NOW});
    assert.equal(first.status, 'succeeded');
    assert.equal(first.documents.new, 2);
    assert.equal(store.revisions.size, 2);

    const second = await runDocumentCollection(connector, store, {window: WINDOW, now: NOW, refetchIntervalHours: 0});
    assert.equal(second.status, 'succeeded_quiet');
    assert.equal(second.documents.unchanged, 2);
    assert.equal(store.revisions.size, 2, 'replaying a run must not duplicate revisions');
    assert.equal(store.runReports.length, 2);
  });

  test('a source correction creates a linked revision and keeps the original inspectable', async () => {
    const store = new MemoryStore();
    const connector = new FakeConnector();
    connector.listed = [item(A)];
    connector.serve(A, 'SYNTHETIC: la tasa quedó en 9,99 %.');
    await runDocumentCollection(connector, store, {window: WINDOW, now: NOW});

    connector.serve(A, 'SYNTHETIC: la tasa quedó en 9,75 %. (Corregido)');
    const report = await runDocumentCollection(connector, store, {window: WINDOW, now: NOW, refetchIntervalHours: 0});
    assert.equal(report.documents.revised, 1);

    const [original, corrected] = await store.listRevisions([...store.revisions.values()][0]!.documentId);
    assert.ok(original && corrected);
    assert.equal(corrected.previousRevisionId, original.revisionId);
    assert.equal(corrected.firstSeenAt, original.firstSeenAt);
    assert.equal(original.document.text, 'SYNTHETIC: la tasa quedó en 9,99 %.');

    // Reverting to the original wording is recorded as a further revision, not lost.
    connector.serve(A, 'SYNTHETIC: la tasa quedó en 9,99 %.');
    const reverted = await runDocumentCollection(connector, store, {window: WINDOW, now: NOW, refetchIntervalHours: 0});
    assert.equal(reverted.documents.revised, 1);
    assert.equal(store.revisions.size, 3);
  });

  test('known items older than the refetch horizon are not refetched', async () => {
    const store = new MemoryStore();
    const connector = new FakeConnector();
    connector.listed = [item(A, '2026-10-20')];
    connector.serve(A, 'SYNTHETIC');
    await runDocumentCollection(connector, store, {window: WINDOW, now: NOW});
    connector.fetched = [];

    const report = await runDocumentCollection(connector, store, {window: WINDOW, now: NOW, refetchKnownWithinDays: 7});
    assert.equal(report.documents.skippedKnown, 1);
    assert.deepEqual(connector.fetched, []);
  });

  test('hourly runs recheck a recent known item at most once per refetch interval', async () => {
    const store = new MemoryStore();
    const connector = new FakeConnector();
    connector.listed = [item(A)];
    connector.serve(A, 'SYNTHETIC');
    let clock = Date.parse('2026-11-17T14:00:00Z');
    const now = () => new Date(clock);
    await runDocumentCollection(connector, store, {window: WINDOW, now});
    connector.fetched = [];

    clock += 3_600_000; // one hour later
    const hourly = await runDocumentCollection(connector, store, {window: WINDOW, now});
    assert.equal(hourly.documents.skippedKnown, 1);
    assert.deepEqual(connector.fetched, []);

    clock += 24 * 3_600_000; // a day later: due for a correction check
    const daily = await runDocumentCollection(connector, store, {window: WINDOW, now});
    assert.equal(daily.documents.unchanged, 1);
    assert.deepEqual(connector.fetched, [A]);
  });

  test('blocked discovery is reported as blocked, never as a quiet day', async () => {
    const store = new MemoryStore();
    const connector = new FakeConnector();
    connector.pagesSucceeded = 0;
    connector.reachedWindowStart = false;
    connector.discoveryProblems = [{stage: 'discover', kind: 'blocked_by_bot_protection', url: A, httpStatus: 200, message: 'challenge'}];
    const report = await runDocumentCollection(connector, store, {window: WINDOW, now: NOW});
    assert.equal(report.status, 'blocked');
    assert.equal(store.revisions.size, 0);
  });

  test('incomplete window coverage is partial even if nothing failed', async () => {
    const connector = new FakeConnector();
    connector.reachedWindowStart = false;
    const report = await runDocumentCollection(connector, new MemoryStore(), {window: WINDOW, now: NOW});
    assert.equal(report.status, 'partial');
  });

  test('failed items stay pending and are retried after they leave the listing', async () => {
    const store = new MemoryStore();
    const connector = new FakeConnector();
    connector.listed = [item(A)];
    connector.responses.set(A, blocked);
    const first = await runDocumentCollection(connector, store, {window: WINDOW, now: NOW});
    assert.equal(first.status, 'partial');
    assert.equal(first.documents.failed, 1);
    assert.equal((await store.listPendingItems('banrep-web')).length, 1);

    connector.listed = [];
    connector.serve(A, 'SYNTHETIC recovered');
    const second = await runDocumentCollection(connector, store, {window: WINDOW, now: NOW});
    assert.equal(second.documents.retriedFromEarlierRuns, 1);
    assert.equal(second.documents.new, 1);
    assert.equal((await store.listPendingItems('banrep-web')).length, 0);
  });

  test('stops retrying after the failure limit', async () => {
    const store = new MemoryStore();
    const connector = new FakeConnector();
    connector.listed = [item(A)];
    connector.responses.set(A, blocked);
    for (let i = 0; i < 3; i++) await runDocumentCollection(connector, store, {window: WINDOW, now: NOW, maxConsecutiveFailures: 3});
    const state = await store.getItemState('banrep-web', A);
    assert.equal(state?.consecutiveFailures, 3);
    assert.equal(state?.pending, null);
    assert.equal(state?.lastFailureKind, 'blocked_by_bot_protection');
  });

  test('access policy reduces stored text and says so', async () => {
    const store = new MemoryStore();
    const connector = new FakeConnector();
    (connector.source as {accessPolicy: {maxStoredText: string}}).accessPolicy.maxStoredText = 'metadata_only';
    connector.listed = [item(A)];
    connector.serve(A, 'SYNTHETIC full text');
    await runDocumentCollection(connector, store, {window: WINDOW, now: NOW});
    const [revision] = store.revisions.values();
    assert.equal(revision?.textReducedByPolicy, true);
    assert.equal(revision?.document.text, null);
    assert.equal(revision?.document.standfirst, null);
    assert.equal(revision?.document.completeness, 'metadata_only');
  });

  test('a document failing contract validation is rejected, not stored, not retried', async () => {
    const store = new MemoryStore();
    const connector = new FakeConnector();
    connector.listed = [item(A)];
    connector.responses.set(A, {ok: true, document: {...doc(A, 'x'), title: ''}, collectedAt: NOW().toISOString()});
    const report = await runDocumentCollection(connector, store, {window: WINDOW, now: NOW});
    assert.equal(report.problems[0]?.kind, 'parse_error');
    assert.equal(store.revisions.size, 0);
    assert.equal((await store.listPendingItems('banrep-web')).length, 0);
  });

  test('dry run discovers without fetching or storing documents', async () => {
    const store = new MemoryStore();
    const connector = new FakeConnector();
    connector.listed = [item(A)];
    connector.serve(A, 'SYNTHETIC');
    const report = await runDocumentCollection(connector, store, {window: WINDOW, now: NOW, dryRun: true});
    assert.equal(report.discovery.itemsInWindow, 1);
    assert.deepEqual(connector.fetched, []);
    assert.equal(store.revisions.size, 0);
  });
});

describe('BanRep web end to end (synthetic fixtures through the real parser)', () => {
  test('collects both language versions as one translation group', async () => {
    const base = 'https://www.banrep.gov.co';
    const {fetch} = fakeFetch({
      [`${base}/es/noticias`]: html(fixture('banrep/listing-es.html')),
      [`${base}/en/press-releases`]: html(fixture('banrep/listing-en.html')),
      [`${base}/es/noticias/junta-directiva/comunicado-sintetico-noviembre-2026`]: html(fixture('banrep/article-es.html')),
      [`${base}/en/news/board-directors/synthetic-statement-november-2026`]: html(fixture('banrep/article-en.html')),
      // The minutes page is challenged: the run must say so and keep the item pending.
      [`${base}/es/noticias/junta-directiva/minutas-sinteticas-octubre-2026`]: html(fixture('challenges/radware-block.html')),
    });
    const http = testHttp(fetch);
    const store = new MemoryStore();
    const report = await runDocumentCollection(new BanrepWebConnector(testSource(), http), store, {
      window: WINDOW,
      now: NOW,
      requestStats: http.stats,
    });

    assert.equal(report.status, 'partial');
    assert.equal(report.documents.new, 2);
    assert.equal(report.documents.failed, 1);
    assert.deepEqual(report.requests, {made: 5, challenged: 1});
    const groups = new Set([...store.revisions.values()].map((r) => r.document.translationGroup));
    assert.deepEqual([...groups], ['banrep-web:node:90001']);
    const languages = [...store.revisions.values()].map((r) => r.document.language).sort();
    assert.deepEqual(languages, ['en', 'es']);
  });
});
