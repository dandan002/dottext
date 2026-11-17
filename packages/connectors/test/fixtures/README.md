# Connector test fixtures

**Synthetic content in real structure.** These files mirror the markup and payload
shapes observed on 2026-11-17 (selectors, nesting, decoy blocks, date encodings,
pagination, `hreflang` alternates, OAI-PMH and ORE layouts) so parsers are tested
against what publishers actually serve. All titles, body text, abstracts, and
identifiers are invented and marked `SYNTHETIC`; they are not reporting and must not
be used as evidence.

| Path | Mirrors | Content |
| --- | --- | --- |
| `banrep/listing-es.html`, `listing-en.html` | `www.banrep.gov.co/es/noticias`, `/en/press-releases` | Synthetic rows; includes mega-menu `views-row` decoys and a trailing undated table seen live |
| `banrep/article-es.html`, `article-en.html` | Drupal `node--type-noticias` press release and its English twin | Synthetic text; shared node ID, canonical + `hreflang` links |
| `oai/*.xml` | `repositorio.banrep.gov.co/server/oai/request` (DSpace 7 OAI-PMH) | Synthetic records; real crosswalk quirks (three `dc:date` values, bilingual titles, untitled record) |
| `bcch/bde-getseries.json`, `bde-searchseries.json` | BCCh BDE REST API | Reproduced from the publisher's public API documentation examples (checked 2026-11-17) |
| `bcch/bde-error.json` | BDE error envelope | Synthetic |
| `challenges/*.html` | Radware Bot Manager and Imperva Incapsula challenge pages | Minimal vendor boilerplate; no publisher content, no tracking IDs |

Real pages captured during validation were kept out of the repository: Banco de la
República's legal notice permits reproduction only in authorized cases.
