import type {Attachment} from '@dottext/contracts';
import {XMLParser} from 'fast-xml-parser';

/**
 * Minimal OAI-PMH 2.0 parsing for `oai_dc` records and DSpace `ore` resource maps.
 * Namespace prefixes are removed (`dc:title` → `title`).
 */

export const DC_FIELDS = [
  'title', 'creator', 'subject', 'description', 'publisher', 'contributor', 'date', 'type', 'format',
  'identifier', 'source', 'language', 'relation', 'coverage', 'rights',
] as const;
export type DcField = (typeof DC_FIELDS)[number];

export interface DcValue {
  value: string;
  /** `xml:lang` when the repository supplies it. */
  lang: string | null;
}

export interface OaiRecord {
  identifier: string;
  datestamp: string;
  setSpecs: string[];
  deleted: boolean;
  dc: Record<DcField, DcValue[]>;
}

export type OaiListResult =
  | {ok: true; records: OaiRecord[]; resumptionToken: string | null; completeListSize: number | null}
  | {ok: false; code: string | null; error: string};

const ARRAY_TAGS = new Set<string>(['record', 'setSpec', 'error', 'link']);
const DC_TAGS = new Set<string>(DC_FIELDS);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  textNodeName: '#text',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  // `identifier` exists both in the OAI header and in Dublin Core; only DC fields are repeatable.
  isArray: (name, jpath) => ARRAY_TAGS.has(name) || (DC_TAGS.has(name) && String(jpath).endsWith(`.dc.${name}`)),
});

type XmlNode = Record<string, unknown>;

/** OAI-PMH responses never declare entities; refusing DTD entities rules out expansion attacks. */
function parseXml(xml: string): {ok: true; root: XmlNode} | {ok: false; error: string} {
  if (/<!ENTITY/i.test(xml)) return {ok: false, error: 'DTD entity declarations are not accepted'};
  try {
    return {ok: true, root: parser.parse(xml) as XmlNode};
  } catch (error) {
    return {ok: false, error: `invalid XML: ${error instanceof Error ? error.message : String(error)}`};
  }
}

/** Parse a ListRecords or GetRecord response. `noRecordsMatch` is a successful empty result. */
export function parseOaiRecords(xml: string): OaiListResult {
  const parsed = parseXml(xml);
  if (!parsed.ok) return {ok: false, code: null, error: parsed.error};
  const pmh = parsed.root['OAI-PMH'] as XmlNode | undefined;
  if (!pmh) return {ok: false, code: null, error: 'not an OAI-PMH response'};

  const errors = (pmh['error'] as unknown[] | undefined) ?? [];
  if (errors.length) {
    const first = errors[0];
    const code = attr(first, 'code');
    if (code === 'noRecordsMatch') return {ok: true, records: [], resumptionToken: null, completeListSize: 0};
    return {ok: false, code, error: `OAI error ${code ?? 'unknown'}: ${text(first)}`};
  }

  const container = (pmh['ListRecords'] ?? pmh['GetRecord']) as XmlNode | undefined;
  if (!container) return {ok: false, code: null, error: 'response has neither ListRecords nor GetRecord'};

  const records: OaiRecord[] = [];
  for (const raw of (container['record'] as XmlNode[] | undefined) ?? []) {
    const header = raw['header'] as XmlNode | undefined;
    if (!header) continue;
    const identifier = text(header['identifier']);
    const datestamp = text(header['datestamp']);
    if (!identifier || !datestamp) continue;
    const dcNode = ((raw['metadata'] as XmlNode | undefined)?.['dc'] as XmlNode | undefined) ?? {};
    const dc = Object.fromEntries(
      DC_FIELDS.map((field) => [
        field,
        ((dcNode[field] as unknown[] | undefined) ?? [])
          .map((v) => ({value: text(v), lang: attr(v, 'lang')}))
          .filter((v) => v.value.length > 0),
      ]),
    ) as Record<DcField, DcValue[]>;
    records.push({
      identifier,
      datestamp,
      setSpecs: ((header['setSpec'] as unknown[] | undefined) ?? []).map(text).filter(Boolean),
      deleted: attr(header, 'status') === 'deleted',
      dc,
    });
  }

  const token = container['resumptionToken'];
  const tokenText = token === undefined ? '' : text(token);
  const size = token === undefined ? null : Number(attr(token, 'completeListSize'));
  return {
    ok: true,
    records,
    resumptionToken: tokenText || null,
    completeListSize: size !== null && Number.isFinite(size) ? size : null,
  };
}

const ORE_AGGREGATES = 'http://www.openarchives.org/ore/terms/aggregates';

/** Files aggregated by a DSpace item, from a GetRecord response in the `ore` format. */
export function parseOreAttachments(xml: string): {ok: true; attachments: Attachment[]} | {ok: false; error: string} {
  const parsed = parseXml(xml);
  if (!parsed.ok) return parsed;
  const pmh = parsed.root['OAI-PMH'] as XmlNode | undefined;
  const errors = (pmh?.['error'] as unknown[] | undefined) ?? [];
  if (!pmh || errors.length) return {ok: false, error: errors.length ? `OAI error: ${text(errors[0])}` : 'not an OAI-PMH response'};

  const attachments: Attachment[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node as XmlNode)) {
      if (key === 'link') {
        for (const link of value as unknown[]) {
          if (attr(link, 'rel') !== ORE_AGGREGATES) continue;
          const href = attr(link, 'href');
          if (!href) continue;
          const length = Number(attr(link, 'length'));
          attachments.push({
            url: href,
            title: attr(link, 'title'),
            mediaType: attr(link, 'type'),
            byteLength: Number.isInteger(length) && length >= 0 ? length : null,
          });
        }
      } else if (!key.startsWith('@_')) {
        visit(value);
      }
    }
  };
  visit(pmh);
  return {ok: true, attachments};
}

function text(node: unknown): string {
  if (typeof node === 'string') return node.trim();
  if (node && typeof node === 'object' && '#text' in node) return String((node as XmlNode)['#text']).trim();
  return '';
}

function attr(node: unknown, name: string): string | null {
  if (!node || typeof node !== 'object') return null;
  const value = (node as XmlNode)[`@_${name}`];
  return typeof value === 'string' ? value : null;
}
