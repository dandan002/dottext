import type {FailureKind} from '@dottext/contracts';
import {challengeForBody, challengeForRedirect, type ChallengeVendor} from './challenge.ts';
import {DEFAULT_SECRET_PARAMS, redactText, redactUrl} from './redact.ts';

export const DEFAULT_USER_AGENT = 'dottext-collector/0.1 (private research; low-rate)';

export interface HostPolicy {
  minIntervalMs: number;
  /** Consecutive challenges after which further requests to the host are skipped. */
  challengeBreakerThreshold: number;
}

export interface HttpClientOptions {
  userAgent?: string;
  /** Applied to hosts without an explicit policy. */
  defaultHostPolicy?: HostPolicy;
  hostPolicies?: Record<string, HostPolicy>;
  /** Total requests this client may make (one client per collection run). */
  maxRequests?: number;
  timeoutMs?: number;
  /** Retries for network errors, 429, and 502/503/504. Challenges are never retried. */
  maxRetries?: number;
  maxBytes?: number;
  /** Query parameter names whose values are redacted from reported URLs. */
  secretParams?: readonly string[];
  /** Literal secret values to scrub from error text. */
  secretValues?: readonly string[];
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export interface GetOptions {
  accept?: string;
  maxBytes?: number;
}

export interface HttpSuccess {
  ok: true;
  /** Final URL after redirects, redacted. */
  url: string;
  status: number;
  contentType: string | null;
  body: Uint8Array;
  text: string;
  fetchedAt: string;
}

export interface HttpFailure {
  ok: false;
  kind: FailureKind;
  url: string;
  status: number | null;
  message: string;
  challengeVendor?: ChallengeVendor;
}

export type HttpResult = HttpSuccess | HttpFailure;

const MAX_REDIRECTS = 5;
const TRANSIENT_STATUSES = new Set([429, 502, 503, 504]);

/**
 * Sequential-per-host, budgeted HTTP client. One instance per collection run so the
 * request budget and challenge breaker reflect that run.
 */
export class PoliteHttpClient {
  readonly stats = {made: 0, challenged: 0};

  #userAgent: string;
  #defaultPolicy: HostPolicy;
  #policies: Record<string, HostPolicy>;
  #maxRequests: number;
  #timeoutMs: number;
  #maxRetries: number;
  #maxBytes: number;
  #secretParams: readonly string[];
  #secretValues: readonly string[];
  #fetch: typeof fetch;
  #sleep: (ms: number) => Promise<void>;
  #now: () => number;
  #queues = new Map<string, Promise<void>>();
  #nextAllowedAt = new Map<string, number>();
  #consecutiveChallenges = new Map<string, number>();

  constructor(options: HttpClientOptions = {}) {
    this.#userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.#defaultPolicy = options.defaultHostPolicy ?? {minIntervalMs: 5_000, challengeBreakerThreshold: 2};
    this.#policies = options.hostPolicies ?? {};
    this.#maxRequests = options.maxRequests ?? 100;
    this.#timeoutMs = options.timeoutMs ?? 30_000;
    this.#maxRetries = options.maxRetries ?? 2;
    this.#maxBytes = options.maxBytes ?? 20 * 1024 * 1024;
    this.#secretParams = options.secretParams ?? DEFAULT_SECRET_PARAMS;
    this.#secretValues = options.secretValues ?? [];
    this.#fetch = options.fetchImpl ?? globalThis.fetch;
    this.#sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.#now = options.now ?? Date.now;
  }

  /** Whether the challenge breaker has tripped for this host during this run. */
  isHostTripped(host: string): boolean {
    return (this.#consecutiveChallenges.get(host) ?? 0) >= this.#policyFor(host).challengeBreakerThreshold;
  }

  async get(url: string, options: GetOptions = {}): Promise<HttpResult> {
    let current = url;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const result = await this.#getOnce(current, options);
      if (!('redirectTo' in result)) return result;
      const challenge = challengeForRedirect(result.redirectTo);
      if (challenge) return this.#challenged(current, result.status, challenge.vendor, challenge.evidence);
      current = result.redirectTo;
    }
    return this.#failure('http_error', current, null, `more than ${MAX_REDIRECTS} redirects`);
  }

  async #getOnce(url: string, options: GetOptions): Promise<HttpResult | {redirectTo: string; status: number}> {
    let host: string;
    try {
      host = new URL(url).host;
    } catch {
      return this.#failure('http_error', url, null, 'invalid URL');
    }
    if (this.isHostTripped(host)) {
      return this.#failure(
        'skipped_after_challenges',
        url,
        null,
        `skipped: ${host} answered repeated bot-protection challenges this run`,
      );
    }

    for (let attempt = 0; ; attempt++) {
      if (this.stats.made >= this.#maxRequests) {
        return this.#failure('request_budget_exhausted', url, null, `request budget of ${this.#maxRequests} used`);
      }
      const release = await this.#acquire(host);
      let response: Response;
      try {
        this.stats.made++;
        response = await this.#fetch(url, {
          method: 'GET',
          redirect: 'manual',
          headers: {
            'user-agent': this.#userAgent,
            accept: options.accept ?? '*/*',
            'accept-language': 'es,en;q=0.8',
          },
          signal: AbortSignal.timeout(this.#timeoutMs),
        });
      } catch (error) {
        release();
        const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
        if (attempt < this.#maxRetries) {
          await this.#sleep(this.#backoffMs(attempt));
          continue;
        }
        return this.#failure(timedOut ? 'timeout' : 'network_error', url, null, describeError(error));
      }

      if (response.status >= 300 && response.status < 400) {
        release();
        await response.body?.cancel();
        const location = response.headers.get('location');
        if (!location) return this.#failure('http_error', url, response.status, 'redirect without Location');
        return {redirectTo: new URL(location, url).toString(), status: response.status};
      }

      const contentType = response.headers.get('content-type');
      const read = await readLimited(response, options.maxBytes ?? this.#maxBytes);
      release();
      if (!read.ok) return this.#failure('too_large', url, response.status, read.message);
      const text = decode(read.body, contentType);

      const challenge = challengeForBody(text.slice(0, 64 * 1024), contentType);
      if (challenge) return this.#challenged(url, response.status, challenge.vendor, challenge.evidence);
      this.#consecutiveChallenges.set(host, 0);

      if (TRANSIENT_STATUSES.has(response.status) && attempt < this.#maxRetries) {
        const retryAfter = Number(response.headers.get('retry-after'));
        await this.#sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : this.#backoffMs(attempt));
        continue;
      }
      if (response.status >= 400) {
        return this.#failure('http_error', url, response.status, `HTTP ${response.status}`);
      }
      return {
        ok: true,
        url: redactUrl(url, this.#secretParams),
        status: response.status,
        contentType,
        body: read.body,
        text,
        fetchedAt: new Date(this.#now()).toISOString(),
      };
    }
  }

  #policyFor(host: string): HostPolicy {
    return this.#policies[host] ?? this.#defaultPolicy;
  }

  /** Serialize requests per host and enforce spacing measured from the previous response. */
  async #acquire(host: string): Promise<() => void> {
    const previous = this.#queues.get(host) ?? Promise.resolve();
    let release!: () => void;
    const mine = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.#queues.set(
      host,
      previous.then(() => mine),
    );
    await previous;
    const wait = (this.#nextAllowedAt.get(host) ?? 0) - this.#now();
    if (wait > 0) await this.#sleep(wait);
    return () => {
      this.#nextAllowedAt.set(host, this.#now() + this.#policyFor(host).minIntervalMs);
      release();
    };
  }

  #backoffMs(attempt: number): number {
    return 2_000 * 2 ** attempt;
  }

  #challenged(url: string, status: number, vendor: ChallengeVendor, evidence: string): HttpFailure {
    this.stats.challenged++;
    let host = '';
    try {
      host = new URL(url).host;
    } catch {
      // unreachable: url was already parsed
    }
    this.#consecutiveChallenges.set(host, (this.#consecutiveChallenges.get(host) ?? 0) + 1);
    const failure = this.#failure('blocked_by_bot_protection', url, status, `bot-protection challenge (${vendor}): ${evidence}`);
    failure.challengeVendor = vendor;
    return failure;
  }

  #failure(kind: FailureKind, url: string, status: number | null, message: string): HttpFailure {
    return {
      ok: false,
      kind,
      url: redactUrl(url, this.#secretParams),
      status,
      message: redactText(message, this.#secretValues),
    };
  }
}

async function readLimited(
  response: Response,
  maxBytes: number,
): Promise<{ok: true; body: Uint8Array} | {ok: false; message: string}> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await response.body?.cancel();
    return {ok: false, message: `declared ${declared} bytes exceeds limit ${maxBytes}`};
  }
  if (!response.body) return {ok: true, body: new Uint8Array()};
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of response.body) {
    total += chunk.byteLength;
    if (total > maxBytes) {
      await response.body.cancel().catch(() => {});
      return {ok: false, message: `body exceeds limit ${maxBytes}`};
    }
    chunks.push(chunk);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return {ok: true, body};
}

function decode(body: Uint8Array, contentType: string | null): string {
  const charset = /charset=([^;]+)/i.exec(contentType ?? '')?.[1]?.trim().toLowerCase() ?? 'utf-8';
  try {
    return new TextDecoder(charset).decode(body);
  } catch {
    return new TextDecoder('utf-8').decode(body);
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    const cause = error.cause instanceof Error ? `: ${error.cause.message}` : '';
    return `${error.name}: ${error.message}${cause}`;
  }
  return String(error);
}
