# Portal

Build the private portal using the working defaults Next.js, TypeScript, Tailwind, and shadcn/ui. This directory currently contains no framework implementation.

## Build sequence

1. Choose auth and resolve authenticated users to workspace memberships on the server.
2. Add archive/results/detail views, country/date/source/topic/document-type filters, keyword search, and a coverage panel.
3. Add cited question answers with matching documents beside them, explicit evidence gaps, and a separate “Search live sources” action. Show durable live-job status and newly retrieved result times.
4. Add briefing controls for selected countries and 24-hour/seven-day periods, saved history, and separate analyst views.
5. Add private follows, feedback, source exclusions, schedules, usage/paused states, and correction views.

## Research routes

Host thin authenticated research route handlers here initially: `POST /v1/briefings`, `POST /v1/research`, `GET /v1/briefings/{id}`, `GET /v1/usage`, plus workspace-scoped schedules, follows, feedback, and correction views. Define exact remaining route shapes in contracts before implementation. Dispatch long work durably; return a job reference instead of holding a request for the full workflow. Shared research logic lives in `packages/research`; evidence is accessed through the content API.

## Display and validation

Show generation time, exact evidence cutoff, countries, reading time, coverage status, and source links. Keep saved prose immutable. Show corrections and linked updates. Differentiate quiet coverage, failure, overdue collection, insufficient evidence, and budget pause. Schedule timezone is configurable and initially America/New_York.

Validate private server-side access with two workspaces; include history, feedback, schedules, caches, artifacts, and job results. Validate the full requested briefing/research flows against [product](../../docs/product.md) and [pilot criteria](../../docs/pilot.md). Do not surface retrieval scores as confidence.
