# Publisher outreach

Requests to publishers whose bot protection blocks low-rate collection. Drafts only: nothing here has been sent. Each draft has a Spanish version to send, a short version for web forms, and an English reference translation.

| Draft | Sources | Status | Sent | Response |
| --- | --- | --- | --- | --- |
| [Banco de la República](banrep-access-request.md) | `banrep-web`, `banrep-repositorio` | Draft | — | — |
| [Banco Central de Chile](bcch-access-request.md) | `bcch-web` | Draft | — | — |

## Before sending

1. Decide the outbound identity: a fixed egress IP (Cloud NAT with a reserved static address — a recurring charge to record in [decisions](../../../docs/decisions.md)) and a User-Agent with a contact, set through `DOTTEXT_USER_AGENT`. Both emails can go out before the IP exists, using the alternative sentence in each placeholder table.
2. Fill the placeholders in both drafts with the same identity.
3. Check the stated volumes still match `rateLimit` in [`registry.json`](../registry.json).

## After sending

Record the date and route in the table above and in the source's onboarding record. When a reply arrives, record what was granted (allowlisted identity, preferred channel, storage permission) in the record and update `status`/`statusReason` in the registry.
