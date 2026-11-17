import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import {BcchSdmxClient, parseSdmxStructureSpecific} from '../src/bcch/sdmx.ts';
import {loadBcchSdmxCategories} from '../src/registry.ts';
import {fakeFetch, fixture, html, testHttp} from './helpers.ts';

const URL = 'https://si3.bcentral.cl/SieteSdmx/SieteSdmx.ashx?SDMXCategory=SDMX_TEST';
const xml = (body: string) => ({body, headers: {'content-type': 'text/xml'}});
const window = {since: '2025-01-01', until: '2026-11-17'};
const config = {
  code: 'SDMX_TEST',
  producer: 'SYNTHETIC-PRODUCER',
  suffixUnits: {_USD: 'USD', _XDC: 'CLP'},
  indicatorUnits: {ENDA_XDC_USD_RATE: 'CLP per USD, period average'},
  indicatorMultiplier: {ENDA_XDC_USD_RATE: 0},
  seasonallyAdjustedMarker: '_SA_',
};

describe('BCCh SDMX (NSDP categories)', () => {
  test('parses structure-specific series attributes and observations, BOM included', () => {
    const parsed = parseSdmxStructureSpecific(fixture('bcch-sdmx/category.xml'));
    assert.ok(parsed.ok);
    assert.equal(parsed.series.length, 2);
    assert.equal(parsed.series[1]?.attributes['BASE_PER'], '2018');
    assert.deepEqual(parsed.series[0]?.observations[2], {TIME_PERIOD: '2026-10', OBS_VALUE: 'NaN', OBS_STATUS: 'M'});
  });

  test('maps observations with producer, curated unit and multiplier fix, SA marker, base in identity', async () => {
    const {fetch, calls} = fakeFetch({[URL]: xml(fixture('bcch-sdmx/category.xml'))});
    const result = await new BcchSdmxClient({http: testHttp(fetch), sourceId: 'bcch-sdmx'}).getCategory(config, window, new Date('2026-11-17T15:00:00Z'));
    assert.equal(calls.length, 1);
    assert.ok(result.ok);
    assert.deepEqual(
      result.observations.map((o) => [o.seriesId, o.referencePeriod, o.value, o.status, o.unit, o.unitMultiplier, o.seasonalAdjustment]),
      [
        ['SDMX_TEST:EXR.CL.ENDA_XDC_USD_RATE._Z.M', '2026-09', 999.123456789, 'A', 'CLP per USD, period average', 0, 'unknown'],
        ['SDMX_TEST:EXR.CL.ENDA_XDC_USD_RATE._Z.M', '2026-10', null, 'M', 'CLP per USD, period average', 0, 'unknown'],
        ['SDMX_TEST:NAG.CL.NGDP_R_SA_XDC._Z.Q.base2018', '2026-Q1', 12345.6, 'A', 'CLP', 6, 'seasonally_adjusted'],
        ['SDMX_TEST:NAG.CL.NGDP_R_SA_XDC._Z.Q.base2018', '2026-Q2', 12400.1, 'A', 'CLP', 6, 'seasonally_adjusted'],
      ],
    );
    assert.ok(result.observations.every((o) => o.producer === 'SYNTHETIC-PRODUCER'));
  });

  test('a challenge or non-SDMX body is a failure, not an empty category', async () => {
    const {fetch} = fakeFetch({[URL]: html(fixture('challenges/incapsula.html'))});
    const result = await new BcchSdmxClient({http: testHttp(fetch), sourceId: 'bcch-sdmx'}).getCategory(config, window, new Date());
    assert.equal(!result.ok && result.problem.kind, 'blocked_by_bot_protection');
    assert.equal(parseSdmxStructureSpecific('<html><body>error</body></html>').ok, false);
  });

  test('curated categories validate and carry shared suffix units', () => {
    const categories = loadBcchSdmxCategories('config/sources/bcch-sdmx-categories.json');
    assert.equal(categories.length, 10);
    assert.deepEqual([...new Set(categories.map((c) => c.producer))].sort(), ['BCCh', 'DIPRES', 'INE']);
    assert.equal(categories[0]?.suffixUnits?.['_USD'], 'USD');
    assert.equal(categories.find((c) => c.code === 'SDMX_XRATE')?.indicatorMultiplier?.['ENDA_XDC_USD_RATE'], 0);
  });
});
