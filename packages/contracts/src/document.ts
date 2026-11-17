import {z} from 'zod';
import {Language, TextCompleteness} from './source.ts';
import {DocumentTimes, TimeValue} from './time.ts';

/** Central bank document taxonomy; journalism types are added with those connectors. */
export const DocumentType = z.enum([
  'policy_decision',
  'minutes',
  'press_release',
  'monetary_policy_report',
  'financial_stability_report',
  'speech',
  'research_paper',
  'statistical_release',
  'report',
  'other',
]);
export type DocumentType = z.infer<typeof DocumentType>;

export const Attachment = z.object({
  url: z.url(),
  title: z.string().nullable(),
  mediaType: z.string().nullable(),
  byteLength: z.number().int().nonnegative().nullable(),
});
export type Attachment = z.infer<typeof Attachment>;

export const Subject = z.object({
  term: z.string().min(1),
  /** Null when the source does not tag the term's language. */
  language: Language.nullable(),
});
export type Subject = z.infer<typeof Subject>;

/** Another-language version of the same publisher document. */
export const Alternate = z.object({
  language: Language,
  url: z.url(),
});
export type Alternate = z.infer<typeof Alternate>;

/** A candidate found during discovery, before its own page/record is fetched. */
export const DiscoveredItem = z.object({
  sourceId: z.string(),
  url: z.url(),
  language: Language,
  listedTitle: z.string().nullable(),
  listedPublished: TimeValue.nullable(),
  /** Where it was found, e.g. `https://www.banrep.gov.co/es/noticias?page=0`. */
  discoveredVia: z.string(),
  /** Connector-private values carried from discovery to fetch (e.g. an OAI record). */
  hints: z.record(z.string(), z.string()),
});
export type DiscoveredItem = z.infer<typeof DiscoveredItem>;

/** Output of a connector's fetch+extract for one item. Original-language text, unchanged. */
export const ExtractedDocument = z.object({
  sourceId: z.string(),
  canonicalUrl: z.url(),
  language: Language,
  title: z.string().min(1),
  /** Other publisher-supplied titles, e.g. the English title of a Spanish repository item. */
  alternateTitles: z.array(z.string()),
  documentType: DocumentType,
  /** Publisher lead/standfirst or abstract, kept separately as published. */
  standfirst: z.string().nullable(),
  /** Paragraphs joined with blank lines; null when only metadata is available. */
  text: z.string().nullable(),
  completeness: TextCompleteness,
  times: DocumentTimes,
  authors: z.array(z.string()),
  subjects: z.array(Subject),
  attachments: z.array(Attachment),
  /** Shared by all language versions of one publisher item, e.g. `banrep-web:node:66475`. */
  translationGroup: z.string().nullable(),
  alternates: z.array(Alternate),
  relatedUrls: z.array(z.url()),
  /** Publisher identifiers, e.g. `{drupalNode: '66475'}` or `{handle: '20.500.12134/11458'}`. */
  publisherIds: z.record(z.string(), z.string()),
  /** Bumped whenever extraction logic changes output for the same input. */
  extractorVersion: z.string(),
});
export type ExtractedDocument = z.infer<typeof ExtractedDocument>;

/**
 * Immutable stored revision. A correction at the source creates a new revision
 * with `previousRevisionId` set; earlier revisions remain inspectable.
 */
export const DocumentRevision = z.object({
  revisionId: z.string(),
  documentId: z.string(),
  previousRevisionId: z.string().nullable(),
  /** sha256 over normalized title + standfirst + text. */
  contentHash: z.string().regex(/^[0-9a-f]{64}$/),
  /** When this document (any revision) was first seen by us. */
  firstSeenAt: z.iso.datetime(),
  /** When this revision's content was fetched. */
  collectedAt: z.iso.datetime(),
  /** Set when the stored text was reduced to satisfy the source access policy. */
  textReducedByPolicy: z.boolean(),
  document: ExtractedDocument,
});
export type DocumentRevision = z.infer<typeof DocumentRevision>;
