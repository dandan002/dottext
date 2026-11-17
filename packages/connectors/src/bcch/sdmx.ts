import type {Observation, Problem} from '@dottext/contracts';
import {problemFromHttp, type ObservationFetcher} from '../connector.ts';
import type {PoliteHttpClient} from '../http/client.ts';
import {
  parseSdmxXml,
  periodStart,
  SDMX_FREQUENCIES,
  sdmxReferencePeriod,
  strictNumber,
  unitMultiplier,
  xmlAttrs,
  xmlNodes,
  type XmlNode,
} from '../sdmx/common.ts';

/**
 * Banco Central de Chile — SDMX files behind its IMF National Summary Data Page
 * (https://si3.bcentral.cl/estadisticas/diario1/aplicaciones/NSDP/nsdp.html).
 *
 * Open, no credential (unlike the BDE API). Observed 2026-11-17:
 * - `GET https://si3.bcentral.cl/SieteSdmx/SieteSdmx.ashx?SDMXCategory=SDMX_<CODE>`
 *   returns the whole history (from 2010) of one category as SDMX 2.1
 *   StructureSpecificData under the IMF ECOFIN DSD; no period filtering.
 * - 28 categories. Producers differ: BCCh (national accounts, money, rates, FX,
 *   reserves, BOP, trade, debt), INE (CPI, PPI, production, labor), DIPRES
 *   (government operations and debt), Santiago exchange (share prices).
 * - Series attributes: FREQ, DATA_DOMAIN, REF_AREA, INDICATOR, COUNTERPART_AREA,
 *   UNIT_MULT, TIME_FORMAT, optional BASE_PER. Periods `YYYY-MM` or `YYYY-Qn`.
 * - Coverage is the IMF headline set (monthly/quarterly), not BDE's daily detail.
 */

export const BCCH_SDMX_ENDPOINT = 'https://si3.bcentral.cl/SieteSdmx/SieteSdmx.ashx';

export interface BcchSdmxSeries {
  attributes: Record<string, string>;
  observations: Array<Record<string, string>>;
}

/** Curated facts for one configured category (verified per category before listing). */
export interface BcchSdmxCategoryConfig {
  /** e.g. `SDMX_CPI`. */
  code: string;
  /** Compiling agency named on the NSDP page (BCCh, INE, DIPRES, BCS). */
  producer: string;
  /** Unit labels by IMF indicator-code suffix, e.g. `{"_USD": "USD"}`; exact codes in `indicatorUnits` win. */
  suffixUnits?: Readonly<Record<string, string>>;
  indicatorUnits?: Readonly<Record<string, string>>;
  indicatorAdjustment?: Readonly<Record<string, Observation['seasonalAdjustment']>>;
  /** Corrections to a publisher-stated UNIT_MULT, each backed by evidence in the config file. */
  indicatorMultiplier?: Readonly<Record<string, number>>;
  /** Indicator-code segment marking seasonally adjusted series (IMF ECOFIN uses `_SA_`). */
  seasonallyAdjustedMarker?: string;
}

export function parseSdmxStructureSpecific(xml: string): {ok: true; series: BcchSdmxSeries[]} | {ok: false; error: string} {
  const parsed = parseSdmxXml(xml);
  if (!parsed.ok) return parsed;
  const message = parsed.root['StructureSpecificData'] as XmlNode | undefined;
  if (!message) return {ok: false, error: 'not an SDMX structure-specific data message'};
  const dataSet = message['DataSet'] as XmlNode | undefined;
  return {
    ok: true,
    series: xmlNodes(dataSet?.['Series']).map((series) => ({
      attributes: xmlAttrs(series),
      observations: xmlNodes(series['Obs']).map(xmlAttrs),
    })),
  };
}

export class BcchSdmxClient {
  #http: PoliteHttpClient;
  #endpoint: string;
  readonly sourceId: string;

  constructor(options: {http: PoliteHttpClient; sourceId: string; endpoint?: string}) {
    this.#http = options.http;
    this.#endpoint = options.endpoint ?? BCCH_SDMX_ENDPOINT;
    this.sourceId = options.sourceId;
  }

  /** Observations of every series in a category whose period starts within [since, until]. */
  async getCategory(
    config: BcchSdmxCategoryConfig,
    window: {since: string; until: string},
    retrievedAt: Date,
  ): Promise<{ok: true; observations: Observation[]} | {ok: false; problem: Problem}> {
    const url = `${this.#endpoint}?SDMXCategory=${encodeURIComponent(config.code)}`;
    const response = await this.#http.get(url, {accept: 'application/xml, text/xml'});
    if (!response.ok) return {ok: false, problem: problemFromHttp('fetch', response)};
    const parsed = parseSdmxStructureSpecific(response.text);
    if (!parsed.ok) return {ok: false, problem: problem(url, parsed.error)};

    const observations: Observation[] = [];
    for (const series of parsed.series) {
      const a = series.attributes;
      const indicator = a['INDICATOR'];
      const frequency = SDMX_FREQUENCIES[a['FREQ'] ?? ''];
      if (!indicator || !frequency) {
        return {ok: false, problem: problem(url, `series without INDICATOR or supported FREQ: ${JSON.stringify(a)}`)};
      }
      // A rebased index is a different series: keep BASE_PER in the identity.
      const seriesId = [
        `${config.code}:${a['DATA_DOMAIN'] ?? ''}`,
        a['REF_AREA'] ?? '',
        indicator,
        a['COUNTERPART_AREA'] ?? '',
        a['FREQ'],
        ...(a['BASE_PER'] ? [`base${a['BASE_PER']}`] : []),
      ].join('.');
      const unit = unitFor(indicator, config);
      for (const obs of series.observations) {
        const referencePeriod = sdmxReferencePeriod(obs['TIME_PERIOD'] ?? '', frequency);
        if (!referencePeriod) return {ok: false, problem: problem(url, `${seriesId}: unparseable period ${obs['TIME_PERIOD']}`)};
        const start = periodStart(referencePeriod);
        if (start < window.since || start > window.until) continue;
        const rawValue = obs['OBS_VALUE'] ?? '';
        const status = obs['OBS_STATUS'] ?? 'A';
        observations.push({
          sourceId: this.sourceId,
          seriesId,
          frequency,
          referencePeriod,
          value: status === 'A' ? strictNumber(rawValue) : null,
          rawValue,
          status,
          unit,
          unitMultiplier: config.indicatorMultiplier?.[indicator] ?? unitMultiplier(a['UNIT_MULT']),
          producer: config.producer,
          seasonalAdjustment: adjustmentFor(indicator, config),
          valueKind: 'reported',
          retrievedAt: retrievedAt.toISOString(),
        });
      }
    }
    return {ok: true, observations};
  }
}

function adjustmentFor(indicator: string, config: BcchSdmxCategoryConfig): Observation['seasonalAdjustment'] {
  const exact = config.indicatorAdjustment?.[indicator];
  if (exact) return exact;
  const marker = config.seasonallyAdjustedMarker;
  return marker && indicator.includes(marker) ? 'seasonally_adjusted' : 'unknown';
}

function unitFor(indicator: string, config: BcchSdmxCategoryConfig): string | null {
  const exact = config.indicatorUnits?.[indicator];
  if (exact) return exact;
  for (const [suffix, label] of Object.entries(config.suffixUnits ?? {})) {
    if (indicator.endsWith(suffix)) return label;
  }
  return null;
}

/** Pipeline adapter: one configured category per item. */
export function bcchSdmxFetcher(client: BcchSdmxClient, categories: readonly BcchSdmxCategoryConfig[]): ObservationFetcher {
  const byCode = new Map(categories.map((c) => [c.code, c]));
  return {
    sourceId: client.sourceId,
    items: categories.map((c) => c.code),
    fetch: (itemId, window, retrievedAt) =>
      client.getCategory(byCode.get(itemId) ?? {code: itemId, producer: 'unknown'}, window, retrievedAt),
  };
}

function problem(url: string, message: string): Problem {
  return {stage: 'extract', kind: 'unexpected_content', url, httpStatus: null, message};
}
