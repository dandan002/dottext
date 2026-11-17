import type {DocumentType} from '@dottext/contracts';
import {containsTerm} from './bilingual.ts';

/**
 * Cheap, deterministic central-bank document typing from titles, URL paths, and
 * publisher-supplied types. Terms are listed in Spanish and English because
 * either version of a document (or a repository's bilingual metadata) may be the
 * only one available. Ordered: the first matching rule wins.
 */
const RULES: Array<{type: DocumentType; terms: string[]}> = [
  {type: 'minutes', terms: ['minuta', 'minutas', 'acta', 'actas', 'minutes']},
  {
    type: 'monetary_policy_report',
    terms: [
      'informe de politica monetaria',
      'informe sobre inflacion',
      'ipom',
      'monetary policy report',
      'inflation report',
    ],
  },
  {
    type: 'financial_stability_report',
    terms: ['estabilidad financiera', 'financial stability'],
  },
  {
    type: 'policy_decision',
    terms: [
      'tasa de interes de politica monetaria',
      'tasa de politica monetaria',
      'tasa de referencia',
      'comunicado rpm',
      'reunion de politica monetaria',
      'monetary policy interest rate',
      'monetary policy rate',
      'benchmark rate',
      'monetary policy meeting',
    ],
  },
  {type: 'speech', terms: ['discurso', 'presentacion', 'palabras de', 'intervencion de', 'speech', 'presentation', 'remarks']},
  {
    type: 'research_paper',
    terms: ['working paper', 'documentos de trabajo', 'documento de trabajo', 'borradores de economia', 'borrador de economia'],
  },
  {
    type: 'statistical_release',
    terms: [
      'compras ventas',
      'purchases sales',
      'boletin estadistico',
      'statistical bulletin',
      'divulgacion de la encuesta',
      'dissemination of the',
      'indicadores de coyuntura',
    ],
  },
  {type: 'report', terms: ['informe', 'reporte', 'report']},
];

export function classifyCentralBankDocument(input: {
  title: string;
  url?: string | null;
  publisherTypes?: readonly string[];
  /** e.g. repository collection names, or listing section names. */
  sections?: readonly string[];
}): DocumentType {
  const path = input.url ? safePath(input.url).replace(/[-_/]+/g, ' ') : '';
  const haystacks = [input.title, ...(input.publisherTypes ?? []), ...(input.sections ?? []), path];
  for (const rule of RULES) {
    if (rule.terms.some((term) => haystacks.some((h) => containsTerm(h, term)))) return rule.type;
  }
  if (/\/(noticias|news|press-releases?|comunicados?)\b/i.test(input.url ?? '')) return 'press_release';
  return 'other';
}

function safePath(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname);
  } catch {
    return '';
  }
}
