import {z} from 'zod';

export const Frequency = z.enum(['DAILY', 'MONTHLY', 'QUARTERLY', 'ANNUAL']);
export type Frequency = z.infer<typeof Frequency>;

/** Catalog entry for a statistical series, with both publisher titles kept verbatim. */
export const SeriesDescriptor = z.object({
  sourceId: z.string(),
  seriesId: z.string().min(1),
  frequency: Frequency,
  titleEs: z.string().nullable(),
  titleEn: z.string().nullable(),
  firstObservation: z.iso.date().nullable(),
  lastObservation: z.iso.date().nullable(),
  sourceUpdatedAt: z.iso.date().nullable(),
});
export type SeriesDescriptor = z.infer<typeof SeriesDescriptor>;

/**
 * One reported value. Units and adjustment come from curated configuration or the
 * publisher's own title text — never inferred silently.
 */
export const Observation = z.object({
  sourceId: z.string(),
  seriesId: z.string(),
  frequency: Frequency,
  /** Reference period: `2024-10-01` (daily), `2024-10` (monthly), `2024-Q3`, `2024`. */
  referencePeriod: z.string().regex(/^\d{4}(-(\d{2}(-\d{2})?|Q[1-4]))?$/),
  /** Null when the publisher marks the point as not available. */
  value: z.number().nullable(),
  /** The value exactly as transmitted. */
  rawValue: z.string(),
  /** Publisher status code, e.g. `OK`, `ND`. */
  status: z.string(),
  unit: z.string().nullable(),
  /** Power of ten the value is scaled by (SDMX UNIT_MULT: 6 = millions); null when not stated. */
  unitMultiplier: z.number().int().nullable(),
  /** Agency that compiles the statistic when it differs from the distributing source (e.g. INE CPI via BCCh). */
  producer: z.string().nullable(),
  seasonalAdjustment: z.enum(['seasonally_adjusted', 'not_seasonally_adjusted', 'not_applicable', 'unknown']),
  /** Reported data vs forecast/projection; statistics APIs report observed values. */
  valueKind: z.enum(['reported', 'forecast']),
  /** When we retrieved this vintage; later retrievals with other values are revisions. */
  retrievedAt: z.iso.datetime(),
});
export type Observation = z.infer<typeof Observation>;
