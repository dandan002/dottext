import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import {BanrepWebConnector, parseBanrepArticle, parseBanrepListing} from '../src/banrep/web.ts';
import {fakeFetch, fixture, html, testHttp, testSource} from './helpers.ts';

const BASE = 'https://www.banrep.gov.co';
const ES_ARTICLE = `${BASE}/es/noticias/junta-directiva/comunicado-sintetico-noviembre-2026`;
const EN_ARTICLE = `${BASE}/en/news/board-directors/synthetic-statement-november-2026`;

describe('parseBanrepListing', () => {
  test('reads only the main listing table, skipping menu decoys, other blocks, and other hosts', () => {
    const parsed = parseBanrepListing(fixture('banrep/listing-es.html'), `${BASE}/es/noticias`);
    assert.ok(parsed.ok);
    assert.deepEqual(
      parsed.value.rows.map((r) => r.url),
      [
        ES_ARTICLE,
        `${BASE}/es/noticias/junta-directiva/minutas-sinteticas-octubre-2026`,
        `${BASE}/es/noticias/reporte-sintetico-septiembre-2026`,
      ],
    );
    assert.equal(parsed.value.hasNextPage, true);
  });

  test('keeps the date part only and the local clock separately', () => {
    const parsed = parseBanrepListing(fixture('banrep/listing-es.html'), `${BASE}/es/noticias`);
    assert.ok(parsed.ok);
    assert.deepEqual(parsed.value.rows[0], {
      url: ES_ARTICLE,
      title: 'SYNTHETIC: La Junta Directiva del Banco de la República mantuvo la tasa de interés de política monetaria',
      date: '2026-11-06',
      clock: '13:00',
    });
  });

  test('fails loudly on a page without the listing (never "no news")', () => {
    const parsed = parseBanrepListing(fixture('challenges/radware-block.html'), `${BASE}/es/noticias`);
    assert.equal(parsed.ok, false);
  });
});

describe('parseBanrepArticle', () => {
  const parsed = parseBanrepArticle(fixture('banrep/article-es.html'), ES_ARTICLE, {
    sourceId: 'banrep-web',
    timeZone: 'America/Bogota',
  });

  test('extracts title, standfirst, and body paragraphs in original Spanish', () => {
    assert.ok(parsed.ok);
    const d = parsed.value;
    assert.equal(d.title, 'SYNTHETIC: La Junta Directiva mantuvo la tasa de interés de política monetaria');
    assert.equal(d.standfirst, 'SYNTHETIC: La Junta Directiva decidió por mayoría mantener la tasa en 9,99 %.');
    assert.equal(
      d.text,
      [
        'SYNTHETIC: Cuatro directores votaron por mantener la tasa y tres por reducirla en 25 puntos básicos.',
        'SYNTHETIC: Segunda línea del párrafo\ncon salto de línea y espacio duro.',
        'Indicador | Valor',
        'Inflación anual | 9,99 %',
        'Presentación (PDF)',
      ].join('\n\n'),
    );
    assert.equal(d.completeness, 'full_text');
    assert.equal(d.language, 'es');
  });

  test('publication time combines the date field with Bogotá local time', () => {
    assert.ok(parsed.ok);
    assert.equal(parsed.value.times.published?.local, '2026-11-06T13:00');
    assert.equal(parsed.value.times.published?.utc, '2026-11-06T18:00:00.000Z');
    assert.equal(parsed.value.times.modified, null);
  });

  test('links the English twin through the Drupal node and hreflang', () => {
    assert.ok(parsed.ok);
    assert.equal(parsed.value.translationGroup, 'banrep-web:node:90001');
    assert.deepEqual(parsed.value.alternates, [{language: 'en', url: EN_ARTICLE}]);
    const english = parseBanrepArticle(fixture('banrep/article-en.html'), EN_ARTICLE, {sourceId: 'banrep-web', timeZone: 'America/Bogota'});
    assert.ok(english.ok);
    assert.equal(english.value.translationGroup, parsed.value.translationGroup);
    assert.equal(english.value.language, 'en');
    // The English page has no time field: day precision, not a guessed instant.
    assert.equal(english.value.times.published?.precision, 'day');
  });

  test('records attachments, related links, publisher IDs, and a bilingual document type', () => {
    assert.ok(parsed.ok);
    assert.deepEqual(parsed.value.attachments, [
      {
        url: `${BASE}/sites/default/files/synthetic/presentacion-sintetica.pdf`,
        title: 'Presentación (PDF)',
        mediaType: 'application/pdf',
        byteLength: null,
      },
    ]);
    assert.deepEqual(parsed.value.relatedUrls, [`${BASE}/es/noticias/junta-directiva/anuncio-sintetico-octubre-2026`]);
    assert.deepEqual(parsed.value.publisherIds, {drupalNode: '90001', drupalNodeType: 'noticias'});
    assert.equal(parsed.value.documentType, 'policy_decision');
  });
});

describe('BanrepWebConnector', () => {
  const window = {since: new Date('2026-10-17T00:00:00Z'), until: new Date('2026-11-17T23:59:59Z')};

  test('discovers Spanish and English listings, stops paging once a page predates the window', async () => {
    const {fetch, calls} = fakeFetch({
      [`${BASE}/es/noticias`]: html(fixture('banrep/listing-es.html')),
      [`${BASE}/en/press-releases`]: html(fixture('banrep/listing-en.html')),
    });
    const connector = new BanrepWebConnector(testSource(), testHttp(fetch));
    const result = await connector.discover(window);

    assert.deepEqual(
      result.items.map((i) => [i.language, i.url]),
      [
        ['es', ES_ARTICLE],
        ['es', `${BASE}/es/noticias/junta-directiva/minutas-sinteticas-octubre-2026`],
        ['en', EN_ARTICLE],
      ],
    );
    // Page 0 of the Spanish listing already reaches 2026-10-12 < since, so page 1 is not requested.
    assert.deepEqual(
      calls.map((c) => c.url),
      [`${BASE}/es/noticias`, `${BASE}/en/press-releases`],
    );
    assert.equal(result.reachedWindowStart, true);
    assert.equal(result.oldestListed?.local, '2026-09-01T10:00');
    assert.equal(result.problems.length, 0);
  });

  test('a challenged listing is a blocked problem, not an empty listing', async () => {
    const {fetch} = fakeFetch({
      [`${BASE}/es/noticias`]: html(fixture('challenges/radware-block.html')),
      [`${BASE}/en/press-releases`]: html(fixture('challenges/radware-block.html')),
    });
    const result = await new BanrepWebConnector(testSource(), testHttp(fetch)).discover(window);
    assert.equal(result.items.length, 0);
    assert.equal(result.pagesSucceeded, 0);
    assert.equal(result.reachedWindowStart, false);
    assert.deepEqual(
      result.problems.map((p) => p.kind),
      ['blocked_by_bot_protection', 'blocked_by_bot_protection'],
    );
  });

  test('reports when the page cap stops discovery before the window start', async () => {
    const {fetch} = fakeFetch({
      [`${BASE}/es/noticias`]: html(fixture('banrep/listing-es.html')),
    });
    const connector = new BanrepWebConnector(testSource(), testHttp(fetch), {
      listings: [{path: '/es/noticias', language: 'es'}],
      maxPagesPerListing: 1,
    });
    const result = await connector.discover({since: new Date('2026-01-01T00:00:00Z'), until: window.until});
    assert.equal(result.reachedWindowStart, false);
  });
});
