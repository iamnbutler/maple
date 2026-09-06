# Static reference data

Immutable MapleStory reference data (job lists, set effects, star-force tables,
scroll rates, and so on) lives here as JSON or `as const` TypeScript modules.

Nothing in this directory is user data — anything written at runtime belongs in
the repo-root `data/` directory, accessed through `$lib/store`.
