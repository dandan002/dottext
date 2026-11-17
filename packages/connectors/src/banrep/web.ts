import type {
  Alternate,
  Attachment,
  DiscoveredItem,
  ExtractedDocument,
  Language,
  Problem,
  SourceDefinition,
} from '@dottext/contracts';
import {classifyCentralBankDocument} from '../classify.ts';
import {problemFromHttp, type CollectionWindow, type DiscoveryResult, type DocumentConnector, type FetchOutcome} from '../connector.ts';
import {all, paragraphsOf, parseHtmlDocument, textOf, type DomDocument, type DomElement} from '../html.ts';
import type {PoliteHttpClient} from '../http/client.ts';
import {certainlyBefore, compareLocal, mayFallInWindow, timeFromParts} from '../time.ts';

/**
 * Banco de la República (www.banrep.gov.co, Drupal 11).
 *
 * Discovery reads the paginated press listings in Spanish and English. Spanish is
 * the complete record (≈297 pages on 2026-11-17); English is a translated subset
 * (≈43 pages), so English is discovered too — some items exist only there — and
 * the two versions are linked through the shared Drupal node ID and hreflang
 * alternates.
 *
 * Listing and article dates are Drupal date-only fields serialized as
 * `YYYY-MM-DDT12:00:00Z`; the noon is an artifact. The separate "Hora"/"Time"
 * column/field is local Bogotá wall-clock time.
 *
 * The site sits behind Radware Bot Manager; challenges are reported, not retried.
 */

export const BANREP_WEB_EXTRACTOR_VERSION = 'banrep-web/1';

export interface BanrepListing {
  path: string;
  language: Language;
}

export const BANREP_DEFAULT_LISTINGS: readonly BanrepListing[] = [
  {path: '/es/noticias', language: 'es'},
  {path: '/en/press-releases', language: 'en'},
];

export interface BanrepListingRow {
  url: string;
  title: string;
  date: string | null;
  clock: string | null;
}

export type ParseResult<T> = {ok: true; value: T} | {ok: false; error: string};

export function parseBanrepListing(
  html: string,
  pageUrl: string,
): ParseResult<{rows: BanrepListingRow[]; hasNextPage: boolean}> {
  const doc = parseHtmlDocument(html);
  const main = doc.querySelector('.block-system-main-block');
  const table = main?.querySelector('.views-element-container table');
  if (!main || !table) return {ok: false, error: 'listing table not found in main content block'};

  const host = new URL(pageUrl).host;
  const rows: BanrepListingRow[] = [];
  for (const tr of all(table, 'tbody tr')) {
    const link = tr.querySelector('td.views-field-title a[href]');
    const href = link?.getAttribute('href');
    if (!link || !href) continue;
    const url = absolutize(href, pageUrl);
    if (!url || new URL(url).host !== host) continue;
    const title = textOf(link);
    if (!title) continue;
    const datetime = tr.querySelector('td.views-field-field-date-format time')?.getAttribute('datetime') ?? null;
    rows.push({
      url,
      title,
      date: datetime ? datetime.slice(0, 10) : null,
      clock: textOf(tr.querySelector('td.views-field-field-time-comunic')),
    });
  }
  const hasNextPage = Boolean(main.querySelector('.pager__item--next a[href]'));
  return {ok: true, value: {rows, hasNextPage}};
}

export function parseBanrepArticle(
  html: string,
  fetchedUrl: string,
  options: {sourceId: string; timeZone: string},
): ParseResult<ExtractedDocument> {
  const doc = parseHtmlDocument(html);
  const main = doc.querySelector('main');
  const node = main?.querySelector('[data-history-node-id]');
  const title = textOf(doc.querySelector('#block-banrep-pagetitle h1') ?? main?.querySelector('h1'));
  if (!main || !node) return {ok: false, error: 'article node not found in main content'};
  if (!title) return {ok: false, error: 'article title not found'};

  const canonicalUrl = absolutize(doc.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '', fetchedUrl) ?? fetchedUrl;
  const language = languageOf(doc, canonicalUrl);
  if (!language) return {ok: false, error: 'article language is neither es nor en'};

  const nodeId = node.getAttribute('data-history-node-id') ?? '';
  const nodeType = /node--type-([a-z0-9_]+)/.exec(node.getAttribute('class') ?? '')?.[1] ?? null;

  const standfirst = textOf(node.querySelector('.field--name-field-general-txt'));
  const bodyRoot = node.querySelector('.field-name-body, .field--name-body');
  const paragraphs = bodyRoot ? paragraphsOf(bodyRoot) : [];
  const text = paragraphs.length ? paragraphs.join('\n\n') : null;

  const datetime = node.querySelector('.field--name-field-date-format time')?.getAttribute('datetime') ?? null;
  const clock = textOf(node.querySelector('.field--name-field-time-comunic'));
  const published = datetime
    ? timeFromParts({
        date: datetime.slice(0, 10),
        clock,
        timeZone: options.timeZone,
        timeZoneBasis: 'publisher_default',
        source: `banrep-web:article:field_date_format${clock ? '+field_time_comunic' : ''}`,
      })
    : null;

  const alternates: Alternate[] = [];
  for (const link of all(doc, 'link[rel="alternate"][hreflang]')) {
    const lang = link.getAttribute('hreflang');
    const href = absolutize(link.getAttribute('href') ?? '', fetchedUrl);
    if ((lang === 'es' || lang === 'en') && lang !== language && href) alternates.push({language: lang, url: href});
  }

  const document: ExtractedDocument = {
    sourceId: options.sourceId,
    canonicalUrl,
    language,
    title,
    alternateTitles: [],
    documentType: classifyCentralBankDocument({title, url: canonicalUrl, sections: nodeType ? [nodeType] : []}),
    standfirst,
    text,
    completeness: text ? 'full_text' : standfirst ? 'excerpt' : 'metadata_only',
    times: {published, modified: null, event: null, other: []},
    authors: [],
    subjects: [],
    attachments: attachmentsOf(node, fetchedUrl),
    translationGroup: nodeId ? `${options.sourceId}:node:${nodeId}` : null,
    alternates,
    relatedUrls: uniqueUrls(all(node, '.field--name-field-publication-reference a[href]'), fetchedUrl),
    publisherIds: nodeId ? {drupalNode: nodeId, ...(nodeType ? {drupalNodeType: nodeType} : {})} : {},
    extractorVersion: BANREP_WEB_EXTRACTOR_VERSION,
  };
  return {ok: true, value: document};
}

export interface BanrepWebOptions {
  listings?: readonly BanrepListing[];
  /** Safety cap per listing per run; discovery reports whether the window start was reached. */
  maxPagesPerListing?: number;
}

export class BanrepWebConnector implements DocumentConnector {
  readonly source: SourceDefinition;
  readonly discoverySignalsChange = false;
  #http: PoliteHttpClient;
  #listings: readonly BanrepListing[];
  #maxPages: number;

  constructor(source: SourceDefinition, http: PoliteHttpClient, options: BanrepWebOptions = {}) {
    this.source = source;
    this.#http = http;
    this.#listings = options.listings ?? BANREP_DEFAULT_LISTINGS;
    this.#maxPages = options.maxPagesPerListing ?? 6;
  }

  async discover(window: CollectionWindow): Promise<DiscoveryResult> {
    const result: DiscoveryResult = {
      items: [],
      pagesAttempted: 0,
      pagesSucceeded: 0,
      itemsListed: 0,
      oldestListed: null,
      newestListed: null,
      reachedWindowStart: true,
      problems: [],
      notes: [],
    };
    const seen = new Set<string>();

    for (const listing of this.#listings) {
      let reached = false;
      for (let page = 0; page < this.#maxPages; page++) {
        const pageUrl = new URL(listing.path, this.source.baseUrl);
        if (page > 0) pageUrl.searchParams.set('page', String(page));
        result.pagesAttempted++;
        const response = await this.#http.get(pageUrl.toString(), {accept: 'text/html'});
        if (!response.ok) {
          result.problems.push(problemFromHttp('discover', response));
          break;
        }
        const parsed = parseBanrepListing(response.text, pageUrl.toString());
        if (!parsed.ok) {
          result.problems.push(parseProblem('discover', pageUrl.toString(), parsed.error));
          break;
        }
        result.pagesSucceeded++;

        let passedWindowStart = false;
        for (const row of parsed.value.rows) {
          result.itemsListed++;
          const listed = row.date
            ? timeFromParts({
                date: row.date,
                clock: row.clock,
                timeZone: this.source.publisherTimeZone,
                timeZoneBasis: 'publisher_default',
                source: `banrep-web:listing:field_date_format${row.clock ? '+field_time_comunic' : ''}`,
              })
            : null;
          if (listed) {
            if (!result.oldestListed || compareLocal(listed, result.oldestListed) < 0) result.oldestListed = listed;
            if (!result.newestListed || compareLocal(listed, result.newestListed) > 0) result.newestListed = listed;
            if (certainlyBefore(listed, window.since)) passedWindowStart = true;
          }
          if (listed && !mayFallInWindow(listed, window.since, window.until)) continue;
          if (seen.has(row.url)) continue;
          seen.add(row.url);
          result.items.push({
            sourceId: this.source.id,
            url: row.url,
            language: listing.language,
            listedTitle: row.title,
            listedPublished: listed,
            discoveredVia: pageUrl.toString(),
            hints: {},
          });
        }
        // Listings are newest-first (observed 2026-11-17): a row older than the window
        // means every later page is older too, so stop without spending another request.
        if (passedWindowStart || !parsed.value.hasNextPage) {
          reached = true;
          break;
        }
      }
      if (!reached) result.reachedWindowStart = false;
    }
    return result;
  }

  async fetch(item: DiscoveredItem): Promise<FetchOutcome> {
    const response = await this.#http.get(item.url, {accept: 'text/html'});
    if (!response.ok) return {ok: false, problem: problemFromHttp('fetch', response)};
    const parsed = parseBanrepArticle(response.text, item.url, {
      sourceId: this.source.id,
      timeZone: this.source.publisherTimeZone,
    });
    if (!parsed.ok) return {ok: false, problem: parseProblem('extract', item.url, parsed.error)};
    return {ok: true, document: parsed.value, collectedAt: response.fetchedAt};
  }
}

const ATTACHMENT_PATTERN = /\.(pdf|xlsx?|docx?|pptx?|csv|zip)(\?|#|$)|\/sites\/default\/files\/|repositorio\.banrep\.gov\.co\/(bitstreams|handle)\//i;

function attachmentsOf(node: DomElement, baseUrl: string): Attachment[] {
  const out: Attachment[] = [];
  const seen = new Set<string>();
  for (const link of all(node, 'a[href]')) {
    const url = absolutize(link.getAttribute('href') ?? '', baseUrl);
    if (!url || seen.has(url) || !ATTACHMENT_PATTERN.test(url)) continue;
    seen.add(url);
    const extension = /\.([a-z0-9]+)(\?|#|$)/i.exec(new URL(url).pathname)?.[1]?.toLowerCase() ?? null;
    out.push({url, title: textOf(link), mediaType: extension ? (MEDIA_TYPES[extension] ?? null) : null, byteLength: null});
  }
  return out;
}

const MEDIA_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  csv: 'text/csv',
  zip: 'application/zip',
};

function languageOf(doc: DomDocument, url: string): Language | null {
  const lang = doc.documentElement.getAttribute('lang')?.slice(0, 2).toLowerCase();
  if (lang === 'es' || lang === 'en') return lang;
  const prefix = /^\/(es|en)\//.exec(new URL(url).pathname)?.[1];
  return prefix === 'es' || prefix === 'en' ? prefix : null;
}

function uniqueUrls(links: DomElement[], baseUrl: string): string[] {
  const urls = links.map((link) => absolutize(link.getAttribute('href') ?? '', baseUrl)).filter((u): u is string => Boolean(u));
  return [...new Set(urls)];
}

function absolutize(href: string, baseUrl: string): string | null {
  if (!href.trim()) return null;
  try {
    const url = new URL(href.trim(), baseUrl);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function parseProblem(stage: Problem['stage'], url: string, message: string): Problem {
  return {stage, kind: 'parse_error', url, httpStatus: null, message};
}

