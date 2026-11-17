# banrep-sdmx — Banco de la República statistics API (SDMX)

| Field | Value |
| --- | --- |
| Source ID / publisher | `banrep-sdmx` / Banco de la República, economic statistics (SUAMECA portal, *Servicios web – SDMX*) |
| Country / language | Colombia / dataflow names in Spanish and/or English |
| Status | **Validating** — live collection succeeded 2026-11-17 |
| Discovery endpoint and method | SDMX 2.1 REST at `https://totoro.banrep.gov.co/nsi-jax-ws/rest`, no credential. `dataflow/all/all/latest` lists 33 dataflows: policy rate (`DF_CBR_*`), TRM (`DF_TRM_*`), IBR, interbank rate, DTF, UVR, TES, COLCAP, monetary aggregates, term deposits — daily/monthly, `HIST` and `LATEST` variants. Flows are found by **bilingual name search** (`npm run collect -- --source banrep-sdmx --find all`); one Spanish name has a publisher typo ("Maercado") that only the English term matches. Inflation, GDP, and activity are not offered (DANE publishes those). |
| Article and attachment extraction | n/a — `data/ESTAT,{flow},1.0/all/ALL/?startPeriod=…` returns SDMX-ML generic data (OECD STES 3.0 structure). Each flow may hold several series (IBR: 4 tenors × `ER`/`NR`; UVR: `CRVU` peso value and `APC`). Series ID = flow + full key. |
| Publication/modification/event time parsing | Observation periods are `YYYYMMDD` (daily). Release time is not provided. UVR is published ahead of its dates (values through 2026-12-15 on 2026-11-17). |
| First-seen/collection handling | `retrievedAt` per vintage; a changed value or status for a stored period is stored as a new vintage. |
| Actual history range and gaps | Per flow: e.g. UVR back to 2000-01-01 (9,846 observations unfiltered). The one-month window 2026-10-17…11-17 returned 280 observations across 12 series. |
| Access/retention terms and supporting references | [Legal notice](https://www.banrep.gov.co/en/legal-notice): statistics served through SDMX follow the website's conditions (cite the source; commercial/promotional use needs prior authorization). Data contact named in every response: Centro de Información Económica, `cie@banrep.gov.co`. Some of the same series are listed on datos.gov.co, but only as links back to the Bank — no Socrata-hosted data. |
| Permitted full text / excerpt / metadata / snapshots | Numerical data. |
| Duplicate and correction behavior | Vintage comparison per (series, period). |
| Failure, retry, and rate behavior | Only `application/vnd.sdmx.genericdata+xml;version=2.1` is served; JSON/CSV return 406 although the portal announced them from 2026-10-26 (and retirement of the old version on 11-15 — the endpoint still answered on 11-17). `startPeriod` is honored only to January 1 of its year; `endPeriod` returned 404, so the client sends `startPeriod` only and windows client-side. Responses take 6–15 s. The host embeds the same Radware script as banrep.gov.co but served 13 requests without a challenge; client uses 10 s spacing, 10 requests/run, breaker after 2 challenges. |
| Validation fixtures and run evidence | `packages/connectors/test/fixtures/banrep-sdmx/*` (synthetic values, real layout). Live run 2026-11-17: 4 requests, status `succeeded`; latest values policy rate 12.25 (2026-11-17), TRM 3,316.70, UVR 421.2775, IBR overnight 12.258 ER / 11.412 NR (2026-11-13). |
| Validation date / owner | 2026-11-17 / owner pending |
| Activation decision | Ready to activate once the owner confirms the terms reading. Watch for the announced JSON/CSV version; confirm the meaning of `ER`/`NR` and `APC` with `cie@banrep.gov.co` before labeling them. |
