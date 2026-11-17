import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import {BdeClient, findSeries, frequencyFromSeriesId, parseBdeDate, parseBdeNumber, referencePeriod, unitFromTitle} from '../src/bcch/bde.ts';
import {fakeFetch, fixture, json, testHttp} from './helpers.ts';

const TOKEN = 'synthetic-token-1234';
const GET_TPM =
  'https://si3.bcentral.cl/SieteRestWS/SieteRestWS.ashx?token=synthetic-token-1234&function=GetSeries&timeseries=F022.TPM.TIN.D001.NO.Z.D&firstdate=2021-10-10&lastdate=2021-10-15';
const SEARCH_Q =
  'https://si3.bcentral.cl/SieteRestWS/SieteRestWS.ashx?token=synthetic-token-1234&function=SearchSeries&frequency=QUARTERLY';

describe('BDE value parsing', () => {
  test('dates, numbers, reference periods, frequency suffixes, units', () => {
    assert.equal(parseBdeDate('12-10-2021'), '2021-10-12');
    assert.equal(parseBdeDate('31-02-2021'), null);
    assert.equal(parseBdeNumber('2.75'), 2.75);
    assert.equal(parseBdeNumber('NaN'), null);
    assert.equal(parseBdeNumber('1,5'), null);
    assert.equal(referencePeriod('2024-07-01', 'QUARTERLY'), '2024-Q3');
    assert.equal(referencePeriod('2024-10-01', 'MONTHLY'), '2024-10');
    assert.equal(frequencyFromSeriesId('F032.PIB.FLU.R.CLP.EP18.Z.Z.0.T'), 'QUARTERLY');
    assert.equal(unitFromTitle('Tasa de política monetaria (TPM) (porcentaje)'), 'porcentaje');
  });
});

describe('BdeClient', () => {
  test('never calls the API without a token', async () => {
    const {fetch, calls} = fakeFetch({});
    const client = new BdeClient({http: testHttp(fetch), token: null, sourceId: 'bcch-bde'});
    const result = await client.getSeries('F022.TPM.TIN.D001.NO.Z.D');
    assert.equal(!result.ok && result.problem.kind, 'missing_credential');
    assert.equal(calls.length, 0);
  });

  test('maps the documented GetSeries payload to observations with curated unit', async () => {
    const {fetch} = fakeFetch({[GET_TPM]: json(fixture('bcch/bde-getseries.json'))});
    const client = new BdeClient({http: testHttp(fetch), token: TOKEN, sourceId: 'bcch-bde'});
    const result = await client.getSeries(
      'F022.TPM.TIN.D001.NO.Z.D',
      {firstDate: '2021-10-10', lastDate: '2021-10-15'},
      {seriesId: 'F022.TPM.TIN.D001.NO.Z.D', unit: 'percent', seasonalAdjustment: 'not_applicable'},
      new Date('2026-11-17T12:00:00Z'),
    );
    assert.ok(result.ok);
    assert.equal(result.value.titleEn, 'Monetary policy rate (MPR) (percentage)');
    assert.deepEqual(result.value.observations[2], {
      sourceId: 'bcch-bde',
      seriesId: 'F022.TPM.TIN.D001.NO.Z.D',
      frequency: 'DAILY',
      referencePeriod: '2021-10-14',
      value: 2.75,
      rawValue: '2.75',
      status: 'OK',
      unit: 'percent',
      unitMultiplier: null,
      producer: null,
      seasonalAdjustment: 'not_applicable',
      valueKind: 'reported',
      retrievedAt: '2026-11-17T12:00:00.000Z',
    });
  });

  test('a non-zero Codigo is a publisher error and the token never appears in the problem', async () => {
    const {fetch} = fakeFetch({[GET_TPM]: json(fixture('bcch/bde-error.json'))});
    const client = new BdeClient({http: testHttp(fetch, {secretValues: [TOKEN]}), token: TOKEN, sourceId: 'bcch-bde'});
    const result = await client.getSeries('F022.TPM.TIN.D001.NO.Z.D', {firstDate: '2021-10-10', lastDate: '2021-10-15'});
    assert.ok(!result.ok);
    assert.equal(result.problem.kind, 'publisher_error');
    assert.match(result.problem.message, /-5/);
    assert.ok(!JSON.stringify(result.problem).includes(TOKEN));
  });

  test('catalog search matches Spanish and English titles separately', async () => {
    const {fetch} = fakeFetch({[SEARCH_Q]: json(fixture('bcch/bde-searchseries.json'))});
    const client = new BdeClient({http: testHttp(fetch), token: TOKEN, sourceId: 'bcch-bde'});
    const catalog = await client.searchSeries('QUARTERLY');
    assert.ok(catalog.ok);
    assert.equal(catalog.value[1]?.lastObservation, '2025-04-01');

    const gdp = findSeries(catalog.value, {id: 'gdp', es: ['PIB'], en: ['GDP']});
    assert.deepEqual(gdp.map((m) => [m.record.seriesId, m.matchedIn]), [['F032.PIB.FLU.R.CLP.EP18.Z.Z.0.T', ['es', 'en']]]);

    // An English-only phrasing still finds the series: the English title carries it.
    const ca = findSeries(catalog.value, {id: 'current-account', es: ['balanza corriente'], en: ['current account']});
    assert.deepEqual(ca.map((m) => [m.record.seriesId, m.matchedIn]), [['F061.1.FLU.S.USD.Z.T', ['en']]]);
  });
});
