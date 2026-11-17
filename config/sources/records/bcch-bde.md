# bcch-bde — Banco Central de Chile statistics API (BDE)

| Field | Value |
| --- | --- |
| Source ID / publisher | `bcch-bde` / Banco Central de Chile, Base de Datos Estadísticos |
| Country / language | Chile / series titles in Spanish and English |
| Status | **Blocked on credential** — client built from documentation; not yet validated live |
| Discovery endpoint and method | REST `https://si3.bcentral.cl/SieteRestWS/SieteRestWS.ashx` ([documentation](https://si3.bcentral.cl/estadisticas/Principal1/Web_Services/documentacion.html), checked 2026-11-17). `SearchSeries&frequency=DAILY\|MONTHLY\|QUARTERLY\|ANNUAL` returns the catalog with Spanish and English titles; `GetSeries&timeseries=…&firstdate=…&lastdate=…` returns observations. A SOAP service also exists (`https://si3.bcentral.cl/SieteWS/sietews.asmx?wsdl`, BDE email and password); no SDMX endpoint was found. Series are found by **bilingual catalog search** (Spanish terms vs Spanish titles, English terms vs English titles): `npm run collect -- --source bcch-bde --find cpi`. |
| Article and attachment extraction | n/a — observations: `indexDateString` (`DD-MM-YYYY`), `value` (string, `.` decimal), `statusCode`. Non-`OK` or non-numeric values are stored as null with the raw value kept. |
| Publication/modification/event time parsing | Reference periods derived from date + frequency (`2024-10`, `2024-Q3`). Release times are not provided by the API. |
| First-seen/collection handling | Each retrieval records `retrievedAt`; a period whose value or status changes is stored as a new vintage (revision), earlier vintages kept. |
| Actual history range and gaps | Per series (`firstObservation`/`lastObservation` in the catalog); e.g. policy rate since 1997-02-07 per documentation. |
| Access/retention terms and supporting references | [API terms](https://si3.bcentral.cl/estadisticas/Principal1/Web_Services/terminos_condiciones.html): free, indefinite, revocable right of use; at most 5 series requests per second per enabled account; repeated breaches may suspend access. |
| Permitted full text / excerpt / metadata / snapshots | Numerical data storable. |
| Duplicate and correction behavior | Vintage comparison per (series, period). |
| Failure, retry, and rate behavior | Requires a BDE account, one-time API activation, and an API Key Token in `BCCH_BDE_TOKEN` (Secret Manager in deployment). The token is valid for **one year** from activation and is copied, renewed, or extended under *Mi Cuenta → Apikey Token* — track its expiry. The limit (5 series per second) is **per account, regardless of IP**. SOAP credentials can be requested from `contacto_ws@bcentral.cl`. The token travels as a URL query parameter, so a header-injecting proxy cannot supply it and every reported URL/message is redacted. Without a token, runs report `blocked`/`missing_credential` and make no request. 300 ms spacing (≤3.4 req/s). `Codigo ≠ 0` → publisher error. |
| Validation fixtures and run evidence | `packages/connectors/test/fixtures/bcch/bde-*.json` reproduce the documentation's examples. Curated series in `config/sources/bcch-bde-series.json` are limited to IDs shown in the documentation (policy rate, observed dollar, Imacec, GDP). |
| Validation date / owner | 2026-11-17 (documentation only) / owner pending |
| Activation decision | Owner registers a BDE account, enables the API, stores the token; then run once live, confirm units/adjustment from catalog titles, and add CPI/copper series found via `--find`. CPI: since January 2024 the reference index is base 2023=100; base-2018 series no longer update, so pick base-2023 series. Monthly and quarterly headlines are already available without a token from [`bcch-sdmx`](bcch-sdmx.md). |
