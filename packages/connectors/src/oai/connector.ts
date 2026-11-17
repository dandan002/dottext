import type {
  DiscoveredItem,
  ExtractedDocument,
  Language,
  LabeledTime,
  Problem,
  SourceDefinition,
  TimeValue,
} from '@dottext/contracts';
import {classifyCentralBankDocument} from '../classify.ts';
import {problemFromHttp, type CollectionWindow, type DiscoveryResult, type DocumentConnector, type FetchOutcome} from '../connector.ts';
import type {PoliteHttpClient} from '../http/client.ts';
import {compareLocal, mayFallInWindow, timeFromInstant, timeFromParts} from '../time.ts';
import {parseOaiRecords, parseOreAttachments, type OaiRecord} from './pmh.ts';

export const OAI_DC_EXTRACTOR_VERSION = 'oai-dc/1';

export interface OaiConnectorOptions {
  /** OAI-PMH base URL, e.g. `https://repositorio.banrep.gov.co/server/oai/request`. */
  endpoint: string;
  /** Restrict harvesting to these setSpecs; omit to harvest the whole repository. */
  sets?: readonly string[];
  /** Human names for setSpecs, used as classification hints. */
  setNames?: Readonly<Record<string, string>>;
  /**
   * Whether record datestamps move only when the record changes. When false
   * (e.g. a repository that re-stamps everything nightly), `from`/`until` cannot
   * narrow a harvest, so the window is applied to issued dates instead.
   */
  datestampTracksChanges: boolean;
  /** Fetch the ORE resource map per new record to list files (one extra request each). */
  enrichAttachments: boolean;
  maxPagesPerSet?: number;
}

/**
 * DSpace OAI-PMH repositories. Records carry title, creators, bilingual subject
 * terms, abstract, type and issued date; the abstract is stored as the standfirst
 * with `excerpt` completeness — it is not the document body.
 */
export class OaiPmhConnector implements DocumentConnector {
  readonly source: SourceDefinition;
  readonly discoverySignalsChange: boolean;
  #http: PoliteHttpClient;
  #options: OaiConnectorOptions;

  constructor(source: SourceDefinition, http: PoliteHttpClient, options: OaiConnectorOptions) {
    this.source = source;
    this.#http = http;
    this.#options = options;
    this.discoverySignalsChange = options.datestampTracksChanges;
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
    const sets: Array<string | null> = this.#options.sets?.length ? [...this.#options.sets] : [null];
    const maxPages = this.#options.maxPagesPerSet ?? 20;

    for (const set of sets) {
      let token: string | null = null;
      let complete = false;
      for (let page = 0; page < maxPages; page++) {
        const url = new URL(this.#options.endpoint);
        url.searchParams.set('verb', 'ListRecords');
        if (token) {
          url.searchParams.set('resumptionToken', token);
        } else {
          url.searchParams.set('metadataPrefix', 'oai_dc');
          if (set) url.searchParams.set('set', set);
          if (this.#options.datestampTracksChanges) {
            url.searchParams.set('from', isoSeconds(window.since));
            url.searchParams.set('until', isoSeconds(window.until));
          }
        }
        result.pagesAttempted++;
        const response = await this.#http.get(url.toString(), {accept: 'text/xml, application/xml'});
        if (!response.ok) {
          result.problems.push(problemFromHttp('discover', response));
          break;
        }
        const parsed = parseOaiRecords(response.text);
        if (!parsed.ok) {
          result.problems.push(problem('discover', 'publisher_error', url.toString(), parsed.error));
          break;
        }
        result.pagesSucceeded++;

        for (const record of parsed.records) {
          result.itemsListed++;
          if (record.deleted || seen.has(record.identifier)) continue;
          const issued = issuedTime(record);
          if (issued) {
            if (!result.oldestListed || compareLocal(issued, result.oldestListed) < 0) result.oldestListed = issued;
            if (!result.newestListed || compareLocal(issued, result.newestListed) > 0) result.newestListed = issued;
          }
          if (!this.#options.datestampTracksChanges && (!issued || !mayFallInWindow(issued, window.since, window.until))) {
            continue;
          }
          if (!record.dc.title.length) {
            // Seen live: records exposed before cataloguing finishes. They reappear when their datestamp moves.
            result.notes.push(`skipped ${record.identifier}: record has no title yet`);
            continue;
          }
          const itemUrl = canonicalUrlOf(record, this.#options.endpoint);
          if (!itemUrl) {
            result.problems.push(problem('discover', 'parse_error', null, `record ${record.identifier} has no http identifier`));
            continue;
          }
          seen.add(record.identifier);
          result.items.push({
            sourceId: this.source.id,
            url: itemUrl,
            language: languageOf(record) ?? this.source.languages[0]!,
            listedTitle: record.dc.title[0]?.value ?? null,
            listedPublished: issued,
            discoveredVia: url.toString(),
            hints: {oaiRecord: JSON.stringify(record)},
          });
        }
        token = parsed.resumptionToken;
        if (!token) {
          complete = true;
          break;
        }
      }
      if (!complete) result.reachedWindowStart = false;
    }
    return result;
  }

  async fetch(item: DiscoveredItem): Promise<FetchOutcome> {
    const raw = item.hints['oaiRecord'];
    if (!raw) return {ok: false, problem: problem('fetch', 'parse_error', item.url, 'discovered item lacks its OAI record')};
    const record = JSON.parse(raw) as OaiRecord;
    const document = documentFromRecord(record, item.url, this.source, this.#options.setNames ?? {});

    if (this.#options.enrichAttachments) {
      const url = new URL(this.#options.endpoint);
      url.searchParams.set('verb', 'GetRecord');
      url.searchParams.set('metadataPrefix', 'ore');
      url.searchParams.set('identifier', record.identifier);
      const response = await this.#http.get(url.toString(), {accept: 'text/xml, application/xml'});
      if (!response.ok) return {ok: false, problem: problemFromHttp('fetch', response)};
      const ore = parseOreAttachments(response.text);
      if (!ore.ok) return {ok: false, problem: problem('extract', 'publisher_error', url.toString(), ore.error)};
      document.attachments = ore.attachments;
      return {ok: true, document, collectedAt: response.fetchedAt};
    }
    return {ok: true, document, collectedAt: new Date().toISOString()};
  }
}

export function documentFromRecord(
  record: OaiRecord,
  canonicalUrl: string,
  source: SourceDefinition,
  setNames: Readonly<Record<string, string>>,
): ExtractedDocument {
  const title = record.dc.title[0]?.value ?? record.identifier;
  const stated = languageOf(record);
  const abstract = record.dc.description.map((d) => d.value).join('\n\n').trim() || null;
  const handle = /^oai:[^:]+:(.+)$/.exec(record.identifier)?.[1] ?? null;

  const other: LabeledTime[] = [];
  const accessioned = record.dc.date
    .map((d) => timeFromInstant(d.value, 'oai_dc:date'))
    .filter((t): t is TimeValue => t !== null)
    .sort(compareLocal)[0];
  if (accessioned) other.push({label: 'repository_accessioned', time: accessioned});
  const datestamp = timeFromInstant(record.datestamp, 'oai:header.datestamp');
  if (datestamp) other.push({label: 'repository_record_datestamp', time: datestamp});

  return {
    sourceId: source.id,
    canonicalUrl,
    language: stated ?? source.languages[0]!,
    title,
    alternateTitles: record.dc.title.slice(1).map((t) => t.value),
    documentType: classifyCentralBankDocument({
      title,
      url: canonicalUrl,
      publisherTypes: record.dc.type.map((t) => t.value),
      sections: record.setSpecs.map((s) => setNames[s]).filter((s): s is string => Boolean(s)),
    }),
    standfirst: abstract,
    text: null,
    completeness: abstract ? 'excerpt' : 'metadata_only',
    times: {published: issuedTime(record), modified: null, event: null, other},
    authors: record.dc.creator.map((c) => c.value),
    subjects: record.dc.subject.map((s) => ({term: s.value, language: languageCode(s.lang)})),
    attachments: [],
    translationGroup: null,
    alternates: [],
    relatedUrls: [...new Set(record.dc.relation.map((r) => r.value).filter(isHttpUrl))],
    publisherIds: {
      oaiIdentifier: record.identifier,
      ...(handle ? {handle} : {}),
      ...(stated ? {} : {languageStated: 'false'}),
    },
    extractorVersion: OAI_DC_EXTRACTOR_VERSION,
  };
}

/**
 * DSpace's oai_dc crosswalk emits accessioned/available timestamps and the issued
 * date all as `dc:date`. Only date-only values (YYYY, YYYY-MM, YYYY-MM-DD) are
 * treated as the issued (publication) date.
 */
export function issuedTime(record: OaiRecord): TimeValue | null {
  for (const {value} of record.dc.date) {
    if (/^\d{4}(-\d{2}(-\d{2})?)?$/.test(value.trim())) {
      return timeFromParts({date: value.trim(), source: 'oai_dc:date(issued)'});
    }
  }
  return null;
}

function canonicalUrlOf(record: OaiRecord, endpoint: string): string | null {
  const host = new URL(endpoint).host;
  const urls = record.dc.identifier.map((i) => i.value).filter(isHttpUrl);
  return (
    urls.find((u) => new URL(u).host === host && /\/handle\//.test(u)) ??
    urls.find((u) => /hdl\.handle\.net\//.test(u)) ??
    urls[0] ??
    null
  );
}

function languageOf(record: OaiRecord): Language | null {
  for (const {value} of record.dc.language) {
    const code = languageCode(value);
    if (code) return code;
  }
  return null;
}

function languageCode(value: string | null): Language | null {
  const v = (value ?? '').toLowerCase();
  if (/^(es|spa)([-_].*)?$/.test(v)) return 'es';
  if (/^(en|eng)([-_].*)?$/.test(v)) return 'en';
  return null;
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function isoSeconds(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function problem(stage: Problem['stage'], kind: Problem['kind'], url: string | null, message: string): Problem {
  return {stage, kind, url, httpStatus: null, message};
}
