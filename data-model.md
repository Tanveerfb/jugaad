# Data model — Jugaad

Entities, relationships and invariants (`project-rules.md` §DOCS). Who updates it: whoever
changes a table, an entity schema or an invariant, in the same change. The zod schemas in
`src/schemas/` are the source of truth for shapes; this file explains them.

**Storage:** one SQLite file, `jugaad.db`, in the data folder (`environment.md`,
`JUGAAD_DATA_DIR`), opened with Node's built-in `node:sqlite` in WAL mode. The app and the
worker each open it; it is their only channel (decisions.md, 2026-10-08). All access goes
through `WorkbenchStore` (`src/lib/data/types.ts`); nothing else writes SQL. Every row read is
parsed through its schema. Schema versions are tracked with `PRAGMA user_version` —
migrations live in `src/lib/data/sqlite.ts` and only ever append.

## Job — `jobs` (schema version 1)

A unit of long work the worker runs (`src/schemas/job-schema.ts`).

| Field | Meaning |
| --- | --- |
| `id` | UUID |
| `module` | The module that asked for it (`organiser`, …) |
| `kind` | What it does within the module (`scan-folder`, …); `module/kind` picks the handler |
| `status` | `queued` · `running` · `paused` · `done` · `failed` · `cancelled` |
| `progress` | 0…1, or null while the size of the work is unknown |
| `detail` | One short line for the rotor panel |
| `payload` | Module-specific JSON input; each kind parses its own |
| `error` | Why it failed, when it did |
| `created_at`, `updated_at` | ISO timestamps |

**Lifecycle (§LIFECYCLE)** — declared once in `src/lib/domain/job-lifecycle.ts`, tested on every
illegal pair:

```
queued ──▶ running ──▶ done | failed
  │  ▲       │  └────▶ paused ──▶ queued (resume)
  │  └───────┘ requeued after a worker restart
  └──▶ cancelled ◀── running, paused
```

**Invariants**
- A status changes only through `transitionJob` (or `claimNextJob` / `requeueInterruptedJobs`,
  which apply declared transitions).
- A job is claimed by one statement, so it can never be handed out twice.
- `done`, `failed` and `cancelled` never change again.
- Progress is written only while a job is `running`.
- After a crash, jobs left `running` go back to `queued` when the worker next starts.

## Worker heartbeat — `worker_beat` (schema version 1)

One row (`id = 1`): the worker's `pid`, `started_at` and last `beat_at`, written every 2 s.
The worker counts as online if it beat within 10 s; a clean stop deletes the row.

## Not yet

The shared file index, categories, plans and the undo journal (spec, phase 1) are added as
new migrations when the Organiser is built.
