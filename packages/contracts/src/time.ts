import {z} from 'zod';

/**
 * How much of a timestamp the source actually told us. A date-only value must
 * never be widened into a fake instant (e.g. Drupal stores date-only fields as
 * `T12:00:00Z`; that noon is a storage artifact, not a publication time).
 */
export const TimePrecision = z.enum(['year', 'month', 'day', 'minute', 'second']);
export type TimePrecision = z.infer<typeof TimePrecision>;

/**
 * Where the time zone of `local` came from.
 * - `explicit`: the source stated an offset or zone (e.g. `Z`, `-05:00`).
 * - `publisher_default`: the source gave wall-clock time only and we applied the
 *   publisher's home zone (documented per connector).
 * - `not_applicable`: precision is coarser than a day boundary matters (year/month/day
 *   values carry no zone claim).
 */
export const TimeZoneBasis = z.enum(['explicit', 'publisher_default', 'not_applicable']);
export type TimeZoneBasis = z.infer<typeof TimeZoneBasis>;

export const TimeValue = z.object({
  /** Wall-clock value truncated to `precision`: `2026`, `2026-11`, `2026-11-06`, `2026-11-06T13:00`. */
  local: z.string().regex(/^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2})?)?)?)?$/),
  precision: TimePrecision,
  /** IANA zone `local` is expressed in, or null when no zone applies or is known. */
  timeZone: z.string().nullable(),
  timeZoneBasis: TimeZoneBasis,
  /** UTC instant; only set when precision is minute/second and the zone is known. */
  utc: z.iso.datetime().nullable(),
  /** Provenance of the value, e.g. `banrep-web:article:field_date_format+field_time_comunic`. */
  source: z.string().min(1),
});
export type TimeValue = z.infer<typeof TimeValue>;

/** A time that is neither publication, modification, nor event time (e.g. repository accession). */
export const LabeledTime = z.object({
  label: z.enum([
    'repository_accessioned',
    'repository_available',
    'repository_record_datestamp',
    'cms_created',
  ]),
  time: TimeValue,
});
export type LabeledTime = z.infer<typeof LabeledTime>;

/**
 * Source-reported times for a document. Unknown stays null: collection time is
 * recorded separately on the revision and is never substituted here.
 */
export const DocumentTimes = z.object({
  published: TimeValue.nullable(),
  modified: TimeValue.nullable(),
  event: TimeValue.nullable(),
  other: z.array(LabeledTime),
});
export type DocumentTimes = z.infer<typeof DocumentTimes>;
