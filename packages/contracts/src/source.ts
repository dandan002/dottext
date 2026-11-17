import {z} from 'zod';

export const Country = z.enum(['chile', 'colombia']);
export type Country = z.infer<typeof Country>;

/** ISO 639-1 codes. Extend as sources in other languages are validated. */
export const Language = z.enum(['es', 'en']);
export type Language = z.infer<typeof Language>;

export const SourceKind = z.enum(['official', 'journalism']);
export type SourceKind = z.infer<typeof SourceKind>;

/** How a source is reached. One publisher can have several channels with separate records. */
export const SourceChannel = z.enum(['website', 'oai_pmh', 'statistics_api', 'web_search']);
export type SourceChannel = z.infer<typeof SourceChannel>;

/**
 * - `inactive`: not validated or deliberately off.
 * - `validating`: connector built; collecting samples to complete the onboarding record.
 * - `active`: onboarding record complete and owner-approved.
 * - `blocked`: access is gated (bot protection, missing credential) — see statusReason.
 * - `paused`: temporarily stopped (budget, publisher change).
 */
export const ActivationStatus = z.enum(['inactive', 'validating', 'active', 'blocked', 'paused']);
export type ActivationStatus = z.infer<typeof ActivationStatus>;

export const TextCompleteness = z.enum(['full_text', 'excerpt', 'metadata_only']);
export type TextCompleteness = z.infer<typeof TextCompleteness>;

export const AccessPolicy = z.object({
  /** The most text we may store for this source; the pipeline downgrades anything richer. */
  maxStoredText: TextCompleteness,
  storeSnapshots: z.boolean(),
  termsUrl: z.url(),
  /** Short paraphrase of the governing terms, in English. */
  termsSummary: z.string().min(1),
  termsReviewedOn: z.iso.date(),
  /** False until the project owner confirms the policy against the terms. */
  ownerConfirmed: z.boolean(),
});
export type AccessPolicy = z.infer<typeof AccessPolicy>;

export const RateLimit = z.object({
  /** Minimum spacing between requests to the same host. */
  minIntervalMs: z.number().int().positive(),
  /** Hard cap on HTTP requests per collection run (discovery + fetch). */
  maxRequestsPerRun: z.number().int().positive(),
  /** Consecutive bot-protection challenges after which the run stops calling the host. */
  challengeBreakerThreshold: z.number().int().positive(),
});
export type RateLimit = z.infer<typeof RateLimit>;

export const SourceDefinition = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  publisher: z.string().min(1),
  country: Country,
  kind: SourceKind,
  channel: SourceChannel,
  languages: z.array(Language).min(1),
  baseUrl: z.url(),
  /** IANA zone the publisher uses for wall-clock times it prints without an offset. */
  publisherTimeZone: z.string().min(1),
  status: ActivationStatus,
  statusReason: z.string().min(1),
  accessPolicy: AccessPolicy,
  rateLimit: RateLimit,
  /** Path to the onboarding record, relative to the repository root. */
  onboardingRecord: z.string().min(1),
});
export type SourceDefinition = z.infer<typeof SourceDefinition>;
