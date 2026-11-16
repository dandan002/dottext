# Model access

Build a single provider-neutral adapter for generation and embeddings. OpenRouter is a candidate; support direct-provider adapters. Do not pin unbenchmarked models in the scaffold.

Own model/provider selection, structured-output settings, timeouts, retries, fallback policy, token limits, reservation checks, and actual-usage accounting. Pin explicit versions where available; record actual provider, model, prompt/schema version, request/run reference, and usage. Validate all returned schemas independently of provider claims.

Reserve maximum cost before dispatch via `budget`; fit calls and retries within run and monthly allowances. Handle ambiguous provider outcomes without assuming a failed response means no billing. Record/reconcile actual costs; never rely on telemetry for enforcement.

Treat source documents as untrusted evidence, incapable of changing permissions, tools, or spending. Generate embeddings only for eligible new/revised passages. Changes of model/prompt do not automatically trigger archive-wide recomputation.

Benchmark summaries, attributed claims, translation fidelity, numerical precision, multilingual retrieval, latency, schema errors, fallback behavior, and cost before selecting versions. Validate timeout, invalid output, spend denial, and reconciliation paths.
