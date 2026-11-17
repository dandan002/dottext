# bcch-repositorio — Repositorio Digital, Banco Central de Chile (DSpace OAI-PMH)

| Field | Value |
| --- | --- |
| Source ID / publisher | `bcch-repositorio` / Banco Central de Chile digital repository |
| Country / language | Chile / Spanish (some English titles and English-language series) |
| Status | **Inactive** — reachable but low pilot value |
| Discovery endpoint and method | OAI-PMH at `https://repositoriodigital.bcentral.cl/oai/request` answers machine requests (the web UI and `/server/oai` show a human-verification page). 100+ sets; relevant: *Actas de las Reuniones de Política Monetaria* (`com_20.500.12580_4514`, collections for 1997–2014). |
| Article and attachment extraction | Same generic `oai_dc` mapping as `banrep-repositorio`; ORE enrichment off. |
| Publication/modification/event time parsing | Issued dates from date-only `dc:date` (e.g. `1961-08-16`, `1953`). |
| First-seen/collection handling | Standard. |
| Actual history range and gaps | Historical: minutes 1925–2014, statistical yearbooks, bulletins. No current policy documents observed. |
| Access/retention terms and supporting references | [BCCh terms of use](https://www.bcentral.cl/en/terms-of-use). |
| Permitted full text / excerpt / metadata / snapshots | Abstracts/metadata. |
| Duplicate and correction behavior | Content hash; datestamps unusable (below). |
| Failure, retry, and rate behavior | **Every record is re-stamped nightly** (all 100 sampled datestamps were 2026-11-17T08:00–08:01Z; `from=2026-08-01` matched 8,269 records = the whole repository). Configured with `datestampTracksChanges: false`: harvest without `from`, filter by issued date. |
| Validation fixtures and run evidence | Parsed a live 100-record page 2026-11-17 (scratch only). |
| Validation date / owner | 2026-11-17 / owner pending |
| Activation decision | Keep inactive; consider a one-time background backfill of policy-meeting minutes for historical context. |
