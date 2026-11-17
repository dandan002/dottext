import type {TimeValue} from '@dottext/contracts';

/**
 * Build a TimeValue from source fragments without inventing precision.
 *
 * - `date` must be `YYYY`, `YYYY-MM`, or `YYYY-MM-DD` (anything after the date part is
 *   ignored on purpose: Drupal date-only fields serialize as `YYYY-MM-DDT12:00:00Z`).
 * - `clock` (`HH:MM` or `HH:MM:SS`) is wall-clock time in `timeZone`.
 * - The UTC instant is computed only when there is a clock time and a zone.
 */
export function timeFromParts(params: {
  date: string;
  clock?: string | null;
  timeZone?: string | null;
  timeZoneBasis?: 'explicit' | 'publisher_default';
  source: string;
}): TimeValue | null {
  const date = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/.exec(params.date.trim());
  if (!date) return null;
  const [, y, m, d] = date;
  if (m !== undefined && !validMonth(m)) return null;
  if (d !== undefined && !validDay(y!, m!, d)) return null;

  const clock = params.clock ? /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(params.clock.trim()) : null;
  if (!clock || d === undefined) {
    return {
      local: [y, m, d].filter((part) => part !== undefined).join('-'),
      precision: d !== undefined ? 'day' : m !== undefined ? 'month' : 'year',
      timeZone: null,
      timeZoneBasis: 'not_applicable',
      utc: null,
      source: params.source,
    };
  }

  const [, hh, mm, ss] = clock;
  const hour = Number(hh);
  const minute = Number(mm);
  const second = ss === undefined ? 0 : Number(ss);
  if (hour > 23 || minute > 59 || second > 59) return null;
  const local = `${y}-${m}-${d}T${pad(hour)}:${mm}${ss === undefined ? '' : `:${ss}`}`;
  const timeZone = params.timeZone ?? null;
  const utc = timeZone
    ? zonedWallTimeToUtc(Number(y), Number(m), Number(d), hour, minute, second, timeZone)
    : null;
  return {
    local,
    precision: ss === undefined ? 'minute' : 'second',
    timeZone,
    timeZoneBasis: timeZone ? (params.timeZoneBasis ?? 'publisher_default') : 'not_applicable',
    utc: utc ? utc.toISOString() : null,
    source: params.source,
  };
}

/** Parse an ISO 8601 instant with an explicit offset or `Z` (e.g. OAI datestamps). */
export function timeFromInstant(value: string, source: string): TimeValue | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(:\d{2})?(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/.exec(value.trim());
  if (!match) return null;
  const instant = new Date(value.trim());
  if (Number.isNaN(instant.getTime())) return null;
  const [, date, hm, sec] = match;
  return {
    local: `${date}T${hm}${sec ?? ''}`,
    precision: sec ? 'second' : 'minute',
    timeZone: match[4] === 'Z' ? 'UTC' : null,
    timeZoneBasis: 'explicit',
    utc: instant.toISOString(),
    source,
  };
}

/**
 * Convert a wall-clock time in an IANA zone to UTC. Returns null for local times
 * that do not exist (spring-forward gaps). Ambiguous fall-back times resolve to
 * the earlier offset.
 */
export function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date | null {
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  // Two candidate offsets: the zone's offset a day before and a day after cover any transition.
  const candidates = new Set([offsetMs(wall - 86_400_000, timeZone), offsetMs(wall + 86_400_000, timeZone)]);
  const matches = [...candidates]
    .map((offset) => wall - offset)
    .filter((utc) => wallClockMs(utc, timeZone) === wall)
    .sort((a, b) => a - b);
  return matches.length ? new Date(matches[0]!) : null;
}

function offsetMs(utcMs: number, timeZone: string): number {
  return wallClockMs(utcMs, timeZone) - utcMs;
}

function wallClockMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
}

/** Compare TimeValues by their local value; coarser values compare by their start. */
export function compareLocal(a: TimeValue, b: TimeValue): number {
  return a.local < b.local ? -1 : a.local > b.local ? 1 : 0;
}

/** First calendar day covered by the value, as `YYYY-MM-DD`. */
export function startDay(value: TimeValue): string {
  const [y, m = '01', d = '01'] = value.local.slice(0, 10).split('-');
  return `${y}-${m}-${d}`;
}

/** Last calendar day covered by the value, as `YYYY-MM-DD`. */
export function endDay(value: TimeValue): string {
  const [y, m, d] = value.local.slice(0, 10).split('-');
  if (d !== undefined) return `${y}-${m}-${d}`;
  if (m !== undefined) {
    const last = new Date(Date.UTC(Number(y), Number(m), 0)).getUTCDate();
    return `${y}-${m}-${pad(last)}`;
  }
  return `${y}-12-31`;
}

/**
 * Whether a source time may fall inside [since, until]. Exact instants compare
 * exactly; coarser values compare by calendar day, inclusively, so an item is never
 * dropped because its zone or time of day is unknown.
 */
export function mayFallInWindow(value: TimeValue, since: Date, until: Date): boolean {
  if (value.utc) {
    const t = Date.parse(value.utc);
    return t >= since.getTime() && t <= until.getTime();
  }
  const sinceDay = since.toISOString().slice(0, 10);
  const untilDay = until.toISOString().slice(0, 10);
  return endDay(value) >= sinceDay && startDay(value) <= untilDay;
}

/** Whether the value is certainly older than `since` (used to stop paging backwards). */
export function certainlyBefore(value: TimeValue, since: Date): boolean {
  if (value.utc) return Date.parse(value.utc) < since.getTime();
  return endDay(value) < since.toISOString().slice(0, 10);
}

function validMonth(m: string): boolean {
  const n = Number(m);
  return n >= 1 && n <= 12;
}

function validDay(y: string, m: string, d: string): boolean {
  const n = Number(d);
  if (n < 1) return false;
  return n <= new Date(Date.UTC(Number(y), Number(m), 0)).getUTCDate();
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
