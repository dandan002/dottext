import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import {
  BanrepSdmxClient,
  findDataflows,
  parseSdmxDataflows,
  parseSdmxGenericData,
  SDMX_GENERIC_DATA,
} from '../src/banrep/sdmx.ts';
import {sdmxReferencePeriod} from '../src/sdmx/common.ts';
import {loadSdmxFlows} from '../src/registry.ts';
import {fakeFetch, fixture, html, testHttp} from './helpers.ts';

const BASE = 'https://totoro.banrep.gov.co/nsi-jax-ws/rest';
const IBR_URL = `${BASE}/data/ESTAT,DF_IBR_DAILY_HIST,1.0/all/ALL/?startPeriod=2026-11-01`;
const sdmx = (body: string) => ({body, headers: {'content-type': 'application/vnd.sdmx.genericdata+xml; version=2.1'}});

describe('SDMX parsing', () => {
  test('reads dataflow IDs with Spanish and English names', () => {
    const parsed = parseSdmxDataflows(fixture('banrep-sdmx/dataflows.xml'));
    assert.ok(parsed.ok);
    assert.deepEqual(parsed.dataflows[0], {
      agencyId: 'ESTAT',
      id: 'DF_CBR_DAILY_HIST',
      version: '1.0',
      nameEs: 'SYNTHETIC Tasa de Política Monetaria - Serie de datos históricos',
      nameEn: 'SYNTHETIC Central Bank Rate - Historical Data Series',
    });
    assert.equal(parsed.dataflows[2]?.nameEn, null);
  });

  test('bilingual search finds flows a single language would miss', () => {
    const parsed = parseSdmxDataflows(fixture('banrep-sdmx/dataflows.xml'));
    assert.ok(parsed.ok);
    // The Spanish name carries a publisher typo ("Maercado"): only the English term finds it.
    const fx = findDataflows(parsed.dataflows, {id: 'usd-cop', es: ['tasa representativa del mercado'], en: ['exchange rate']});
    assert.deepEqual(fx.map((m) => [m.record.id, m.matchedIn]), [['DF_TRM_DAILY_LATEST', ['en']]]);
    // A flow named only in Spanish is still found by the Spanish term.
    const ibr = findDataflows(parsed.dataflows, {id: 'ibr', es: ['IBR'], en: ['IBR']});
    assert.deepEqual(ibr.map((m) => [m.record.id, m.matchedIn]), [['DF_IBR_DAILY_HIST', ['es']]]);
  });

  test('reads series keys and observations from generic data', () => {
    const parsed = parseSdmxGenericData(fixture('banrep-sdmx/data-ibr.xml'));
    assert.ok(parsed.ok);
    assert.deepEqual(
      parsed.series.map((s) => [s.keyString, s.observations.length]),
      [
        ['CO.IRIBRM00._Z._Z._Z.ER.D', 4],
        ['CO.IRIBRM00._Z._Z._Z.NR.D', 1],
      ],
    );
    assert.deepEqual(parsed.series[0]?.observations[2], {period: '20261104', value: 'NaN', attributes: {OBS_STATUS: 'M'}});
  });

  test('normalizes SDMX periods to contract reference periods', () => {
    assert.equal(sdmxReferencePeriod('20261117', 'DAILY'), '2026-11-17');
    assert.equal(sdmxReferencePeriod('202610', 'MONTHLY'), '2026-10');
    assert.equal(sdmxReferencePeriod('2026-08', 'QUARTERLY'), '2026-Q3');
    assert.equal(sdmxReferencePeriod('2026-Q4', 'QUARTERLY'), '2026-Q4');
    assert.equal(sdmxReferencePeriod('202613', 'MONTHLY'), null);
    assert.equal(sdmxReferencePeriod('2026', 'DAILY'), null);
  });

  test('rejects non-SDMX and entity-declaring documents', () => {
    assert.equal(parseSdmxGenericData(fixture('challenges/radware-block.html')).ok, false);
    assert.equal(parseSdmxGenericData('<?xml version="1.0"?><!DOCTYPE x [<!ENTITY a "a">]><GenericData/>').ok, false);
  });
});

describe('BanrepSdmxClient', () => {
  test('sends only startPeriod with the generic-data Accept type, and windows client-side', async () => {
    const {fetch, calls} = fakeFetch({[IBR_URL]: sdmx(fixture('banrep-sdmx/data-ibr.xml'))});
    const client = new BanrepSdmxClient({http: testHttp(fetch), sourceId: 'banrep-sdmx'});
    const result = await client.getObservations(
      {flowId: 'DF_IBR_DAILY_HIST', unitLabels: {NR: 'SYNTHETIC label'}},
      {since: '2026-11-01', until: '2026-11-17'},
      new Date('2026-11-17T15:00:00Z'),
    );
    assert.equal(calls[0]?.url, IBR_URL);
    assert.equal(calls[0]?.headers['accept'], SDMX_GENERIC_DATA);
    assert.ok(result.ok);
    // 2026-01-02 (before the window) and 2026-12-15 (published ahead, after it) are excluded.
    assert.deepEqual(
      result.observations.map((o) => [o.seriesId, o.referencePeriod, o.value, o.status, o.unit]),
      [
        ['DF_IBR_DAILY_HIST:CO.IRIBRM00._Z._Z._Z.ER.D', '2026-11-03', 11.111, 'A', 'ER'],
        ['DF_IBR_DAILY_HIST:CO.IRIBRM00._Z._Z._Z.ER.D', '2026-11-04', null, 'M', 'ER'],
        ['DF_IBR_DAILY_HIST:CO.IRIBRM00._Z._Z._Z.NR.D', '2026-11-03', 10.101, 'A', 'SYNTHETIC label'],
      ],
    );
    assert.equal(result.observations[0]?.seasonalAdjustment, 'not_applicable');
    assert.equal(result.observations[1]?.rawValue, 'NaN');
  });

  test('a 406 (format not served) and a challenge are failures, never empty data', async () => {
    const {fetch} = fakeFetch({[IBR_URL]: [{status: 406, body: 'HTTP Status 406 – Not Acceptable'}, html(fixture('challenges/radware-block.html'))]});
    const client = new BanrepSdmxClient({http: testHttp(fetch), sourceId: 'banrep-sdmx'});
    const window = {since: '2026-11-01', until: '2026-11-17'};
    const first = await client.getObservations({flowId: 'DF_IBR_DAILY_HIST'}, window, new Date());
    assert.equal(!first.ok && first.problem.kind, 'http_error');
    const second = await client.getObservations({flowId: 'DF_IBR_DAILY_HIST'}, window, new Date());
    assert.equal(!second.ok && second.problem.kind, 'blocked_by_bot_protection');
  });

  test('curated dataflow config validates', () => {
    const flows = loadSdmxFlows('config/sources/banrep-sdmx-dataflows.json');
    assert.deepEqual(
      flows.map((f) => f.flowId),
      ['DF_CBR_DAILY_HIST', 'DF_TRM_DAILY_HIST', 'DF_IBR_DAILY_HIST', 'DF_UVR_DAILY_HIST'],
    );
  });
});
