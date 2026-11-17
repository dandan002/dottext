import type {Frequency, Observation} from '@dottext/contracts';
import {XMLParser} from 'fast-xml-parser';

/** Helpers shared by the SDMX 2.1 dialects served by Banco de la República and Banco Central de Chile. */

export type XmlNode = Record<string, unknown>;

const ARRAY_TAGS = new Set(['Dataflow', 'Name', 'Series', 'Obs', 'Value']);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  textNodeName: '#text',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  isArray: (name) => ARRAY_TAGS.has(name),
});

/** SDMX messages never declare entities; refusing DTD entities rules out expansion attacks. */
export function parseSdmxXml(xml: string): {ok: true; root: XmlNode} | {ok: false; error: string} {
  if (/<!ENTITY/i.test(xml)) return {ok: false, error: 'DTD entity declarations are not accepted'};
  try {
    return {ok: true, root: parser.parse(xml.replace(/^﻿/, '')) as XmlNode};
  } catch (error) {
    return {ok: false, error: `invalid XML: ${error instanceof Error ? error.message : String(error)}`};
  }
}

export const xmlNodes = (value: unknown): XmlNode[] => (Array.isArray(value) ? (value as XmlNode[]) : []);

export function xmlAttr(node: XmlNode | undefined, name: string): string | null {
  const value = node?.[`@_${name}`];
  return typeof value === 'string' ? value : null;
}

/** All `@_`-prefixed attributes of a node, without the prefix. */
export function xmlAttrs(node: XmlNode | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(node ?? {})) {
    if (key.startsWith('@_') && typeof value === 'string') out[key.slice(2)] = value;
  }
  return out;
}

export const SDMX_FREQUENCIES: Readonly<Record<string, Frequency>> = {D: 'DAILY', M: 'MONTHLY', Q: 'QUARTERLY', A: 'ANNUAL'};

/** Normalize an SDMX period (`20261117`, `202610`, `2026-10`, `2026-Q3`, `2026`) to the contract format. */
export function sdmxReferencePeriod(period: string, frequency: Frequency): string | null {
  const p = period.trim();
  let y: string | undefined;
  let m: string | undefined;
  let d: string | undefined;
  let q: string | undefined;
  let match: RegExpExecArray | null;
  if ((match = /^(\d{4})-?(\d{2})-?(\d{2})$/.exec(p))) [, y, m, d] = match;
  else if ((match = /^(\d{4})-?(\d{2})$/.exec(p))) [, y, m] = match;
  else if ((match = /^(\d{4})-?Q([1-4])$/.exec(p))) [, y, q] = match;
  else if ((match = /^(\d{4})$/.exec(p))) [, y] = match;
  else return null;
  if (m !== undefined && (Number(m) < 1 || Number(m) > 12)) return null;
  switch (frequency) {
    case 'DAILY':
      return d ? `${y}-${m}-${d}` : null;
    case 'MONTHLY':
      return m ? `${y}-${m}` : null;
    case 'QUARTERLY':
      if (q) return `${y}-Q${q}`;
      return m ? `${y}-Q${Math.floor((Number(m) - 1) / 3) + 1}` : null;
    case 'ANNUAL':
      return `${y}`;
  }
}

/** First calendar day a reference period covers, for window comparisons. */
export function periodStart(period: string): string {
  const quarter = /^(\d{4})-Q([1-4])$/.exec(period);
  if (quarter) return `${quarter[1]}-${String((Number(quarter[2]) - 1) * 3 + 1).padStart(2, '0')}-01`;
  const [y, m = '01', d = '01'] = period.split('-');
  return `${y}-${m}-${d}`;
}

export function strictNumber(raw: string): number | null {
  const trimmed = raw.trim();
  return /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed) ? Number(trimmed) : null;
}

/** SDMX UNIT_MULT (power of ten), when stated as an integer. */
export function unitMultiplier(raw: string | null | undefined): number | null {
  return raw !== null && raw !== undefined && /^-?\d+$/.test(raw.trim()) ? Number(raw) : null;
}

/** SDMX ADJUSTMENT codes (`_Z` not applicable, `N` neither, `S` seasonally adjusted). */
export function adjustmentFromCode(code: string | undefined): Observation['seasonalAdjustment'] {
  if (code === '_Z') return 'not_applicable';
  if (code === 'N') return 'not_seasonally_adjusted';
  if (code === 'S' || code === 'SA' || code === 'Y') return 'seasonally_adjusted';
  return 'unknown';
}
