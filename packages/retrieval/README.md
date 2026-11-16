# Retrieval

Build keyword, semantic, and hybrid evidence retrieval behind the content API. Apply workspace permissions and country/date/source/topic/document-type filters before returning evidence. Retrieve original-language passages and English summaries.

Research sequence: interpret question → apply scope/metadata filters → retrieve candidates → combine rankings → deduplicate passages → assess coverage → optionally search archive again → return evidence for synthesis. The default permits at most two archive retrieval rounds. Live retrieval is a separate user action.

Evaluate multilingual embeddings with English questions against Spanish evidence, including institution names, legislation, idioms, and numerical questions. Preserve known supporting passages, source diversity, provenance, and extraction completeness. Scores represent retrieval relevance, not factual confidence.

Briefings require time-window discovery, country-anchor checks, and story grouping; similarity search alone is insufficient. Record what each anchor check searched and whether evidence is unavailable, unchanged, or materially new.

Validate known-evidence retrieval, private filters, stale discoveries, conflicting group/date definitions, duplicates, and unsupported questions using [fixtures](../../fixtures/README.md). Set quality thresholds only after the initial measured sample.
