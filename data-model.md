# Data model — Jugaad

Entities, relationships and invariants (`project-rules.md` §DOCS). Who updates it: whoever
changes a table, an entity schema or an invariant, in the same change. The zod schemas in
`src/schemas/` are the source of truth for shapes; this file explains them.

**Storage:** one SQLite file, `jugaad.db`, in the data folder (`environment.md`,
`JUGAAD_DATA_DIR`), opened with Node's built-in `node:sqlite` in WAL mode. The app and the
worker each open it; it is their only channel (decisions.md, 2026-10-08). All access goes
through `WorkbenchStore` (`src/lib/data/types.ts`); nothing else writes SQL. Every row read is
parsed through its schema. Schema versions are tracked with `PRAGMA user_version` —
migrations live in `src/lib/data/migrations.ts` and only ever append.

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

## Allowed folder — `allowed_folders` (schema version 2)

A folder the owner pasted onto the allow-list (`src/schemas/allowed-folder-schema.ts`). `path` is
the real path (junctions resolved), unique without letter case. Rules — no drive roots, no
system or program folders, no folder inside or around another — are checked in
`src/lib/domain/path-guard.ts` before a row is written. Removing a folder sets `removed_at`;
the row, its plans and its journal stay, and nothing in it is touched until it is added back.
`include_subfolders` (v8) is the owner's "Include subfolders" tick: suggestions and plans both
sort the files `inScope` allows — the folder's own files, plus nested ones when ticked, never
files already in a category folder or `_review`, never a project's files one by one, never
folder metadata (`desktop.ini`, `Thumbs.db`) or a download still in progress (`isFolderOwned`).

## Plan — `plans`, `plan_moves` (schema version 2)

A proposed reorganisation of one allowed folder (`src/schemas/plan-schema.ts`). Each move holds
paths **relative to the folder**, so a move can't name anywhere else; `resolveInside` refuses
`..` and absolute paths again at apply time.

**Plan lifecycle** — `src/lib/domain/plan-lifecycle.ts`, tested on every illegal pair:

```
draft ⇄ approved ──▶ applying ──▶ applied ──────┐
  │                     ▲  └────▶ incomplete ───┼──▶ undoing ──▶ undone
  ▼                     └──────── (retry) ┘     │       ▲  └────▶ undo-incomplete
discarded                                       │       └──────── (retry) ┘
```

**Move lifecycle:** `pending → moved → undone`. A failed attempt leaves the status and sets
`error`; the next apply (or undo) retries it.

**Invariants**
- Nothing moves unless the plan was `approved` — `draft → applying` is illegal.
- Moves are included or excluded only while the plan is a `draft`.
- `applying` and `undoing` are held only by the worker; a crash leaves them, and the resumed
  job carries on from the journal.

## Journal — `journal` (schema version 2)

The write-ahead record of every disk change (`src/schemas/journal-schema.ts`): `make-folder`,
`move`, `undo`, `remove-empty-folder`. An entry is opened **before** the change and closed
(`outcome` done/failed) after, with how the file travelled (`rename`, or `copy` across drives)
and its size and modified time as it landed.

**Invariants** (SQLite triggers enforce the first two)
- Append-only: no entry is ever deleted.
- An entry is closed once and never changes again.
- Entries left open by a crash are settled against the disk when the worker starts
  (`src/lib/safety/reconcile-journal.ts`), before any job resumes. Settling never moves a file.
- Undo moves a file back only if its size and modified time still match the journal.

## Indexed file — `files` (schema version 3)

The shared index (`src/schemas/indexed-file-schema.ts`): one row per file in an allowed folder,
by relative path (unique without letter case), with size, dates, extension and a content hash.
`hash` is a full SHA-256 for files whose size another file shares (only those can be duplicates)
and a **quick fingerprint** — `q:` + SHA-256 of size, first MB and last MB — for the rest; a
fingerprinted file gets the full hash once a same-size twin appears.

| `state` | Meaning |
| --- | --- |
| `indexed` | Readable; `hash` set once hashed |
| `online-only` | A OneDrive placeholder — listed, never read |
| `locked` | Open elsewhere when last tried; the next scan retries |
| `gone` | Not seen by the latest scan |

**Invariants**
- A file whose size and modified time are unchanged keeps its hash; any change clears it.
- Duplicates are files in one folder with the same full hash (a `q:` fingerprint never matches).
- A file Jugaad moves keeps its row: the path follows it (`relocateFile`, `relocateFolder`).
- An `online-only` file is never read, and is never hashed while it stays online-only.

## File signals — `file_signals` (schema version 4; caption v7; kinds widened v10)

What was read from a file's contents (`src/schemas/file-signals-schema.ts`): the opening text
of a PDF, Word or text file (capped at 1,500 characters); a photo's capture time, camera and
whether it has a location (only the fact); a video's length, size and codec (ffprobe); an
archive's file list (Windows tar); a program's product, maker and version. `caption` is the
vision model's one line for an image or a text-less PDF's first page, with `caption_model`. Keyed by file, tied to the **hash** it was read from —
a changed file is read again, an unchanged one never. Files with nothing to read get a `none` row.
The excerpt is the owner's text, untrusted: prompts treat it as data.

## Category — `categories` (schema version 5)

A category of one allowed folder (`src/schemas/category-schema.ts`); when a plan is applied it
becomes a subfolder, so its name must be a valid Windows folder name (`toCategoryName`:
no `<>:"/\|?*`, no device names like `CON`, no leading `_` — `_review` is Jugaad's). Unique per
folder without letter case. `source` says whether clustering suggested it, the owner typed it,
or it is one of the owner's existing subfolders (`folder`, v9 — offered first);
`file_count` and `examples` show the cluster it came from.

**Lifecycle** — `src/lib/domain/category-rules.ts`:
`suggested → approved | rejected`, `approved → suggested | rejected`, `rejected → suggested`.

**Invariants**
- Only `approved` categories are offered to the classifier; a model answer outside them fails
  validation (`fileClassificationSchemaFor`).
- Suggesting again replaces only suggestions the owner never acted on — approved, rejected and
  owner-added categories stay, and a fresh suggestion with one of their names is dropped.

## Embedding — `file_embeddings` (schema version 5)

One vector per file (float32 blob), keyed by file and tied to the content **hash** and a
**model key** (`<model>#<recipe>`, e.g. `qwen3-embedding:0.6b#grouping-2`). A changed file, a
different model or a new recipe means a new embedding; otherwise it is reused.

## Remembered classification — `file_classifications` (schema version 6)

The model's answer for one file, keyed by file, model and a **categories key** — the approved
list, plus which of the owner's filing examples the file was shown. Reused only for the same
content hash. A rebuild with nothing changed asks the model nothing.

## Filing example — `filing_examples` (schema version 11)

The owner's own decision ("Send to…"): a file's description and the category it went to, per
folder, one per file (the latest wins). That file goes there again on later plans; similar files
are shown up to 6 such examples (`nearestExamples`).

## Plan move — folder moves (schema version 12)

`plan_moves.is_folder` marks a move that carries a whole **project folder** (a folder holding a
marker such as `package.json` or a `.blend` file — `src/lib/domain/projects.ts`). It moves by one
same-drive rename, journalled like a file, undone as one; it never gets a rename suggestion.
