import {readFileSync} from 'node:fs';
import type {SourceDefinition} from '@dottext/contracts';
import {PoliteHttpClient, type HttpClientOptions} from '../src/http/client.ts';

export function fixture(path: string): string {
  return readFileSync(new URL(`./fixtures/${path}`, import.meta.url), 'utf8');
}

export interface FakeResponse {
  status?: number;
  body?: string | null;
  headers?: Record<string, string>;
}
type Route = FakeResponse | Error;

/**
 * A fetch stand-in keyed by exact URL. An array answers successive calls in order
 * (the last entry repeats). Unknown URLs answer 404.
 */
export function fakeFetch(routes: Record<string, Route | Route[]>) {
  const calls: Array<{url: string; headers: Record<string, string>}> = [];
  const counters = new Map<string, number>();
  const impl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    calls.push({url, headers: Object.fromEntries(new Headers(init?.headers).entries())});
    const route = routes[url];
    if (route === undefined) return new Response('not found', {status: 404});
    const index = counters.get(url) ?? 0;
    counters.set(url, index + 1);
    const answer = Array.isArray(route) ? route[Math.min(index, route.length - 1)]! : route;
    if (answer instanceof Error) throw answer;
    return new Response(answer.body ?? null, {status: answer.status ?? 200, headers: answer.headers ?? {}});
  }) as typeof fetch;
  return {fetch: impl, calls};
}

export function testHttp(fetchImpl: typeof fetch, options: Partial<HttpClientOptions> = {}): PoliteHttpClient {
  return new PoliteHttpClient({
    fetchImpl,
    sleep: async () => {},
    defaultHostPolicy: {minIntervalMs: 0, challengeBreakerThreshold: 2},
    ...options,
  });
}

export const html = (body: string): FakeResponse => ({body, headers: {'content-type': 'text/html; charset=utf-8'}});
export const xml = (body: string): FakeResponse => ({body, headers: {'content-type': 'text/xml;charset=UTF-8'}});
export const json = (body: string): FakeResponse => ({body, headers: {'content-type': 'application/json'}});

export function testSource(overrides: Partial<SourceDefinition> = {}): SourceDefinition {
  return {
    id: 'banrep-web',
    publisher: 'Banco de la República',
    country: 'colombia',
    kind: 'official',
    channel: 'website',
    languages: ['es', 'en'],
    baseUrl: 'https://www.banrep.gov.co',
    publisherTimeZone: 'America/Bogota',
    status: 'validating',
    statusReason: 'test',
    accessPolicy: {
      maxStoredText: 'full_text',
      storeSnapshots: false,
      termsUrl: 'https://www.banrep.gov.co/en/legal-notice',
      termsSummary: 'test',
      termsReviewedOn: '2026-11-17',
      ownerConfirmed: false,
    },
    rateLimit: {minIntervalMs: 1, maxRequestsPerRun: 50, challengeBreakerThreshold: 2},
    onboardingRecord: 'config/sources/records/banrep-web.md',
    ...overrides,
  };
}
