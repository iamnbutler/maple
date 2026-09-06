# Maple

Personal MapleStory gear/progression tracker with an agent-driven API.

Maple keeps track of characters, equipment and progression goals, and exposes
them over a small HTTP API that coding agents (and the web UI) can drive.

## Stack

- SvelteKit 2 + Svelte 5 (runes mode), TypeScript, Vite
- `@sveltejs/adapter-node` for deployment as a plain Node server
- Zod for schema validation
- Vitest for unit tests, Prettier for formatting
- Plain scoped CSS — no Tailwind, no UI kit

## Layout

| Path              | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `src/lib/calc/`   | Pure TypeScript game-math library                    |
| `src/lib/schema/` | Zod schemas for characters and related entities      |
| `src/lib/data/`   | Static MapleStory reference data                     |
| `src/lib/store/`  | JSON-file persistence over the repo-root `data/`     |
| `src/routes/api/` | Agent-facing JSON API (`GET /api/health` → `{ ok }`) |
| `data/`           | Runtime character JSON store (git-ignored)           |

## Dev commands

```sh
npm install       # install dependencies
npm run dev       # start the dev server
npm run check     # svelte-check + TypeScript
npm test          # vitest run
npm run build     # production build
npm run preview   # preview the production build
npm run lint      # prettier --check
npm run format    # prettier --write
```

Requires Node 24+ and npm.
