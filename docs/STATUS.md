# Jugaad — status

**Two zones, maintained differently.** The snapshot (everything above the session log) is
rewritten in place every checkpoint. The session log is append-at-top, newest first.

---

## Start here

**State:** Phase 0 done and on GitHub (`Tanveerfb/jugaad`, `master`). The PC is set up and
verified: Node 24, deps, 98 tests, build. AI is **Ollama only**, default classifier
`gemma4:12b-it-qat`, checked live on the GPU (Decisions this checkpoint).
**Next:** phase 1 — core (scanner, shared index, safety layer) + Organiser, per the spec;
its sample-file set re-runs `12b` against `e4b` (Open items 1).
**Blocked on:** nothing — phase 1 waits only for the owner to start it.
**Don't trust:** a real Ctrl+C on the worker (unit-tested only); quality differences between
the Gemma models (one fixture only); the toast ring's countdown seen moving.

> **Things that will save a session:** the spec lives in `Tanveerfb/project-plans`
> (`plans/jugaad/`), not here — and it still says "LM Studio + Ollama" (overridden, Open
> items 2). `AGENTS.md` carries a Next.js-generated block that `next dev` re-adds — leave it.
> Two machines: the **PC** (RTX 5060 Ti 16 GB, Ollama on the GPU, models in `E:\Ollama`) and
> the **laptop** (Intel Arc, Ollama on CPU). Both use fnm (Node 24) with
> `%APPDATA%\fnm\aliases\default` on the user PATH. On the PC, PowerShell 7's profile is under
> `OneDrive\Documents\PowerShell\`. **Ollama app settings override env vars** (context length
> 32k there). **Changing any Ollama setting restarts it and kills a running `ollama pull`**,
> leaving empty `*-partial-N` files that make every retry fail with `EOF` — delete that
> model's `-partial*` files in `E:\Ollama\blobs` and pull again.

---

## What this project is

A local AI workbench: one Next.js app on the owner's Windows PC that uses local models
(Ollama, 16 GB GPU) for narrow, reliable jobs — organising folders safely, voice, questions
about the owner's own files, and auditing projects against `fleet-standards`. Private by
default; never deletes a file.

---

## Current state

- **Motif and kit in code:** tokens in `src/app/globals.css`, motif components in
  `src/components/motif/`, the locked component kit in `src/components/ui/` on Radix
  (`components.md`, `docs/design/components.html`). Workbench `/` and an empty `/organiser`.
- **Worker and data:** `src/worker/` on `tsx`; `node:sqlite` store with jobs, lifecycle and
  heartbeat (`data-model.md`). App bound to 127.0.0.1.
- **AI layer:** `src/lib/ai/` — `classifyFile` behind `getAi()`, mock by default, AI SDK v7
  over **Ollama only**. `JUGAAD_AI_PROVIDER=ollama` alone switches it on; the model defaults to
  `gemma4:12b-it-qat` (`DEFAULT_MODELS` in `src/lib/ai/models.ts`), overridable with
  `JUGAAD_CLASSIFY_MODEL`. `lmstudio` is now rejected at startup.
- **Repo:** pushed to `github.com/Tanveerfb/jugaad`, `master` tracking `origin/master`.
- **Rules:** `project-rules.md` v3.4.0, identical to the `fleet` plugin's copy.

---

## Decisions this checkpoint

Full entries in `decisions.md` (2026-10-09 — Ollama only; Gemma 4 12B QAT classifies).

- **LM Studio dropped** (owner: unreliable). Overrides the spec's "LM Studio + Ollama"; the
  provider, `JUGAAD_LMSTUDIO_URL` and the live test's provider switch are gone.
- **Classifier `gemma4:12b-it-qat`**, agent's choice at the owner's request: 7.47 GB fully on
  GPU at 32k, ~1 s a file; the owner's everyday apps hold ~2.3 GB and they don't game while
  working. `gemma4:e4b-it-qat` (3.05 GB, ~0.5 s) is the fallback.
- **Ruled out:** `gpt-oss:20b` (always reasons; empty answer with reasoning off).
- **Ollama on the PC:** context length 32k (was 256k in the app); network exposure off.
- **Declined:** Ollama web search — queries leave the PC and it is a model-driven tool loop.
  Owner: "nah its fine then. don't need it."

---

## Open items

*Renumbered 2026-10-09 (2nd session): the GitHub remote exists — the old item 1 is closed.*

1. **Phase 1 — core + Organiser** · [card](https://trello.com/c/1uunz8dK/3-phase-1-core-organiser)
   — includes building destination bays (designed, `docs/design/rounds/round-1.html`), worker
   status in the job panel, and a fixture set that re-runs `gemma4:12b-it-qat` against
   `gemma4:e4b-it-qat`.
2. **Update project-plans** · [card](https://trello.com/c/hlHkpgPp/8-update-project-plans-for-jugaad)
   — `fleet-drift.md` (Jugaad on v3.4.0); the spec's resolved open questions and status; **the
   LM Studio override and the classifier choice**. A separate repo, needing its own approval.
3. **Remaining models** (spec open question: triage, reasoning, embeddings, vision, speech) —
   chosen in the phase that needs each, against the VRAM left beside the 12B (~6 GB) ·
   [card](https://trello.com/c/NKSDyjvb/7-choose-exact-models-on-the-pc)
4. **`npm audit` reports 10 high-severity findings**, and `npm ci` warns that `esbuild` and
   `unrs-resolver` install scripts are not in `allowScripts`. Not looked into;
   `npm audit fix --force` would make breaking upgrades — review first ·
   [card](https://trello.com/c/Mng9loKR/9-review-npm-audit-findings-and-install-script-warnings)

---

## Verified this checkpoint, by measurement (on the PC)

- Node 24.21.0 / npm 11.19.0 via fnm; `npm ci` from the lockfile.
- `npx tsc --noEmit` clean — **after** a build: on a fresh clone it fails with
  `Cannot find name 'LayoutProps'` until `.next/` types exist (`CLAUDE.md`, known issues).
- `npm run lint` clean; `npm test` — 98 passed, 1 skipped (live); `npm run build` — 3 static
  routes. Re-run after the Ollama-only change: all the same.
- Live, Ollama 0.34.2, one invoice fixture — all correct (Invoices, `Invoice_0423_final.pdf`):
  `gemma4:12b-it-qat` 33 s cold / 0.99 s warm, 7.47 GB on GPU; `gemma4:e4b-it-qat` 8.9 s /
  0.50 s, 3.05 GB; `gemma4:latest`, `qwen3:8b` ~0.5 s warm (at 256k context). `gpt-oss:20b`
  failed: empty output. Through the new default path (`JUGAAD_LIVE_MODEL` = the default): pass.
- `modelFor('classifyFile')` with only `JUGAAD_AI_PROVIDER=ollama` resolves to
  `gemma4:12b-it-qat`; `JUGAAD_AI_PROVIDER=lmstudio` stops startup with the env error.
- Ollama listens on `127.0.0.1:11434` only; its server log shows `OLLAMA_CONTEXT_LENGTH:32768`.
- Laptop-era checks (component kit in the browser, view transitions, worker heartbeat, filename
  lint) are in the 2026-10-09 (1st session) log entry; nothing visual changed since.

**The mistake worth keeping.** Structured output looked solved by sending a JSON schema; on
Ollama with reasoning off the schema can be ignored and the model answers in Markdown. The
prompt states the JSON keys too — still needed on 0.34.2. Don't remove that line.

---

## Assumed, not verified

- That `12b` classifies better than `e4b` on real, harder files — one easy fixture can't tell.
- First-visit view-transition abort in dev is purely Turbopack compile time.
- The 2.3 GB VRAM baseline: measured once, with Broadcast, Chrome, Discord and Teams open.

---

## Confidence and gaps

Build, tests and the AI path are verified on the PC's GPU. The data layer, job queue and
worker exist but have no UI yet — the VRAM gauge, sonic control and rotor show honest "not yet"
states. No interface was re-checked in a browser this session (no UI changed). Coming back
cold, start with Open item 1.

---

## Session log

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
