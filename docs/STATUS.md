# Jugaad — status

**Two zones, maintained differently.** The snapshot (everything above the session log) is
rewritten in place every checkpoint. The session log is append-at-top, newest first.

---

## Start here

**State:** Phase 1 is done and proven on the owner's real Downloads. Jugaad is now also a desktop
app (Electron, `desktop/`): a Desktop/Start-menu shortcut starts the app and worker, shows them in
their own window, and keeps them in the tray until Quit. Rules synced to 3.5.0. All committed
(newest log entry).
**Next:** the owner tries the desktop app for real (tray Quit included), then picks: Twitch
Backup, or folders that are a set moving whole (Open items 1–3).
**Blocked on:** the owner's choice on a GitHub release (Open item 4).
**Don't trust:** tray Quit clicked in the UI (its stop path was tested, the click wasn't); a job
run with a model changed on `/settings`; a whole-plan undo on a real folder (unit-tested only).

> **Things that will save a session:** the map is `docs/architecture.md`. The spec lives in
> `Tanveerfb/project-plans` (`plans/jugaad/`). **Never approve, apply or undo on the owner's
> real folders** — that's theirs; audits use a separate DB (`node_modules/.cache/jugaad-sandbox/`).
> **Read the owner's real database from the PowerShell tool** — the Bash tool is sandboxed and
> sees an empty `%LOCALAPPDATA%\Jugaad`. **On Windows, stopping a background shell doesn't stop
> its node worker** — list `node.exe` processes and stop stale workers. Heredocs in the Bash tool
> collapse `\\` (it corrupted a regex again this session) — write backslash code with Edit.
> Ollama holds 2 models (`OLLAMA_MAX_LOADED_MODELS=2`, set by the owner). The owner runs Jugaad
> from the **Jugaad** desktop shortcut (or `npm run app`); both need `.env.local` with
> `JUGAAD_AI_PROVIDER=ollama`, which exists on the PC. **Files are written with Edit/Write, never
> heredocs or `sed`** (rules 3.5.0 §AGENTS).

---

## What this project is

A local AI workbench: one Next.js app on the owner's Windows PC that uses local models
(Ollama, 16 GB GPU) for narrow, reliable jobs — organising folders safely, voice, questions
about the owner's own files, and auditing projects against `fleet-standards`. Private by
default; never deletes a file.

---

## Current state

- **Core** (`docs/architecture.md` has the map): SQLite store, migrations v1–13
  (`data-model.md`); scanner with quick fingerprints and content signals; safety layer — every
  move journalled, never overwrites, copy-verify across drives, undo (whole plan or "Put back"
  of the files that left the owner's folders), crash reconciliation; model manager with a VRAM
  plan that records the models it loads (`jugaad_models`).
- **Organiser** (locked `docs/design/organiser.html`): paste a folder → scan → suggested
  categories → plan → destination bays → apply → history, undo and Put back. Hidden files and
  folders, folder metadata and in-progress downloads are never sorted. With "Include subfolders"
  on, an unticked folder of the owner's is warned about on the tick and on the categories list.
- **Settings** (`/settings`, locked `docs/design/settings.html`): Ollama status, model per job
  (sorting, naming, images — can be off, grouping) from installed models that can do the job,
  stored in the database, applied from the next job; VRAM gauge drop-down with "Free" (Jugaad's
  models only).
- **Models (defaults):** `gemma4:12b-it-qat` sorts, names and captions; `qwen3-embedding:0.6b`
  groups. Mock unless `JUGAAD_AI_PROVIDER=ollama`.
- **Owner's real data:** Downloads organised — 537 loose files sorted; the 288 files first taken
  out of 7 of the owner's folders were put back. Twitch Backup not added yet.
- **Motion:** content still materialises in three pulses on opening; the background ribs no
  longer sweep (`decisions.md`, "Background ribs are still").
- **Desktop app** (locked `docs/design/desktop-app.html`): Electron 44.9.0 runs the app and worker
  on its own Node 24.22 (`ELECTRON_RUN_AS_NODE`), so the shortcut needs no Node on PATH. Startup
  screen (rotor, steps, error with Try again / Open the log), window with a 32 px title strip in
  Jugaad's colours, close hides to the tray (a note on the first close), tray menu Open / Quit.
  If Jugaad already runs on :3000 it opens on that copy. Not packaged into an installer.
  Shortcuts: `C:\Users\Tanve\Desktop\Jugaad.lnk` and the Start menu's `Jugaad.lnk`.

---

## Decisions this checkpoint

Full entries in `decisions.md` (2026-10-18, "Jugaad as a desktop app (Electron)"; 2026-10-17
entries above it).

- **Desktop app:** offered an app window in Edge/Chrome (recommended, no new package), a
  shortcut only, or Electron — the owner picked **Electron**, and **keep running on close**.
  Locked picks: icon C (lit key), title bar Y (Jugaad's colours), startup and tray as mocked.
  Not packaged (an installer would copy the build out of the repo for no gain on one PC).
- **Rules 3.4.0 → 3.5.0** (owner approved): files through Edit/Write only; checkpoints keep the
  README and docs current; text-on-colour pairs as tokens; `Studio credit: local only — not asked`.
  `conventions.md` still says "Audited against v3.3.0" — the re-audit is separate work.

Earlier this phase (2026-10-17):

- Owner's picks: settings on its own page plus a gauge shortcut; "Free VRAM" unloads Jugaad's
  models only; a model per job; subfolder warnings on the tick and on the categories list;
  restore by "Put back" (only files moved out of their folders), not a full undo.
- Plan lifecycle gained `undoing → applied` (partial undo).
- Background ribs: the sweep removed (owner saw it as constant flicker on the panels). Tried and
  dropped on the way: a single-fade opening (reverted at the owner's request) and moving the ribs
  to their own compositing layer (didn't help).
- Bug fixed: hidden folders were sorted (8 files left `.remember`).
- Worker now loads `.env.local` itself — under `npm run app` it had been on the mock model.

---

## Open items

1. **Desktop app in use** — the owner runs it for real, Quit from the tray included · in Review ·
   [card](https://trello.com/c/FYOVfpD7/12-desktop-app-electron-shortcut-window-tray)
2. **Twitch Backup** — the owner's second folder, not added yet.
3. **Folders that are a set should move whole** — the run split two font folders and a property
   photo set. Fonts (`.ttf` + licence) could join the project markers. Not started.
4. **A GitHub release?** — the owner asked how apps get released on GitHub (answered in chat,
   2026-10-18). Undecided; it would need packaging (electron-builder), the motif's homage review
   (`design-system.md`: "If Jugaad is ever distributed…") and Ollama installed separately ·
   [card](https://trello.com/c/wXjYeEyF/13-decide-release-jugaad-on-github-as-an-installable-app)
5. **Settings in use** — a job run with a model changed on `/settings` · in Review ·
   [card](https://trello.com/c/CDtWIOZF/11-settings-page-vram-panel-subfolder-warnings-put-back)
6. **Broad catch-all categories** — "Documents" took 117 Downloads files in the real run ·
   [card](https://trello.com/c/jEq1MNE6/10-organiser-break-up-broad-catch-all-categories)
7. **Update project-plans** (now also: the desktop app) · [card](https://trello.com/c/hlHkpgPp/8-update-project-plans-for-jugaad)
8. **Remaining models** (triage, reasoning, speech) · [card](https://trello.com/c/NKSDyjvb/7-choose-exact-models-on-the-pc)
9. **`npm audit` findings and install-script warnings** (13 reported after adding Electron: 3
   moderate, 10 high — not reviewed) · [card](https://trello.com/c/Mng9loKR/9-review-npm-audit-findings-and-install-script-warnings)
10. **Re-audit against rules 3.5.0** — `conventions.md` was last audited against 3.3.0 ·
   [card](https://trello.com/c/2y5K7fE3/14-re-audit-against-fleet-rules-350)
11. `npm run app` prints a Node `DEP0190` warning (child process with `shell: true`) — harmless, noisy.

---

## Verified this checkpoint, by measurement (on the PC)

- `npx tsc --noEmit` exit 0; `npm run lint` exit 0; `npm test` — 30 files passed, 422 tests
  passed, 5 skipped (live); `npm run build` exit 0 — all after this checkpoint's doc edits.
- **Desktop app, before building:** Electron 44.9.0's Node is 24.22.0 (releases.electronjs.org);
  under `ELECTRON_RUN_AS_NODE`, `node:sqlite` opened (SQLite 3.53.4), the worker started with
  `--import tsx` in one process (sandbox data), and `next start` served "Jugaad" on :3001.
- **Desktop app, built, on the real PC:** the Desktop shortcut started it; `next start` on
  :3000 and the worker (real database, provider ollama) ran as children of `electron.exe`; the
  window showed the title strip and Windows buttons in dark, and both followed a switch to light
  (screenshots; colours on the owner's HDR screen capture paler than they are — the same page
  in the browser pane measured `#efe2d2` / `#4f6075`). Closing the window hid it, the app kept
  answering 200, the first-close note's flag was written, and the shortcut brought the same
  window back with no second set of processes. The worker's IPC stop, on sandbox data:
  `worker.stopping signal=desktop` → `worker.stopped`, exit 0 in 654 ms. A rebuild while it ran
  left it serving (page and a JS chunk 200).

Earlier this phase (2026-10-17), still standing:

- **Owner's real run, Downloads** (read from the real DB via PowerShell): scan 36 s, categories
  12 min (483 images, subfolders on), plan 20 min, apply 5.5 s; plan applied, 825 moved, 0
  errors. 288 of the moves came out of 7 of the owner's folders (table in the log entry "owner's first real run, settings, VRAM, put back").
- In the browser on the real app: VRAM panel lists Jugaad's 12B with its jobs; "Free" took VRAM
  from 11.0 to 2.8 GB and Ollama showed nothing loaded; `/settings` lists models per job by
  capability, change notes and the "fits together" bar (16.7 GB "too big" with qwen3:8b for
  sorting); History shows the Put back block with the real 7 folders; the subfolder warnings show
  on Downloads. `/settings` checked at 390 px — no sideways scroll.
- **Put back on the real Downloads** (the owner clicked it): plan still applied, 537 moved, 288
  undone, 0 errors; on disk all 288 back at their original paths, none left at a destination;
  the 7 folders hold 146, 69, 56, 8, 6, 2 and 1 files — exactly their counts before the run.
- Flicker: with the ribs still, the owner sees none (their check). The opening pulses are back
  (0.68 s `materialise`, checked in the browser).
- Live checks from the 3rd session still stand (classify, captions through the `file` part,
  embeddings; the two read-only audits) — see its log entries.

---

## Assumed, not verified

- Quit from the tray menu clicked in the UI (the stop path it calls was tested; the agent had no
  access to the taskbar). Also untested: the startup screen's error states (port taken, build
  failed, a process exiting), and the first-ever start that builds.
- The startup screen's look on the PC (it flashed by in about a second; its markup is the locked
  mockup's).
- Whole-plan undo on the owner's real folder (unit-tested; Put back proved the same code path in part).
- A job run with a non-default model chosen on `/settings`.
- Cross-drive moves on real large videos (unit-tested; never run on 400 GB).

---

## Confidence and gaps

The Organiser worked end to end on the owner's real Downloads; the gap it exposed (own folders
emptied with subfolders on) is now warned about and reversible. The new settings and VRAM
screens were seen working in the browser, and Put back restored the owner's folders exactly.
The desktop app was seen working from the real shortcut; its failure paths and tray Quit were
not clicked through. Coming back cold: read Start here, then `docs/architecture.md`, then the
tail of `decisions.md`. If the desktop app misbehaves, its log is
`%LOCALAPPDATA%\Jugaad\desktop\jugaad.log`.

---

## Session log

### 2026-10-18 (4th session) — desktop app, rules 3.5.0

The owner asked for a desktop shortcut and whether Jugaad could be an app. Offered an Edge/Chrome
app window (recommended), a shortcut only, or Electron; the owner picked Electron, keeping it
running on close. Checked first that Electron's own Node runs everything (it does: Node 24.22,
`node:sqlite`, tsx worker, `next start`) — so the shortcut needs no Node on PATH, which fnm only
provides inside a terminal. Mockup round 1 (`public/_mockups/desktop-app-r1.html`) locked as icon
C, title bar Y, startup and tray as shown → `docs/design/desktop-app.html`. Built `desktop/`
(main, processes, preload, splash, icon and shortcut scripts), `DesktopTitleBar`, `--titlebar-h`
and the `desktop:` variant, the worker's IPC stop. Created the owner's Desktop and Start-menu
shortcuts and launched from them.

Things learned: Electron 44 has no postinstall — the binary needs `npx install-electron`; sharp
is only Next's dependency, so the icon renders with `@napi-rs/canvas`; the theme-flash script in
`layout.tsx` also marks the desktop window (user agent `JugaadDesktop`), so the strip is there
on first paint. A false lead: light mode looked washed out in screenshots — the owner's screen is
HDR; the page's colours measured right.

Then `/fleet:sync-standards`: 3.4.0 → 3.5.0 (owner approved). The README, still the
create-next-app boilerplate, was rewritten for Jugaad. Asked how apps get released on GitHub —
answered in chat; undecided (Open items).

Commit: see git log (follows `91c3251`).

### 2026-10-17 (3rd session, end) — Put back on the real folder, background flicker

The owner clicked **Put back**: all 288 files returned to their 7 folders (checked in the record
and on disk, counts match). Phase 1 card to Done. The owner then reported flicker on the
Organiser panel. Idle pages showed no DOM changes or refreshes; the only motion was the ribs'
sweep. Tried in order: a single-fade opening (owner's pick) — still flickered; ribs on their own
compositing layer — still; ribs still (owner's pick) — **gone**. The owner then asked to undo the
other changes: the three-pulse opening is back, the layer tweak removed. A false lead on the way:
the agent's Browser pane, hidden behind the owner's window, never revealed streamed content, so
pages there showed loading placeholders forever — not a bug in the app.

Commit: see git log (follows `51722c9`).

### 2026-10-17 (3rd session, continued) — owner's first real run, settings, VRAM, put back

The owner came home and was walked through the app. Before starting it: `.env.local` didn't
exist (the app would have used the mock), and the worker never read it — fixed
(`src/worker/load-env-file.ts`). The owner ran Downloads end to end with "Include subfolders"
on and applied: 825 files moved, 0 errors.

The owner then asked for a way to free VRAM and change models (a settings page) and for the
missing subfolder warning. Choices via the question tool; mockup round 1 published as an
artifact (https://claude.ai/artifact/1RZZEDpcr4EnyPfQTVYdUL), locked as V1 / M1 / warnings,
recorded in `docs/design/settings.html`. Built: `settings` + `jugaad_models` tables (v13), model
per job resolved per job, `/settings`, VRAM drop-down (`Popover` kit component, `shape-pop`),
`WarnNote`, warnings on the tick and the categories list.

While checking the warnings on the real folder, the agent found the run had moved 288 files out
of 7 of the owner's unticked folders: `1-5 Oxford St Blacktown - Photos` 146 (→ Group photos
99, `_review` 36, Screenshots 11), `SimetrixDT-v02` 69, `Google_Sans_Flex,Quicksand` 56,
`.remember` 8 (hidden — a bug), `Kalam,Permanent_Marker` 6, `NCA` 2, `CD Projekt RED Goodies` 1.
Told the owner; they chose "Undo just those files". Mockup
(https://claude.ai/artifact/SyQ1RudLTqXqMHcXraVwqn) locked as `docs/design/history-put-back.html`;
built `organiser/put-back` (partial `undoPlan`, `undoing → applied`). Hidden paths are now never
in scope. Put back itself is left for the owner to click.

Mistakes worth keeping: reading the real DB from the Bash tool showed it empty (sandbox) and
briefly looked like lost data — use PowerShell (memory note saved); a Python heredoc dropped a
backslash from a regex again — caught by grep, fixed with Edit.

Commit: see git log (this checkpoint's commit follows `6412a1c`).

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
