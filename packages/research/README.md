# Research and briefing workflows

Own analytical workflows independently of portal routes, publishers, and hosting. Consume evidence exclusively through the versioned content API. LangGraph is a working orchestration default; actual model selection belongs in `models`.

## Build sequence

1. Implement question interpretation, up to two archive retrieval rounds, coverage assessment, and cited synthesis; return explicit evidence gaps.
2. Load country profiles, workspace follows, evidence cutoff, previous assessments, and applicable settings for briefings.
3. Discover developments and record checks against every persistent country driver.
4. Run bounded Local Color, Macro Outlook, and Political Analysis branches where evidence warrants them.
5. Reconcile overlaps, retain substantive disagreements, select stories, and write connected combined prose.
6. Validate citations and numerical consistency, apply editorial/AP review, and save immutable output with its evidence snapshot.

Defaults to validate: at most eight model calls/ten minutes for a briefing and four calls/two minutes for an ordinary answer. These are execution caps, not performance promises; count retries and supplementary calls under the applicable run allowance. Live search requires separate authorization.

Branches may use the same model. Reuse valid assessments/sections; do not run them hourly per article. Check new evidence daily or when a briefing is requested. Unchanged outlooks get brief updates. Weekly synthesis describes evolution, not concatenated dailies. A combined briefing targets five minutes across selected countries, with a short cross-country opening and upcoming decisions/releases when useful.

Persist parameters, evidence IDs, findings, gaps, prior assessment references, budget allowance, and graph version. Reuse successful checkpointed steps. Invalidate dependent assessment reuse when evidence/user corrections require review. Preserve saved prose and link corrected versions.

See [editorial responsibilities](../../docs/editorial.md), [country profiles](../../config/countries/README.md), [data/caches](../../docs/data.md), and [pilot](../../docs/pilot.md). Validate citation identity separately from semantic support and human usefulness.
