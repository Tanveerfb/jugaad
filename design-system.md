# Design system — Jugaad

**Binding on every visual change** (`project-rules.md` §DESIGN). Who updates it: whoever
changes a token or a rule, in the same change. The locked mockup is
[`docs/design/motif.html`](./docs/design/motif.html) — open it in a browser; it is the
reference for everything below.

**Status:** motif locked 2026-10-08. Tokens below are the values in the locked mockup; they
move into `@theme` in `src/app/globals.css` at the tokens step (not done yet).

---

## Motif

**Universe-inspired — *Doctor Who*, modern series, "Honeycomb console"** — an obvious homage
to the 2012 console room (*The Snowmen*, Michael Pickwoad), with the 2010 room as light mode.
Chosen 2026-10-08 via bring your own (universe-inspired, from the spec's agreed direction);
locked at round 2 of the mockup loop. See `decisions.md`.

- **Signature elements:**
  - **Honeycomb of module tiles** — flat-top hexagons in a tessellated diamond, never
    rectangle cards. A tile with something to show is *lit*: warm inner glow and a light that
    runs slowly round its edge (after the 2012 set's chasing lights). Hover/focus sends one
    fast lap of light. Tiles for unbuilt modules are dim and inert.
  - **Bigger on the inside** — opening a module morphs its hexagon into the full view's
    notched panel (View Transition, 8-point `clip-path` to 8-point `clip-path`); content then
    *materialises* in three soft opacity pulses. Closing reverses the morph.
  - **Rotor** — the job-progress ring: 18 segments (the room's 18 ribs), leading segment
    pulses, two rings of original marks turning in opposite directions.
  - **Ribs** — 18 faint lines radiating from above the page, a light sweeping across them.
  - **Sonic control** — the one control for push-to-talk (and later scanning): original slim
    tool glyph, tip glows while live, a soundwave line runs.
  - **Roundels** — hexagon with a glowing circle over it (the 2012 room's actual roundel);
    used as tile cores, status lights and the empty-state mark.
  - **Notched panels** — chamfered corners with a notch at the top centre; buttons have two
    cut corners. No plain rectangles in the motif's surfaces.
  - **VRAM bar** — aqua-to-orange gauge in the top bar.
- **Plain zones:** file tables, plan reviews, forms and settings stay high-contrast and
  unornamented inside their panels.
- **Off-limits:** the police-box shape; show or TARDIS logos; characters, likenesses, names,
  quotes; real Gallifreyan script (the ring marks are original and never readable as text);
  a console-style home screen; a glowing orb; generic rectangle card grids. If Jugaad is ever
  distributed, the homage elements are reviewed first.
- **Colour schemes:** both. **Dark is the default** (2012 room); light is the 2010 room read
  as copper (owner's choice over the sourced "golden").
- **Palette sources:** 2012 room — cosmic-blue ribs, steel, aqua and orange lighting, blue and
  amber gallery lights. Gallifrey's burnt-orange sky and the Prydonian orange for the accent.
  TARDIS blue `#003B6F` is a widely cited, unofficial value — a starting point only.

Research sources (2026-10-08): thedoctorwhosite.co.uk (Series 5 and 7 interiors, 2005
interior), tardis.wiki (Snowmen control room, TARDIS blue, Prydonian), cultbox.co.uk
(Pickwoad interview). Not confirmed: copper/amber for the 2010 room; any official TARDIS-blue
value.

---

## Tokens (from the locked mockup)

| Token | Dark | Light | Role |
| --- | --- | --- | --- |
| `bg` | `#061428` | `#efe2d2` | page |
| `surface` | `#0c2140` | `#fdf6ee` | panels, tiles |
| `surface-2` | `#11294f` | `#f1dfca` | raised, inputs' track, bulk bar |
| `border` | `#2a5287` | `#b97a50` (copper) | edges |
| `rib` | `#2a5a92` | `#c08055` | background ribs |
| `text` | `#e6edf6` | `#0e2a47` (TARDIS-blue ink) | body |
| `text-muted` | `#9db0c7` (steel) | `#4f6075` | secondary |
| `accent` | `#ff8a2b` (Gallifrey orange) | `#e2691b` | primary action, lit, progress |
| `accent-ink` | `#1c0b00` | `#1c0b00` | text on accent |
| `attn-text` | `#ff8a2b` | `#a8420e` | "needs review" text |
| `aqua` | `#52d6e6` | `#0f7f8c` | running / working |
| `danger` | `#ff6b6b` | `#b42318` | errors |
| `focus` | `#ffb067` | `#b4470f` | focus ring |
| `ember` | `#b33f0f` | `#b33f0f` | primary button body — white text 5.8:1 |
| `ember-hover` | `#c94a14` | `#c24614` | primary button hover |

Measured contrast (WCAG): text on surface 13.6:1 dark / 14.0:1 light; muted on surface
7.2:1 / 5.7:1; orange on dark surface 6.8:1; ink on orange 8.1:1; light attention text 5.9:1.

**Type:** Space Grotesk (headings, 500–700), IBM Plex Sans (body, 400–600), IBM Plex Mono
(numbers, paths, counts — tabular). Base 15px.

**Shape:** chamfer 18px on panels, 7px on buttons; hexagons flat-top, height = width × 0.866.

**Motion:** ease `cubic-bezier(.16, 1, .3, 1)`; 160ms fast, 240ms standard, 520ms module
open. Edge chase 3.6s per lap (lit), 1.1s (hover). Rib sweep 7.2s. Rotor rings 30s / 22s.
Materialise 680ms.


**Kit shapes:** `shape-key` (console key: a hexagon stretched, `--tip` 12px; 10px small,
14px large), `shape-cut` (two cut corners, `--chamfer-sm` 7px), `shape-notched` /
`shape-chamfered` (panels), `shape-hex` (tiles, icon keys, checkboxes).

## Component kit

Locked 2026-10-09 through the component round (§SHADCN); the record is
`docs/design/components.html`, the registry `components.md`. In short: console-key buttons
(Ember), chase-frame inputs and selects, rotor-track tabs, iris dialogs, rotor-ticket toasts,
batch-timeline lists, missing-cell empty states, materialising skeletons, the hex family of
selection controls — and destination bays as the signature plan review. No footer.

## Rules

- **No generic components.** Every surface in the motif gets a custom shape or treatment;
  never propose a plain rectangle card grid or stock component look (owner, 2026-10-08).
  Standard affordances keep their behaviour — a button still acts like a button.
- **Motion conveys state** — lit, running, listening, opening. `prefers-reduced-motion`
  turns every animation off; a lit tile then shows a solid lit edge instead of the chase.
- **State never by colour alone** — status is a light plus a word, and an icon where it
  warns.
- Sentence case everywhere. Icon-only controls carry an `aria-label`.
- Hex tiles clip their own outline, so focus is shown on the SVG edge (thicker, focus
  colour), not with `outline`.
