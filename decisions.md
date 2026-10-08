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
