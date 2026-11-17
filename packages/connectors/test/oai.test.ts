import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import {OaiPmhConnector} from '../src/oai/connector.ts';
import {parseOaiRecords, parseOreAttachments} from '../src/oai/pmh.ts';
import {fakeFetch, fixture, html, testHttp, testSource, xml} from './helpers.ts';

const ENDPOINT = 'https://repositorio.banrep.gov.co/server/oai/request';
const source = testSource({id: 'banrep-repositorio', channel: 'oai_pmh', baseUrl: 'https://repositorio.banrep.gov.co'});
const window = {since: new Date('2026-10-17T00:00:00Z'), until: new Date('2026-11-17T23:59:59Z')};

function listUrl(params: Record<string, string>): string {
  const url = new URL(ENDPOINT);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.toString();
}
const FIRST_PAGE = listUrl({verb: 'ListRecords', metadataPrefix: 'oai_dc', from: '2026-10-17T00:00:00Z', until: '2026-11-17T23:59:59Z'});
const SECOND_PAGE = listUrl({verb: 'ListRecords', resumptionToken: 'oai_dc/2026-10-17T00:00:00Z///100'});
const ORE_99001 = listUrl({verb: 'GetRecord', metadataPrefix: 'ore', identifier: 'oai:repositorio.banrep.gov.co:20.500.12134/99001'});

describe('parseOaiRecords', () => {
  test('parses records, header identifiers (distinct from dc:identifier), and the resumption token', () => {
    const parsed = parseOaiRecords(fixture('oai/list-records-page1.xml'));
    assert.ok(parsed.ok);
    assert.equal(parsed.records.length, 2);
    assert.equal(parsed.records[0]?.identifier, 'oai:repositorio.banrep.gov.co:20.500.12134/99001');
    assert.equal(parsed.records[0]?.dc.identifier.length, 3);
    assert.deepEqual(parsed.records[0]?.setSpecs, ['com_20.500.12134_7018', 'col_20.500.12134_7264']);
    assert.equal(parsed.resumptionToken, 'oai_dc/2026-10-17T00:00:00Z///100');
    assert.equal(parsed.completeListSize, 4);
    assert.equal(parsed.records[0]?.dc.subject[2]?.lang, 'en');
  });

  test('an empty self-closing token ends the list; deleted records are flagged', () => {
    const parsed = parseOaiRecords(fixture('oai/list-records-page2.xml'));
    assert.ok(parsed.ok);
    assert.equal(parsed.resumptionToken, null);
    assert.equal(parsed.records[1]?.deleted, true);
  });

  test('noRecordsMatch is a quiet success; other OAI errors fail', () => {
    assert.deepEqual(parseOaiRecords(fixture('oai/no-records-match.xml')), {
      ok: true,
      records: [],
      resumptionToken: null,
      completeListSize: 0,
    });
    const bad = parseOaiRecords(fixture('oai/bad-resumption-token.xml'));
    assert.equal(bad.ok, false);
    assert.equal(!bad.ok && bad.code, 'badResumptionToken');
    assert.equal(parseOaiRecords(fixture('challenges/radware-soft302.html')).ok, false);
  });

  test('refuses documents that declare DTD entities', () => {
    const hostile = '<?xml version="1.0"?><!DOCTYPE x [<!ENTITY a "aaaa"><!ENTITY b "&a;&a;&a;">]><OAI-PMH><ListRecords/></OAI-PMH>';
    const parsed = parseOaiRecords(hostile);
    assert.equal(parsed.ok, false);
    assert.match(!parsed.ok ? parsed.error : '', /entity/);
  });

  test('ORE resource maps list aggregated files with type and length', () => {
    const ore = parseOreAttachments(fixture('oai/get-record-ore.xml'));
    assert.ok(ore.ok);
    assert.deepEqual(
      ore.attachments.map((a) => [a.title, a.mediaType, a.byteLength]),
      [
        ['SYNTHETIC-informe.pdf', 'application/pdf', 11436991],
        ['SYNTHETIC-graficos.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1554727],
      ],
    );
  });
});

describe('OaiPmhConnector', () => {
  const options = {
    endpoint: ENDPOINT,
    setNames: {'col_20.500.12134_7264': 'Informe de Política Monetaria (anterior Informe sobre Inflación)'},
    datestampTracksChanges: true,
    enrichAttachments: true,
  };

  test('harvests through resumption tokens; skips deleted and untitled records with a note', async () => {
    const {fetch, calls} = fakeFetch({
      [FIRST_PAGE]: xml(fixture('oai/list-records-page1.xml')),
      [SECOND_PAGE]: xml(fixture('oai/list-records-page2.xml')),
    });
    const result = await new OaiPmhConnector(source, testHttp(fetch), options).discover(window);
    assert.deepEqual(
      calls.map((c) => c.url),
      [FIRST_PAGE, SECOND_PAGE],
    );
    assert.deepEqual(
      result.items.map((i) => [i.url, i.language]),
      [
        ['https://repositorio.banrep.gov.co/handle/20.500.12134/99001', 'es'],
        ['https://repositorio.banrep.gov.co/handle/20.500.12134/99002', 'es'],
      ],
    );
    assert.equal(result.itemsListed, 4);
    assert.equal(result.reachedWindowStart, true);
    assert.deepEqual(result.notes, ['skipped oai:repositorio.banrep.gov.co:20.500.12134/99003: record has no title yet']);
  });

  test('maps issued vs repository times, bilingual titles, abstract as excerpt, and ORE files', async () => {
    const {fetch} = fakeFetch({
      [FIRST_PAGE]: xml(fixture('oai/list-records-page1.xml')),
      [SECOND_PAGE]: xml(fixture('oai/list-records-page2.xml')),
      [ORE_99001]: xml(fixture('oai/get-record-ore.xml')),
    });
    const connector = new OaiPmhConnector(source, testHttp(fetch), options);
    const {items} = await connector.discover(window);

    const report = await connector.fetch(items[0]!);
    assert.ok(report.ok);
    const d = report.document;
    assert.equal(d.documentType, 'monetary_policy_report');
    assert.equal(d.times.published?.local, '2026-11-04');
    assert.equal(d.times.published?.precision, 'day');
    assert.deepEqual(
      d.times.other.map((o) => [o.label, o.time.utc]),
      [
        ['repository_accessioned', '2026-11-04T15:52:22.000Z'],
        ['repository_record_datestamp', '2026-11-10T16:07:49.000Z'],
      ],
    );
    assert.equal(d.completeness, 'excerpt');
    assert.equal(d.text, null);
    assert.equal(d.standfirst, 'SYNTHETIC: Resumen del informe con cifras inventadas (9,99 %).');
    assert.equal(d.attachments.length, 2);
    assert.deepEqual(d.relatedUrls, ['https://www.banrep.gov.co/es/synthetic-related']);
    assert.deepEqual(d.publisherIds, {
      oaiIdentifier: 'oai:repositorio.banrep.gov.co:20.500.12134/99001',
      handle: '20.500.12134/99001',
    });

    const paper = await new OaiPmhConnector(source, testHttp(fetch), {...options, enrichAttachments: false}).fetch(items[1]!);
    assert.ok(paper.ok);
    assert.equal(paper.document.documentType, 'research_paper');
    assert.deepEqual(paper.document.alternateTitles, ['SYNTHETIC The Economic Development of an Invented Country']);
    assert.equal(paper.document.times.published?.precision, 'month');
    assert.equal(paper.document.standfirst, 'SYNTHETIC abstract paragraph one.\n\nSYNTHETIC abstract paragraph two.');
  });

  test('a challenged ORE request fails the item (to be retried) instead of storing it without files', async () => {
    const {fetch} = fakeFetch({
      [FIRST_PAGE]: xml(fixture('oai/list-records-page1.xml')),
      [SECOND_PAGE]: xml(fixture('oai/list-records-page2.xml')),
      [ORE_99001]: html(fixture('challenges/radware-soft302.html')),
    });
    const connector = new OaiPmhConnector(source, testHttp(fetch), options);
    const {items} = await connector.discover(window);
    const outcome = await connector.fetch(items[0]!);
    assert.equal(!outcome.ok && outcome.problem.kind, 'blocked_by_bot_protection');
  });

  test('when datestamps do not track changes, harvest without from/until and filter by issued date', async () => {
    const unbounded = listUrl({verb: 'ListRecords', metadataPrefix: 'oai_dc'});
    const {fetch, calls} = fakeFetch({
      [unbounded]: xml(fixture('oai/list-records-page1.xml')),
      [SECOND_PAGE]: xml(fixture('oai/list-records-page2.xml')),
    });
    const connector = new OaiPmhConnector(source, testHttp(fetch), {...options, datestampTracksChanges: false});
    assert.equal(connector.discoverySignalsChange, false);
    const result = await connector.discover({since: new Date('2026-11-01T00:00:00Z'), until: window.until});
    assert.equal(calls[0]?.url, unbounded);
    // 99002 was issued 2026-10 (month precision) and overlaps 2026-11-01? No — October ends before the window.
    assert.deepEqual(
      result.items.map((i) => i.url),
      ['https://repositorio.banrep.gov.co/handle/20.500.12134/99001'],
    );
  });
});
