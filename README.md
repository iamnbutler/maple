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

| Path              | Purpose                                            |
| ----------------- | -------------------------------------------------- |
| `src/lib/calc/`   | Pure TypeScript game-math library                  |
| `src/lib/schema/` | Zod schemas for characters and related entities    |
| `src/lib/data/`   | Static MapleStory reference data                   |
| `src/lib/store/`  | JSON-file persistence over the repo-root `data/`   |
| `src/lib/docs/`   | `agent-guide.md`, served verbatim from `/api/docs` |
| `src/routes/api/` | Agent-facing JSON API (see below)                  |
| `data/`           | Runtime character JSON store (git-ignored)         |

## API

JSON in, JSON out. Errors are `{ error, issues? }` with `400` / `404` / `409`;
every write returns `{ character, warnings }`, where `warnings` are non-fatal
capture problems (a tooltip breakdown that does not add up, a missing star
count, a missing item level). Start an external agent at `GET /api/docs`.

| Method & path                                          | Purpose                                                                     |
| ------------------------------------------------------ | --------------------------------------------------------------------------- |
| `GET /api/docs`                                        | The screenshot-extraction guide, as markdown                                |
| `GET /api/schema`                                      | JSON Schema for `Character`, `Item`, `StatWindow`, … (`?name=Item` for one) |
| `GET /api/ref/slots` · `/api/ref/classes`              | Reference data (classes is a stub for now)                                  |
| `GET` · `POST /api/characters`                         | List / create (`{ id?, name, classId, level, world }`)                      |
| `GET` · `PUT` · `PATCH` · `DELETE /api/characters/:id` | Read, replace, RFC 7396 merge-patch, delete                                 |
| `PUT` · `DELETE /api/characters/:id/equipment/:slot`   | Upsert / remove one item                                                    |
| `PUT /api/characters/:id/stat-window`                  | Replace the stat window capture                                             |
| `GET /api/characters/:id/history` · `/history/:ts`     | Append-only snapshots                                                       |
| `GET /api/health`                                      | `{ ok: true }`                                                              |

`GET /api/characters/:id/analysis`, `POST /api/analyze` and
`POST /api/characters/:id/what-if` land with the calc engine in the next wave.

Storage is plain files: `data/characters/<id>.json` plus an immutable
`data/characters/<id>/history/<ISO>.json` per write. Set `MAPLE_DATA_DIR` to
point that somewhere else (the tests use a temp directory). Set `MAPLE_TOKEN` to
require `Authorization: Bearer <token>` on everything except `/api/docs` and
`/api/schema`; CORS is wide open either way.

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
