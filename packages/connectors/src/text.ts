import {createHash} from 'node:crypto';

/** Collapse whitespace (including NBSP) inside a paragraph; keep characters otherwise unchanged. */
export function normalizeInline(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[\s   ]+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

/** Lowercase and strip diacritics for matching (`Política` → `politica`). Never used for storage. */
export function foldForMatch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}
