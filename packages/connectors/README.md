# Connectors

Own publisher-specific discovery, fetch, article/attachment extraction, timestamp parsing, and source capability reporting. Implement a shared connector interface using contracts, with adapters selected by the [source registry](../../config/sources/README.md).

Before activation validate discovery method, extraction, timestamps, historical coverage, permitted access/retention, duplicate patterns, and failure behavior. RSS discovery does not prove full article availability. Respect access terms; do not bypass paywalls or restrictions.

Preserve original text. Remove navigation, related-story widgets, advertising, and publisher-generated summaries when the underlying article is available. Report full text, excerpt, or metadata-only honestly. Keep all time fields distinct; unknown publication time remains unknown.

Begin with official and journalistic samples for both countries. Capture permitted fixtures covering attachments, stale discoveries, missing times, revised content, duplicates, and failures. Do not activate the candidate roster merely because it appears in the specification.
