import type {AccessPolicy, ExtractedDocument} from '@dottext/contracts';
import {sha256Hex} from '@dottext/connectors';

/** Stable ID for a publisher document: one per (source, canonical URL), across revisions. */
export function documentIdFor(sourceId: string, canonicalUrl: string): string {
  return `doc_${sha256Hex(`${sourceId}\n${canonicalUrl}`).slice(0, 24)}`;
}

/**
 * Hash of the evidence text we store. Metadata-only changes (attachments, subjects)
 * do not create a revision; a change to the title, standfirst, or body does.
 */
export function contentHash(document: Pick<ExtractedDocument, 'title' | 'standfirst' | 'text'>): string {
  const canonical = [document.title, document.standfirst ?? '', document.text ?? ''].join('\n\n').normalize('NFC');
  return sha256Hex(canonical);
}

const RANK = {metadata_only: 0, excerpt: 1, full_text: 2} as const;

/** Reduce stored text to what the source's access policy permits. */
export function applyAccessPolicy(
  document: ExtractedDocument,
  policy: AccessPolicy,
): {document: ExtractedDocument; reduced: boolean} {
  if (RANK[document.completeness] <= RANK[policy.maxStoredText]) return {document, reduced: false};
  if (policy.maxStoredText === 'excerpt') {
    return {
      document: {...document, text: null, completeness: document.standfirst ? 'excerpt' : 'metadata_only'},
      reduced: true,
    };
  }
  return {document: {...document, text: null, standfirst: null, completeness: 'metadata_only'}, reduced: true};
}
