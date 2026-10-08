# Jugaad — status

**Two zones, maintained differently.** The snapshot (everything above the session log) is
rewritten in place every checkpoint. The session log is append-at-top, newest first.

---

## Start here

**State:** Phase 0 complete and committed locally: motif and the locked component kit in
code, worker + SQLite job queue, AI layer (mock + verified local call), 98 tests, app on
127.0.0.1, rules v3.4.0. Not pushed — no GitHub remote yet (Open items 1).
**Next:** phase 1 — core (scanner, shared index, safety layer) + Organiser, per the spec.
**Blocked on:** the owner creating the GitHub repo; phase 1 was paused by the owner's choice.
**Don't trust:** a real Ctrl+C on the worker (clean stop is unit-tested, not seen in a
terminal); the 29 s live classification time (laptop CPU, not the PC); the toast ring's
countdown seen moving (the pane was hidden — animations freeze there; timer verified).

> **Things that will save a session:** the spec lives in `Tanveerfb/project-plans`
> (`plans/jugaad/`), not here. `AGENTS.md` carries a Next.js-generated block that `next dev`
> re-adds if removed — leave it. Node comes from fnm (default 24); `%APPDATA%\fnm\aliases\default`
> is on the user PATH so GUI apps and MCP servers find it. In Claude Code's Bash tool, `cd`
> can fail with fnm's "can't find the necessary environment variables" — use `builtin cd`.
> This machine is the **laptop** (Intel Arc, Ollama runs on CPU); the 16 GB GPU is the PC.

---

## What this project is

A local AI workbench: one Next.js app on the owner's Windows PC that uses local models
(LM Studio or Ollama, 16 GB GPU) for narrow, reliable jobs — organising folders safely, voice,
questions about the owner's own files, and auditing projects against `fleet-standards`.
Private by default; never deletes a file.

---

## What shipped in this checkpoint

- **Motif in code:** tokens in `src/app/globals.css` (shadcn names + motif additions, dark
  default, light via `data-theme`, no-flash inline script in `layout.tsx`); motif components
  in `src/components/motif/`; `TopBar`; workbench `/` (honeycomb + idle rotor);
  `/organiser` empty view; React `<ViewTransition>` hexagon → notched panel and back.
- **Component kit (rules 3.4.0 component round):** three rounds of mockups, owner chose each
  component; built on Radix — console-key buttons (Ember), chase-frame inputs and selects,
  rotor-track tabs, iris dialog, rotor-ticket toasts, batch timeline, missing-cell empty
  state, materialising skeleton, hex checkbox and switch (`components.md`,
  `docs/design/components.html`).
- **Worker and data:** `src/worker/` on `tsx`; `node:sqlite` store with jobs, lifecycle and
  heartbeat (`data-model.md`); filename lint rule; app bound to 127.0.0.1.
- **AI layer:** `src/lib/ai/` — `classifyFile` behind `getAi()`, mock default, AI SDK v7 over
  LM Studio / Ollama, prompt with delimited data, zod-validated output with one retry,
  reasoning off; opt-in live test.
- **Tests:** Vitest 5, `npm test`; geometry, module registry, schemas, prompt fixtures, mock,
  retry logic.
- **Docs:** `design-system.md`, `components.md`, `environment.md`, `PRODUCT.md`, locked mockup
  `docs/design/motif.html`.

---

## Open items

*Renumbered 2026-10-09: the component round is done and the footer decided (none).*

1. **GitHub remote** — the repo is committed locally (`master`) but has no remote: GitHub
   `Tanveerfb/jugaad` must be created (empty) by the owner — no `gh` CLI or GitHub connector
   here — then `git remote add origin https://github.com/Tanveerfb/jugaad.git` and
   `git push -u origin master`.
2. **Phase 1 — core + Organiser** · [card](https://trello.com/c/1uunz8dK/3-phase-1-core-organiser)
   — includes building destination bays (designed, `docs/design/rounds/round-1.html`) and
   showing worker status in the job panel.
3. **Exact models** (spec open question) — chosen on the PC against the 16 GB budget ·
   [card](https://trello.com/c/NKSDyjvb/7-choose-exact-models-on-the-pc)
4. **Update project-plans** — `fleet-drift.md` (Jugaad on v3.4.0), the spec's resolved open
   questions and status; a separate repo, needing its own approval ·
   [card](https://trello.com/c/hlHkpgPp/8-update-project-plans-for-jugaad)

---

## Verified this checkpoint, by measurement

- Node 24.21.0 / npm 11.19.0 via fnm — `node -v` in Git Bash and in PowerShell without a profile.
- `npx tsc --noEmit` clean; `npm run lint` clean; `npm run build` — 3 static routes (`/`,
  `/_not-found`, `/organiser`).
- `npm test` — 7 files, 98 passed, 1 skipped (the opt-in live test).
- Worker started for real against a fresh database: schema version 1, heartbeat every 2 s.
- Dev server listens on `127.0.0.1:3000` only (`Get-NetTCPConnection`).
- Filename lint catches a bad file and folder name (throwaway test, removed).
- Component rounds 1, 1b, 2: rendered and exercised in the browser (dialogs focus-trap and
  return focus, toasts send, tabs move with arrows); no horizontal overflow at 390 px.
- Built kit, on a temporary page (deleted): every button variant and state, input error and
  disabled, select opens with the chosen hexagon, checkbox mixed, switch, tab bead moves,
  timeline, iris dialog grows from its button (`--iris-x/y` set, `iris-in` runs) and returns
  focus, toast appears in a live region and dismisses at 8 s.
- Production CSS contains every keyframe (`countdown`, `iris-in/out`, `sweep`, `blink`, …).
- Live: `qwen3.5:latest` via Ollama returned `{"category":"Invoices","suggestedName":"Invoice_0423_final.pdf","confidence":0.95}`
  in 29 s (laptop CPU, model load included).
- In the browser (dev server): workbench and `/organiser` at 800 px and 390 px, dark and
  light; theme survives reload, no hydration warnings; view transition runs with types
  `module-open` / `module-close` and finishes; Escape closes the module.
- Primitives seen on a temporary check page (deleted) in both themes, Select opened.

**The mistake worth keeping.** Structured output looked solved by sending a JSON schema; on
Ollama 0.23 + qwen3.5 with reasoning off, the schema is ignored and the model answers in
Markdown. The prompt now states the JSON keys too. Don't remove that line assuming the
schema is enough.

---

## Assumed, not verified

- That Ollama/LM Studio on the **PC** behave like the laptop's Ollama for structured output.
- First-visit view-transition abort in dev is purely Turbopack compile time (seen once, not
  repeated after compile).

---

## Confidence and gaps

UI and AI layer are verified in a real browser and against a real local model; nothing has
run on the PC's GPU. No data layer, job queue or worker exists — the VRAM gauge, sonic
control and rotor show honest "not yet" states. Coming back cold, check Open items 1–3 first.

---

## Session log

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
