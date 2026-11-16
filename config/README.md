# Editable configuration

Keep editorial/domain configuration separate from application code. These Markdown profiles are initial requirements, not executable configuration. Add validated machine-readable schemas and loaders when implementation starts; avoid maintaining divergent copies.

- [Countries](countries/README.md): persistent drivers and anchor-check behavior.
- [Sources](sources/README.md): candidate roster and validation before activation.
- [Editorial](editorial/README.md): style policy and documented market-notation exceptions.

Version effective configuration and include profile/settings versions in derived-output cache identities. Do not store credentials here.
