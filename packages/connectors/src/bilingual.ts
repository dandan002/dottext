import type {Language} from '@dottext/contracts';
import {foldForMatch} from './text.ts';

/**
 * A concept searched in the publisher's language AND English. Central banks in the
 * pilot publish in Spanish first, translate selectively, and index some material
 * (statistics catalogs, repository subjects) in both languages — searching only
 * one language misses items that exist only in the other.
 */
export interface BilingualConcept {
  id: string;
  /** Native-language terms (Spanish for the pilot). */
  es: string[];
  en: string[];
}

export interface PlannedQuery {
  conceptId: string;
  language: Language;
  query: string;
}

/** Expand concepts into one query per term per language, native language first. */
export function planQueries(concepts: readonly BilingualConcept[], languages: readonly Language[] = ['es', 'en']): PlannedQuery[] {
  const plan: PlannedQuery[] = [];
  for (const concept of concepts) {
    for (const language of languages) {
      for (const term of concept[language]) {
        plan.push({conceptId: concept.id, language, query: term});
      }
    }
  }
  return plan;
}

export interface MergedHit<T> {
  hit: T;
  /** Every query (and therefore language) that returned this hit. */
  foundBy: PlannedQuery[];
}

export interface LanguageCoverage {
  total: number;
  onlyNative: number;
  onlyEnglish: number;
  both: number;
}

/**
 * Merge per-query results by key (canonical URL, series ID, …), keeping which
 * languages found each hit so coverage gaps between languages are measurable.
 */
export function mergeHits<T>(
  results: ReadonlyArray<{query: PlannedQuery; hits: readonly T[]}>,
  keyOf: (hit: T) => string,
): {hits: MergedHit<T>[]; coverage: LanguageCoverage} {
  const merged = new Map<string, MergedHit<T>>();
  for (const {query, hits} of results) {
    for (const hit of hits) {
      const key = keyOf(hit);
      const existing = merged.get(key);
      if (existing) existing.foundBy.push(query);
      else merged.set(key, {hit, foundBy: [query]});
    }
  }
  const coverage: LanguageCoverage = {total: merged.size, onlyNative: 0, onlyEnglish: 0, both: 0};
  for (const {foundBy} of merged.values()) {
    const languages = new Set(foundBy.map((q) => q.language));
    if (languages.has('es') && languages.has('en')) coverage.both++;
    else if (languages.has('en')) coverage.onlyEnglish++;
    else coverage.onlyNative++;
  }
  return {hits: [...merged.values()], coverage};
}

/** Accent- and case-insensitive whole-phrase match (`politica monetaria` matches `Política Monetaria`). */
export function containsTerm(text: string | null | undefined, term: string): boolean {
  if (!text) return false;
  const haystack = ` ${foldForMatch(text).replace(/[^\p{L}\p{N}%]+/gu, ' ')} `;
  const needle = ` ${foldForMatch(term).replace(/[^\p{L}\p{N}%]+/gu, ' ').trim()} `;
  return needle.trim().length > 0 && haystack.includes(needle);
}

/**
 * Local bilingual matching for catalogs that carry both titles (e.g. BCCh BDE series):
 * Spanish terms are matched against the Spanish title and English terms against the
 * English title; a record matched in either language is returned.
 */
export function matchBilingual<T>(
  records: readonly T[],
  concept: BilingualConcept,
  titles: (record: T) => {es: string | null; en: string | null},
): Array<{record: T; matchedIn: Language[]}> {
  const out: Array<{record: T; matchedIn: Language[]}> = [];
  for (const record of records) {
    const {es, en} = titles(record);
    const matchedIn: Language[] = [];
    if (concept.es.some((term) => containsTerm(es, term))) matchedIn.push('es');
    if (concept.en.some((term) => containsTerm(en, term))) matchedIn.push('en');
    if (matchedIn.length) out.push({record, matchedIn});
  }
  return out;
}
