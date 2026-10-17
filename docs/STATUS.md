# Jugaad — status

**Two zones, maintained differently.** The snapshot (everything above the session log) is
rewritten in place every checkpoint. The session log is append-at-top, newest first.

---

## Start here

**State:** Phase 1 (core + Organiser) is built and tested, but not yet committed at the time of
writing (see the newest log entry for the commit). Read-only audits ran on the owner's real
folders (Verified this checkpoint). Nothing has been applied to a real folder.
**Next:** the owner's own first run — `npm run app`, add `C:\Users\Tanve\Downloads`, scan,
categories, plan, review, apply, check, undo if needed (Open items 1).
**Blocked on:** the owner — the first real run is theirs to make.
**Don't trust:** plan apply/undo on a *real* folder (unit tests, plus one smoke test on the
sandbox copy only); first-plan time on big folders (~10 min for 525 files); category quality
beyond the two folders audited.

> **Things that will save a session:** the map is `docs/architecture.md`. The spec lives in
> `Tanveerfb/project-plans` (`plans/jugaad/`). **Never approve or apply a plan on the owner's
> real folders** — audits use a separate DB (`node_modules/.cache/jugaad-sandbox/`). To try the
> UI, run `jugaad-dev-sandbox` (`.claude/launch.json`, port 3001) and a worker with the same
> `JUGAAD_DATA_DIR`. **On Windows, stopping a background shell does not stop its node worker** —
> list `node.exe` processes and stop stale workers, or old code keeps claiming jobs (happened
> 2026-10-17). Heredocs in the Bash tool collapse `\\` — write backslash code with Write/Edit.
> Ollama holds 2 models (`OLLAMA_MAX_LOADED_MODELS=2`, machine env, set by the owner).

---

## What this project is

A local AI workbench: one Next.js app on the owner's Windows PC that uses local models
(Ollama, 16 GB GPU) for narrow, reliable jobs — organising folders safely, voice, questions
about the owner's own files, and auditing projects against `fleet-standards`. Private by
default; never deletes a file.

---

## Current state

- **Core** (`docs/architecture.md` has the map): SQLite store, migrations v1–12
  (`data-model.md`); scanner with quick fingerprints and content signals (PDF, Word, EXIF,
  video via ffprobe, archives via Windows tar, program info, scanned-PDF captions); safety
  layer — every move journalled, never overwrites, copy-verify across drives, undo, crash
  reconciliation; model manager with a VRAM plan.
- **Organiser** (locked design `docs/design/organiser.html`): paste a folder → scan →
  suggested categories (image captions + embeddings + clustering + one naming call; existing
  subfolders offered, pre-ticked only when files belong in them) → plan (one classification per
  file, cached; existing folders shown with sample files) → destination bays with per-file
  rename ticks and "Send to…" (remembered as filing examples) → apply → history and undo.
  Folder-level "Include subfolders"; project folders move whole; duplicates to
  `_review\Duplicates`; doubtful files to `_review`.
- **Models:** `gemma4:12b-it-qat` classifies, names and captions; `qwen3-embedding:0.6b` embeds
  (`num_ctx` 4096). Mock by default; `JUGAAD_AI_PROVIDER=ollama` switches on.
- **Running it:** `npm run app` starts the built app and the worker together.
- **Repo:** `master` at `9455a63` before this checkpoint; this session's work is the commit
  named in the newest log entry.

---

## Decisions this checkpoint

Full entries in `decisions.md` (2026-10-16 to 2026-10-17, from "Phase 1 plan" on).

- Owner's picks: organised files stay inside the same folder; folders added by pasting a path;
  "Include subfolders" lives on the folder; renames are suggested, ticked per file; videos read
  for length and resolution only (no frames); images only for vision; all four add-ons
  (learn from corrections, keep projects whole, read text-less PDFs, archives + installers).
- New dependencies: `unpdf`, `mammoth`, `exifr`, `@napi-rs/canvas` (pinned 1.0.10).
- Tried and dropped: a 0.25 silhouette cut-off (put everything in one group); 32k context for
  the embedder (5.78 GB); `gpt-oss` (failed every file); Git's GNU `tar` (can't read zip).
- After the audits: existing folders pre-ticked only when matched, dot-folders hidden; the
  classifier sees sample files per existing folder; no renames for files going to review;
  `desktop.ini` and in-progress downloads never sorted; re-suggesting reuses the owner's names.

---

## Open items

1. **Owner's first real run** on Downloads, then `F:\Twtich Backup` ·
   [card](https://trello.com/c/1uunz8dK/3-phase-1-core-organiser) (in Review until then).
2. **Broad catch-all categories** — "Documents" took 107 Downloads files ·
   [card](https://trello.com/c/jEq1MNE6/10-organiser-break-up-broad-catch-all-categories)
3. **Update project-plans** · [card](https://trello.com/c/hlHkpgPp/8-update-project-plans-for-jugaad)
   — fleet drift, resolved spec questions, LM Studio override, model choices (now including
   the embedder and vision). Separate repo, its own approval.
4. **Remaining models** (triage, reasoning, speech) — in their phases ·
   [card](https://trello.com/c/NKSDyjvb/7-choose-exact-models-on-the-pc)
5. **`npm audit` findings and install-script warnings** — not looked into ·
   [card](https://trello.com/c/Mng9loKR/9-review-npm-audit-findings-and-install-script-warnings)

---

## Verified this checkpoint, by measurement (on the PC)

- `npx tsc --noEmit` clean; `npm run lint` clean; `npm test` — 404 passed, 5 skipped (live);
  `npm run build` clean.
- Live (`src/lib/ai/live.test.ts`, 12B): classify 1.3 s; caption of a drawn red circle correct
  through the AI SDK 7 `file` part; embeddings separate bill from photo (0.58 vs 0.31).
- Sample folder (48 files): `gemma4:12b-it-qat` 48/48, `gemma4:e4b-it-qat` 44/48 (called
  screenshots photos at 0.9). On 150 real files vs the 12B: e4b agreed 73%, gemma4 8B 72%,
  qwen3 8B 63%.
- **Downloads** (read-only, sandbox DB): scan 41 s, 1,407 files / 18 GB, 62 duplicates;
  suggestions 6.3 min incl. ~300 captions; first plan 9.8 min → after fixes 511 sorted, 14 to
  review (Mixamo `.fbx`, `index.js`, a `.winmd`…), 13 duplicates, 85 renames; rebuild 0.1 s.
  Spot-checked: all 25 files sent to `NCA` belong there.
- **Twitch Backup**: scan 1 min 45 s, 1,514 files / 412 GB, 510 videos read; suggestions 15 s
  (only the 11 existing folders); plan 39 s → 33 sorted, 2 to review (was 16 before folder
  samples; all 10 OBS recordings now to `Recorded` at 0.8).
- UI in the browser (sandbox): add folder, scan, categories (unticked "your folder" row, no
  hidden folders, no near-twins on re-suggest, "1 file"), plan bays, history. Phone width
  not re-checked this checkpoint.

---

## Assumed, not verified

- Apply and undo on a real folder of this size (tested on fixtures and the sandbox copy).
- Cross-drive moves on real large videos (unit-tested with copy-verify; never run on 400 GB).
- That the Downloads suggestions now look right with the pre-tick fix — the audit ran before
  it; the sandbox check used the small sample folder.

---

## Confidence and gaps

Backend logic is well covered by unit tests and two real-folder audits; the interface was seen
working in the browser on a sandbox copy. The untested part is the owner's own end-to-end run
on a real folder, which is the next step and theirs to make. Coming back cold: read Start here,
then `docs/architecture.md`, then the tail of `decisions.md`.

---

## Session log

### 2026-10-16 → 17 (3rd session, on the PC) — Phase 1: core + Organiser, real-folder audits

Relay, then the owner gave the session the GPU and phase 1. Planned with the question tool
(same-folder sorting, paste a path, deps approved, mockups after backend). Built the core:
store migrations v2–12, scanner (quick fingerprints after hashing 384 GB looked like ~40 min),
signals, safety layer, model manager, worker handlers. Organiser mockup rounds →
owner locked layout A, categories C1, renames R1, kept "Send to…" (artifact
https://claude.ai/artifact/GexewtJ6MyMNGTfSne8Gta; record `docs/design/organiser.html`).
Built the screens; `npm run app`; live refresh; dialog iris fix.

Audits on the owner's Downloads across models (12B chosen; e4b, gemma4 8B, qwen3 8B weaker;
gpt-oss failed). Owner set `OLLAMA_MAX_LOADED_MODELS=2` (a 400 on embedding came from Ollama
holding one model). Fixes and re-audits: scope shared between suggestions and plans (`inScope`;
files to review 89 → 26), index follows moved files, existing folders as categories, clustering
tuned on real embeddings. Owner asked for vision (images only) and all four add-ons, then set
the bar: "I am going to be the first user of this app… make sure atleast the app is competent
and easy to use". Final audits on Downloads and `F:\Twtich Backup` → fixes listed in Decisions
this checkpoint, with before/after numbers in Verified.

Mistakes worth keeping: heredocs collapsed `\\` and wrote NUL bytes into a `.ts` file
(memory note saved); a stray sandbox worker from the morning kept running old code, because
stopping a background shell on Windows left its node process alive — the agent first called it
the owner's, which was wrong.

Commit: see git log (this checkpoint's commit follows `9455a63`).

### 2026-10-09 (2nd session, on the PC) — PC setup, Ollama only, classifier chosen

Relay on the PC found the handoff stale: the GitHub remote already existed and `master` was
pushed; "this machine is the laptop" no longer held; "Confidence and gaps" still said no worker
existed. Installed the `fleet` plugin on the PC (marketplace `tanveerfb`; rules copy identical
to v3.4.0); the old loose `relay`/`checkpoint`/`build-and-log` skills in `~/.claude/skills`
vanished during the session — not deleted by the agent, cause unknown. PC setup: the owner's
fnm line was only in the Windows PowerShell 5.1 profile, so the agent added it to PowerShell 7's
and put the fnm default alias on the user PATH; `npm ci`; baseline green.

Tested six local models live. LM Studio closed mid-run once; the owner then dropped it as
unreliable, and the agent removed the provider from code and docs. Found and fixed with the
owner: Ollama exposed on all interfaces (turned off) and a 256k context in the Ollama app
(set to 32k). Pulling `gemma4:12b-it-qat` failed twice with `EOF` — each Ollama settings change
restarted the server mid-pull and left empty chunk-state files; repairing them by hand worked
once, then the owner had the agent delete the partials and pull fresh, which succeeded. The
agent also briefly started a mistaken `gemma4:12b` pull; its partial was deleted too. With LM
Studio's model unloaded VRAM sat at 2.3 GB, and the agent chose the 12B as default. Owner
declined Ollama web search. Owner asked for no GPU work while recording; honoured.

### 2026-10-09 (1st session, continued) — rules 3.4.0, worker, component kit, first commit

First commit (this checkpoint), local only — no remote. Owner synced the fleet rules to
v3.4.0 mid-session, which made the earlier shadcn reskin "interim" and required a component
round. Owner decided: worker ↔ app through SQLite only, worker on `tsx`, localhost-only with
no auth (§AI exception), `eslint-plugin-check-file`, no footer. Built the worker and the
`node:sqlite` store. Ran three component rounds — round 1's inputs were all declined, and
dark-ink-on-orange buttons rejected as muddy (the Ember treatment replaced them) — then built
the kit on Radix. Found and fixed: the iris origin read before the portal mounted; the
`countdown` keyframes dropped by the compiler for a unitless SVG length; a stale dev
stylesheet twice. Owner chose to stop after this checkpoint rather than start phase 1.

### 2026-10-08 (1st session) — setup on the fleet standard, motif, primitives, AI layer

No commits; not a git repo yet. Installed the `fleet` plugin user-wide; recycled the old
`jugaad` folder (GitHub repo deleted by the owner); scaffolded with `create-next-app` 16.4;
pinned Node 24 (owner moved the laptop to fnm); copied `project-rules.md` v3.3.0 and the
templates; created the Trello board. Ran `design-motif`: round 1 (rounded-rectangle cards,
two variants) rejected as generic; round 2 "Honeycomb console" locked. Built the motif in
code, reshaped the shadcn primitives, added Vitest and the `lib/ai/` layer; found and worked
around the Ollama structured-output behaviour. Stopped at the owner decisions above.
