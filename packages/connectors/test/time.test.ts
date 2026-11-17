import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import {certainlyBefore, mayFallInWindow, timeFromInstant, timeFromParts, zonedWallTimeToUtc} from '../src/time.ts';

describe('timeFromParts', () => {
  test('ignores the Drupal noon-UTC artifact on date-only fields', () => {
    const t = timeFromParts({date: '2026-11-06T12:00:00Z', source: 's'});
    assert.deepEqual(t, {
      local: '2026-11-06',
      precision: 'day',
      timeZone: null,
      timeZoneBasis: 'not_applicable',
      utc: null,
      source: 's',
    });
  });

  test('resolves a Bogotá wall-clock time to UTC and records the basis', () => {
    const t = timeFromParts({date: '2026-11-06', clock: '13:00', timeZone: 'America/Bogota', source: 's'});
    assert.equal(t?.local, '2026-11-06T13:00');
    assert.equal(t?.precision, 'minute');
    assert.equal(t?.utc, '2026-11-06T18:00:00.000Z');
    assert.equal(t?.timeZoneBasis, 'publisher_default');
  });

  test('keeps month and year precision without inventing a day', () => {
    assert.equal(timeFromParts({date: '2026-10', source: 's'})?.precision, 'month');
    assert.equal(timeFromParts({date: '1953', source: 's'})?.local, '1953');
  });

  test('a clock without a zone stays unresolved rather than assumed UTC', () => {
    const t = timeFromParts({date: '2026-11-06', clock: '09:25', source: 's'});
    assert.equal(t?.local, '2026-11-06T09:25');
    assert.equal(t?.utc, null);
  });

  test('rejects impossible dates and times', () => {
    assert.equal(timeFromParts({date: '2026-02-30', source: 's'}), null);
    assert.equal(timeFromParts({date: '2026-13', source: 's'}), null);
    assert.equal(timeFromParts({date: '2026-11-06', clock: '25:00', timeZone: 'UTC', source: 's'}), null);
  });
});

describe('zonedWallTimeToUtc', () => {
  test('returns null inside a spring-forward gap (America/Santiago, 2026-09-06 00:30 does not exist)', () => {
    assert.equal(zonedWallTimeToUtc(2026, 9, 6, 0, 30, 0, 'America/Santiago'), null);
  });

  test('resolves an ambiguous fall-back time to the earlier instant (America/New_York 2026-11-01 01:30)', () => {
    assert.equal(zonedWallTimeToUtc(2026, 11, 1, 1, 30, 0, 'America/New_York')?.toISOString(), '2026-11-01T05:30:00.000Z');
  });
});

describe('timeFromInstant', () => {
  test('parses explicit-offset instants', () => {
    const t = timeFromInstant('2026-11-04T15:52:22Z', 'oai');
    assert.equal(t?.utc, '2026-11-04T15:52:22.000Z');
    assert.equal(t?.timeZoneBasis, 'explicit');
    assert.equal(timeFromInstant('2026-11-04', 'oai'), null);
  });
});

describe('window checks', () => {
  const since = new Date('2026-10-17T00:00:00Z');
  const until = new Date('2026-11-17T23:59:59Z');

  test('day-precision values compare inclusively by calendar day', () => {
    const d = timeFromParts({date: '2026-10-17', source: 's'})!;
    assert.equal(mayFallInWindow(d, new Date('2026-10-17T15:00:00Z'), until), true);
    assert.equal(certainlyBefore(d, new Date('2026-10-17T15:00:00Z')), false);
    assert.equal(certainlyBefore(timeFromParts({date: '2026-10-16', source: 's'})!, since), true);
  });

  test('a month overlapping the window start may fall in it', () => {
    const m = timeFromParts({date: '2026-10', source: 's'})!;
    assert.equal(mayFallInWindow(m, since, until), true);
    assert.equal(certainlyBefore(m, since), false);
  });
});
