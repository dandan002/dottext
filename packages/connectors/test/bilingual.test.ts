import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import {containsTerm, mergeHits, planQueries} from '../src/bilingual.ts';
import {classifyCentralBankDocument} from '../src/classify.ts';
import {loadConcepts, loadRegistry, loadSeriesConfig} from '../src/registry.ts';
import {bilingualSearch, type SearchProvider} from '../src/search.ts';

describe('bilingual matching', () => {
  test('is accent- and case-insensitive on whole phrases', () => {
    assert.equal(containsTerm('Informe de Política Monetaria - Octubre', 'informe de politica monetaria'), true);
    assert.equal(containsTerm('Reporte de mercados', 'report'), false);
    assert.equal(containsTerm('Monetary Policy Report', 'report'), true);
  });

  test('plans every term in Spanish and English, native language first', () => {
    const plan = planQueries([{id: 'mpr', es: ['Informe de Política Monetaria', 'IPoM'], en: ['Monetary Policy Report']}]);
    assert.deepEqual(
      plan.map((q) => `${q.language}:${q.query}`),
      ['es:Informe de Política Monetaria', 'es:IPoM', 'en:Monetary Policy Report'],
    );
  });

  test('merges hits and measures what each language alone would have missed', () => {
    const [es, en] = planQueries([{id: 'x', es: ['a'], en: ['b']}]);
    const {hits, coverage} = mergeHits(
      [
        {query: es!, hits: [{url: 'https://x/1'}, {url: 'https://x/2'}]},
        {query: en!, hits: [{url: 'https://x/2'}, {url: 'https://x/3'}]},
      ],
      (h) => h.url,
    );
    assert.equal(hits.length, 3);
    assert.deepEqual(coverage, {total: 3, onlyNative: 1, onlyEnglish: 1, both: 1});
  });
});

describe('bilingualSearch', () => {
  test('runs both languages against the provider and records failures without dropping results', async () => {
    const seen: string[] = [];
    const provider: SearchProvider = {
      id: 'fake',
      async search(query, {language, site}) {
        seen.push(`${language}:${query}@${site}`);
        if (query === 'boom') throw new Error('quota');
        return language === 'es'
          ? [{url: 'https://www.bcentral.cl/documents/a.pdf?utm_source=x', title: null, snippet: null}]
          : [{url: 'https://www.bcentral.cl/documents/a.pdf', title: null, snippet: null}, {url: 'https://www.bcentral.cl/documents/b.pdf', title: null, snippet: null}];
      },
    };
    const result = await bilingualSearch(provider, [{id: 'mpr', es: ['IPoM', 'boom'], en: ['Monetary Policy Report']}], {site: 'www.bcentral.cl'});
    assert.deepEqual(seen, ['es:IPoM@www.bcentral.cl', 'es:boom@www.bcentral.cl', 'en:Monetary Policy Report@www.bcentral.cl']);
    assert.deepEqual(result.coverage, {total: 2, onlyNative: 0, onlyEnglish: 1, both: 1});
    assert.equal(result.problems.length, 1);
  });
});

describe('classifyCentralBankDocument', () => {
  const cases: Array<[string, string | null, string[], string]> = [
    ['Minutas BanRep: La Junta Directiva decidió…', null, [], 'minutes'],
    ['BanRep Minutes: The Board of Directors decided…', null, [], 'minutes'],
    ['Informe de Política Monetaria, octubre de 2026', null, [], 'monetary_policy_report'],
    ['Monetary Policy Report - October 2026', null, [], 'monetary_policy_report'],
    ['Informe especial de Estabilidad Financiera', null, [], 'financial_stability_report'],
    ['The Board decided to keep the monetary policy interest rate unchanged at 12.25%', null, [], 'policy_decision'],
    ['Evaluating Unemployment Insurance', null, ['Working Paper', 'Documentos de trabajo'], 'research_paper'],
    ['Compras / ventas de TES y divisas', null, [], 'statistical_release'],
    ['Reporte del Mercado Laboral', null, [], 'report'],
    ['Ganadores del concurso', 'https://www.banrep.gov.co/es/noticias/ganadores-cane-2026', [], 'press_release'],
  ];
  for (const [title, url, types, expected] of cases) {
    test(`${expected}: ${title}`, () => {
      assert.equal(classifyCentralBankDocument({title, url, publisherTypes: types}), expected);
    });
  }
});

describe('configuration', () => {
  test('registry, concepts, and curated series validate', () => {
    const registry = loadRegistry();
    assert.deepEqual(
      registry.map((s) => s.id),
      ['banrep-web', 'banrep-repositorio', 'banrep-sdmx', 'bcch-web', 'bcch-bde', 'bcch-sdmx', 'bcch-repositorio'],
    );
    assert.ok(registry.every((s) => s.status !== 'active'), 'no source is active before owner approval');
    for (const concept of [...loadConcepts().documentConcepts, ...loadConcepts().seriesConcepts]) {
      assert.ok(concept.es.length && concept.en.length, `${concept.id} must have Spanish and English terms`);
    }
    assert.equal(loadSeriesConfig('config/sources/bcch-bde-series.json').length, 4);
  });
});
