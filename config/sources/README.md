# Source roster and activation

No source is **active**. Central bank channels have connectors and onboarding records; everything else is still a candidate with no feed, URL, access right, or history asserted. Validate the actual publisher endpoint and terms before implementing or activating a connector.

| Country | Official | Journalism candidates |
| --- | --- | --- |
| Chile | Banco Central de Chile — see below; DIPRES and INE are candidates | BioBioChile; Radio Universidad de Chile; El Mostrador |
| Colombia | Banco de la República — see below; DANE and finance ministry are candidates | La República; Portafolio |

## Central bank channels (evidence 2026-11-17)

Machine-readable definitions: [`registry.json`](registry.json) (validated by `packages/connectors/src/registry.ts`). Bilingual search terms: [`central-bank-concepts.json`](central-bank-concepts.json). Curated statistics series: [`bcch-bde-series.json`](bcch-bde-series.json).

| Source | Channel | Status | Summary |
| --- | --- | --- | --- |
| [`banrep-web`](records/banrep-web.md) | Website listings, es + en | Validating | Parsers validated on live pages; Radware bot protection challenges after a handful of requests |
| [`banrep-repositorio`](records/banrep-repositorio.md) | DSpace OAI-PMH | Validating | Live run stored 13 reports/papers with abstracts and file lists; same bot protection |
| [`bcch-web`](records/bcch-web.md) | Website | Blocked | Incapsula JavaScript challenge on all HTML; PDFs open; needs allowlisting or a search provider |
| [`bcch-bde`](records/bcch-bde.md) | Statistics REST API | Blocked on credential | Needs a BDE API Key Token |
| [`bcch-repositorio`](records/bcch-repositorio.md) | DSpace OAI-PMH | Inactive | Historical holdings; datestamps re-stamped nightly |

**Search in both languages.** Wherever discovery searches — a statistics catalog, a repository, or a web-search provider — every concept is queried in the native language and in English and the results merged, recording which language found each hit. Central banks publish Spanish first, translate selectively, and index some material bilingually; one language alone misses items.

**Bot protection.** Challenges are detected and reported as `blocked`, never parsed as content or as a quiet day. We do not solve or evade challenges; the remedies are allowlisting by the publisher or another permitted channel. Allowlisting requests to both banks are drafted (not sent) in [`outreach/`](outreach/README.md).

Accessible local economic research can provide attributed institutional views. Source availability is not equivalent to representativeness.

## Required onboarding record

For each source record publisher/country/language; discovery method; validated URL/feed/API; article and attachment extraction; separate timestamp parsing; actual historical period/gaps; permitted access, storage, and retention; full-text/excerpt/metadata capabilities; duplicate/republication patterns; failure/retry behavior; validation date/evidence; owner; activation status; and health expectations.

Use RSS, public APIs, and permitted website/document retrieval. RSS availability alone does not imply full-text access. Attempt a one-month backfill; disclose actual coverage. Do not use headlines for full-document summaries. Do not activate social or paid feeds for the initial pilot.

Start with the [onboarding template](onboarding-template.md); completed records live in [`records/`](records/). Connectors belong in `packages/connectors`; runtime secrets belong in a secret provider.
