# Architecture — Jugaad

The map (`project-rules.md` §SCALE): what each module owns, what it depends on, and how data
moves. Who updates it: the checkpoint, whenever a module is added, moved or removed.
`components.md` is the registry of interface components; `data-model.md` holds the tables.

## Two processes, one channel

```
 browser ──▶ Next.js app (127.0.0.1)                      worker (tsx, src/worker/)
             pages read the store                          claims queued jobs,
             Server Actions write it ──▶  jugaad.db  ◀──── runs them, reports progress
                                          (node:sqlite, WAL)
```

The app never does long work and the worker never renders: the app queues a **job**, the worker
claims it, runs its handler and writes progress, results and status back. `WorkbenchStore`
(`src/lib/data/`) is the only way either side touches the database. Pages refresh themselves
while a job runs (`src/components/live-refresh.tsx`). `npm run app` starts both.

## Modules

| Folder | Owns | Depends on | Used by |
| --- | --- | --- | --- |
| `src/lib/data/` | `WorkbenchStore`: every SQL statement, migrations v1–12 (`migrations.ts`), one file per area (`sqlite-jobs`, `-folders`, `-files`, `-plans`, `-journal`, `-categories`, `-classifications`, `-examples`) composed in `sqlite.ts` | `src/schemas/`, `src/lib/domain/` lifecycles | everything with state |
| `src/lib/domain/` | Pure rules, no I/O: lifecycles (job, plan, category), `path-guard`, `plan-rules` (`inScope`, `toMoves`, `isFolderOwned`, `looksMessy`), `cluster`, `projects`, `filing-examples`, `folder-samples`, `folder-status`, `plan-bays`, `vram-plan` | nothing | all of `src/lib/` |
| `src/lib/files/` | Reading the disk: `walk-folder` (skips junctions, protected folders), `online-only` (OneDrive placeholders), `hash-file` (full SHA-256 or `q:` fingerprint), `read-signals` + `external-readers` (PDF, Word, EXIF, ffprobe, tar, program info), `render-pdf-page`, `scan-folder` | data, domain | worker (scan) |
| `src/lib/safety/` | **The only code that changes the disk.** `allow-folder`, `move-file` (`moveFile`, `moveFolder`: no overwrite, copy-verify across drives, case-only via a temp name), `apply-plan` (apply / undo, journalled), `reconcile-journal`, `protected-paths` | data, domain | worker (apply, undo, start-up), actions (allow) |
| `src/lib/ai/` | `WorkbenchAi` (`types.ts`): `classifyFile`, `embedTexts`, `nameCategories`, `describeImage`. `ai-sdk.ts` (AI SDK 7 → Ollama), `ollama-embedder.ts` (`/api/embed`), `mock.ts`, `model-manager.ts` (`prepareModel`, VRAM budget), `models.ts`, `prompts/` | schemas, domain | organiser, worker |
| `src/lib/organiser/` | The Organiser's steps: `suggest-categories` (captions → embeddings → clusters → one naming call), `describe-images`, `build-plan` (classify against approved categories, cached), `edit-plan` (rename ticks, "Send to…" + filing examples), `organiser-view` (what pages show) | data, domain, ai, files | worker handlers, pages, actions |
| `src/worker/` | `run-worker` (claim loop, heartbeat, cancel polling, reconcile on start), `job-handlers` (`organiser/scan-folder`, `suggest-categories`, `build-plan`, `apply-plan`, `undo-plan`) | everything in `src/lib/` | — |
| `src/app/` | Routes: `/` workbench, `/organiser`, `/organiser/[folderId]/{categories,plan,history}`; `organiser/actions.ts` — every Organiser Server Action | lib, features, components | — |
| `src/features/organiser/` | The Organiser's screens (folder rail, stage, step track, category editor, destination bays, history…) | components, lib (views only) | organiser routes |
| `src/features/workbench/` | Module comb, hex tiles, job panel | components | `/` |
| `src/components/` | Shared: motif primitives (`motif/`), the kit (`ui/`), top bar, module view, live refresh | — | features, routes |
| `scripts/run-app.mjs` | `npm run app`: builds if needed, starts app and worker together | — | the owner |

## Main flows

**Sort a folder.** Paste a path → `addFolder` → `allowFolder` (path-guard) → row in
`allowed_folders`. "Scan" queues `organiser/scan-folder` → walk, hash, read signals → `files`,
`file_signals`. "Categories" queues `suggest-categories` → captions, embeddings, clusters,
names → `categories` (suggested). The owner edits and approves (`approveCategories`). "Build
plan" queues `build-plan` → one classification per file (cached in `file_classifications`) →
`plans` + `plan_moves` (draft). The owner adjusts moves, then `approvePlan` queues
`apply-plan` → `src/lib/safety/` moves each file, journalling before and after → plan applied.
`undoPlan` reverses it from the journal.

**A job that needs a model** calls `prepareModel` first; the model manager unloads only
Jugaad's own models to fit the VRAM budget.

## Where do I find…

- **…what a page shows?** `src/lib/organiser/organiser-view.ts` and `src/lib/workbench-view.ts`.
- **…which files get sorted?** `inScope` in `src/lib/domain/plan-rules.ts` (suggestions and plans
  share it).
- **…what the model is sent?** `src/lib/ai/prompts/`, and `environment.md` (data sent to Ollama).
- **…why a choice was made?** `decisions.md`, newest at the bottom.
- **…the audit numbers on the owner's folders?** `docs/STATUS.md`, Verified.
