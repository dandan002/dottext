import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import {BdeClient} from '@dottext/connectors';
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
    const client = new BdeClient({http: testHttp(fetch), token: TOKEN, sourceId: 'bcch-bde'});
    const store = new MemoryStore();

    const first = await runObservationCollection(client, 'bcch-bde', series, store, {window});
    assert.equal(first.status, 'succeeded');
    assert.deepEqual(first.series[0], {seriesId: 'F022.TPM.TIN.D001.NO.Z.D', received: 4, new: 4, revised: 0, unchanged: 0, failed: false});

    const second = await runObservationCollection(client, 'bcch-bde', series, store, {window});
    assert.equal(second.status, 'succeeded_quiet');

    const third = await runObservationCollection(client, 'bcch-bde', series, store, {window});
    assert.equal(third.series[0]?.revised, 1);
    const vintages = store.observations.get('bcch-bde\nF022.TPM.TIN.D001.NO.Z.D\n2021-10-15');
    assert.deepEqual(vintages?.map((o) => o.rawValue), ['2.75', '2.5']);
  });

  test('a missing token is reported as blocked without any request', async () => {
    const {fetch, calls} = fakeFetch({});
    const client = new BdeClient({http: testHttp(fetch), token: '', sourceId: 'bcch-bde'});
    const report = await runObservationCollection(client, 'bcch-bde', series, new MemoryStore(), {window});
    assert.equal(report.status, 'blocked');
    assert.equal(report.problems[0]?.kind, 'missing_credential');
    assert.equal(calls.length, 0);
  });
});
