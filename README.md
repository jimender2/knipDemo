# CARDS

A card-based todo app with a REST API and a terminal UI — built as a **knip fixture**.

The app itself is real and working. Alongside it, the repo deliberately carries dead
code (orphan files, unused exports, unused types, unused dependencies) so `knip` has
something substantial to find. That makes it useful for testing knip configurations,
`--fix` behaviour, CI gates, and reporter output.

![stack](https://img.shields.io/badge/TypeScript-5.9-blue) ![node](https://img.shields.io/badge/node-%3E%3D20-green)

## Quick start

```bash
npm install

# terminal 1 — the API
npm run serve

# terminal 2 — the TUI
npm run dev
```

The TUI talks to `http://127.0.0.1:4310` by default. Point it elsewhere with
`CARDS_API_URL`, and change the port with `PORT` / `HOST`.

```bash
npm run build        # compile to dist/
npm start            # run the compiled TUI
npm test             # vitest
npm run typecheck    # tsc --noEmit
npm run format       # prettier --write
npm run format:check # prettier --check, what CI enforces
npm run knip         # dead-code report
```

## What a card is

A card has a title, optional notes, a status, a priority, tags, and an optional due date.

| Field         | Values                               | Notes                                 |
| ------------- | ------------------------------------ | ------------------------------------- |
| `title`       | 1–120 chars                          | required                              |
| `notes`       | ≤ 2000 chars                         | shown truncated in the card body      |
| `status`      | `todo` · `doing` · `done`            | drives sorting and the stats bar      |
| `priority`    | `low` · `normal` · `high` · `urgent` | rendered as `!`/`!!`/`!!!`            |
| `tags`        | ≤ 8, `[\w-]`                         | filterable with the `t` key           |
| `due`         | ISO 8601 datetime or `null`          | shown as relative time; red when late |
| `completedAt` | ISO 8601 or `null`                   | set/cleared automatically by `status` |

Everything is validated with [zod](https://zod.dev) at the edges, so the store can assume
well-formed cards.

## TUI keys

| Key               | Action                   |
| ----------------- | ------------------------ |
| `↑` `↓` / `k` `j` | move the selection       |
| `space`           | toggle done / todo       |
| `d`               | delete the selected card |
| `n`               | add a card               |
| `f`               | cycle the status filter  |
| `t`               | cycle the tag filter     |
| `r`               | reload from the API      |
| `q` / `ctrl+c`    | quit                     |

Cards render in a two-column grid. The selected card gets a rounded border, and its accent
colour encodes state: green when done, red when overdue, magenta when urgent, yellow when
high priority, cyan otherwise.

## API

All card payloads are validated; a bad request returns `400` with per-field issues.

| Method   | Path                         | Purpose                        |
| -------- | ---------------------------- | ------------------------------ |
| `GET`    | `/health`                    | liveness + card count          |
| `GET`    | `/api/cards`                 | list, filter, sort             |
| `GET`    | `/api/cards/:id`             | fetch one                      |
| `POST`   | `/api/cards`                 | create                         |
| `PATCH`  | `/api/cards/:id`             | partial update                 |
| `POST`   | `/api/cards/:id/toggle`      | flip done ⇄ todo               |
| `DELETE` | `/api/cards/:id`             | delete (`204`)                 |
| `POST`   | `/api/cards/clear-completed` | bulk delete, returns the count |
| `GET`    | `/api/stats`                 | totals per status / priority   |

`GET /api/cards` accepts `status`, `priority`, `tag`, `search` (title, notes and tags)
and `overdueOnly=true`. Results are sorted by priority, then due date, with done cards last.

```bash
curl -X POST localhost:4310/api/cards -H 'content-type: application/json' \
  -d '{"title":"Ship the board","priority":"urgent","tags":["work"]}'
```

## Layout

```
src/
├── bin/          entry points: cards.tsx (TUI), serve.ts (API)
├── core/         domain logic, no I/O framework dependencies
│   ├── card.ts         zod schemas, createCard, applyUpdate, toggleCard
│   ├── store.ts        CardStore (EventEmitter, in-memory)
│   ├── selectors.ts    filterCards, sortCards, computeStats, allTags
│   ├── format.ts       relative dates, priority glyphs, accent colours
│   └── persistence.ts  JSON load/save to data/cards.json
├── api/          Fastify server + REST routes
├── tui/          Ink components and a typed API client
├── util/         ids, logger
├── legacy/       ⚠️ dead on purpose — see below
└── util/fuzzy.ts ⚠️ dead on purpose
```

`core/` is pure and independently testable; the TUI and API are thin adapters over it.
Cards are persisted to `data/cards.json` on every mutation (git-ignored).

Tests live in `test/` and cover the domain, the formatters, persistence, and every route
via Fastify's `inject` (no ports bound). 78 tests, no TTY required.

## The knip fixture

`npm run knip` currently reports:

```
Unused files (3)
src/legacy/old-store.ts
src/legacy/sync.ts
src/util/fuzzy.ts

Unused dependencies (2)      chalk, lodash
Unused devDependencies (1)   eslint

Unused exports (6)
  buildStore           src/api/server.ts:14
  PRIORITIES           src/core/card.ts:4
  tagSchema            src/core/card.ts:10
  CardValidationError  src/core/card.ts:39
  describeCard         src/core/format.ts:52
  DEFAULT_DATA_PATH    src/core/persistence.ts:5

Unused exported types (2)
  StoreEvent  src/core/store.ts:11
  ColorName   src/tui/CardView.tsx:68
```

Every one of these is intentional:

- **`src/legacy/old-store.ts`, `src/legacy/sync.ts`** — a superseded store and a
  never-wired cloud sync stub, both marked `@deprecated`.
- **`src/util/fuzzy.ts`** — a levenshtein "did you mean" helper, never wired up.
- **`chalk` / `lodash`** — declared but unused at runtime. The TUI colours with
  [kleur](https://github.com/morphlabs/kleur) instead, so these are leftovers from an
  earlier approach.
- **`eslint`** — installed, but there is deliberately no eslint config. (`prettier` used
  to sit in this list too; it left once the `format` scripts started invoking it, since
  knip counts a devDependency referenced by a package.json script as used. The config
  file on its own does not count.)
- **The unused exports and types** — realistic over-exports: helpers written and exported
  ahead of their call sites. `PRIORITIES` and `CardValidationError` in particular are
  plausible API surface that nothing consumes yet.

`knip.json` sets explicit project globs and rules so the report stays stable as the app
grows, and `includeEntryExports: false` keeps entry-file exports out of the report. It
deliberately sets no `entry` — knip already treats `src/bin/**` as entry, so naming it
again only earns a "redundant entry pattern" hint.

To see a clean run, delete the dead code above and drop `chalk`, `lodash` and `eslint`
from `package.json`. Reverting the fixture commit does the same in one step.

## Tooling

- **prettier** — `.prettierrc.json` (single quotes, semicolons, trailing commas, 100
  columns) with `npm run format` and `npm run format:check`. `.prettierignore` skips
  build output and the lockfile.
- **CI** — `.github/workflows/ci.yml` has two jobs. `verify` (typecheck, tests, format
  check) is a real gate. `knip` is report-only via `continue-on-error`, because findings
  are the point of this repo and `npm run knip` exits 1 by design; remove that line to
  make knip a gate too.
- **devcontainer** — `.devcontainer/devcontainer.json` pins Node 22 on bookworm, forwards
  port 4310 as "cards API" with `onAutoForward: notify`, runs `npm install` on create, and
  turns on format-on-save. Open the project in a dev container and you get the API and a
  TUI-capable terminal with no setup.

## Notes

- ESM throughout (`"type": "module"`), strict TypeScript with
  `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- Node 20+. Requires Node 22.12+ for the `knip` script itself. CI and the devcontainer
  both pin Node 22.
- The app needs two terminals: `npm run serve` for the API and `npm run dev` for the TUI.
- The TUI needs a real TTY — Ink sets raw mode on stdin, so piping it to a file will fail
  with _"Raw mode is not supported"_. Use `script -q /dev/null npm run dev` if you need to
  capture output.
- Corrupt JSON in `data/cards.json` throws rather than silently resetting to an empty
  board, so you never lose data to a typo.
