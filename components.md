# Components — Jugaad

What exists, so nothing is built twice (`project-rules.md` §COMPONENTS). **An index, not a
source of truth** — check the filesystem too. Who updates it: whoever adds, moves or removes
a component, in the same change. Every look here is set by `design-system.md`; the locked
component designs and their rounds are in `docs/design/components.html`.

## The kit — `src/components/ui/` (§SHADCN: custom by design, shadcn/Radix behaviour)

Locked through the component round (2026-10-09). Behaviour — keyboard, focus, ARIA,
positioning — is Radix's; everything visible is the motif's.

| Component | Design | Notes |
| --- | --- | --- |
| `Button` | Console key, Ember: a hexagon stretched into a key, a light on its left | Variants default (ember) / secondary / ghost / destructive / link; sizes sm / default / lg / icon / icon-sm (true hexagon, needs `aria-label`); `loading` blinks the light and sweeps a bar |
| `Input` | Chase frame: a light runs once round the edge on focus | `aria-invalid` → red lit edge; disabled → dashed. `className` styles the input, `frameClassName` the frame |
| `ChaseFrame` | The frame itself (SVG) | Used by `Input` and `SelectTrigger`; reacts to a parent `group/field` |
| `Select` | Chase-frame trigger with a hexagon chevron; cut-corner list; hexagon on the chosen item | Radix Select, `position="popper"` |
| `Checkbox` | Hexagon that fills; a bar across it when mixed | Radix Checkbox |
| `Switch` | Hexagonal bead on a rail | Radix Switch |
| `Tabs` | Rotor track: dashed rail, a glowing bead travels to the active tab | Bead moves by `transform`, measured from the active trigger |
| `Dialog` | Iris: grows out of the control that opened it, closes back into it | Radix Dialog; notched panel; close is an icon key |
| `Toaster` + `toast()` | Rotor ticket: a mini rotor counts down the time to act | Radix Toast; store in `src/stores/toast-store.ts`; mounted once in the root layout |
| `Timeline` / `TimelineItem` / `TimelineTitle` / `TimelineMeta` | Batch timeline: dashed spine, hexagon node per item, dark when `inactive` | An `<ol>` |
| `EmptyState` | Missing cell: a honeycomb with one cell outlined | Title, description, and the next action as children |
| `Skeleton` | Materialises in soft pulses | Stagger with `animationDelay`; match the final layout |
| `Badge` | Hexagonal pill; `attention` and `working` variants | From the interim kit; fits the motif — revisit if a round covers it |
| `Tooltip` | Cut-corner popover, no arrow | From the interim kit |
| `Table` | Plain zone — motif spacing and colours only | Plans use destination bays instead |
| `Label` | Unchanged | |

The signature component — the plan review as **destination bays** — is built as a feature
(`DestinationBays`, below), on the `shape-bay` utility in `globals.css`.

## Motif — `src/components/motif/`

| Component | What it is | Notes |
| --- | --- | --- |
| `HexFrame` | SVG outline of a flat-top hexagon tile; `lit` adds inner glow and the slow edge light; `interactive` adds the fast lap on hover/focus | Fills its parent; parent clips with `shape-hex` and is the `group` |
| `Roundel` | Hexagon with a glowing circle (2012 room); `glowing` / dim; `sm` `md` `lg` | Decorative, `aria-hidden` |
| `NotchedPanel` | The motif's panel: chamfers + top-centre notch, or `shape="chamfered"` | Two-layer clip so the diagonal edges keep a border |
| `StatusLight` | Light + word; `attention` / `working` / `idle` | Never colour alone |
| `Rotor` | Job-progress ring: 18 segments, pulsing head, contra-rotating marks while `progress` is a number | `progress={null}` = idle, nothing turns; `compact` = 58px ring for a job row, no figure or outer marks |
| `Ribs` | Fixed background of 18 radiating lines with a sweeping light | Rendered once, in the root layout |
| `VramGauge` | Top-bar memory meter, aqua → orange; `usedGb={null}` = not measured | `role="meter"` |
| `SonicControl` | Hold-to-talk control (pointer or Space/Enter); `available={false}` shows why in a tooltip | Client |
| `ThemeToggle` | Sun / moon icon key; icon and label follow `<html data-theme>` via CSS | Client; saves to `localStorage` |

## Shared — `src/components/`

| Component | What it is |
| --- | --- |
| `TopBar` | The app's navigation: wordmark home, VRAM gauge, sonic control, theme toggle |
| `ModuleView` | The full view a module tile opens into — `NotchedPanel` sharing the tile's view-transition name, content materialises | `title` + `back` for a screen inside the module ("Downloads · plan", back to the folder) |
| `BackToWorkbench` | Icon key back to the workbench; runs the reverse morph (`module-close`); Escape does the same |
| `LiveRefresh` | Refreshes the page every couple of seconds while a job runs — the store is the only channel to the worker. Used by the workbench and the Organiser |

## Features

| Component | Where | What it is |
| --- | --- | --- |
| `ModuleComb` | `src/features/workbench/` | The honeycomb of module tiles (diamond of four) — workbench navigation |
| `ModuleHex` | `src/features/workbench/` | One tile: link + view-transition when the module has a view, inert when planned |
| `JobPanel` | `src/features/workbench/` | Notched panel around the `Rotor`, showing the job running now (`getWorkbenchView`) or idle |
| `FolderRail` | `src/features/organiser/` | The allow-list as a rail of cut-corner rows, the selected one lit; `AddFolderForm` at its foot (locked layout A) |
| `AddFolderForm` | `src/features/organiser/` | Paste a path to add a folder; a refusal keeps the path and says why. `compact` for the rail |
| `FolderStage` | `src/features/organiser/` | The selected folder: name, `StepTrack`, `IndexFacts`, `JobProgress`, `FolderActions` |
| `StepTrack` | `src/features/organiser/` | Scanned → categories → plan → applied as hex nodes on a dashed line |
| `IndexFacts` | `src/features/organiser/` | Files, size, duplicates (and online-only / locked when present) in mono figures |
| `JobProgress` | `src/features/organiser/` | A job on the compact rotor with its line and Stop; stacks on a phone; says when the worker isn't running |
| `FolderActions` | `src/features/organiser/` | The stage's one primary action plus the secondary ones |
| `StatusWord` | `src/features/organiser/` | A folder's status as a `StatusLight` and word |
| `CategoryEditor` | `src/features/organiser/` | Category rows (locked C1): tick to keep, rename in place, add, approve |
| `BuildPlanPanel` | `src/features/organiser/` | "Sort N files into M folders", the Include subfolders tick box, Build plan |
| `DestinationBays` | `src/features/organiser/` | **Signature.** One notched bay per destination: include ticks, confidence, rename ticks (R1), Send to… in the review bay, sticky approve bar |
| `PlanHistory` | `src/features/organiser/` | Applied plans on the batch timeline with undo, failures and retry |
| `SubfolderToggle` | `src/features/organiser/` | The folder's "Include subfolders" tick — suggestions and plans follow it |
| `RemoveFolder` | `src/features/organiser/` | "Remove from list" with a confirming dialog; nothing on disk changes |
| `WorkerNotice` | `src/features/organiser/` | Says, once, when the worker isn't running and how to start it |
