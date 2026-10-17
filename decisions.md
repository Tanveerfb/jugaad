# Decisions — Jugaad

Why each non-obvious choice was made. **Append only.** A decision that turns out wrong gets a
**new entry reversing it, not an edit**.

Required by [`project-rules.md`](./project-rules.md) §DOCS. Started 2026-10-08. The planning
decisions (one workbench app, narrow model tasks, Organiser first, LM Studio + Ollama, per-module
cloud, voice in phase 2, the design direction, laptop-on-mock) live in the spec's own
`decisions.md` in `Tanveerfb/project-plans` and are not copied here — two copies drift.

---

## 2026-10-08 — Fresh repo; the old `jugaad` is gone

**The new Jugaad starts from an empty folder on fleet rules v3.3.0.**

The old `jugaad` (rules v2.0.0) was not continued. The owner deleted the GitHub repo
`Tanveerfb/jugaad` and asked for the local copy to go too (it was sent to the Recycle Bin).
In the owner's words: *"the new jugaad is basically the same thing but going to be properly
implemented."* Settles the spec's open question *Old `jugaad` repo — archive or delete*.

---

## 2026-10-08 — Stack at setup

**Next.js 16.4 (App Router, `src/`), TypeScript strict, Tailwind 4, npm; zod 4, zustand 5,
motion 14; Node pinned to 24.x.**

- **zod** — required by the spec: env checking and structured model output.
- **zustand** — client state for job progress, the VRAM panel and push-to-talk.
- **motion** — the planned "bigger on the inside" expand transition. Chosen now so the
  motif's mockups can use it.
- **Node 24** — offered against Node 22 (what this machine had). There is no deploy platform
  to match, so the current LTS with the longest support (to 2028) won.
- **No Firebase** — the spec keeps all data in local SQLite.
- **Trello board** created: https://trello.com/b/2poFG0U9/jugaad — the owner asked for one,
  over the spec's "none yet".

Not covered: the AI SDK provider packages, SQLite driver and vector extension — they are
chosen through `ai-setup` and at phase 1, each with its own entry.

---

## 2026-10-08 — Motif locked: *Doctor Who* "Honeycomb console"

**Universe-inspired homage to the 2012 console room; hexagon module tiles that morph into
notched panels; copper light mode. Locked mockup: `docs/design/motif.html`. Detail in
`design-system.md`.**

Way in: bring your own (universe-inspired), from the spec's agreed direction. Research
confirmed the 2012 room's hexagon roundels with glowing circles, cosmic-blue ribs and
aqua/orange light; the 2010 room is sourced only as "golden" — the owner chose copper anyway.
Scoping answers: hexagon-plus-circle roundels; original ring marks used sparingly; copper
light mode; two variants in round 1.

- **Round 1** offered two variants — A "Snowmen console" (crisp, technical) and B "Coral
  glow" (rounded, organic). Both were rejected as generic: the owner's words, *"this is
  generic still square or a rectangle cards … the only thing unique is the progress bar …
  VRAM usage and … hold to talk."* Those three were kept.
- **Round 2** offered three directions: Honeycomb console, Rotor arc (curved ring-segment
  tiles in an arc — closest to the console-style home screen rejected in planning), and Field
  lines (organic tiles joined by animated field lines — heaviest to build and keep tidy).
  Honeycomb chosen and locked: *"it's much better … it is certainly non-standard."*
- **Standing preference recorded:** never propose generic components or layouts — custom
  shapes and motion by default. The owner intends to raise this as a `fleet-standards` issue.

Not covered: shadcn customisation and the `@theme` tokens — the next steps.

---

## 2026-10-08 — Tokens, shadcn and the motif in code

**Tokens live in `src/app/globals.css` under shadcn's variable names** (`primary`, `card`,
`muted`…) plus the motif's own (`working`, `attention`, `rib`, `surface-2`, shapes, motion), so
every shadcn primitive inherits the motif without per-component colour work. Dark is the
default via `<html data-theme="dark">`; a saved light choice is applied by an inline script
before first paint (Next.js 16's own recommended pattern) — chosen over `next-themes` to
avoid a dependency for one attribute.

**Dependencies added by `shadcn init` / `add`:** `radix-ui`, `class-variance-authority`,
`lucide-react`, `tw-animate-css`, `shadcn` (its CSS entry is imported by `globals.css`) and
`cn` — shadcn's own class-merging package (github.com/shadcn-ui/cn), which current shadcn
uses in place of `clsx` + `tailwind-merge`. All implied by §SHADCN.

**Bigger on the inside uses React 19.3's `<ViewTransition>`** with a shared name per module
and Next's `Link transitionTypes` (`module-open` / `module-close`) to pick the direction —
no animation library. In dev, the first visit to a route can abort the transition because
Turbopack compiles it on demand; that is a dev-only artefact.

**Vitest 5** for unit tests (`npm test` → `vitest run`), config in `vitest.config.mts` (the
`.mts` extension because the package is CommonJS-by-default and Vite warns otherwise).

---

## 2026-10-08 — AI layer: AI SDK v7 over LM Studio / Ollama, mock by default

**`ai` 7 and `@ai-sdk/openai-compatible` 3**, per the spec's decision (AI SDK, LM Studio and
Ollama, one code path). Tooling was not re-asked: the spec's `decisions.md` already records
it. `lib/ai/` exposes one domain task so far — `classifyFile` (Organiser step 4) — with a
deterministic mock that is the default, so the laptop and every test run without a GPU.

- **Structured output is validated twice:** the server gets the JSON schema, and the reply is
  parsed with zod against *that call's* approved categories — an invented category fails and
  is retried once, then becomes an error.
- **Reasoning is off for classification** (`reasoning: "none"`). Measured on the laptop
  (CPU only — Intel Arc, Ollama `size_vram: 0`) with `qwen3.5:latest` 9.7B Q4: with
  reasoning on, the thinking trace alone ran past a 110 s timeout; off, a short answer takes
  seconds.
- **The JSON shape is also stated in the prompt.** Ollama 0.23 with qwen3.5 ignored the
  response schema when thinking was off — on the OpenAI-compatible *and* native APIs — and
  answered in Markdown. Stating the keys in the system prompt fixed it (24 tokens of JSON).
  Live check: `{"category":"Invoices","suggestedName":"Invoice_0423_final.pdf","confidence":0.95}`
  in 29 s on CPU, model load included.
- **No `server-only` in `lib/ai` or `env.ts`:** the spec's worker runs outside Next.js and
  must import both; the local servers need no keys, so nothing secret is exposed. A cloud
  key would get its own `server-only` module.

`qwen3.5` was used only because it is the one chat model installed; choosing the project's
models stays open (spec) until the PC.

---

## 2026-10-08 — Rules synced to v3.4.0; the shadcn pass becomes interim

**`project-rules.md` 3.3.0 → 3.4.0.** §SHADCN now says components are custom by design —
shadcn supplies behaviour, everything visible is designed for the motif, and a component
round (two or three options per core component, plus a signature component, each approved
through mockups) comes before feature work. The primitives reshaped earlier today (cut
corners, inset edges, colours) fail the new generic test; they stay as the **interim kit**
until the component round replaces them. Nothing was dropped in 3.4.0.

---

## 2026-10-08 — Worker, its runtime, local access, filename lint

Owner's choices, each offered with alternatives:

- **Worker ↔ app: SQLite only.** The worker writes jobs and progress to the shared SQLite
  file; the app reads it and the interface polls about once a second. Chosen over SQLite plus
  a live localhost socket (snappier, but two channels and a second port) and a worker HTTP
  API (state lost on a crash unless also persisted). Settles the spec's open question.
- **Worker runs on `tsx`** (dev dependency): it shares `src/lib` and its `@/` imports with the
  app. Chosen over compiling with `tsc` (a build step and alias rewriting) and Node 24's
  native type stripping (no `@/`, explicit `.ts`, some TS syntax unsupported).
- **§AI access: localhost-only, no sign-in, no rate limit.** The app binds to `127.0.0.1` so
  nothing on the network reaches it. Chosen over a local token and over full §AI sign-in and
  per-user limits for a single-user local tool. Recorded as a granted exception in
  `conventions.md`.
- **Filename lint: `eslint-plugin-check-file`**, chosen over `eslint-plugin-unicorn` (large,
  only one rule wanted) and no rule.

**Data layer on `node:sqlite`** (Node 24 built-in, SQLite 3.53.4) rather than
`better-sqlite3`: no native compile — `better-sqlite3` is exactly what failed to build on the
laptop (no C++ build tools) — no dependency, and `loadExtension` is available for the
spec's vector extension later. Data folder `%LOCALAPPDATA%\Jugaad` (override
`JUGAAD_DATA_DIR`), outside every allow-listed folder.

---

## 2026-10-09 — Component round 1: tabs and the plan review locked

From `public/_mockups/components-r1.html` (three options each, all original to the motif):

- **Tabs: Rotor track** — tabs on a dashed rail, a glowing bead travels to the active one.
  Chosen over hex cells and console switches.
- **Signature component — the plan review: Destination bays** — grouped by destination
  folder, one notched bay each, approved whole or per file; a bay holding a low-confidence
  file glows orange. Chosen over routes (per-file rows with marching paths) and a manifest
  (dense table on a lit spine).
- **Buttons: Console key**, with a condition — *"make sure the contrast is okay. the black on
  orange doesn't go well."* (dark ink on orange measured 8.1:1 but reads muddy). Three
  contrast treatments go to round 1b.
- **Inputs and selects: none chosen** — gauge slot, rib rail and bracketed readout all
  declined; three new directions in round 1b.

**Round 1b** (`public/_mockups/components-r2.html`):

- **Buttons: Console key, Ember** — deep burnt-orange body (`#b33f0f`) with white text
  (5.8:1); the bright orange only in the light and the loading sweep. Chosen over lit edge
  (navy body, orange text and edge) and split key (orange end-cap, navy body).
- **Inputs and selects: Chase frame** — on focus a light runs once round the field's edge
  and stays lit, the honeycomb tile's edge light. Chosen over key slot (hexagonal end-cap
  carrying the action) and roundel socket (a status roundel at the left end).

**Round 2** (`public/_mockups/components-r3.html`) — the rest of the core kit:

- **Dialogs: Iris** — opens as a circle growing out of the button that asked for it, closes
  back into it. Over materialise (pulses over a rib-lit backdrop) and a console drawer sheet.
- **Toasts: Rotor ticket** — a mini rotor counts down the time left to undo. Over gallery
  light (a line of light opening into a strip) and hex stack (parked hexagons).
- **Lists: Batch timeline** — a dashed rotor spine with a lit hexagon node per item, dark
  when undone. Over rib ledger (lit left edge) and honeycomb index (count in a hexagon).
- **Empty and loading: Missing cell** — a honeycomb with one cell outlined where it is
  missing; skeletons materialise in pulses. Over dormant (breathing roundel, shimmer) and
  single light (ribs onto one lit cell, dashed skeletons).
- **Selection controls: Hex** — hexagon checkbox that fills, a hexagonal bead on a rail for
  the switch, a hexagon on the chosen list item. Over roundel and gallery-light families.
- **No footer** — the checklist lists one; the top bar carries everything a single-screen
  local tool needs, so a footer would be empty chrome.

Navigation and cards were not re-opened: the top bar, honeycomb and notched panel are part
of the locked motif. With this the core kit is chosen; the locked designs are collected in
`docs/design/components.html`.

---

## 2026-10-09 — The kit, built

**Every core component is now the locked design, on Radix behaviour.** Built in
`src/components/ui/`; the record of designs is `docs/design/components.html`.

- **Dialog written directly on Radix `Dialog`**, not added through the shadcn CLI: the CLI
  wanted to overwrite the customised `Button` it depends on, and the iris replaces almost all
  of shadcn's dialog anyway. The iris origin is read in a callback ref — the portal attaches
  the content a tick late, so a layout effect ran before the node existed and the circle grew
  from the centre.
- **Toasts on Radix `Toast` plus a small zustand store**, not shadcn's Sonner: Radix is
  already installed and gives the live region, timers, swipe and pause-on-hover; Sonner
  would have been a new dependency to restyle. The rotor ring pauses with Radix's timer.
- **Icon-only buttons are true hexagons** (`size="icon"`), so the theme toggle and the back
  key match the honeycomb.
- **The Organiser's empty view now uses the kit's missing-cell empty state** instead of the
  big lit hexagon from the motif mockup — features compose the kit (§SHADCN).
- **Destination bays wait for phase 1**: designed and locked, built with the Organiser's
  plan data rather than as an empty shell now.

---

## 2026-10-09 — Ollama only; Gemma 4 12B QAT classifies

**The owner dropped LM Studio: Jugaad runs on Ollama alone.** Owner's reason: LM Studio is
unreliable in their use (it also shut down mid-test on the PC). This **overrides the spec's
"LM Studio + Ollama"** planning decision in `Tanveerfb/project-plans`; the spec needs the same
change (Open item: update project-plans). The `lmstudio` provider, `JUGAAD_LMSTUDIO_URL` and
the live test's provider switch are removed — an unused provider is a second code path to keep
working for nothing.

**Default classifier: `gemma4:12b-it-qat`; `gemma4:e4b-it-qat` is the lighter fallback**,
chosen by the agent at the owner's request ("you decide"). Live check on the PC (RTX 5060 Ti
16 GB, Ollama 0.34.2, 32k context), one invoice fixture:

| Model | Result | Cold | Warm | On GPU |
| --- | --- | --- | --- | --- |
| `gemma4:12b-it-qat` | correct | 33 s | 0.99 s | 7.47 GB, all of it |
| `gemma4:e4b-it-qat` | correct | 8.9 s | 0.50 s | 3.05 GB, all of it |
| `gemma4:latest` (8B), `qwen3:8b` | correct | — | ~0.5 s | not measured |
| `gpt-oss:20b` | **empty output** | — | — | — |

The owner's everyday apps (Broadcast, Chrome, Discord, Teams) hold ~2.3 GB and they don't game
while working, so the 12B leaves ~6 GB for Voice and an embedding model; for moving files the
more capable model is worth ~1 s a file. One fixture cannot separate the Gemma models — **phase
1's fixture set re-runs `12b` against `e4b`**, and `e4b` takes over if it is as good.

`gpt-oss:20b` is out: it always reasons first and cannot turn it off, and with reasoning off its
answer arrives empty. Structured output on Ollama 0.34.2 still needs the JSON keys stated in the
prompt — the laptop finding holds.

**Ollama settings recorded:** context length 32k (it was 256k in the app, which overrides
`OLLAMA_CONTEXT_LENGTH`; 32k covers classification, Ask my files' retrieved passages and
Auditor's multi-file reads, and `e4b`'s cold load halved). "Expose to the network" turned off —
Ollama was listening on all interfaces, against private-by-default.

**Declined: Ollama web search.** It sends queries to ollama.com and works as a model-driven tool
loop — against private-by-default and "no open-ended agent loops". Owner: not needed.

---

## 2026-10-17 — Phase 1 plan, and how the safety layer moves files

**Owner's choices at the start of phase 1** (question tool, all the recommended options):

- **Organised files stay inside their allowed folder** — category subfolders (`Downloads\Invoices\`)
  and a `_review` folder there. Matches the locked destination-bay mockup. Rejected: one
  destination root (more cross-drive moves), a destination per folder (an extra field for now).
- **A folder is added by pasting its path**, not by browsing in the app — a browser would list
  folder names outside the allow-list. Explorer's "Copy as path" quotes are stripped.
- **New dependencies for reading contents:** `unpdf` (PDF text), `mammoth` (Word `.docx`
  text), `exifr` (photo date, camera, location present). Pinned exactly; `unpdf` at 1.8.1, not
  1.9.0, which was two days old.
- **The UI mockup round comes after the backend** (steps 1–6), so the mockups show real plan data.

**Agent proposals, not yet contradicted by the owner:** embeddings by `qwen3-embedding:0.6b`
(already installed; `nomic-embed-text` the fallback); **no SQLite vector extension in phase 1** —
clustering needs the vectors in memory only; the extension is chosen in phase 3, which searches.

**How a move is made** (`src/lib/safety/`):

- **Check, then rename — never a hard link.** Windows' rename replaces an existing file, so the
  target is checked first and a taken name fails the move. A link-then-unlink was considered for
  an atomic no-overwrite, and rejected: with the file open elsewhere the unlink fails and leaves
  two names, which the rollback can't always remove either. The check-to-rename gap is accepted
  for a single-user tool.
- **Across drives: copy (refusing to overwrite), compare SHA-256, keep the modified time, then
  remove the original.** If removing the original fails, the copy Jugaad just made is removed —
  the one place code removes a file, and it is never the owner's: it is the duplicate it created
  seconds earlier, and the original is untouched.
- **Capitals-only renames go through a stop-over name** (`<name>.jugaad-case`).
- **Write-ahead journal:** every folder made, file moved, file moved back and empty folder
  removed is journalled before it happens and closed after. SQLite triggers make the journal
  append-only. A crash leaves entries open; the worker settles them against the disk before it
  resumes anything, and never moves a file while doing so.
- **Undo refuses a file changed since it was moved** (size or modified time differ) and removes
  only folders this plan created, only when empty.
- **A folder taken off the allow-list is kept in the database** (soft removal), with its plans
  and journal; nothing in it is touched — not even an undo — until it is added back.

**Scanning:** a file is read only when it is new or its size or modified time changed.
**OneDrive online-only files** can't be recognised through Node's `stat` (it reports them as
ordinary files — checked on the PC). PowerShell lists their attributes for exactly the folders
the scanner walked; it never recurses itself, so it can't follow a junction out of the
allow-list. If that check fails, the scan reads nothing. Junctions, links, protected folders
(AppData, Jugaad's own data) and `.git` / `node_modules` are never entered.

---

## 2026-10-17 — Models, clustering and plans, measured on the sample folder

All measured on the PC (RTX 5060 Ti 16 GB, Ollama 0.34.2) against the **sample folder** —
`src/lib/organiser/fixtures/sample-folder.ts`: 48 invented files in 8 groups a person would
make (bills, banking and tax, photos, screenshots, installers, study, recipes, career), each
tagged with its right group. `src/lib/organiser/live.test.ts` re-runs it.

**Classifier: `gemma4:12b-it-qat` stays** — the comparison phase 1 owed:

| Model | Right | Warm, per file | VRAM |
| --- | --- | --- | --- |
| `gemma4:12b-it-qat` | **48 / 48** | 0.98 s | 8.02 GB |
| `gemma4:e4b-it-qat` | 44 / 48 | 0.47 s | 3.28 GB |

All four of e4b's misses were screenshots filed as photos **at 0.9 confidence** — confidently
wrong, which the review threshold can't catch. Half a second per file is not worth that.

**Embeddings: `qwen3-embedding:0.6b`, through Ollama's own `/api/embed` with a 4,096 context.**
Ollama's app-wide 32k context applies to embedding models too and made this 0.6B model take
5.78 GB; at 4,096 it takes 2.37 GB, ~80 ms a file in batches of 32. The AI SDK's
OpenAI-compatible endpoint can't set a context size, so this one call goes to Ollama's API
directly — still only inside `lib/ai/`. With the 12B, both stay loaded: ~10.4 GB plus the
owner's ~2.3 GB of everyday apps.

**Clustering, tuned on the sample folder** (share of files in a cluster whose majority is their
own group):

- qwen3 plain, k-means: 71% at 8 clusters, silhouette 0.24 — real embeddings score far below
  textbook thresholds, and the first cut-off (0.25) put every file in one group.
- `nomic-embed-text` did better plain (83%), but **qwen3 with its instruction prefix**
  ("Instruct: Identify what kind of personal file this is and what it is for") reached 98%,
  silhouette ~0.45. Kept the file type in the description (it helped the choice of count).
- Vectors are **centred** before clustering (embeddings share a direction that makes
  everything look alike), each count gets **8 k-means runs**, and among counts within 0.02 of
  the best silhouette **the largest wins** — an extra category is easy to reject; two kinds of
  file merged is easy to miss. "No real structure" is now a silhouette under 0.15.
- Live result: 8 categories in 10 s — Bills and statements, Course materials, Recipes, Photos,
  Installers, Screenshots, Job applications, Financial documents. The only overlap is the
  realistic one: two bank documents grouped with bills.

The embedding cache is keyed by model **and** a recipe tag (`grouping-1`), bumped whenever the
embedded text or its instruction changes.

**Model manager:** plans with these measured sizes (an unmeasured model is estimated at 1.25 ×
its download plus 256 MB), the card's real free memory from `nvidia-smi`, and an optional
`JUGAAD_VRAM_BUDGET_GB`. It unloads only models Jugaad itself loaded — another app's model is
never touched — and otherwise refuses with the numbers ("needs 16.3 GB … 10.9 GB is free").
Batching by model is per job: a job runs all its files through one model.

**Plans — agent defaults, open to the owner's call** (each a one-line change):

- **Only loose files at the top of an allowed folder are planned**; subfolders the owner made
  are left as they are.
- **Files keep their names.** The model's suggested name is not applied.
- **Duplicates:** the oldest copy is sorted like any file; extra copies go to
  `_review\Duplicates`. Doubtful answers (confidence under 0.6) and failed classifications go
  to `_review`.
- Building a new plan discards older plans that were never applied.

---

## 2026-10-17 — Owner's calls on plans: subfolders and renames

Settling the agent's defaults above (question tool):

- **"Include subfolders" is a tick box when building a plan.** Unticked (the default), only
  the folder's own files are planned; ticked, files in subfolders too — except files already
  in an approved category's folder or `_review`, which are where they belong. Owner: "an
  option to either select all subfolders or files; if unchecked then only the contents in the
  folder."
- **Renames are per file, owner-ticked.** The model's suggested name is shown on each move,
  unticked; ticking it changes only the name, kept unique in the plan. Owner: "it can suggest
  names but user should be able to tick/untick for each file." A suggestion keeps the original
  extension and is dropped when unusable or no different.
- **Duplicates:** extra copies to `_review\Duplicates`, as proposed.

---

## 2026-10-17 — Organiser interface locked

**Locked mockup: `docs/design/organiser.html`** (round 2; round 1 at `public/_mockups/organiser-r1.html`,
gitignored). Built from the locked motif and component kit; the destination bays are the
signature plan review chosen in the component round.

Owner's choices from round 1 (two options each):

- **Folders: A — a rail and a stage.** The allow-list as a rail of folders on the left; the
  selected folder's steps (scanned → categories → plan → applied), numbers and next action on
  the right. Chosen over B, a stacked panel per folder.
- **Categories: C1 — rows.** Tick to keep, rename in place, examples beside each; an unticked
  row is turned down. Chosen over C2, a honeycomb of cells with a side panel.
- **Renames: R1 — a tick box under each file** with a suggestion ("Rename to …"). Chosen over
  R2, an "Aa" key that swaps the name.
- **"Send to…" on doubtful files** in the review bay — the agent's proposal, kept: a doubtful
  file can be given a category in the plan instead of going to `_review`.
- Owner's feedback during the round: on a phone, job progress stacks (rotor, then text, then
  Stop) rather than sitting in a row.

The screens add routes under `/organiser`: the folder view, and per folder its categories, its
plan and its history. The mockup's own per-screen fade was removed after the owner found the
text "barely visible" — paused in a background tab, it held the screen near transparent. The
app keeps the locked motif's one-time materialise when a module view opens; at rest the
content is fully opaque (checked in the browser).

---

## 2026-10-17 — Audit on the owner's Downloads, and what changed

Run on the owner's real Downloads (1,407 files, 16.75 GB; 525 loose) at the owner's request,
in the sandbox database — nothing approved or applied.

**Before the fixes:** scan 33 s; suggestions 46 s with 12 categories that overlapped in name
(Photos / Images, Webm videos / Videos, "Numbered images"); plan 9 min (1.03 s a file) with 89
of 525 to review; a rename suggested for 380 files. Other models on 150 of the same files,
against the 12B: e4b 73 % agreement, gemma4 8B 72 %, qwen3 8B 63 %, all more confident than
the 12B while disagreeing with it; gpt-oss 20B answered nothing. **The 12B stays.**

**Ollama held one model at a time** — a machine-wide `OLLAMA_MAX_LOADED_MODELS=1`. Every switch
between the embedder and the 12B reloaded a model, and one embedding batch was refused mid-swap
(HTTP 400). The owner set it to **2** (the 12B and the embedder together, ~10.4 GB); checked
in Ollama's log and with both loaded at once. The embedder now also retries a refused batch
once, and Ollama's own error text is kept in the message.

**Fixes:**
- **Categories are named all at once.** The clusters were distinct (closest centres 0.50); the
  names overlapped because each group was named alone. One call now names every group side by
  side, told never to give two the same meaning; clusters whose centres exceed 0.6 merge first.
- **Renames are offered only for messy names** — copy markers, "final", generic or scanner
  names, URL encoding, very long names (`looksMessy`), and never for a change of case or
  separators. Camera and phone names are left alone: the model can't see a photo.
- **Classifications are remembered** per file contents, model and approved category list.

**After:** suggestions 37 s, 9 categories with no near-synonyms (WhatsApp photos, Random
images, Work documents, Video clips, Webm files, Fonts, Configuration files, Numbered images,
Python scripts); plan 9.6 min with **26** to review (from 89); renames offered **77** (from
380) — e.g. a hash-named PDF → "SimetrixDT_Engineering_Certainty_Brochure.pdf"; **rebuilding
the plan: 0 s**. Sample folder still right: 8 categories, all distinct.

**Still open:** "Random images" (272 loose files) is a catch-all, and "Numbered images" names
UI icons poorly — images without text give the models little to go on; a vision model is the
likely fix (spec: phase 1 optional, "a small vision model describes images").

---

## 2026-10-17 — Built for the owner's own folders

The owner is the first user ("if I don't like it I can't distribute it"), with two real
targets: `C:\Users\Tanve\Downloads` (1,407 files, 16.75 GB) and `F:\Twtich Backup` (1,514 files,
384 GB, 506 MP4s — 248 GB of Twitch VODs — on a 5 TB drive; already organised into 11
subfolders, 35 loose files). What they needed, and what changed:

- **"Include subfolders" lives on the folder** (owner's choice). Suggestions and plans follow
  the same tick, so categories are suggested from the files that get sorted. With captions,
  Downloads had 217 of 525 to review because categories came from every file (213 photos almost
  all in subfolders) while plans sorted only loose ones. A small change to the locked design:
  the tick moved from the build panel to the folder's stage; the build panel says which files
  and links back.
- **Fast scans.** Only files of the same size can be duplicates: they get a full SHA-256, every
  other file a quick fingerprint (size + first and last MB, `q:` prefix); a twin appearing later
  triggers the full hash. Reading all of a 384 GB VOD folder would have taken ~40 min.
- **Existing subfolders are categories** ("your folder"), offered first; the namer reuses their
  exact names for groups that belong in them.
- **Videos: length and resolution** (owner's choice over frames) via ffprobe — tells VODs, clips
  and shorts apart without the GPU.
- **Add-ons (owner picked all four):**
  - Archives listed with Windows' own `tar` (bsdtar — Git's GNU tar on the PATH can't read zip),
    programs' version info via PowerShell.
  - Text-less PDFs (scans): page 1 rendered with `@napi-rs/canvas` (new dependency, 1.0.10,
    pinned; 1.0.11 was under two weeks old) and captioned by the 12B.
  - **Learning from corrections:** "Send to…" records the file and where it went. That file goes
    there again on later plans; similar files (word overlap) are shown up to 6 such decisions as
    examples. The classification cache key includes which examples a file was shown, so a new
    correction re-sorts only the files near it.
  - **Projects kept whole:** a folder holding a marker (package.json, pyproject.toml, .sln,
    .uproject, .blend, .prproj, .aep…) is never sorted file by file; with subfolders included it
    moves as one folder (a same-drive rename, journalled, undone as one; across drives a folder
    doesn't move). Projects are never offered as categories.
- **Images only from files in scope** — the Twitch folder's ~850 subfolder images aren't looked
  at while only its 35 loose files are being sorted.
- **Usability:** `npm run app` starts the app and the worker together; every Organiser screen
  says when the worker isn't running; a folder can be removed from the list (confirmed; nothing
  on disk changes; history returns if re-added); the workbench tile, job panel and VRAM gauge
  show live state.
- **Errors split:** a server that answers with an error ("rejected" — e.g. a WebP Ollama can't
  decode) skips that file; only a server that isn't there ("unreachable") stops a job. One odd
  WebP had stopped a whole image run.
- **Dialog fix (restores the locked design):** the iris grew to a fixed 150 % around the opening
  control, so a dialog opened from a button far to its right was clipped on the left; it now
  reaches the farthest corner, and the panel's notched shape returns once open.

## 2026-10-17 — Existing folders offered only when they fit

The real Downloads audit offered all 15 of the owner's subfolders as ticked categories, including
font folders (`Google_Sans_Flex,Quicksand`), a one-file `CD Projekt RED Goodies` and the hidden
`.remember` — and the plan then filed loose files into them. Now an existing folder is pre-ticked
only when the namer put a group of loose files in it; the rest are listed after the new
suggestions, unticked ("your folder — tick to let new files join it"), so the owner can still
choose them. Hidden dot-folders are never offered.

## 2026-10-17 — The classifier sees what each existing folder holds

On the Twitch Backup audit, 10 OBS recordings (`2023-07-03_19-19-43.mp4`…) went to review: the
model, shown only folder names, wavered between "Recorded" and "Unprocessed Clips" at 0.3–0.4,
while `Recorded` held files named exactly like them. Each approved category that exists as a
folder is now listed with up to 4 of its file names, picked evenly across the folder
(`folderSamples`). Re-run on the same folder: review 16 → 2, all 10 recordings to `Recorded` at
0.8. The answer cache key moved to `3:`, so the first plan after this re-sorts once.

Also: a file going to review gets no rename suggestion — a model unsure where a file goes is no
surer what it is (the audit offered `Commercial_Kitchen_Photo.jpg` for an unknown screenshot).

## 2026-10-17 — Re-run findings fixed

- **Files that stay put.** The Downloads re-run planned to move `desktop.ini` — the file that gives
  Downloads its icon and name. Folder metadata (`desktop.ini`, `Thumbs.db`, `.DS_Store`) and
  downloads still being written (`.crdownload`, `.part`…) are now never sorted (`isFolderOwned`,
  through `inScope`, so suggestions and plans both skip them).
- **Suggesting again doesn't offer near-twins.** With categories already approved, a second
  suggestion offered "University notes" beside "Study" and "Phone photos" beside "Photos": the
  namer saw only the folder's subfolders. It now also sees the categories the owner chose, turned
  down or added, and a group it names after one of them is not suggested again.
- **Counts say "1 file".** `countOf` (`src/lib/count-of.ts`) for every count the interface shows.
- **Images go to the model as a `file` part** (AI SDK 7 deprecates the `image` part;
  `AISDK_DEP_IMAGE_CONTENT_PART`). Checked live: the 12B still captions; a vision check joins
  `src/lib/ai/live.test.ts`.
