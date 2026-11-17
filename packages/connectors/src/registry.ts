import {readFileSync} from 'node:fs';
import {Language, Observation, SourceDefinition} from '@dottext/contracts';
import {z} from 'zod';
import {BanrepWebConnector} from './banrep/web.ts';
import type {BilingualConcept} from './bilingual.ts';
import type {SeriesConfig} from './bcch/bde.ts';
import type {DocumentConnector} from './connector.ts';
import {PoliteHttpClient, type HttpClientOptions} from './http/client.ts';
import {OaiPmhConnector} from './oai/connector.ts';

export const REPO_ROOT = new URL('../../../', import.meta.url);

const ConnectorSettings = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('banrep-web'),
    listings: z.array(z.object({path: z.string().startsWith('/'), language: Language})).min(1),
    maxPagesPerListing: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('oai-pmh'),
    endpoint: z.url(),
    sets: z.array(z.string()),
    setNames: z.record(z.string(), z.string()),
    datestampTracksChanges: z.boolean(),
    enrichAttachments: z.boolean(),
    maxPagesPerSet: z.number().int().positive(),
  }),
  z.object({type: z.literal('bcch-bde'), tokenEnv: z.string().min(1), seriesFile: z.string().min(1)}),
  /** No collectable channel yet (see the source's statusReason). */
  z.object({type: z.literal('none')}),
]);
export type ConnectorSettings = z.infer<typeof ConnectorSettings>;

export const RegistryEntry = SourceDefinition.extend({connector: ConnectorSettings});
export type RegistryEntry = z.infer<typeof RegistryEntry>;

const Registry = z
  .object({sources: z.array(RegistryEntry)})
  .refine((r) => new Set(r.sources.map((s) => s.id)).size === r.sources.length, 'source ids must be unique');

const Concept = z.object({id: z.string().min(1), es: z.array(z.string().min(1)).min(1), en: z.array(z.string().min(1)).min(1)});
const Concepts = z.object({documentConcepts: z.array(Concept), seriesConcepts: z.array(Concept)});

const SeriesFile = z.object({
  series: z.array(
    z.object({
      seriesId: z.string().min(1),
      conceptId: z.string().optional(),
      unit: z.string().optional(),
      seasonalAdjustment: Observation.shape.seasonalAdjustment.optional(),
      evidence: z.string().min(1),
    }),
  ),
});

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(new URL(relativePath, REPO_ROOT), 'utf8'));
}

export function loadRegistry(relativePath = 'config/sources/registry.json'): RegistryEntry[] {
  return Registry.parse(readJson(relativePath)).sources;
}

export function loadConcepts(relativePath = 'config/sources/central-bank-concepts.json'): {
  documentConcepts: BilingualConcept[];
  seriesConcepts: BilingualConcept[];
} {
  return Concepts.parse(readJson(relativePath));
}

export function loadSeriesConfig(relativePath: string): SeriesConfig[] {
  return SeriesFile.parse(readJson(relativePath)).series.map(({seriesId, unit, seasonalAdjustment}) => ({
    seriesId,
    ...(unit ? {unit} : {}),
    ...(seasonalAdjustment ? {seasonalAdjustment} : {}),
  }));
}

/** One HTTP client per run, paced and budgeted by the source's rate limit. */
export function httpClientFor(entry: RegistryEntry, overrides: Partial<HttpClientOptions> = {}): PoliteHttpClient {
  const policy = {
    minIntervalMs: entry.rateLimit.minIntervalMs,
    challengeBreakerThreshold: entry.rateLimit.challengeBreakerThreshold,
  };
  return new PoliteHttpClient({
    defaultHostPolicy: policy,
    maxRequests: entry.rateLimit.maxRequestsPerRun,
    ...(process.env['DOTTEXT_USER_AGENT'] ? {userAgent: process.env['DOTTEXT_USER_AGENT']} : {}),
    ...overrides,
  });
}

/** Build the document connector for a registry entry, or null for non-document channels. */
export function createDocumentConnector(entry: RegistryEntry, http: PoliteHttpClient): DocumentConnector | null {
  const settings = entry.connector;
  switch (settings.type) {
    case 'banrep-web':
      return new BanrepWebConnector(entry, http, {
        listings: settings.listings,
        maxPagesPerListing: settings.maxPagesPerListing,
      });
    case 'oai-pmh':
      return new OaiPmhConnector(entry, http, {
        endpoint: settings.endpoint,
        sets: settings.sets,
        setNames: settings.setNames,
        datestampTracksChanges: settings.datestampTracksChanges,
        enrichAttachments: settings.enrichAttachments,
        maxPagesPerSet: settings.maxPagesPerSet,
      });
    case 'bcch-bde':
    case 'none':
      return null;
  }
}
