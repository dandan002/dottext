import type {Observation, Problem} from '@dottext/contracts';
import {matchBilingual, type BilingualConcept} from '../bilingual.ts';
import {problemFromHttp, type ObservationFetcher} from '../connector.ts';
import type {PoliteHttpClient} from '../http/client.ts';
import {
  adjustmentFromCode,
  parseSdmxXml,
  periodStart,
  SDMX_FREQUENCIES,
  sdmxReferencePeriod,
  strictNumber,
  unitMultiplier,
  xmlAttr as attr,
  xmlNodes as nodes,
  type XmlNode,
} from '../sdmx/common.ts';

/**
 * Banco de la República — SDMX 2.1 REST web service behind its statistics portal
 * (SUAMECA). Open, no credential. Observed 2026-11-17:
 *
 * - `GET {base}/dataflow/all/all/latest` lists 33 dataflows (policy rate, TRM, IBR,
 *   interbank rate, DTF, UVR, TES, COLCAP, monetary aggregates, term deposits), each
 *   named in Spanish and/or English.
 * - `GET {base}/data/ESTAT,{flow},1.0/all/ALL/?startPeriod=YYYY-MM-DD` returns
 *   SDMX-ML generic data. `startPeriod` is honored only to the start of its year;
 *   adding `endPeriod` produced HTTP 404, so windows are applied client-side.
 * - Only `application/vnd.sdmx.genericdata+xml;version=2.1` is served: JSON and CSV
 *   answered 406 even though the portal announced them from 2026-10-26.
 * - Observation periods are `YYYYMMDD`; series keys follow the OECD STES DSD
 *   (REFERENCE_AREA, SUBJECT, EXPENDITURE, ACTIVITY, ADJUSTMENT, UNIT_MEASURE, FREQ).
 */

export const BANREP_SDMX_BASE = 'https://totoro.banrep.gov.co/nsi-jax-ws/rest';
export const SDMX_GENERIC_DATA = 'application/vnd.sdmx.genericdata+xml;version=2.1';
export const SDMX_STRUCTURE = 'application/vnd.sdmx.structure+xml;version=2.1';

export interface SdmxDataflow {
  agencyId: string;
  id: string;
  version: string;
  nameEs: string | null;
  nameEn: string | null;
}

export interface SdmxSeries {
  key: Record<string, string>;
  /** Key values in document order, e.g. `CO.IRCBRM01._Z._Z._Z.PA.D`. */
  keyString: string;
  /** Series-level attributes, e.g. UNIT_MULT. */
  attributes: Record<string, string>;
  observations: Array<{period: string; value: string; attributes: Record<string, string>}>;
}

/** Curated facts for a configured dataflow (labels for publisher unit codes, verified by eye). */
export interface SdmxFlowConfig {
  flowId: string;
  /** Human labels for UNIT_MEASURE codes seen in this flow; unlabeled codes are kept verbatim. */
  unitLabels?: Readonly<Record<string, string>>;
}

export function parseSdmxDataflows(xml: string): {ok: true; dataflows: SdmxDataflow[]} | {ok: false; error: string} {
  const parsed = parseSdmxXml(xml);
  if (!parsed.ok) return parsed;
  const structure = parsed.root['Structure'] as XmlNode | undefined;
  const container = (structure?.['Structures'] as XmlNode | undefined)?.['Dataflows'] as XmlNode | undefined;
  if (!container) return {ok: false, error: 'not an SDMX structure message with dataflows'};
  const dataflows: SdmxDataflow[] = [];
  for (const flow of nodes(container['Dataflow'])) {
    const id = attr(flow, 'id');
    if (!id) continue;
    const names = nodes(flow['Name']);
    const nameIn = (lang: string) => {
      const match = names.find((n) => attr(n, 'lang') === lang);
      const text = match ? String(match['#text'] ?? '').trim() : '';
      return text || null;
    };
    dataflows.push({
      agencyId: attr(flow, 'agencyID') ?? '',
      id,
      version: attr(flow, 'version') ?? '1.0',
      nameEs: nameIn('es'),
      nameEn: nameIn('en'),
    });
  }
  return {ok: true, dataflows};
}

export function parseSdmxGenericData(xml: string): {ok: true; series: SdmxSeries[]} | {ok: false; error: string} {
  const parsed = parseSdmxXml(xml);
  if (!parsed.ok) return parsed;
  const message = parsed.root['GenericData'] as XmlNode | undefined;
  if (!message) return {ok: false, error: 'not an SDMX generic data message'};
  const dataSet = message['DataSet'] as XmlNode | undefined;
  const series: SdmxSeries[] = [];
  for (const raw of nodes(dataSet?.['Series'])) {
    const keyValues = nodes((raw['SeriesKey'] as XmlNode | undefined)?.['Value']);
    const key: Record<string, string> = {};
    for (const v of keyValues) {
      const id = attr(v, 'id');
      if (id) key[id] = attr(v, 'value') ?? '';
    }
    const observations = nodes(raw['Obs']).map((obs) => {
      const attributes: Record<string, string> = {};
      for (const v of nodes((obs['Attributes'] as XmlNode | undefined)?.['Value'])) {
        const id = attr(v, 'id');
        if (id) attributes[id] = attr(v, 'value') ?? '';
      }
      return {
        period: attr(obs['ObsDimension'] as XmlNode | undefined, 'value') ?? '',
        value: attr(obs['ObsValue'] as XmlNode | undefined, 'value') ?? '',
        attributes,
      };
    });
    const attributes: Record<string, string> = {};
    for (const v of nodes((raw['Attributes'] as XmlNode | undefined)?.['Value'])) {
      const id = attr(v, 'id');
      if (id) attributes[id] = attr(v, 'value') ?? '';
    }
    series.push({key, keyString: Object.values(key).join('.'), attributes, observations});
  }
  return {ok: true, series};
}

export class BanrepSdmxClient {
  #http: PoliteHttpClient;
  #base: string;
  readonly sourceId: string;

  constructor(options: {http: PoliteHttpClient; sourceId: string; baseUrl?: string}) {
    this.#http = options.http;
    this.#base = (options.baseUrl ?? BANREP_SDMX_BASE).replace(/\/$/, '');
    this.sourceId = options.sourceId;
  }

  async listDataflows(): Promise<{ok: true; dataflows: SdmxDataflow[]} | {ok: false; problem: Problem}> {
    const url = `${this.#base}/dataflow/all/all/latest`;
    const response = await this.#http.get(url, {accept: SDMX_STRUCTURE});
    if (!response.ok) return {ok: false, problem: problemFromHttp('discover', response)};
    const parsed = parseSdmxDataflows(response.text);
    return parsed.ok ? parsed : {ok: false, problem: problem('extract', url, parsed.error)};
  }

  /**
   * Observations of every series in a dataflow within [since, until] (inclusive,
   * by calendar day of the period start). Only `startPeriod` is sent upstream.
   */
  async getObservations(
    config: SdmxFlowConfig,
    window: {since: string; until: string},
    retrievedAt: Date,
  ): Promise<{ok: true; observations: Observation[]} | {ok: false; problem: Problem}> {
    const url = `${this.#base}/data/ESTAT,${encodeURIComponent(config.flowId)},1.0/all/ALL/?startPeriod=${window.since}`;
    const response = await this.#http.get(url, {accept: SDMX_GENERIC_DATA});
    if (!response.ok) return {ok: false, problem: problemFromHttp('fetch', response)};
    const parsed = parseSdmxGenericData(response.text);
    if (!parsed.ok) return {ok: false, problem: problem('extract', url, parsed.error)};

    const observations: Observation[] = [];
    for (const series of parsed.series) {
      const frequency = SDMX_FREQUENCIES[series.key['FREQ'] ?? ''];
      if (!frequency) {
        return {ok: false, problem: problem('extract', url, `series ${series.keyString}: unsupported FREQ ${series.key['FREQ'] ?? '(none)'}`)};
      }
      const unitCode = series.key['UNIT_MEASURE'] ?? null;
      for (const obs of series.observations) {
        const referencePeriod = sdmxReferencePeriod(obs.period, frequency);
        if (!referencePeriod) {
          return {ok: false, problem: problem('extract', url, `series ${series.keyString}: unparseable period ${obs.period}`)};
        }
        const start = periodStart(referencePeriod);
        if (start < window.since || start > window.until) continue;
        const status = obs.attributes['OBS_STATUS'] ?? 'A';
        observations.push({
          sourceId: this.sourceId,
          seriesId: `${config.flowId}:${series.keyString}`,
          frequency,
          referencePeriod,
          value: status === 'A' ? strictNumber(obs.value) : null,
          rawValue: obs.value,
          status,
          unit: unitCode ? (config.unitLabels?.[unitCode] ?? unitCode) : null,
          unitMultiplier: unitMultiplier(series.attributes['UNIT_MULT']),
          producer: null,
          seasonalAdjustment: adjustmentFromCode(series.key['ADJUSTMENT']),
          valueKind: 'reported',
          retrievedAt: retrievedAt.toISOString(),
        });
      }
    }
    return {ok: true, observations};
  }
}

/** Pipeline adapter: one configured dataflow per item. */
export function banrepSdmxFetcher(client: BanrepSdmxClient, flows: readonly SdmxFlowConfig[]): ObservationFetcher {
  const byId = new Map(flows.map((f) => [f.flowId, f]));
  return {
    sourceId: client.sourceId,
    items: flows.map((f) => f.flowId),
    fetch: (itemId, window, retrievedAt) => client.getObservations(byId.get(itemId) ?? {flowId: itemId}, window, retrievedAt),
  };
}

/** Find dataflows for a concept by their Spanish and English names. */
export function findDataflows(dataflows: readonly SdmxDataflow[], concept: BilingualConcept) {
  return matchBilingual(dataflows, concept, (f) => ({es: f.nameEs, en: f.nameEn}));
}

function problem(stage: Problem['stage'], url: string, message: string): Problem {
  return {stage, kind: 'unexpected_content', url, httpStatus: null, message};
}
