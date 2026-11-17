import type {Frequency, Observation, Problem, SeriesDescriptor} from '@dottext/contracts';
import {z} from 'zod';
import {matchBilingual, type BilingualConcept} from '../bilingual.ts';
import {problemFromHttp, type ObservationFetcher} from '../connector.ts';
import type {PoliteHttpClient} from '../http/client.ts';

/**
 * Banco Central de Chile — Base de Datos Estadísticos (BDE) REST API.
 *
 * Documented at https://si3.bcentral.cl/estadisticas/Principal1/Web_Services/documentacion.html
 * (checked 2026-11-17). Requires a registered BDE account with the API enabled and an
 * API Key Token, passed as the `token` query parameter — so it cannot be injected as a
 * header by a proxy, and every URL we report is redacted. Terms limit use to at most
 * 5 series requests per second per account.
 */

export const BDE_ENDPOINT = 'https://si3.bcentral.cl/SieteRestWS/SieteRestWS.ashx';

const BdeObservation = z.object({indexDateString: z.string(), value: z.string(), statusCode: z.string()});
const BdeSeriesInfo = z.object({
  seriesId: z.string(),
  frequencyCode: z.string(),
  spanishTitle: z.string().nullable(),
  englishTitle: z.string().nullable(),
  firstObservation: z.string().nullable(),
  lastObservation: z.string().nullable(),
  updatedAt: z.string().nullable(),
  createdAt: z.string().nullable(),
});
export const BdeResponse = z.object({
  Codigo: z.number(),
  Descripcion: z.string().nullable(),
  Series: z
    .object({
      descripEsp: z.string().nullable(),
      descripIng: z.string().nullable(),
      seriesId: z.string().nullable(),
      Obs: z.array(BdeObservation).nullable(),
    })
    .nullable(),
  SeriesInfos: z.array(BdeSeriesInfo).nullable(),
});
export type BdeResponse = z.infer<typeof BdeResponse>;

/** Curated per-series facts that the API does not state as fields. */
export interface SeriesConfig {
  seriesId: string;
  /** Overrides the frequency inferred from the ID suffix (only `.D`/`.M`/`.T` are confirmed in BDE docs). */
  frequency?: Frequency;
  /** Explicit unit; when absent, the publisher's own parenthetical from the Spanish title is used. */
  unit?: string;
  seasonalAdjustment?: Observation['seasonalAdjustment'];
}

export type BdeResult<T> = {ok: true; value: T} | {ok: false; problem: Problem};

export class BdeClient {
  #http: PoliteHttpClient;
  #token: string | null;
  #sourceId: string;
  #endpoint: string;

  constructor(options: {http: PoliteHttpClient; token: string | null; sourceId: string; endpoint?: string}) {
    this.#http = options.http;
    this.#token = options.token && options.token.trim() ? options.token.trim() : null;
    this.#sourceId = options.sourceId;
    this.#endpoint = options.endpoint ?? BDE_ENDPOINT;
  }

  /** Full catalog for one frequency. Titles are kept verbatim in both languages. */
  async searchSeries(frequency: Frequency): Promise<BdeResult<SeriesDescriptor[]>> {
    const response = await this.#call({function: 'SearchSeries', frequency});
    if (!response.ok) return response;
    const infos = response.value.SeriesInfos ?? [];
    return {ok: true, value: infos.map((info) => descriptorFromInfo(info, this.#sourceId))};
  }

  async getSeries(
    seriesId: string,
    range: {firstDate?: string; lastDate?: string} = {},
    config: SeriesConfig = {seriesId},
    retrievedAt: Date = new Date(),
  ): Promise<BdeResult<{titleEs: string | null; titleEn: string | null; observations: Observation[]}>> {
    const params: Record<string, string> = {function: 'GetSeries', timeseries: seriesId};
    if (range.firstDate) params['firstdate'] = range.firstDate;
    if (range.lastDate) params['lastdate'] = range.lastDate;
    const response = await this.#call(params);
    if (!response.ok) return response;
    const series = response.value.Series;
    const frequency = config.frequency ?? frequencyFromSeriesId(seriesId);
    if (!series || !frequency) {
      return {
        ok: false,
        problem: problem('extract', 'unexpected_content', `series ${seriesId}: missing Series block or unknown frequency suffix`),
      };
    }
    const observations: Observation[] = [];
    for (const obs of series.Obs ?? []) {
      const date = parseBdeDate(obs.indexDateString);
      if (!date) {
        return {ok: false, problem: problem('extract', 'parse_error', `series ${seriesId}: bad date ${obs.indexDateString}`)};
      }
      observations.push({
        sourceId: this.#sourceId,
        seriesId,
        frequency,
        referencePeriod: referencePeriod(date, frequency),
        value: obs.statusCode === 'OK' ? parseBdeNumber(obs.value) : null,
        rawValue: obs.value,
        status: obs.statusCode,
        unit: config.unit ?? unitFromTitle(series.descripEsp),
        seasonalAdjustment: config.seasonalAdjustment ?? seasonalAdjustmentFromTitles(series.descripEsp, series.descripIng),
        valueKind: 'reported',
        retrievedAt: retrievedAt.toISOString(),
      });
    }
    return {ok: true, value: {titleEs: series.descripEsp, titleEn: series.descripIng, observations}};
  }

  async #call(params: Record<string, string>): Promise<BdeResult<BdeResponse>> {
    if (!this.#token) {
      return {ok: false, problem: problem('fetch', 'missing_credential', 'BCCH_BDE_TOKEN is not set; register a BDE account and enable the API')};
    }
    const url = new URL(this.#endpoint);
    url.searchParams.set('token', this.#token);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const response = await this.#http.get(url.toString(), {accept: 'application/json'});
    if (!response.ok) return {ok: false, problem: problemFromHttp('fetch', response)};
    let json: unknown;
    try {
      json = JSON.parse(response.text);
    } catch {
      return {ok: false, problem: {...problem('extract', 'unexpected_content', 'response is not JSON'), url: response.url}};
    }
    const parsed = BdeResponse.safeParse(json);
    if (!parsed.success) {
      return {ok: false, problem: {...problem('extract', 'unexpected_content', `unexpected BDE payload: ${parsed.error.issues[0]?.message ?? ''}`), url: response.url}};
    }
    if (parsed.data.Codigo !== 0) {
      return {
        ok: false,
        problem: {...problem('fetch', 'publisher_error', `BDE error ${parsed.data.Codigo}: ${parsed.data.Descripcion ?? ''}`), url: response.url},
      };
    }
    return {ok: true, value: parsed.data};
  }
}

/**
 * Find catalog series for a concept in BOTH languages: Spanish terms against the
 * Spanish title, English terms against the English title. Candidates still need a
 * human check before being added to the curated series list.
 */
export function findSeries(catalog: readonly SeriesDescriptor[], concept: BilingualConcept) {
  return matchBilingual(catalog, concept, (s) => ({es: s.titleEs, en: s.titleEn}));
}

/** `DD-MM-YYYY` → `YYYY-MM-DD`. */
export function parseBdeDate(value: string): string | null {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, d, m, y] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (date.getUTCFullYear() !== Number(y) || date.getUTCMonth() !== Number(m) - 1 || date.getUTCDate() !== Number(d)) return null;
  return `${y}-${m}-${d}`;
}

/** The documented payload uses `.` decimals; anything else (e.g. `NaN`) is not a value. */
export function parseBdeNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) return null;
  return Number(trimmed);
}

export function referencePeriod(isoDate: string, frequency: Frequency): string {
  const [y, m] = isoDate.split('-');
  switch (frequency) {
    case 'DAILY':
      return isoDate;
    case 'MONTHLY':
      return `${y}-${m}`;
    case 'QUARTERLY':
      return `${y}-Q${Math.floor((Number(m) - 1) / 3) + 1}`;
    case 'ANNUAL':
      return `${y}`;
  }
}

/** BDE series IDs end in a frequency letter: `.D`, `.M`, `.T` (trimestral) are documented; `.A` is assumed. */
export function frequencyFromSeriesId(seriesId: string): Frequency | null {
  const suffix = seriesId.split('.').at(-1);
  return ({D: 'DAILY', M: 'MONTHLY', T: 'QUARTERLY', A: 'ANNUAL'} as const)[suffix as 'D' | 'M' | 'T' | 'A'] ?? null;
}

/** The trailing parenthetical of a BDE title, verbatim: `… (porcentaje)` → `porcentaje`. */
export function unitFromTitle(title: string | null): string | null {
  const match = /\(([^()]+)\)\s*$/.exec(title ?? '');
  return match?.[1]?.trim() ?? null;
}

function seasonalAdjustmentFromTitles(es: string | null, en: string | null): Observation['seasonalAdjustment'] {
  const text = `${es ?? ''} ${en ?? ''}`.toLowerCase();
  if (/sin desestacionalizar|not seasonally adjusted|non-seasonally adjusted/.test(text)) return 'not_seasonally_adjusted';
  if (/desestacionalizad|seasonally adjusted/.test(text)) return 'seasonally_adjusted';
  return 'unknown';
}

function descriptorFromInfo(info: z.infer<typeof BdeSeriesInfo>, sourceId: string): SeriesDescriptor {
  const frequency = (['DAILY', 'MONTHLY', 'QUARTERLY', 'ANNUAL'] as const).find((f) => f === info.frequencyCode.toUpperCase());
  return {
    sourceId,
    seriesId: info.seriesId,
    frequency: frequency ?? frequencyFromSeriesId(info.seriesId) ?? 'DAILY',
    titleEs: info.spanishTitle,
    titleEn: info.englishTitle,
    firstObservation: info.firstObservation ? parseBdeDate(info.firstObservation) : null,
    lastObservation: info.lastObservation ? parseBdeDate(info.lastObservation) : null,
    sourceUpdatedAt: info.updatedAt ? parseBdeDate(info.updatedAt) : null,
  };
}

function problem(stage: Problem['stage'], kind: Problem['kind'], message: string): Problem {
  return {stage, kind, url: null, httpStatus: null, message};
}

/** Pipeline adapter: one configured BDE series per item. */
export function bdeFetcher(client: BdeClient, sourceId: string, series: readonly SeriesConfig[]): ObservationFetcher {
  const byId = new Map(series.map((s) => [s.seriesId, s]));
  return {
    sourceId,
    items: series.map((s) => s.seriesId),
    async fetch(itemId, window, retrievedAt) {
      const config = byId.get(itemId) ?? {seriesId: itemId};
      const result = await client.getSeries(itemId, {firstDate: window.since, lastDate: window.until}, config, retrievedAt);
      return result.ok ? {ok: true, observations: result.value.observations} : result;
    },
  };
}
