# Data, evidence, and persistence

## Records

| Record | Required contents |
| --- | --- |
| Source | Publisher, country, language, connector settings, access/retention policy, health |
| Document revision | Canonical URL, source, original title, timestamps, content hash, extracted text or snapshot reference, completeness |
| Passage | Revision ID, stable locator, original text, optional English rendering, embedding version |
| Derived document output | English summary, topics, entities, claims, quoted passages, model/prompt versions |
| Story | Related documents, actors, event timeline, development status |
| Country profile | Persistent drivers, institutions, entities, coverage checks |
| Country assessment | Analyst type, as-of time, interpretation, uncertainties, evidence, superseded status |
| Workspace | Ownership, membership, settings, accessible source collection |
| Follow and feedback | Workspace, story/theme/person/source reference, preference or review |
| Schedule | Workspace, countries, period, local timezone, next due time, enabled status |
| Research answer or briefing | Parameters, prose, evidence snapshot, creation time, correction status, cache identity |
| Job and checkpoint | State, attempts, leases, step results, errors, workflow version |
| Usage reservation | Provider, operation, reserved maximum, actual cost, status, run reference |

A small structured observation layer preserves numerical values with units, currency, reference period, seasonal adjustment where relevant, revision status, source, and reported-value/forecast distinction. It supports comparisons without replacing a market-data terminal.

## Time and evidence identity

Keep publication, modification, first-seen, and collection timestamps distinct; record event dates when recoverable. Unknown publication time remains unknown. Never substitute collection time silently. Store UTC while retaining original timezone and precision when known.

Source corrections create immutable revisions rather than overwriting evidence. Keep document/revision IDs and stable passage locators. Every substantive factual claim should link to an accessible revision and passage. Attributed forecasts/views retain speaker and date. Missing support requires a qualification or explicit gap.

Validate citation identity and numerical consistency automatically. Link existence alone cannot establish semantic support; evaluation and human review are required.

## Access and retention

Store text and snapshots only where permitted. Distinguish full-text, excerpt, and metadata-only records. A headline alone cannot support a full-document summary. Preserve source identities and differences within grouped stories. Share duplicate processing only where access and retention permit.

Personal source selections, follows, queries, answers, schedules, feedback, and briefing history remain private. Public-document reuse never grants access by itself.

## Cache identities

- Document output: source revision, task, prompt version, model, output schema.
- Country section: evidence snapshot, period, analyst/profile version, applicable settings.
- Personalized combined briefing: section identity plus workspace preferences and selected countries.

Recheck permissions on hits. New evidence permits refresh but must not mutate saved prose. Preserve original as-of time and evidence snapshot. A model/prompt change does not automatically justify recomputing the archive.

## Corrections

A revised source, user report, or validation may initiate correction. Preserve the original revision and saved output; attach a visible correction and link the corrected version. Mark dependent assessments for review when evidence materially changes. Track dependencies so user corrections can invalidate assessment reuse and dependent outputs.
