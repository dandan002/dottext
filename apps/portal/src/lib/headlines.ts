import {
  SAMPLE_HEADLINES,
  SAMPLE_NOW,
  TOPIC_LABEL,
  type SampleHeadline,
} from './sample';
import {COUNTRY_LABEL} from './sources';

export type HeadlinePeriod = '24h' | '7d' | '30d';

const PERIOD_MS: Record<HeadlinePeriod, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export function withinPeriod(headline: SampleHeadline, period: HeadlinePeriod) {
  return (
    SAMPLE_NOW.getTime() - new Date(headline.publishedAt).getTime() <=
    PERIOD_MS[period]
  );
}

const STOPWORDS = new Set([
  'about', 'after', 'also', 'been', 'does', 'from', 'have', 'into', 'latest',
  'more', 'should', 'that', 'their', 'there', 'they', 'this', 'what', 'when',
  'where', 'which', 'with', 'would', 'week', 'today', 'news', 'happened',
]);

function keywords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(word => word.length > 2 && !STOPWORDS.has(word));
}

function haystack(headline: SampleHeadline): string {
  return [
    headline.title,
    headline.source,
    COUNTRY_LABEL[headline.country],
    TOPIC_LABEL[headline.topic],
  ]
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Keyword match over the sample set, newest first. */
export function matchHeadlines(query: string, limit = 5): SampleHeadline[] {
  const words = keywords(query);
  if (words.length === 0) {
    return [];
  }
  return SAMPLE_HEADLINES.map(headline => {
    const text = haystack(headline);
    return {headline, score: words.filter(word => text.includes(word)).length};
  })
    .filter(entry => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.headline.publishedAt.localeCompare(a.headline.publishedAt),
    )
    .slice(0, limit)
    .map(entry => entry.headline);
}

/** Time of day for today's items, a short date otherwise. */
export function formatHeadlineTime(iso: string, timeZone: string): string {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat('en-CA', {timeZone}).format(date);
  const today = new Intl.DateTimeFormat('en-CA', {timeZone}).format(SAMPLE_NOW);
  return day === today
    ? new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        minute: '2-digit',
      }).format(date)
    : new Intl.DateTimeFormat('en-US', {
        timeZone,
        month: 'short',
        day: 'numeric',
      }).format(date);
}
