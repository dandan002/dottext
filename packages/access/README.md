# Access control

Build server-side workspace authorization and separate service-identity policies. Auth provider remains open; Clerk and Firebase Authentication are candidates. Keep authorization rules independent of either SDK.

Resolve end-user identity to membership and accessible source collection. Enforce document/revision/passage access, private research artifacts, follows, feedback, schedules, job results, and cache hits. Internal ingestion privileges require service authentication and must not be granted by ordinary user retrieval permissions.

Public processing reuse is allowed only when source terms and caller access permit it. Source exclusions and private selections must not leak between workspaces. Retrieved text cannot modify authorization.

Before private-data routes ship, test two workspaces across direct reads, filtered and semantic search, caches, job polling/results, artifacts, histories, corrections, and schedule/feedback changes. Do not rely on client-side filtering.
