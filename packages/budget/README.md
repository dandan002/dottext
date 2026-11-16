# Budget reservations and accounting

Build authoritative transactional reservations before any provider-paid work is dispatched. The operating policy is in [operations](../../docs/operations.md).

Record provider, operation, reserved maximum, actual cost, status, and run reference. Treat in-flight reservations as committed. Atomically check the remaining allowance and reserve funds so concurrent requests cannot all spend the same balance. Keep baseline hosting/storage allowances reserved; support category and trace caps and an 80% alert.

Reconcile provider usage, retries, ambiguous outcomes, cancellations, and completed work. Define reservation lifecycle and recovery before implementing release behavior; a timeout does not prove a provider did not charge. Apply per-request maximums before dispatch and preserve headroom.

At AI/retrieval cap, pause generation, embeddings, paid search, and dependent processing while retaining reading where available. Infrastructure caps may affect availability. Return explicit pause reasons to jobs and UI. Telemetry failure cannot disable enforcement.

Validate concurrent near-cap requests, duplicate dispatch, retry charging, in-flight costs, category limits, month boundaries, alerts, and recovery. No single application/cloud alert guarantees an exact $50 invoice ceiling.
