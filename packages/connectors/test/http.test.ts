import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import {challengeForBody} from '../src/http/challenge.ts';
import {PoliteHttpClient} from '../src/http/client.ts';
import {redactUrl} from '../src/http/redact.ts';
import {fakeFetch, fixture, html, testHttp} from './helpers.ts';

describe('challenge detection', () => {
  test('recognizes Radware and Incapsula challenge pages', () => {
    assert.equal(challengeForBody(fixture('challenges/radware-block.html'), 'text/html')?.vendor, 'radware_shieldsquare');
    assert.equal(challengeForBody(fixture('challenges/radware-soft302.html'), 'text/html')?.vendor, 'radware_shieldsquare');
    assert.equal(challengeForBody(fixture('challenges/incapsula.html'), 'text/html')?.vendor, 'imperva_incapsula');
  });

  test('does not flag real pages that embed the Radware connector script', () => {
    assert.equal(challengeForBody(fixture('banrep/listing-es.html'), 'text/html'), null);
    assert.equal(challengeForBody(fixture('banrep/article-es.html'), 'text/html'), null);
  });

  test('ignores binary content types', () => {
    assert.equal(challengeForBody('<title>Radware Bot Manager Block</title>', 'application/pdf'), null);
  });
});

describe('PoliteHttpClient', () => {
  test('identifies itself and asks for Spanish then English', async () => {
    const {fetch, calls} = fakeFetch({'https://a.test/': html('<p>ok</p>')});
    const result = await testHttp(fetch, {userAgent: 'dottext-test/1'}).get('https://a.test/');
    assert.equal(result.ok, true);
    assert.equal(calls[0]?.headers['user-agent'], 'dottext-test/1');
    assert.equal(calls[0]?.headers['accept-language'], 'es,en;q=0.8');
  });

  test('reports a challenge as blocked, never retries it, and trips the breaker for the host', async () => {
    const {fetch, calls} = fakeFetch({
      'https://www.banrep.gov.co/a': html(fixture('challenges/radware-block.html')),
      'https://www.banrep.gov.co/b': html(fixture('challenges/radware-block.html')),
      'https://www.banrep.gov.co/c': html('<p>would be fine</p>'),
      'https://other.test/': html('<p>fine</p>'),
    });
    const http = testHttp(fetch);
    const a = await http.get('https://www.banrep.gov.co/a');
    const b = await http.get('https://www.banrep.gov.co/b');
    const c = await http.get('https://www.banrep.gov.co/c');
    const other = await http.get('https://other.test/');
    assert.equal(a.ok || a.kind, 'blocked_by_bot_protection');
    assert.equal(b.ok || b.kind, 'blocked_by_bot_protection');
    assert.equal(c.ok || c.kind, 'skipped_after_challenges');
    assert.equal(other.ok, true);
    assert.deepEqual(
      calls.map((x) => x.url),
      ['https://www.banrep.gov.co/a', 'https://www.banrep.gov.co/b', 'https://other.test/'],
    );
    assert.deepEqual(http.stats, {made: 3, challenged: 2});
  });

  test('treats a redirect to the challenge host as blocked without following it', async () => {
    const {fetch, calls} = fakeFetch({
      'https://www.banrep.gov.co/x': {status: 302, headers: {location: 'https://validate.perfdrive.com/abc/?ssa=1'}},
    });
    const result = await testHttp(fetch).get('https://www.banrep.gov.co/x');
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.challengeVendor, 'radware_shieldsquare');
    assert.equal(calls.length, 1);
  });

  test('follows ordinary redirects', async () => {
    const {fetch} = fakeFetch({
      'https://a.test/old': {status: 301, headers: {location: '/new'}},
      'https://a.test/new': html('<p>moved</p>'),
    });
    const result = await testHttp(fetch).get('https://a.test/old');
    assert.equal(result.ok && result.url, 'https://a.test/new');
  });

  test('retries transient statuses and network errors, then succeeds', async () => {
    const {fetch, calls} = fakeFetch({
      'https://a.test/': [{status: 503}, new TypeError('fetch failed'), html('<p>ok</p>')],
    });
    const result = await testHttp(fetch).get('https://a.test/');
    assert.equal(result.ok, true);
    assert.equal(calls.length, 3);
  });

  test('does not retry ordinary 4xx', async () => {
    const {fetch, calls} = fakeFetch({'https://a.test/': {status: 404}});
    const result = await testHttp(fetch).get('https://a.test/');
    assert.equal(!result.ok && result.kind, 'http_error');
    assert.equal(!result.ok && result.status, 404);
    assert.equal(calls.length, 1);
  });

  test('enforces the per-run request budget', async () => {
    const {fetch} = fakeFetch({'https://a.test/': html('ok')});
    const http = testHttp(fetch, {maxRequests: 1});
    assert.equal((await http.get('https://a.test/')).ok, true);
    const second = await http.get('https://a.test/');
    assert.equal(!second.ok && second.kind, 'request_budget_exhausted');
  });

  test('rejects bodies over the size limit', async () => {
    const {fetch} = fakeFetch({'https://a.test/': {body: 'x'.repeat(2048)}});
    const result = await testHttp(fetch, {maxBytes: 1024}).get('https://a.test/');
    assert.equal(!result.ok && result.kind, 'too_large');
  });

  test('spaces requests to the same host by the policy interval', async () => {
    let clock = 0;
    const waits: number[] = [];
    const {fetch} = fakeFetch({'https://a.test/1': html('1'), 'https://a.test/2': html('2')});
    const http = new PoliteHttpClient({
      fetchImpl: fetch,
      now: () => clock,
      sleep: async (ms) => {
        waits.push(ms);
        clock += ms;
      },
      defaultHostPolicy: {minIntervalMs: 10_000, challengeBreakerThreshold: 2},
    });
    await http.get('https://a.test/1');
    await http.get('https://a.test/2');
    assert.deepEqual(waits, [10_000]);
  });

  test('redacts credentials from reported URLs and messages', async () => {
    const {fetch} = fakeFetch({'https://api.test/x?token=s3cr3t-token&function=GetSeries': new TypeError('failed for token=s3cr3t-token')});
    const http = testHttp(fetch, {maxRetries: 0, secretValues: ['s3cr3t-token']});
    const result = await http.get('https://api.test/x?token=s3cr3t-token&function=GetSeries');
    assert.equal(result.ok, false);
    assert.ok(!result.ok && !result.url.includes('s3cr3t'));
    assert.ok(!result.ok && !result.message.includes('s3cr3t'));
    assert.equal(redactUrl('https://x.test/?user=a&pass=b&q=1'), 'https://x.test/?user=REDACTED&pass=REDACTED&q=1');
  });
});
