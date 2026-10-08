# Project Rules & Code Style
**Author:** Tanveer (tanveerfb)
**Version:** 3.4.0
**Applies to:** All Next.js projects
**Master copy:** `standards/project-rules.md` in `github.com/Tanveerfb/fleet-standards`.
History is in `standards/CHANGELOG.md`.

Coding standards, architectural decisions and workflow rules. Follow these
unless the project's own `conventions.md` says otherwise — see §SCOPE.

This file grows as practice improves. A convention that proves itself on a real
project belongs here; a rule that keeps needing exceptions belongs deleted.

**Sections are referenced by name, not number** — `§GIT`, `§FIREBASE`. Names are
stable; sections can be reordered or inserted without breaking a reference
anywhere in the fleet. A reference to a bare number (`§26`) was written against
v2 — the v2 → v3 map is in `CHANGELOG.md`.

---

# Part A — How we work

## §SCOPE — Scope and precedence

These rules are the default for every project. A project may hold its own
`conventions.md` covering choices specific to it.

**Where this file and a project's `conventions.md` disagree, stop and ask.**
Neither wins by default — a conflict usually means one of the two is out of
date, and resolving it is the owner's decision, not an inference. Record the
outcome in `decisions.md`, and update this file if it should apply everywhere.

**Keeping in step with the master.** The `fleet` plugin (marketplace `tanveerfb`, from
`Tanveerfb/fleet-standards`) carries this file, its templates and the fleet skills. Its
`sync-standards` skill brings a project's copy up to date; `propose-standard` sends a change
or request back as an issue on `fleet-standards`. **Never edit this file in place inside a project** —
a fix made here and not proposed is lost at the next sync, and every other project misses it.

---

## §DOCS — Project documents

Every project carries the same document set. Each states who maintains it and
when it is updated.

| File | Holds | Updated when |
|---|---|---|
| `conventions.md` | Choices specific to this project | A decision changes |
| `decisions.md` | Why each non-obvious choice was made. Append only | A choice is made |
| `design-system.md` | Tokens, typography, density, motion, exclusions | A token or rule changes |
| `components.md` | What already exists | A component is added, moved or removed |
| `data-model.md` | Entities, relationships, invariants | An entity or invariant changes |
| `environment.md` | Environment variables and external accounts, with owners | A credential or account appears |
| `docs/STATUS.md` | Where the work is right now — a snapshot over a session log | Every checkpoint (§GIT) |
| `issues.md` | Open and closed issues | Continuously |
| `roadmap.md` | Phases. Slow moving | A phase changes |
| `docs/architecture.md` | The map: modules, what each owns and depends on, data flow, where to find things (§SCALE) | A module is added, moved or removed |
| `docs/specs/<feature>.md` | A feature or upgrade planned before it is built (§SPECS) | Written when planned; status kept current until built |

**Every file answers "who updates this and when", or it gets deleted.** An
unmaintained document is not neutral — it is a confidently wrong instruction.

**Do not create a document before it has content.** An `environment.md` written
before any credential exists documents nothing and claims otherwise.

**`docs/STATUS.md` has two zones, maintained differently.** The snapshot at the
top — opening with a `Start here` block — is rewritten in place and never
appended to. The session log below it is added to at the top, newest first. The
format belongs to the `checkpoint` skill; `templates/STATUS.template.md` matches
it.

Status, issues and roadmap overlap. Keep their jobs distinct: roadmap is phases,
issues is the churn, status is the current position.

---

## §ASK — Asking before assuming

- **Choices go through the question tool.** When the owner is choosing between
  options, it is the default — a choice buried in prose gets missed, and the
  tool notifies the owner's phone. Two to four short mutually exclusive options,
  the recommended one first, one to four questions at a time
- **Open questions go in plain prose.** When an answer needs explaining — what
  something should feel like, what was meant, what is missing — ask it as a
  short numbered list in the message, so the owner can answer in their own
  words, including by speech-to-text. Never force an open question into fixed
  options
- **Never assume design values.** Ask first; propose only when invited
- **Ask once per technical decision.** Once confirmed, apply consistently
- **Ask before structural decisions** — navigation, auth strategy, folder
  conventions
- **Ask when this file and `conventions.md` conflict** (§SCOPE)

---

## §AGENTS — For agents

- **Never present a problem without a direction out of it.** Every issue comes
  with at least one proposed fix, its trade-off, and a recommendation. A list of
  problems with no proposed solutions is not a useful report
- Use the question tool for decisions that are the owner's to make (§ASK)
- Do not create pages or routes absent from the project's documentation.
  Propose them
- Read `components.md` and check the filesystem before creating a component
- Do not introduce a colour, size, spacing or motion value outside
  `design-system.md`
- Do not bypass the data adapter (§DATA) or write a status directly
  (§LIFECYCLE)
- Do not add dependencies without asking
- Never read a credential file's contents into context
- Where documentation and code disagree, the documentation is the intent and the
  code is the bug, unless told otherwise
- Git follows §GIT, without exception

---

## §GIT — Git, commits and the checkpoint

**Git is invoked by the owner. An agent never commits or pushes on its own initiative** —
not `add`, not `commit`, not `push`, not a "quick tidy-up commit" at the end of a task. A
dirty working tree at the end of a piece of work is the correct state, not an untidy one.

**There is one trigger, and it is a phrase:**

| The owner says | The agent does |
| --- | --- |
| *anything else* | No git at all. Leave the tree as it is. |
| `checkpoint` | Documentation pass, then **ask** about commit and push, separately. |
| **`git checkpoint`** | Documentation pass, then **commit and push.** Both pre-authorised. |
| **`git checkpoint max`** | The same, exhaustively verified claim by claim. |

The `checkpoint` skill and `relay`, its inverse, ship in the `fleet` plugin (§SCOPE) and
appear as `fleet:checkpoint` and `fleet:relay`. **If they do not appear in a session's
surfaced skills list, look for them rather than improvising a commit process**, which is how a session ends up inventing its own
worse version of a protocol that already exists.

**Cloud sessions.** A cloud session (Claude Code on the web, a GitHub Action) is assigned a
branch by its harness and told to commit and push there — the container is discarded, and
unpushed work is lost. There the harness's branch instruction **is** the authorisation, on
that branch only. Everything else in this section still applies: batch the work, never push
to `main`/`master` or any branch the harness did not name, never force-push, and never open
a pull request unless the owner asks.

**Where work happens depends on whether the project is live.** The project's `CLAUDE.md`
says which applies (its *Deploys* line):

- **A project with a live domain or real users** works on an update branch and merges to the
  production branch when the update is complete. Every branch gets a preview deploy — check
  the update there before merging
- **A project with no live users** may work on its main branch
- **Keep update branches short-lived.** A branch that runs for weeks drifts from main and ends
  in a merge-conflict session. Merge within days, or bring main into the branch regularly;
  split a large update into several branches that each merge on their own. For the largest
  updates, a feature flag lets work merge continuously while staying switched off on the live
  site (Firebase Remote Config, or the platform's flags)

**Batch. Do not commit per change.** A session's work lands as one considered set of commits
at a checkpoint. A long string of small commits is not tidiness — it is the thing this rule
exists to prevent, and it makes a session's history harder to read rather than easier.

**An approval does not generalise.** "Yes, commit that" authorises the commit in front of you
and nothing after it. The next one needs its own trigger. The same applies to a push: one
push approved is not pushing approved.

**Where the branch auto-deploys, a push is a production release.** Say so in the
confirmation. The owner should never learn from somewhere else that a checkpoint shipped.

**Never run a destructive command** — force push, history rewrite, branch deletion,
`git clean`, `reset --hard` — unless explicitly asked for that command.

**The safety exceptions still stand**, and they are worth a sentence rather than silence: a
secret in the staged diff, a dirty tree containing work that is not yours, a detached HEAD,
or a push that would need a force. Stop for those even mid-checkpoint. A routine push needs
no such sentence.

**Every commit must build standalone** (§BUILD). When splitting a session's work, check
file-level imports at each boundary — a green typecheck on the final tree proves nothing
about the commits before it.

---

## §OWNER — The owner's working agreement

Standing preferences that apply in every project. A project's `CLAUDE.md` adds to these; it
does not restate them.

- **Every visual or layout change starts as a mockup the owner approves** — a new page,
  a restyle, a spacing or layout change, a new component's look, copy the business owns.
  Never build a visual change first and show it after. The one exception is a bug fix that
  restores an already-approved design (a broken alignment, a wrong token); it goes straight
  in, with a line in the running small-changes document
- **Iterate until the owner is satisfied.** One mockup is a starting point, not a
  deliverable. Offer alternatives where the direction is open, revise on feedback, and keep
  going round by round — the loop ends when the owner says the design is locked, not when
  the agent thinks it is close enough. Ask through the question tool at each round (§ASK)
- **Mockups are static HTML**, rendering desktop and a 390px phone from the same markup.
  Drafts live in a gitignored `public/_mockups/`, which the dev server serves. Animation is
  decided here (§MOTION)
- **A locked design is recorded.** The approved mockup moves to `docs/design/<name>.html` —
  committed, and outside `public/` so it is never deployed — with a dated `decisions.md`
  entry naming it. Building follows the locked mockup; changing a locked design takes a new
  mockup round
- **Mobile is first-class** — it must work properly on a phone, not merely not break
- **Consistency, modularisation, QoL — on everything touched**, not only on work with a
  spec. If a change introduces a second version of something the repo already has, it is
  wrong. Where the project has a motif (§DESIGN), it is held to the same standard: every
  visual change fits it
- **Don't state the obvious.** Interface text that repeats what a component already makes
  clear is noise. A light/dark toggle is a switch with a sun and a moon — no "Light mode"
  label beside it. No helper text explaining a self-evident control, no caption restating a
  heading, no "Click here to…". Two limits: an icon-only control still has an accessible
  name (`aria-label`, usually a tooltip), which screen readers need and which is not visible
  text; and an icon that is not universally understood gets its label. What is *not*
  obvious still gets said — an empty state still says what to do next (§QOL)
- **The existing code is not the benchmark.** Check a pattern against this file before
  copying it
- **Shared primitives are never restyled to suit one page.** That is a repo-wide visual
  change and needs its own approval
- **Never rewrite copy the business owns.** Draft it, show it, apply it on a yes
- **Frozen files** are listed in the project's `CLAUDE.md`. Frozen means raise it and get a
  yes, not never touch

---

## §TRELLO — Trello boards

Some projects mirror their progress on a Trello board. **A project has one only if its
`CLAUDE.md` says so**, in its project identity: `Trello board: <url>`. No line, no Trello —
never search for a board or create one unasked.

- **`docs/STATUS.md` is the record; the board mirrors it.** Where they disagree, the repo
  wins: the checkpoint corrects the board and says what it changed
- **Lists are Backlog / To do / Doing / Review / Done**, unless the project's `CLAUDE.md`
  names others. Review holds work that is finished but not yet verified or approved; a card
  reaches Done only when `STATUS.md` records the work as verified
- **An open item with a card carries the card's link in `STATUS.md`.** The link is how item
  and card are matched — never the title, which drifts
- **The `checkpoint` skill writes to the board on every checkpoint**, with or without the
  `git` prefix — the board is not git. It moves cards between lists, creates cards for new
  open items, and ticks checklist items whose work is verified. **`relay` reads the board
  and never writes.** Outside those two, an agent writes to the board only when asked
- Never delete or archive a card unasked. Finished work goes to Done

---

## §SPECS — Spec files

A spec is written when work is planned now and built later — a future feature, an upgrade, a
new system, or a plan finished before usage limits would leave an implementation half done.
Work already in progress hands over through the checkpoint (`docs/STATUS.md`), not a spec.
Skip a spec when the work does not need one.

**A spec must be buildable by a session that knows nothing else.** No template; it covers:

- **Goal, and what it deliberately does not do**
- **Decided versus open** — the owner's confirmed choices, each with a one-line reason, kept
  apart from open questions. Never write a guess in the voice of a decision
- **What it touches** — the areas, files and data it changes
- **Done means** — acceptance criteria that can be checked
- **Status** — the first line

**Where it lives.** A feature or upgrade of an existing project: `docs/specs/<feature>.md` in
that project's repo, where the session that builds it will look. A whole new project: the
owner's plans repo.

**Status and Trello.** On a project with a board (§TRELLO), the status line links the spec's
card, and the card links back to the spec. Progress, discussion and comments from other
people happen on the card; the spec holds only what to build. On a project without a board,
the status line is a plain word — planned, in progress, built — and the spec stays in the
repo alone.

**Building from a spec.** It is binding, like other project documentation (§AGENTS). Never
build on an open question — raise it. When the work is done, mark the spec built (or move its
card to Done); a built spec is kept as a record and is never treated as pending work. The
checkpoint keeps both current.

---

## §TOOLS — Other coding agents

This standard is written for Claude Code and binds every agent equally — Codex, GitHub
Copilot, Cursor, Gemini CLI or any other.

- **`CLAUDE.md` files are the only hand-written instructions** — the root one, plus any
  area files (§SCALE). `AGENTS.md` (Codex, Copilot, Cursor) and `GEMINI.md` (Gemini CLI) are
  pointers to them from `templates/AGENTS.template.md`, and never hold facts of their own
- **The skills run everywhere.** They follow the open Agent Skills format. Claude Code gets
  them from the `fleet` plugin; other agents from `standards/scripts/install-skills.mjs`,
  which installs them to `~/.agents/skills/` and `~/.codex/skills/`
- **Where this file names a Claude Code tool, use the equivalent:**

| Named here | Elsewhere |
| --- | --- |
| The question tool (§ASK) | The agent's own ask-the-user tool; otherwise a short question with numbered options, recommended first |
| Claude's built-in browser, Claude in Chrome (§TESTING) | The agent's own browser control; Playwright stays the last resort |
| Context7, Trello and GitHub MCP tools | The same MCP servers configured in that agent, or `gh`; with none, say so |
| `fleet` plugin, `${CLAUDE_PLUGIN_ROOT}` | `~/.agents/fleet/`, installed by `install-skills.mjs` |

Where an agent has no equivalent at all, it says so rather than quietly skipping the rule.

---

# Part B — Architecture

## §GROWTH — Building for growth

Assume every project outlives its brief. A demo becomes an MVP, an MVP gains a
second customer type, an internal tool gets opened to clients.

**Build for growth in the boundaries:**

- Data shapes, names and relationships — expensive to change, so get them right
- Access boundaries — permission checks, not role checks
- Data access behind an interface, so storage can change without touching
  callers (§DATA)
- Extensible representations — a list of priced lines rather than three named
  fee fields, so a fourth needs no migration
- Structure and naming that still make sense at ten times the size

**Do not build for growth in the features.** Speculative screens, settings
nobody asked for, configuration options with one caller — cost, not foresight.

The distinction: pay upfront where retrofitting is expensive, defer where it is
not. When unsure which side something falls on, ask.

---

## §MODULES — Modularisation and responsibility

There is no line limit. A file is the right size when it does one job.

**Split when any of these is true:**

- You cannot describe the file's job in one sentence without using "and"
- It exports more than one concern
- A component both fetches or computes data and renders it
- A store holds both UI state and domain data
- You scroll to navigate it rather than to read it
- Its name contains `utils`, `helpers`, `misc` or `common`

**Regardless of size:**

- One responsibility per file
- Business logic never lives in a component. Extract to a hook or a pure
  function
- Pure logic imports nothing from React, Next or any store
- Shared things live where their consumers can find them

Splitting a cohesive file into three fragments is worse than leaving it long.
Cohesion is the goal; brevity is a symptom.

---

## §NAMING — Naming

The words in the interface, the code and the documentation are the same words.

- Every project with more than a handful of entities keeps a glossary. Terms
  that sound alike get defined against each other explicitly
- If the interface calls it an offer, the type is `Offer` and the collection is
  `offers`. No synonyms, no internal-only vocabulary
- Name things by what the user understands, not by how the system is built
- An action keeps its name through the whole flow: the button that says
  "Publish" produces a toast that says "Published"

**Files and identifiers** — one spelling per kind of thing, so a search finds everything and
an agent copying the nearest pattern copies the right one:

| Kind | Case | Example |
| --- | --- | --- |
| Files and folders | kebab-case | `user-card.tsx`, `use-cart.ts`, `invoice-schema.ts` |
| Components and types | PascalCase | `UserCard`, `Invoice` |
| Functions, variables, hooks | camelCase | `formatPrice`, `useCart` |
| Zod schemas | camelCase with a `Schema` suffix | `invoiceSchema` |
| True constants | SCREAMING_SNAKE_CASE | `MAX_UPLOAD_SIZE` |

Framework-reserved file names (`page.tsx`, `layout.tsx`, `route.ts`) and tool configs keep
the names their tools expect — they are already lowercase. kebab-case files match what
shadcn and `create-next-app` generate.

- **New projects** use this from day one, enforced by a filename lint rule (ESLint's
  `check-file` or `unicorn/filename-case`) offered at setup
- **Existing projects keep the convention they have.** Record it in `conventions.md`; never
  mass-rename files to match — it is churn across every import and the history, with nothing
  gained for users
- **Renaming on Windows: always `git mv`.** Windows treats `Button.tsx` and `button.tsx` as
  the same file; git and the Linux build servers do not. A capitals-only rename made in the
  editor or File Explorer can look fine locally, never register in git, and fail the deploy
  with "module not found"

---

## §TS — TypeScript

- **Strict mode always.** `"strict": true` is non-negotiable
- No `any`. Use `unknown` and narrow
- Props, parameters, return types and state are explicitly typed
- `type` for object shapes and unions. `interface` only when extending

**Where zod is in use, domain types are inferred from schemas:**

```ts
export const requestSchema = z.object({ /* ... */ })
export type Request = z.infer<typeof requestSchema>
```

There is no global `types/` directory. A hand-written type mirroring a schema
drifts from it. Non-domain types — props, UI unions, hook returns — are declared
in the file that owns them.

---

## §STRUCTURE — Project structure

```
src/
  app/              routes only, grouped by route group or role
  components/       shared across two or more features
  components/ui/    the project's own component kit, on shadcn behaviour — see §SHADCN
  features/         feature-specific components, colocated
  hooks/            one hook per file
  lib/              clients, constants, helpers with a real name
  lib/domain/       pure business logic. No React, no storage
  lib/data/         data access adapter, where the project has one
  lib/ai/           AI adapter, model map and prompts — see §AI
  schemas/          zod schemas and inferred types, where zod is used
  stores/           zustand, one per domain
  styles/globals.css
public/
docs/STATUS.md      the living project record — §DOCS
```

**Promotion.** A feature component gaining a second consumer moves to
`components/` in the same commit that creates the second use. Not before.

**Import aliases.** Always `@/`. Never relative paths climbing directories.
Confirm `"paths": { "@/*": ["./src/*"] }` in `tsconfig.json`.

---

## §SCALE — Finding your way in a larger project

On a small project an agent can read everything. On a large one it reads a slice, and guesses
the rest — so it duplicates what exists, or edits the wrong place. Two things give it the
right slice. Add them when a project outgrows a single read: several feature areas, or the
first time an agent duplicates something or works in the wrong place.

- **Area `CLAUDE.md` files.** A folder with rules or traps of its own gets its own
  `CLAUDE.md` — `src/features/billing/CLAUDE.md`. Claude Code loads it when work touches that
  folder, so local rules arrive exactly when needed and the root file stays short and
  general. **A fact lives in exactly one of them**: the most local file it applies to. The
  root `CLAUDE.md` lists the area files that exist
- **The architecture map** — `docs/architecture.md`, the registry of what belongs where:
  - a table of modules: each folder, what it owns, what it depends on, what uses it;
  - how data moves through the main flows (form → Server Action → adapter → store);
  - a *where do I find…* index for the questions that keep coming up.

  `components.md` (§COMPONENTS) stays the registry of interface components; the map covers
  the system around them. **Keep it current, or it becomes a confident lie** — the checkpoint
  updates it whenever a module is added, moved or removed. The depends-on and used-by columns
  can be generated from the imports by a tool such as dependency-cruiser or madge rather than
  maintained by hand — the owner's choice (§AGENTS)

---

## §DATA — Data access

Where a project has a backend, a mock backend, or any prospect of changing
either, **all reads and writes go through an adapter**.

```
lib/data/
  index.ts      the active adapter
  types.ts      the interface every adapter implements
  <impl>.ts     one file per implementation
```

- The interface is defined in **domain terms** — `listOffersForEngineer`,
  `submitRequest`. If a method name mentions a collection, a document or a
  query, it belongs one layer down
- No component reads storage directly
- A prototype's mock implementation and the eventual real one satisfy the same
  interface. That is what makes a prototype extensible rather than disposable

This is usually the single decision separating "we build on it" from "we start
again".

---

## §LIFECYCLE — Entity lifecycles

Where a record moves through states — orders, requests, applications, jobs:

- **Allowed transitions are declared once**, as an explicit map, in
  `lib/domain/`
- Nothing writes a status directly. Every change goes through a transition
  function that rejects illegal moves
- The state diagram lives in the project's documentation and is the
  specification the map implements
- Status history is append-only where an audit trail matters

Scattered status assignments produce records that are somehow both cancelled and
in progress, and the bug surfaces in production rather than in review.

---

## §SHORTCUTS — Prototypes and shortcuts

Where a build is deliberately incomplete — a demo, a phased delivery, a spike —
every shortcut is marked in code and registered in `demo-shortcuts.md`:

```ts
// DEMO: fee calculated client-side. Production computes server-side.
// See demo-shortcuts.md #4
```

The register lists what is fake, what replaces it, and the risk if it ships.
**It is the next phase's backlog.** An unmarked shortcut is a shortcut that
will ship.

Separate the shortcuts that are safe to build on — mock implementations behind
an adapter, seed data, structure — from those that must be torn out: simulated
payments, client-side authorisation, fake identity. Anything standing in for a
server-side rule is in the second group without exception.

---

## §STATE — State and validation

**Zustand** where the project needs shared client state. A project with little
client state does not need a store. Confirm once, then apply consistently.

- One store per domain. Never one global store
- **Separate UI state from server data.** View context, form progress, filters
  and dialogs belong in a store. Server data does not get mirrored into one —
  mirroring produces two sources of truth that drift
- Selectors only. No derived data in a store. Actions describe intent
- `immer` for deeply nested updates. `persist` for only what must survive reload

**Zod** where the project handles external data: forms, API responses, uploads,
stored records. A static site with no inputs does not need it.

- One schema per entity, in `schemas/`
- Parse at every boundary — submission, response, stored data read
- Enums declared once in zod and imported. No scattered string literals
- Seed and fixture data parsed through the same schemas. If it will not
  validate, the schema or the data is wrong, and finding out early is the point
- Form schemas extend entity schemas. They never redefine them

---

## §FORMS — Forms, errors and data fetching

**Forms.** Simple forms — login, contact, search — use a `<form action={…}>` with
uncontrolled inputs: a Server Action where the work belongs on the server, a client function
where it must run in the browser (Firebase Auth sign-in, for example). `useActionState` holds
the pending and error state; `useFormStatus` drives the submit button. Complex forms —
multi-step, conditional, dynamic validation — use `react-hook-form` with `zod`. Never mix
controlled and uncontrolled inputs in one form. Validate on the client, and again on the
server; client validation is a courtesy, not a control.

**Errors.** `try`/`catch` around every async operation. Nothing fails silently.
`error.tsx` for route-level boundaries, error boundary components around complex
or third-party subtrees. Users never see a raw error — every fallback says what
happened and what to do, and does not apologise.

**Fetching.** Server Actions or Route Handlers for mutations. Client-side
fetching uses SWR or TanStack Query, never bare `useEffect` plus `fetch`.
Live data uses Firestore `onSnapshot` listeners, exposed by the data adapter as
a subscription method (§DATA), wrapped in a hook, and unsubscribed on unmount.
Loading, error and empty states handled every time.

---

## §HOOKS — Custom hooks

- Reusable stateful logic becomes a hook in `hooks/`
- One hook per file, the file kebab-case and the hook camelCase: `use-cart.ts` exports
  `useCart` (§NAMING)
- Return typed objects, not arrays, except for simple pairs

---

# Part C — Stack, platform and security

## §PACKAGES — Packages and APIs

- Use the **latest version compatible with the framework and the rest of the
  dependency tree** — not simply the newest published. Check peer requirements
- Verify current versions on npm before installing
- Use **Context7 MCP** for version-specific documentation before implementing
  anything library-related
- If an API may have changed since training, fetch current docs. Do not assume
- Do not add a dependency duplicating something already in the stack. Record
  every new dependency in `decisions.md`

---

## §NPM — Package manager

- **npm is the fleet default.** Use it unless the project's own `CLAUDE.md` explicitly says
  otherwise.
- A project may pin a different manager for its own reasons. That is a per-project override,
  **documented in that project's `CLAUDE.md`**, not a fleet change. Do not switch a
  project's package manager without asking.

---

## §RUNTIME — Node version and environment

**Node runs the same major version everywhere the app runs** — on the owner's machine, in CI,
and on the deploy platform. A build that passes locally on one major and fails in production
on another is the failure this prevents: a dependency that is fine on one version and breaks
on the next does not show up until the deploy.

- **Pin to the deploy platform's version, not the local one.** At project start, check which
  Node majors the deploy target supports today and pick its current LTS. Record it in
  `decisions.md`; revisit when the platform retires it
- **Declare it twice, the same major in both:** `"engines": { "node": "<major>.x" }` in
  `package.json` — which Vercel reads to choose its runtime — and the major in `.nvmrc` at the
  root, which local version managers read. Use a version manager that switches automatically
  from `.nvmrc` (fnm, or nvm-windows on Windows); Volta, pinning through `package.json`, is the
  alternative
- **A version mismatch is a finding, not a warning.** If the local Node differs from the
  pinned major, switch before building, and say so in the report rather than building anyway
- **No version manager is a gap to fix, not to work around.** A single Node installed from
  the website serves every project at one version. When an agent finds that, it offers to
  walk the owner through setting one up — on Windows: list global npm packages first
  (`npm ls -g --depth=0`, since they belong to one Node install and must be reinstalled),
  uninstall the website Node, `winget install Schniz.fnm`, add `fnm env --use-on-cd --shell
  powershell | Out-String | Invoke-Expression` to the PowerShell `$PROFILE`, then
  `fnm install --lts` and reinstall the global packages
- **Before pushing server-rendered changes, deploy a preview.** A green local build does not
  prove a dynamic route works on the platform (`adopting-the-standard.md`, section 5)

**Environment variables are checked when the app starts, not when a page first breaks.**

- **`src/lib/env.ts` parses them with zod** (§STATE): one schema for server variables, one for
  client (`NEXT_PUBLIC_`) variables. A missing or malformed variable stops the app at startup
  with a message naming it
- **Server variables never reach the client.** The server half is imported only from server
  code (`import "server-only"`); components read the client half
- **Client variables are referenced one by one** — `process.env.NEXT_PUBLIC_X`, written out in
  full. Next.js inlines them at build time and cannot see a dynamic lookup such as
  `process.env[name]`
- **`.env.example` is committed:** every variable name with a one-line comment, never a value.
  `.gitignore` covers `.env*`, so it needs an `!.env.example` exception. `environment.md`
  (§DOCS) stays the record of what each variable is for and who owns the account; the example
  file is the starting point for a fresh clone
- A small library such as `@t3-oss/env-nextjs` does the same job; the owner chooses (§AGENTS)

---

## §SECURITY — Security and secrets

- **`.gitignore` covers `.env*`, `.secrets/` and credential files from the first
  commit**, before any code exists — not after the file lands. The one exception is
  `.env.example`, which holds names only (§RUNTIME)
- **Credential files live outside the repository by preference**, referenced by
  path through an environment variable, or pasted into a deployment environment
  variable. Where the platform supports application default credentials, prefer
  having no key on disk at all. Where a key must sit beside the project, it goes
  in `.secrets/` at the root — gitignored, never committed
- Never read a credential's contents into a prompt, a log or a source file
- A pre-commit hook blocking anything containing `private_key` costs one setup
  and prevents the mistake that cannot be undone
- **Never commit a credential, even to a private repository.** Repositories
  change visibility, get handed to clients, get cloned by collaborators and
  interns. Git history is permanent; cleaning it means rewriting history across
  every clone
- Use scoped service accounts rather than the default broad-permission one
- If a key is exposed, rotate it first and clean history second. Rotation is
  immediate; history cleanup is not
- `environment.md` records every external account and **who owns it**. This is
  what bites at client handover
- Prices, permissions, roles and record states are decided server-side. Anything
  the client can send, the client can forge

---

## §FIREBASE — Firebase

The default backend for auth, data and storage across the fleet.

- **Two SDKs, and the boundary between them is the whole rule.** The client SDK
  (`firebase`) is initialised once, in `lib/firebase/client.ts`, and used from client
  components. The Admin SDK (`firebase-admin`) is **server-only** — Route Handlers, Server
  Actions, `*.server.ts` modules — and lives in `lib/firebase/admin.ts` opening with
  `import "server-only"`. **Never import the Admin SDK from a file a client bundle can
  reach.**
- **Service account keys follow §SECURITY** — outside the repo by preference, never
  committed.
- **Environment variables.** Client-exposed config is `NEXT_PUBLIC_FIREBASE_*` — `API_KEY`,
  `AUTH_DOMAIN`, `PROJECT_ID`, `STORAGE_BUCKET`, `MESSAGING_SENDER_ID`, `APP_ID`. Admin
  credentials and any admin allowlist stay server-only and unprefixed. All of it in
  `.env.local`, gitignored. Record every one in `environment.md` (§DOCS) by name and owner,
  never by value.
- **One Firebase project, many apps: use a named database.** `getFirestore(app, "db-name")`,
  never the default, when an internal tool shares a Firebase project with a public site.
  Isolation without a second project.
- **A duplicated authorisation check must be noted at both sites.** An admin allowlist that
  exists in app code *and* in `firestore.rules` is two sources of truth kept in sync by hand.
  When you touch either, say so at the other.
- **Editing `firestore.rules` does nothing until it is deployed.** Validate first
  (`firebase_validate_security_rules` via the Firebase MCP), then
  `firebase deploy --only firestore:rules`. Confirm the result rather than trusting the exit
  status — a deploy can report success and create nothing.
- **A composite index is declared in `firestore.indexes.json`, and a missing one does not
  fail fast.** The Admin SDK retries, so the symptom is a build that *hangs* until the
  framework kills the page, reporting nothing useful. Suspect a missing index before
  anything else when a page build times out.
- **Firebase is not exempt from §QOL or §FORMS.** Every read and write path gets loading,
  error and empty states.
- **A public page never fetches Firestore in a component.** It serves crawlers an empty
  skeleton, which for a content site is the whole ballgame. Read on the server; the one
  exception is an admin preview route rendering an unpublished draft, which the server path
  will not return.

---

## §AI — AI and LLM features

Applies wherever a project calls a language model — generation, chat, summaries,
classification, extraction, agents.

**The owner chooses the AI tooling — it is never imposed.** When AI first enters a project,
put the options to the owner with the question tool, with the trade-offs and a
recommendation drawn from the project's requirements, and record the choice and the reason in
`decisions.md`. Once chosen, it is the project's tooling: never bring in the other option
later without asking.

| Option | Suits an owner who | Trade-offs |
| --- | --- | --- |
| **Firebase AI Logic** (`firebase/ai`) | Wants to stay inside Firebase — auth, data and AI in one console and one bill | Gemini models only; calls run from the client; no server key to manage, protected by App Check and Firebase quotas. No local models |
| **Vercel AI SDK** (`ai` plus a provider package) | Wants versatility — any provider, Claude among them, local models, chat UIs, agents | Calls run on the server, so the project manages provider keys and its own rate limiting. One API across providers, zod schemas passed straight to `generateObject`, `useChat` for streaming chat UIs |
| **Both** | Wants simple client-side Gemini features *and* server-side or non-Gemini work | Two tools to keep track of; the adapter keeps them behind one interface. `decisions.md` records which task uses which |

The AI SDK is a free, open-source library: the project pays the model provider directly with
its own key, and it runs on any Node host. Vercel's AI Gateway is a separate, optional,
usage-billed service — not needed to use the SDK.

Everything below applies whichever option is chosen. **The `ai-setup` skill runs the whole
process** — use it rather than improvising, in a new project or an existing one.

- **Behind an adapter, like §DATA.** Every model call goes through `lib/ai/`: an interface in
  domain terms (`suggestOutfit`, `summariseNote` — never `callGemini`), one implementation per
  tool or provider the project uses, and a mock. Components never import a model SDK. Changing provider, or sending a
  task to a local model in development, touches one file
- **Model choice in one place.** `lib/ai/models.ts` maps each task to a provider and a model
  ID, read from environment variables where it differs between development and production. IDs go stale
  fast — check them against the provider's current docs before use (§PACKAGES), never from
  memory, and never inline in a component
- **Protect every model call before it ships — an unprotected one is an open bill.** With AI
  Logic: enforce App Check, prefer limited-use tokens (`useLimitedUseAppCheckTokens`), and
  set per-user quotas in the Firebase console. With AI SDK routes: require an authenticated user,
  rate-limit per user on the server, and keep provider keys server-only, never
  `NEXT_PUBLIC_`
- **Structured output is validated with zod.** The zod schema is the single source of truth.
  The AI SDK takes it directly (`generateObject`); for AI Logic, convert it with
  `z.toJSONSchema` for `responseJsonSchema`, then parse the response with the same schema
  (§STATE). A response that fails
  parsing is retried once, then shown as an error state — never rendered half-valid
- **Prompts are code.** They live in `lib/ai/prompts/`, one per task, with typed inputs. User
  input is clearly delimited from instructions and never concatenated into them
- **Model output is untrusted.** Never rendered as raw HTML, never executed, never used as a
  URL, query or file path without validation. A model can be talked into anything its input
  says
- **Tools and agents.** Tool arguments are parsed with zod; permissions are checked on the
  server, never trusted from the model (§SECURITY); anything with side effects — sending,
  paying, deleting, writing on someone's behalf — needs the user's confirmation
- **AI is not exempt from §QOL.** Stream long output; show a skeleton while waiting; offer
  stop and retry; give every failure an error state that says what to do. Mark AI-generated
  content where a user could mistake it for a person's or a verified fact
- **Cost is a design constraint.** Cap output tokens per task, rate-limit per user, cache
  repeated work (prompt caching where the provider supports it), and log usage — tokens and
  cost per task — never the content
- **Privacy is recorded.** `environment.md` names each AI provider, what data reaches it, and
  who owns the account. Send the minimum; strip personal data a task does not need

**Local models (Ollama, LM Studio)** need the AI SDK, and are for development and for tools
that run on the owner's own machine. A project on AI Logic alone develops against the mock
adapter instead.

- Both serve an OpenAI-compatible API (Ollama `http://localhost:11434/v1`, LM Studio
  `http://localhost:1234/v1`), which the AI SDK reaches through its OpenAI-compatible
  provider. The same code then runs a local model in development and a cloud model in
  production — only the provider, base URL and model name change, all from environment
  variables. Call it from the server side of the app; a browser calling `localhost`
  directly runs into CORS
- Use the model name exactly as the tool lists it (`ollama list`, LM Studio's model list)
- Use them to build and test AI features without API cost, and for features in local-only
  tools. **A deployed app cannot reach a model on the owner's PC** — production uses a cloud
  provider
- Choose models that fit the hardware: on a 16 GB GPU, roughly up to 14B parameters at 4-bit
  quantisation runs comfortably, about 20B with care. Smaller local models are weaker at
  tool calling and structured output, and their output differs from the production model's,
  so a feature is only verified once it runs against the model that will serve it
- Chrome's built-in on-device model, through AI Logic's hybrid mode (`InferenceMode`), is a
  separate option for small private tasks in the user's browser, with a cloud fallback

**Testing (§TESTING).** Unit tests run against the mock adapter. Each prompt that matters
keeps a small set of fixture inputs, checked for properties of the output — it parses, it
stays within length, it names no forbidden thing — not exact text.

---

# Part D — Interface

## §STYLING — Styling

- **Tailwind only.** No CSS Modules, no styled-components, no inline `style`
  objects except for genuinely computed values
- Tailwind v4 is CSS-first. Tokens live in `@theme` in `globals.css`. No
  `tailwind.config.ts` unless a plugin requires one
- **Never write a raw hex value, font size, spacing value, duration or easing
  in a component**
- Tokens are defined before any interface work begins

Where Tailwind becomes unreadable, the answer is a component, not a stylesheet.

---

## §DESIGN — Design motif and system

Every project has a `design-system.md` defining its motif, palette, typography,
spacing, density, motion and exclusions. Build nothing before it exists.

**Every project has a motif** — one theme the interface is designed around,
carried through palette, type, shapes, texture, iconography, copy voice and
motion. The catalogue, and how each motif is used, is
[`motifs.md`](./motifs.md) in the master copy of this standard.

- **Choose it before designing** — at a new project, or at a redesign or design
  overhaul. Offer the four ways in from `motifs.md`: browse the catalogue,
  *decide for me* from a description of the site's purpose and audience,
  *surprise me* from the motifs that suit it, or bring your own. Each motif is a
  family: once one is picked, offer its named variants, one or two suggested
  variants — one built from the existing tokens where the project has them —
  Custom, and *decide for me*. Ground every suggestion in subject and audience:
  a tool used outdoors on a phone and a dashboard read at a desk are different
  design problems
- **A project that already has a motif keeps it.** Record it; do not re-choose
- **Universe-inspired** (a motif drawn from a fictional world) has no option
  list: ask which world, research it on the web, ask scoping questions, and get
  a written brief confirmed before any design work — the process is in
  `motifs.md`. Inspired, never copied
- **One motif.** A blend only with the owner's approval, recorded as its own
  motif
- **Record it** in `design-system.md` (the block is in `motifs.md`) and the
  choice in `decisions.md`. From then on it is a standing rule: new interface
  work fits the motif, and anything that does not is the owner's call
- **Restraint.** The motif lives in signature places; forms, tables and body
  text stay plainly readable
- **Starter kits and full motif specs** are produced on request — proposals,
  approved through the mockup loop (§OWNER) like any visual change
- **The `design-motif` skill runs this whole process** — use it rather than
  improvising one. `new-project` calls it before any interface work

Then, always:

- Do not invent colours, type sizes or spacing values. If none are defined, ask
- Spend visual boldness in one place; everything around it stays quiet
- Sentence case throughout, including buttons and table headers
- Never convey state by colour alone

---

## §SHADCN — Components: custom by design

**Every visible component is designed for its project — never a reskin.** shadcn, and the
Radix or Base UI primitives under it, supply *behaviour*: keyboard handling, focus
management, ARIA, positioning. Everything a user sees — shape, anatomy, texture, states,
motion — is designed for the project's motif (§DESIGN) and owned by the project. Changing
colours and radius on a stock component is not customisation; it is the generic look with a
different paint job.

**Taking time here is expected.** Component design is a phase of the build, not a pass over
the defaults.

- **The generic test.** If a component could drop into another project — or a stock shadcn
  demo — unchanged, it is not done. Every component carries the motif somewhere: its
  silhouette, edges, layers, texture, states, motion or sound
- **Be ambitious.** Propose non-standard forms that come from the motif — a button that is a
  stamped ticket, a progress bar that is a soundwave, tabs that are file folders, a toast that
  arrives as a note pinned to the board. Mockups show **two or three creative options per core
  component**, not one safe one, and the owner chooses
- **Anatomy can change, not just paint.** New shapes, layered parts, built-in ornament, and
  every state designed on purpose: rest, hover, press, focus, loading, disabled, error, empty
- **Behaviour stays standard and accessible.** Custom components are built on shadcn's
  behaviour primitives (or an equivalent), never hand-rolled focus traps or menus. Keyboard
  operable, visible focus, correct ARIA, `prefers-reduced-motion` honoured. A creative
  component that cannot be used from the keyboard is not done
- **Creative in form, clear in content.** Restraint (§DESIGN) and *don't state the obvious*
  (§OWNER) still hold: the component is distinctive, the information inside it stays plainly
  readable
- **The component round.** After the motif is locked and before feature work, a mockup round
  designs the project's core kit — navigation, buttons, inputs and selects, cards, tables and
  lists, dialogs and sheets, tabs, toasts, empty states, loading skeletons — plus the
  project's **signature component**, the one the product is remembered by. Each in all its
  states, at desktop and phone width. It may take several rounds; the owner approves each
  component
- **Recorded.** The locked designs go in `docs/design/components.html` (committed, never
  deployed), the components in `components.md` (§COMPONENTS), their values in `@theme`
- **Every project's kit is its own.** Never copied from another project, and no second
  component library added without asking
- Features compose the kit; restyling a kit component for one page is a repo-wide change
  (§OWNER)

---

## §COMPONENTS — Component registry

Every project has a `components.md` listing what exists.

- **Read it, and verify it against the filesystem, before building any
  component.** It is an index, not a source of truth
- If something close exists, extend it with a prop. Do not fork it
- Add what you build to the registry in the same commit

An unmaintained registry is worse than none, because it gets trusted.

---

## §QOL — Quality of life and utilities

Build the expected version, not a bare minimum needing immediate extension.

| Component | Expected |
|---|---|
| Table | Pagination, search, column filters, sortable columns, row selection, empty state, skeleton |
| List | Search, filter, empty state, skeleton |
| Form | Inline validation, submit loading state, success and error feedback, disabled while submitting |
| Modal | Backdrop close, Escape close, focus trap, loading state |
| Select | Search when over ten options, clear selection, loading state |
| Image | Skeleton, error fallback, lazy loading |
| Card | Skeleton variant |
| Input | Clear button, character count, password reveal — where applicable |
| Button | Sizes (sm, md, lg), outline and ghost treatments, loading, full width, leading and trailing icons |

Every list has a written empty state saying what to do next. Every async view has
a skeleton matching its final layout, not a spinner.

**Offer improvements proactively.** Where a screen would clearly benefit from an
unscoped utility — bulk actions, keyboard shortcuts, saved filters, export,
inline preview — propose it. Offer it; do not build it unasked.

Anything deliberately deferred gets a `// TODO:` naming what is missing.

---

## §PATTERNS — Interface patterns

**Button to modal overlay.** On pages carrying a lot of content, tools or
sub-sections, put secondary tasks behind a button that opens an overlay rather
than stacking them on the page. It keeps the primary task legible and scales as
the page grows.

Use for: filters and advanced search, create and edit forms, detail from a list,
settings, bulk actions, confirmations.

Do not use for: the page's primary task, anything repeated many times in a row,
or content that must be read alongside what is behind it — those want a panel or
an inline section.

Every overlay closes on backdrop click and Escape, traps focus, and returns
focus to the control that opened it.

---

## §MOTION — Motion

**Animation is decided by the owner at the mockup stage, not by this file.** Nothing is
banned on style. A mockup may be as animation-heavy as the idea calls for; the owner keeps
what works and cuts what does not (§OWNER).

Three things hold regardless:

- **`prefers-reduced-motion` is honoured.** Movement becomes an instant change or a short
  fade, and nothing essential is conveyed only through motion. This is accessibility, not
  taste, and no exception covers it
- **Motion never makes the app feel slow.** Nothing waits on an animation before it can be
  used, and it stays smooth on a mid-range phone. If it drops frames, cut it back
- **Durations, easings and springs are tokens** in `@theme` (§STYLING), recorded in
  `design-system.md` once a mockup settles them

**Library.** `motion` (imported from `motion/react`; formerly Framer Motion) by default.
GSAP where it is genuinely the better tool, with the reason in `decisions.md`.

---

# Part E — Quality

## §BUILD — Comments, cleanliness and build discipline

- Comment non-obvious decisions and complex logic. Not obvious code
- JSDoc on exported functions and hooks
- No `console.log` left behind. No commented-out code
- No TODO surviving more than one session unless explicitly deferred in writing
- **During work:** `npx tsc --noEmit` and `npm run lint` after each change of
  substance, and fix what they report before moving on
- **`npm run build` before every checkpoint and before anything deploys.** It
  is the only check that proves the app builds — lint and typecheck do not
- TypeScript and ESLint errors are blockers, not warnings. Warnings cleared
  before a task is done
- Nothing ships with a failing build

---

## §TESTING — Testing

- **Unit tests with Vitest** for `lib/domain/` and `schemas/`. Pure logic is cheap to test,
  which is half the reason §MODULES keeps it pure. Every transition map (§LIFECYCLE) has
  tests for its illegal moves, not only its legal ones. `npm test` runs `vitest run`
- **Interface changes are checked in a real browser by the agent**, at desktop width and at
  a 390px phone width (§OWNER). Use, in this order: **Claude's built-in browser**, then
  **Claude in Chrome**. Playwright or any other headless tool is the last resort, only when
  neither is available — and say so in the report
- A green build is not evidence an interface works. A UI change is done when it has been
  seen working
- No end-to-end suite by default. If a project needs one, that is a decision, recorded in
  `decisions.md`

---

## Checklist — new project

The `new-project` skill walks this list with the owner.


- [ ] `create-next-app` with TypeScript, Tailwind, App Router, `src/`, `@/` alias
- [ ] `.gitignore` covers `.secrets/` and `.env*` (except `.env.example`) — first commit, before
      code
- [ ] `tsconfig.json` strict confirmed
- [ ] Node pinned to the deploy platform's major in `engines` and `.nvmrc` (§RUNTIME)
- [ ] `src/lib/env.ts` validates env at startup; `.env.example` committed with an `!.env.example`
      exception in `.gitignore` (§RUNTIME)
- [ ] Motif proposed and chosen, recorded in `design-system.md` (§DESIGN)
- [ ] `design-system.md` written and tokens in `@theme` before any UI work
- [ ] Component round done: the core kit and signature component designed in the motif,
      approved through mockups, built on shadcn behaviour (§SHADCN)
- [ ] Navigation style confirmed with the owner
- [ ] Zustand and zod confirmed as needed or not needed (§STATE)
- [ ] Data adapter interface defined, if the project has data (§DATA)
- [ ] Base components built: navigation, footer, button
- [ ] Document set created — only the files that have content (§DOCS)
- [ ] Structure matches §STRUCTURE; files named per §NAMING, with the filename lint rule offered
- [ ] MCP servers active: Context7, Next.js DevTools, shadcn, Firebase and
      Vercel where applicable, web search
- [ ] `.env.local` created, and every variable recorded by name and owner in
      `environment.md` (§FIREBASE for the Firebase set)
- [ ] If the project has AI features: the `lib/ai/` adapter and model map in place, every model
      call protected before any AI feature ships (§AI)
- [ ] Vitest installed and `npm test` wired (§TESTING)
- [ ] Trello board line in `CLAUDE.md` if the project has a board (§TRELLO)
- [ ] First `npm run build` passes clean
- [ ] `fleet` plugin enabled in `.claude/settings.json` (`sync-standards` writes it)
- [ ] `AGENTS.md` and `GEMINI.md` pointers at the root, if anyone works on the project with another agent (§TOOLS)
- [ ] **`project-rules.md` copied into the project root and `@project-rules.md` imported
      from `CLAUDE.md`** — and **committed**. An untracked copy is one `git clean` from gone.
