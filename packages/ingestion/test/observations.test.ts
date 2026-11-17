import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import {BanrepSdmxClient, banrepSdmxFetcher, BdeClient, bdeFetcher} from '@dottext/connectors';
import {fakeFetch, fixture, json, testHttp} from '../../connectors/test/helpers.ts';
import {runObservationCollection} from '../src/observations.ts';
import {MemoryStore} from '../src/store.ts';

const TOKEN = 'synthetic-token-1234';
const URL_TPM =
  'https://si3.bcentral.cl/SieteRestWS/SieteRestWS.ashx?token=synthetic-token-1234&function=GetSeries&timeseries=F022.TPM.TIN.D001.NO.Z.D&firstdate=2021-10-10&lastdate=2021-10-15';
const series = [{seriesId: 'F022.TPM.TIN.D001.NO.Z.D', unit: 'percent', seasonalAdjustment: 'not_applicable' as const}];
const window = {since: '2021-10-10', until: '2021-10-15'};

function revisedPayload(): string {
  const payload = JSON.parse(fixture('bcch/bde-getseries.json'));
  payload.Series.Obs[3].value = '2.5'; // SYNTHETIC revision of the last point
  return JSON.stringify(payload);
}

describe('runObservationCollection', () => {
  test('stores new points, ignores unchanged ones, and keeps revised vintages', async () => {
    const {fetch} = fakeFetch({[URL_TPM]: [json(fixture('bcch/bde-getseries.json')), json(fixture('bcch/bde-getseries.json')), json(revisedPayload())]});
    const fetcher = bdeFetcher(new BdeClient({http: testHttp(fetch), token: TOKEN, sourceId: 'bcch-bde'}), 'bcch-bde', series);
    const store = new MemoryStore();

    const first = await runObservationCollection(fetcher, store, {window});
    assert.equal(first.status, 'succeeded');
    assert.deepEqual(first.series[0], {seriesId: 'F022.TPM.TIN.D001.NO.Z.D', received: 4, new: 4, revised: 0, unchanged: 0, failed: false});

    const second = await runObservationCollection(fetcher, store, {window});
    assert.equal(second.status, 'succeeded_quiet');

    const third = await runObservationCollection(fetcher, store, {window});
    assert.equal(third.series[0]?.revised, 1);
    const vintages = store.observations.get('bcch-bde\nF022.TPM.TIN.D001.NO.Z.D\n2021-10-15');
    assert.deepEqual(vintages?.map((o) => o.rawValue), ['2.75', '2.5']);
  });

  test('a missing token is reported as blocked without any request', async () => {
    const {fetch, calls} = fakeFetch({});
    const fetcher = bdeFetcher(new BdeClient({http: testHttp(fetch), token: '', sourceId: 'bcch-bde'}), 'bcch-bde', series);
    const report = await runObservationCollection(fetcher, new MemoryStore(), {window});
    assert.equal(report.status, 'blocked');
    assert.equal(report.problems[0]?.kind, 'missing_credential');
    assert.equal(calls.length, 0);
  });

  test('collects every series of an SDMX dataflow under one configured item', async () => {
    const url = 'https://totoro.banrep.gov.co/nsi-jax-ws/rest/data/ESTAT,DF_IBR_DAILY_HIST,1.0/all/ALL/?startPeriod=2026-11-01';
    const {fetch} = fakeFetch({[url]: {body: fixture('banrep-sdmx/data-ibr.xml'), headers: {'content-type': 'application/vnd.sdmx.genericdata+xml'}}});
    const fetcher = banrepSdmxFetcher(new BanrepSdmxClient({http: testHttp(fetch), sourceId: 'banrep-sdmx'}), [{flowId: 'DF_IBR_DAILY_HIST'}]);
    const store = new MemoryStore();
    const report = await runObservationCollection(fetcher, store, {window: {since: '2026-11-01', until: '2026-11-17'}});
    assert.equal(report.status, 'succeeded');
    assert.deepEqual(report.series, [{seriesId: 'DF_IBR_DAILY_HIST', received: 3, new: 3, revised: 0, unchanged: 0, failed: false}]);
    assert.equal(store.observations.size, 3);
  });
});
