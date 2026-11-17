# bcch-web — Banco Central de Chile website

| Field | Value |
| --- | --- |
| Source ID / publisher | `bcch-web` / Banco Central de Chile |
| Country / language | Chile / Spanish and English |
| Status | **Blocked** — no permitted discovery channel yet |
| Discovery endpoint and method | None working. Press section (Comunicados RPM/RPF, notas de prensa, presentaciones, IPoM, IEF) lives on `www.bcentral.cl` (Liferay). Every HTML URL tested on 2026-11-17 — home, press listings, terms of use, `/o/headless-delivery` API, `portalbiblioteca.bcentral.cl` — returned a 212-byte Imperva Incapsula JavaScript challenge to a non-browser client. `robots.txt` additionally disallows `*nuevo-buscador*`, `*search*`, `*buscador*`, and `*reunion-de-politica-monetaria-rpm*`. No RSS feed was found (searched in Spanish and English). |
| Article and attachment extraction | Not built. PDFs under `/documents/…` are served without the challenge (verified with the 2021 communications policy PDF), so documents are fetchable once discovered. |
| Publication/modification/event time parsing | Not built. |
| First-seen/collection handling | — |
| Actual history range and gaps | — |
| Access/retention terms and supporting references | [Terms of use](https://www.bcentral.cl/en/terms-of-use): unaltered copying for personal or organizational use with citation; sale/distribution needs prior express authorization; third-party material needs its owner's consent. |
| Permitted full text / excerpt / metadata / snapshots | `full_text` for internal use with citation (owner to confirm). |
| Duplicate and correction behavior | — |
| Failure, retry, and rate behavior | Challenge detection is implemented; breaker trips after one challenge. We do not execute or solve the challenge (no headless-browser workaround). |
| Validation fixtures and run evidence | `packages/connectors/test/fixtures/challenges/incapsula.html` (vendor shell). |
| Validation date / owner | 2026-11-17 / owner pending |
| Activation decision | Choose one: (a) ask BCCh to allowlist the collector (its communications office publishes a communications policy); (b) adopt a live-search provider and use the implemented bilingual search discovery (`packages/connectors/src/search.ts`, concepts in `central-bank-concepts.json`) restricted to `www.bcentral.cl/documents`, then fetch the open PDFs. Numerical data is available now via `bcch-bde`. |
