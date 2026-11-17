// Design-time sample content. None of this is collected evidence: no connectors
// run yet. Pages that render it say so on screen.

import type {Country} from './sources';

export type DocumentType = 'statement' | 'release' | 'report' | 'article';
export type Topic = 'fx' | 'rates' | 'credit' | 'fiscal' | 'politics' | 'activity';

export interface SampleHeadline {
  id: string;
  /** English headline as it would appear after summarization. */
  title: string;
  source: string;
  country: Country;
  type: DocumentType;
  topic: Topic;
  /** ISO timestamp the publisher gives. */
  publishedAt: string;
}

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  statement: 'Statement',
  release: 'Data release',
  report: 'Report',
  article: 'Article',
};

export const TOPIC_LABEL: Record<Topic, string> = {
  fx: 'FX',
  rates: 'Rates',
  credit: 'Sovereign credit',
  fiscal: 'Fiscal',
  politics: 'Politics',
  activity: 'Activity',
};

/** "Now" for the sample set, so relative periods are stable in screenshots. */
export const SAMPLE_NOW = new Date('2026-11-16T16:00:00Z');

export const SAMPLE_HEADLINES: SampleHeadline[] = [
  {id: 'cl-01', title: 'Regional mining association comments on labor talks', source: 'BioBioChile', country: 'chile', type: 'article', topic: 'activity', publishedAt: '2026-11-16T13:40:00Z'},
  {id: 'cl-02', title: 'Senate committee schedules pension debate', source: 'El Mostrador', country: 'chile', type: 'article', topic: 'politics', publishedAt: '2026-11-16T11:05:00Z'},
  {id: 'cl-03', title: 'Copper producers report quarterly output', source: 'Radio Universidad de Chile', country: 'chile', type: 'article', topic: 'activity', publishedAt: '2026-11-15T21:20:00Z'},
  {id: 'cl-04', title: 'Monetary policy meeting statement', source: 'Banco Central de Chile', country: 'chile', type: 'statement', topic: 'rates', publishedAt: '2026-11-13T22:00:00Z'},
  {id: 'cl-05', title: 'Consumer price index, monthly release', source: 'INE', country: 'chile', type: 'release', topic: 'activity', publishedAt: '2026-11-09T11:00:00Z'},
  {id: 'cl-06', title: 'Quarterly budget execution report', source: 'DIPRES', country: 'chile', type: 'report', topic: 'fiscal', publishedAt: '2026-11-04T15:30:00Z'},
  {id: 'co-01', title: 'Local exporters on peso volatility', source: 'Portafolio', country: 'colombia', type: 'article', topic: 'fx', publishedAt: '2026-11-16T14:15:00Z'},
  {id: 'co-02', title: 'Congress committee debates tax bill amendments', source: 'La República', country: 'colombia', type: 'article', topic: 'politics', publishedAt: '2026-11-16T09:50:00Z'},
  {id: 'co-03', title: 'Labor market survey, monthly release', source: 'DANE', country: 'colombia', type: 'release', topic: 'activity', publishedAt: '2026-11-12T15:00:00Z'},
  {id: 'co-04', title: 'Debt office outlines issuance calendar', source: 'La República', country: 'colombia', type: 'article', topic: 'credit', publishedAt: '2026-11-11T13:25:00Z'},
  {id: 'co-05', title: 'Medium-term fiscal framework update', source: 'Finance ministry', country: 'colombia', type: 'report', topic: 'fiscal', publishedAt: '2026-11-06T17:00:00Z'},
  {id: 'co-06', title: 'Board of directors policy decision', source: 'Banco de la República', country: 'colombia', type: 'statement', topic: 'rates', publishedAt: '2026-10-31T18:00:00Z'},
];

export type Analyst = 'briefing' | 'local' | 'macro' | 'political';

export const ANALYST_LABEL: Record<Analyst, string> = {
  briefing: 'Briefing',
  local: 'Local color',
  macro: 'Macro outlook',
  political: 'Political analysis',
};

/**
 * Placeholder prose that describes what will appear in each slot, so the layout
 * can be judged at realistic length without inventing research.
 */
export const SAMPLE_BRIEFING: Record<
  Analyst,
  {overview: string; countries: Record<Country, string[]>}
> = {
  briefing: {
    overview:
      'The overview opens with the few developments that matter across both countries, written as connected prose for a reader who already watches the terminal. It names who said what and when, separates official statements from reported positions, and links each claim to the evidence behind it.',
    countries: {
      chile: [
        'Country sections follow the overview. Each one leads with the most material change in the period, then turns to the persistent drivers in the coverage profile: copper, Codelco, fiscal policy, inflation and the central bank.',
        'Quiet days stay short. Unchanged background is dated and linked rather than restated, and the section says plainly when nothing material happened.',
      ],
      colombia: [
        'The same structure holds here. Material developments come first, followed by the drivers in the Colombia profile, with disagreements between sources preserved instead of averaged away.',
        'Translated quotations are marked as translations, keep their original numbers and reference periods, and link back to the Spanish source.',
      ],
    },
  },
  local: {
    overview:
      'Local color gathers domestic reactions, interviews and regional reporting. Each item says who spoke, in what capacity and when, without treating a handful of voices as representative opinion.',
    countries: {
      chile: [
        'Regional business associations, unions and officials appear here with their own words, translated and attributed.',
      ],
      colombia: [
        'Accessible informal views reported by local outlets sit here, clearly separated from official positions.',
      ],
    },
  },
  macro: {
    overview:
      'Macro outlook covers growth, inflation, monetary and fiscal policy, external accounts and financing. Observations, our interpretation, institutional forecasts and market pricing are kept visibly distinct.',
    countries: {
      chile: [
        'An unchanged outlook gets a brief update with links to the prior assessment rather than a new thesis.',
      ],
      colombia: [
        'Data releases are cited with their reference period and units exactly as published.',
      ],
    },
  },
  political: {
    overview:
      'Political analysis weighs policy feasibility, coalitions, institutional constraints and implementation risk. Scenarios come with observable signposts and no numerical probabilities.',
    countries: {
      chile: [
        'Rhetoric, proposals, announced decisions, enacted measures and implementation are separated so the stage of each item is clear.',
      ],
      colombia: [
        'Where stakeholders disagree, the section shows each position with its date and source.',
      ],
    },
  },
};
