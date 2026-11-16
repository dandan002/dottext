# Source roster and activation

All names below are **candidates, inactive and unvalidated**. No feeds, URLs, access rights, or historical availability have been asserted. Validate the actual publisher endpoint and terms before implementing or activating a connector.

| Country | Official candidates | Journalism candidates |
| --- | --- | --- |
| Chile | Banco Central de Chile; DIPRES; INE | BioBioChile; Radio Universidad de Chile; El Mostrador |
| Colombia | Banco de la República; DANE; finance ministry | La República; Portafolio |

Accessible local economic research can provide attributed institutional views. Source availability is not equivalent to representativeness.

## Required onboarding record

For each source record publisher/country/language; discovery method; validated URL/feed/API; article and attachment extraction; separate timestamp parsing; actual historical period/gaps; permitted access, storage, and retention; full-text/excerpt/metadata capabilities; duplicate/republication patterns; failure/retry behavior; validation date/evidence; owner; activation status; and health expectations.

Use RSS, public APIs, and permitted website/document retrieval. RSS availability alone does not imply full-text access. Attempt a one-month backfill; disclose actual coverage. Do not use headlines for full-document summaries. Do not activate social or paid feeds for the initial pilot.

Start with the [onboarding template](onboarding-template.md). Connectors belong in `packages/connectors`; runtime secrets belong in a secret provider.
