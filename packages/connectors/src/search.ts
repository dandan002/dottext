import type {Language, Problem} from '@dottext/contracts';
import {mergeHits, planQueries, type BilingualConcept, type LanguageCoverage, type MergedHit} from './bilingual.ts';

/**
 * Search-based discovery for publishers whose listing pages cannot be collected
 * (e.g. bcentral.cl HTML behind a JavaScript challenge, while its PDFs are open).
 * Every concept is searched in the native language AND English and merged by URL.
 *
 * No provider is wired: the live-search provider is an open decision with a
 * monthly cost line (docs/decisions.md). Providers implement this interface.
 */
export interface SearchHit {
  url: string;
  title: string | null;
  snippet: string | null;
}

export interface SearchProvider {
  readonly id: string;
  search(query: string, options: {language: Language; site?: string; since?: Date}): Promise<SearchHit[]>;
}

export interface BilingualSearchResult {
  hits: MergedHit<SearchHit>[];
  coverage: LanguageCoverage;
  queriesRun: number;
  problems: Problem[];
}

export async function bilingualSearch(
  provider: SearchProvider,
  concepts: readonly BilingualConcept[],
  options: {site?: string; since?: Date; maxQueries?: number} = {},
): Promise<BilingualSearchResult> {
  const plan = planQueries(concepts);
  const limit = options.maxQueries ?? plan.length;
  const results: Array<{query: (typeof plan)[number]; hits: SearchHit[]}> = [];
  const problems: Problem[] = [];
  for (const query of plan.slice(0, limit)) {
    try {
      const hits = await provider.search(query.query, {
        language: query.language,
        ...(options.site ? {site: options.site} : {}),
        ...(options.since ? {since: options.since} : {}),
      });
      results.push({query, hits});
    } catch (error) {
      problems.push({
        stage: 'discover',
        kind: 'publisher_error',
        url: null,
        httpStatus: null,
        message: `${provider.id} query "${query.query}" (${query.language}) failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
  if (limit < plan.length) {
    problems.push({
      stage: 'discover',
      kind: 'request_budget_exhausted',
      url: null,
      httpStatus: null,
      message: `ran ${limit} of ${plan.length} planned bilingual queries`,
    });
  }
  const merged = mergeHits(results, (hit) => canonicalize(hit.url));
  return {...merged, queriesRun: results.length, problems};
}

function canonicalize(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^utm_/i.test(key)) parsed.searchParams.delete(key);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}
