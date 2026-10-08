# Conventions — Jugaad

**What this file is:** the choices specific to this project, and every place it
**deliberately diverges from [`project-rules.md`](./project-rules.md)**.

**Audited against v3.3.0.**

**What this file is not:** a copy of how to work in this repo. That is
[`CLAUDE.md`](./CLAUDE.md).

**Precedence.** `project-rules.md` §SCOPE: where the fleet rules and this file disagree, **stop
and ask.** Anything not listed here follows the fleet rules.

---

## Divergences from `project-rules.md` — granted

### §AI — model calls without sign-in or per-user rate limits. **Exception granted 2026-10-08.**

The fleet rule: AI SDK routes require an authenticated user and rate-limit per user on the
server — an unprotected model call is an open bill.

Jugaad instead binds its app to `127.0.0.1` (`npm run dev` / `npm start` pass `-H 127.0.0.1`)
and has no sign-in and no rate limiter. It has one user, on one PC; its model servers are
local and free; nothing is deployed.

It stays that way because:

- nothing on the network can reach a server bound to the loopback address;
- there is no bill to protect — LM Studio and Ollama run locally without keys;
- a login for the only person at the keyboard adds friction and no protection.

**Not covered:** everything else in §AI — the adapter, zod-validated output, delimited
prompts, untrusted output, output caps. **And cloud providers:** the moment a module may send
a request to Gemini or Claude (spec: per-module, per-request), that path needs its own
protection and this exception is revisited.

---

## Open against the fleet rules — not yet decided

| Rule | Gap | Tracked as |
| --- | --- | --- |
| — | None open. | |

---

## Fully compliant — worth stating

- §SHADCN (3.4.0) The component round is done: core kit chosen over three rounds (two or three
  options each), built on Radix behaviour, recorded in `docs/design/components.html`. The
  signature component (destination bays) is designed and is built with the Organiser.
  `Badge` and `Tooltip` were not in a round; they already carry the motif (hexagonal pill,
  cut-corner popover).

- §RUNTIME Node is pinned to 24.x although there is no deploy platform — chosen by the owner
  as the current LTS for a local-only tool.

---

## §DOCS Document set — mapped, not duplicated

| §DOCS document | Here |
| --- | --- |
| `conventions.md` | this file |
| `decisions.md` | [`decisions.md`](./decisions.md) |
| `design-system.md` | [`design-system.md`](./design-system.md) — locked motif and tokens; `PRODUCT.md` holds the strategic summary for the `impeccable` skill |
| `components.md` | [`components.md`](./components.md) |
| `data-model.md` | [`data-model.md`](./data-model.md) — jobs and the worker heartbeat; the index arrives in phase 1 |
| `environment.md` | [`environment.md`](./environment.md) — model-server variables, providers and data flow |
| `status.md` | [`docs/STATUS.md`](./docs/STATUS.md) |
| `issues.md` | not yet |
| `roadmap.md` | the spec's phases (`project-plans/plans/jugaad/README.md`) and the Trello board |
