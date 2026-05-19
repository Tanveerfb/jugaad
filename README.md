# Jugaad

> **Hack it together. Ship it fast.**

Jugaad is a **local-first AI scaffolding studio** for Next.js projects. Describe your app idea in natural language, refine it through a conversational planning agent, pick your tech stack, and Jugaad autonomously generates a complete, working Next.js project — file by file — using a locally running LLM (Ollama or LM Studio). Every generated file is written directly to your machine via the File System Access API with no cloud dependency.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Getting Started](#getting-started)
3. [How It Works](#how-it-works)
4. [Configuration](#configuration)
5. [Settings](#settings)
6. [Tech Stack](#tech-stack)
7. [Project Structure](#project-structure)
8. [API Routes](#api-routes)
9. [State Management](#state-management)
10. [LLM Integration](#llm-integration)
11. [Code Generation Pipeline](#code-generation-pipeline)
12. [Export Options](#export-options)
13. [Project Management](#project-management)
14. [Stack Registry](#stack-registry)
15. [Security](#security)
16. [Development Conventions](#development-conventions)
17. [Scripts](#scripts)

---

## Prerequisites

| Requirement       | Details                                                                              |
| ----------------- | ------------------------------------------------------------------------------------ |
| Node.js           | ≥ 18                                                                                 |
| npm               | ≥ 9                                                                                  |
| LLM server        | [Ollama](https://ollama.com) **or** [LM Studio](https://lmstudio.ai) running locally |
| Recommended model | `qwen3.5:latest` (Ollama) or any OpenAI-compatible chat model                        |
| Browser           | Chromium-based (Chrome, Edge, Arc) — required for the File System Access API         |

> **Firefox / Safari** will display a browser-compatibility warning. The filesystem write features require the File System Access API, which is only supported in Chromium browsers.

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server (runs on port 9999)
npm run dev
```

Open [http://localhost:9999](http://localhost:9999) in a Chromium browser.

### First-time setup

1. Go to **Settings** (`/settings`).
2. Select your LLM **provider** (Ollama or LM Studio) and verify the **base URL**.
3. Pick the **model** you want to use.
4. Choose an **output folder** — this is where all generated projects will be saved.
5. Return to the studio and start building.

---

## How It Works

```
User describes app idea
        │
        ▼
 Planning Agent (Chat)
 ┌──────────────────────────────────────────┐
 │  Conversational back-and-forth with LLM  │
 │  Extracts a structured ProjectPlan JSON  │
 │  wrapped in <plan>...</plan> tags        │
 └──────────────────────────────────────────┘
        │
        ▼
  Stack Selector
  (choose DB, auth, UI libraries)
        │
        ▼
  Task Generator
  (LLM produces a dependency-ordered
   list of files to generate)
        │
        ▼
  Task Executor (file-by-file)
  ┌─────────────────────────────────────────────┐
  │  For each task:                              │
  │   1. Build prompt (system + docs + task)     │
  │   2. Stream LLM response                     │
  │   3. Validate output (no fences, no prose)   │
  │   4. Enforce pinned package versions         │
  │   5. Write file to local filesystem          │
  │   6. On error → retry up to 3×              │
  │   7. Auto-split oversized files              │
  └─────────────────────────────────────────────┘
        │
        ▼
  Post-build checks
  ┌──────────────────────────┐
  │  npm install             │
  │  tsc typecheck           │
  │  next build              │
  │  Auto-fix errors (LLM)   │
  └──────────────────────────┘
        │
        ▼
  Export: ZIP download or GitHub push
```

---

## Configuration

All branding, metadata, and defaults live in `app.config.ts` at the project root. **Never hardcode** the app name, tagline, logo paths, or LLM URLs anywhere else.

```ts
// app.config.ts
const appConfig = {
  name: "Jugaad",
  tagline: "Hack it together. Ship it fast.",
  description: "Local-first AI scaffolding studio for Next.js projects.",
  logo: {
    icon: "/logo-icon.svg",
    full: "/logo-full.svg",
    alt: "Jugaad logo",
  },
  version: "0.1.0",
  defaults: {
    llm: {
      provider: "ollama", // "ollama" | "lmstudio"
      ollamaBaseUrl: "http://localhost:11434",
      lmstudioBaseUrl: "http://localhost:1234",
      model: "qwen3.5:latest",
      temperature: 0.3,
      maxTokens: -1, // -1 = unlimited
    },
    output: {
      framework: "nextjs",
    },
  },
  links: {
    docs: "#",
    github: "#",
    feedback: "#",
  },
};
```

---

## Settings

The Settings page (`/settings`) exposes:

| Setting              | Description                                                            |
| -------------------- | ---------------------------------------------------------------------- |
| **LLM Provider**     | Toggle between Ollama and LM Studio                                    |
| **Base URL**         | Auto-populated per provider; editable for custom setups                |
| **Model**            | Dropdown populated by a live `/v1/models` query to the LLM server      |
| **Temperature**      | Sampling temperature (default `0.3`)                                   |
| **Connection check** | Live status indicator — tests the LLM server on load and on URL change |
| **Output folder**    | Root folder where all generated projects are saved                     |
| **Firebase account** | Sign in / sign out; required to save projects to Firestore             |
| **Clear local data** | Wipes all persisted Zustand store data from `localStorage`             |

---

## Tech Stack

### Jugaad itself (the studio)

| Category      | Package                                |
| ------------- | -------------------------------------- |
| Framework     | Next.js 16 (App Router, TypeScript)    |
| Styling       | Tailwind CSS v4                        |
| Components    | shadcn/ui + Base UI                    |
| Animation     | Framer Motion                          |
| State         | Zustand v5                             |
| Forms         | react-hook-form + Zod v4               |
| Code editor   | @monaco-editor/react                   |
| Markdown      | react-markdown + remark-gfm            |
| Notifications | Sonner                                 |
| Icons         | lucide-react                           |
| Auth / DB     | Firebase Web SDK v10                   |
| LLM transport | Native `fetch` (OpenAI-compatible API) |
| ZIP export    | jszip + file-saver                     |
| GitHub export | @octokit/rest (dynamic import)         |

### Generated projects (default stack)

| Category      | Default                                                    |
| ------------- | ---------------------------------------------------------- |
| Framework     | Next.js (latest)                                           |
| Language      | TypeScript                                                 |
| Styling       | Tailwind CSS v4                                            |
| UI components | shadcn/ui                                                  |
| Database      | _(none by default — choose Prisma, Drizzle, or Firestore)_ |
| Auth          | _(none by default — choose NextAuth, Clerk, or Firebase)_  |

---

## Project Structure

```
jugaad/
├── app.config.ts              # Branding, defaults, links
├── app/
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Landing page
│   ├── settings/
│   │   └── page.tsx           # LLM + folder + auth settings
│   └── studio/
│       ├── layout.tsx         # Studio shell layout
│       ├── page.tsx           # Studio index (redirects to new)
│       ├── StudioLayoutClient.tsx
│       ├── new/               # New project wizard
│       └── [projectId]/       # Existing project view
│
├── app/api/
│   ├── lm-proxy/route.ts      # CORS proxy for local LLM servers
│   ├── build/route.ts         # Run `next build` in generated project
│   ├── typecheck/route.ts     # Run `tsc` in generated project
│   ├── scaffold/route.ts      # Run `create-next-app` for new project
│   ├── install/route.ts       # Run `npm install` in generated project
│   ├── fs/
│   │   ├── browse/            # List directory contents
│   │   ├── export/            # Read all files for ZIP/GitHub export
│   │   ├── read-file/         # Read single file
│   │   ├── tree/              # Recursive file tree
│   │   └── write/             # Write file to disk
│   ├── run/
│   │   ├── start/             # Start dev server for generated project
│   │   ├── stop/              # Stop dev server
│   │   ├── status/            # Poll dev server status
│   │   └── capture/           # Capture dev server stdout/stderr
│   ├── env/
│   │   ├── detect/            # Scan project for required env vars
│   │   └── write/             # Write .env.local file
│   └── projects/
│       ├── list/              # List all jugaad.json manifests
│       ├── delete/            # Delete project folder
│       └── rename/            # Rename project folder
│
├── components/
│   ├── agent/
│   │   ├── ChatInterface.tsx   # Planning conversation UI
│   │   ├── ChatMessage.tsx     # Single message bubble
│   │   ├── IterateInterface.tsx# Post-build iterate panel
│   │   ├── OverlayQA.tsx       # Clarifying questions overlay
│   │   ├── PlanEditor.tsx      # Editable plan view
│   │   └── PlanSummary.tsx     # Compact plan display
│   ├── auth/
│   │   └── AuthModal.tsx       # Firebase sign-in modal
│   ├── editor/
│   │   └── CodePreview.tsx     # Monaco editor for generated files
│   ├── export/
│   │   └── GitHubExportModal.tsx
│   ├── filesystem/
│   │   ├── FileTree.tsx        # Generated project file tree
│   │   ├── FolderBrowser.tsx   # OS folder picker dialog
│   │   └── FolderPicker.tsx    # Output folder selection widget
│   ├── layout/
│   │   ├── AppShell.tsx        # Top bar + sidebar wrapper
│   │   ├── CenterPanel.tsx     # Main content area
│   │   ├── RightPanel.tsx      # Code preview / task log panel
│   │   └── Sidebar.tsx         # Nav + project tabs
│   ├── preview/
│   │   ├── EnvVarForm.tsx      # .env.local editor form
│   │   └── PreviewPanel.tsx    # Embedded dev server iframe
│   ├── projects/
│   │   ├── DeleteProjectDialog.tsx
│   │   ├── ProjectBrowser.tsx  # Sidebar "Projects" tab
│   │   └── RenameProjectDialog.tsx
│   ├── shared/
│   │   ├── BrandLogo.tsx       # Logo from app.config.ts
│   │   ├── BrowserWarning.tsx  # Non-Chromium warning banner
│   │   ├── LoadingSkeleton.tsx
│   │   ├── ModelSwitcher.tsx   # Inline model picker
│   │   ├── ProviderBadge.tsx   # Ollama/LM Studio indicator
│   │   └── StatusBadge.tsx     # Task status pill
│   ├── stack/
│   │   ├── stackRegistry.ts    # All supported stack options
│   │   └── StackSelector.tsx   # Stack picker UI
│   ├── tasks/
│   │   ├── StreamPanel.tsx     # Live LLM stream output
│   │   ├── TaskBoard.tsx       # Task list with status + elapsed time
│   │   ├── TaskGroup.tsx       # Grouped task rows
│   │   ├── TaskItem.tsx        # Single task row
│   │   ├── TaskLog.tsx         # Per-task error/output viewer
│   │   └── ThinkingPanel.tsx   # Thinking-token display (Qwen3)
│   └── ui/
│       └── button.tsx          # shadcn/ui Button
│
├── hooks/
│   ├── useFileSystem.ts        # File System Access API wrapper
│   ├── useLLMStream.ts         # Streaming LLM response hook
│   └── useOverlayQA.ts         # Overlay question state
│
├── lib/
│   ├── envScanner.ts           # Scan source files for process.env references
│   ├── utils.ts                # cn() and general utilities
│   ├── versioning.ts           # Pinned package versions + enforceLatestVersions
│   ├── devServer/
│   │   └── manager.ts          # Dev server process manager (start/stop/status)
│   ├── executor/
│   │   ├── errorFixer.ts       # LLM-based build/typecheck error fixer
│   │   ├── taskExecutor.ts     # Core file generation loop
│   │   └── validator.ts        # Validate raw LLM output before writing
│   ├── export/
│   │   ├── githubExport.ts     # Push project to GitHub via Octokit
│   │   └── zipExport.ts        # Bundle project as downloadable ZIP
│   ├── firebase/
│   │   ├── authHelpers.ts      # signIn / signOut / onAuthChange
│   │   ├── config.ts           # Firebase app initialization
│   │   └── projects.ts         # Firestore CRUD for saved projects
│   ├── fs/
│   │   ├── handle.ts           # FileSystemDirectoryHandle persistence helpers
│   │   ├── tree.ts             # Recursive directory tree builder
│   │   └── writer.ts           # writeFile with directory creation
│   ├── llm/
│   │   ├── client.ts           # streamChat, fetchModels, LLMConnectionError
│   │   ├── docFetcher.ts       # Fetch library docs for task context
│   │   └── prompts.ts          # All system + user prompt builders
│   └── planner/
│       ├── planAgent.ts        # sendMessage — planning conversation + plan extraction
│       └── taskGenerator.ts    # generateTasks — produces Task[] from ProjectPlan
│
├── stores/
│   ├── authStore.ts            # Firebase user state
│   ├── devServerStore.ts       # Dev server process state
│   ├── fsStore.ts              # Output folder path + active project path
│   ├── llmConfigStore.ts       # LLM provider, model, temperature, etc.
│   ├── projectPlanStore.ts     # Current ProjectPlan + conversation history
│   └── taskStore.ts            # Task list, statuses, stream buffers, timers
│
├── types/
│   └── index.ts                # Canonical TypeScript types (import only from here)
│
└── public/
    ├── logo-icon.svg
    └── logo-full.svg
```

---

## API Routes

All routes are under `app/api/`. They run server-side and handle filesystem, process, and LLM proxy operations that cannot run in the browser.

### LLM Proxy

| Route           | Method    | Description                                                                                                                                                                                       |
| --------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/lm-proxy` | GET, POST | Forwards requests to local LLM servers (Ollama/LM Studio). Accepts a `x-proxy-target` header. **Allowlist-restricted to localhost and private IP ranges only** (SSRF guard). Max duration: 5 min. |

### Filesystem

| Route               | Method | Body / Query                         | Description                                                                       |
| ------------------- | ------ | ------------------------------------ | --------------------------------------------------------------------------------- |
| `/api/fs/write`     | POST   | `{ projectPath, filePath, content }` | Write a single file to disk, creating directories as needed.                      |
| `/api/fs/read-file` | GET    | `?projectPath=&filePath=`            | Read a single file's contents.                                                    |
| `/api/fs/tree`      | GET    | `?projectPath=`                      | Return recursive file tree as JSON.                                               |
| `/api/fs/browse`    | GET    | `?path=`                             | List directory contents (one level).                                              |
| `/api/fs/export`    | GET    | `?projectPath=`                      | Return all project files as `{ files: [{path, content}] }` for ZIP/GitHub export. |

### Project Lifecycle

| Route            | Method | Body              | Description                                                                                                   |
| ---------------- | ------ | ----------------- | ------------------------------------------------------------------------------------------------------------- |
| `/api/scaffold`  | POST   | `{ projectPath }` | Run `create-next-app` to bootstrap an empty Next.js project. Skips silently if `package.json` already exists. |
| `/api/install`   | POST   | `{ projectPath }` | Run `npm install` in the project directory.                                                                   |
| `/api/typecheck` | POST   | `{ projectPath }` | Run `tsc --noEmit` and return structured errors.                                                              |
| `/api/build`     | POST   | `{ projectPath }` | Run `next build --no-lint` and return structured per-file build errors.                                       |

### Dev Server

| Route              | Method | Description                                   |
| ------------------ | ------ | --------------------------------------------- |
| `/api/run/start`   | POST   | Start the dev server for a generated project. |
| `/api/run/stop`    | POST   | Stop the dev server.                          |
| `/api/run/status`  | GET    | Poll readiness (port open check).             |
| `/api/run/capture` | GET    | Stream or return captured stdout/stderr.      |

### Environment Variables

| Route             | Method | Description                                             |
| ----------------- | ------ | ------------------------------------------------------- |
| `/api/env/detect` | POST   | Scan project source for all `process.env.*` references. |
| `/api/env/write`  | POST   | Write key-value pairs to `.env.local`.                  |

### Projects

| Route                  | Method | Body                       | Description                                                             |
| ---------------------- | ------ | -------------------------- | ----------------------------------------------------------------------- |
| `/api/projects/list`   | GET    | —                          | Scan the output folder for all `jugaad.json` manifests and return them. |
| `/api/projects/rename` | POST   | `{ projectPath, newName }` | Rename a project folder on disk and update `jugaad.json`.               |
| `/api/projects/delete` | POST   | `{ projectPath }`          | Delete a project folder and all its contents.                           |

---

## State Management

Jugaad uses **Zustand v5** with `persist` middleware (localStorage) for all global state.

| Store                 | File                         | Contents                                                     |
| --------------------- | ---------------------------- | ------------------------------------------------------------ |
| `useLLMConfigStore`   | `stores/llmConfigStore.ts`   | Provider, baseUrl, model, temperature, maxTokens             |
| `useProjectPlanStore` | `stores/projectPlanStore.ts` | Active `ProjectPlan`, conversation history                   |
| `useTaskStore`        | `stores/taskStore.ts`        | Task list, statuses, stream/thinking buffers, build timers   |
| `useFsStore`          | `stores/fsStore.ts`          | Output folder path, active project path, folder display name |
| `useAuthStore`        | `stores/authStore.ts`        | Firebase `User` object, loading state                        |
| `useDevServerStore`   | `stores/devServerStore.ts`   | Dev server port, PID, status                                 |

> **Note**: `FileSystemDirectoryHandle` is not serializable. Only the display name is persisted in localStorage; the actual handle must be re-acquired on page reload.

---

## LLM Integration

### Providers

Jugaad supports any **OpenAI-compatible** chat completions API:

- **Ollama** (default) — `http://localhost:11434`
- **LM Studio** — `http://localhost:1234`

Both use the same `/v1/chat/completions` endpoint with streaming enabled.

### CORS Proxy

Browser-to-LLM requests to a different origin (e.g., port 1234 from port 9999) are blocked by CORS. Jugaad automatically routes these through `/api/lm-proxy`, which makes the request server-to-server.

### `streamChat` (`lib/llm/client.ts`)

The core streaming function. Key parameters:

| Parameter         | Default     | Description                                         |
| ----------------- | ----------- | --------------------------------------------------- |
| `messages`        | —           | Full conversation history                           |
| `config`          | —           | LLMConfig (provider, model, temp, etc.)             |
| `onChunk`         | —           | Called on each output token                         |
| `onThinkingChunk` | —           | Called on `reasoning_content` tokens (Qwen3)        |
| `thinkingBudget`  | `undefined` | `0` = disable thinking; positive = cap tokens       |
| `stallTimeoutMs`  | `600_000`   | Abort if no output token arrives within this window |

### Thinking model support (Qwen3)

Qwen3-style models produce a `<think>...</think>` reasoning block before the actual response. Jugaad:

- Captures thinking tokens separately in `thinkingBuffer` (`taskStore`)
- Displays them in `ThinkingPanel.tsx`
- Sets `thinkingBudget = 0` during code generation (prepends `/no_think\n`) to skip reasoning for faster file generation
- Allows thinking during the planning phase where reasoning improves plan quality

### Plan extraction

The planning agent embeds the structured plan in `<plan>{ ... }</plan>` XML tags. `planAgent.ts` extracts and validates the JSON against a Zod schema before accepting it, and overwrites `createdAt`/`updatedAt` with real timestamps (the LLM has no clock).

---

## Code Generation Pipeline

### 1. Planning (`lib/planner/planAgent.ts`)

`sendMessage()` maintains a multi-turn conversation with the LLM. On each turn it looks for a `<plan>` block and validates the JSON against `ProjectPlanSchema` (Zod). The resulting `ProjectPlan` contains:

- `name`, `description`
- `stack` — selected stack IDs
- `features` — list of features with title + description
- `pages` — list of pages with route + description
- `dataModels` — named entities with typed fields
- `authStrategy` — `"none" | "nextauth" | "clerk" | "firebase" | "custom"`

### 2. Task generation (`lib/planner/taskGenerator.ts`)

`generateTasks()` sends the finalized `ProjectPlan` to the LLM and asks it to produce a dependency-ordered list of `Task` objects — one per file to create. Each task includes:

- `filePath` — the relative path to write
- `instruction` — what the file should do
- `dependsOn` — IDs of tasks that must finish first
- `docsContext` — relevant library docs injected at generation time

### 3. Task execution (`lib/executor/taskExecutor.ts`)

`executeAll()` iterates over tasks in order:

1. **Dependency check** — all `dependsOn` tasks must be `done` before proceeding.
2. **Prompt building** — system prompt + optional docs + file instruction (from `lib/llm/prompts.ts`).
3. **LLM stream** — calls `streamChat()` with a per-file token budget of `65,536` tokens.
4. **Validation** — `validateOutput()` rejects responses containing markdown fences, HTML, or prose preambles.
5. **Version enforcement** — `enforceLatestVersions()` patches `package.json` to use pinned versions from `lib/versioning.ts`.
6. **Write to disk** — `writeFile()` via `/api/fs/write`.
7. **Retry** — on validation or write failure, the task retries up to 3× with a rephrased prompt.
8. **Auto-split** — if a file is too large, the executor splits it into sub-tasks and inserts them into the queue.
9. **npm install** — triggered automatically after `package.json` is written.

### 4. Post-build repair

After all tasks complete:

1. **Typecheck** — `/api/typecheck` runs `tsc --noEmit` and returns structured errors.
2. **Build** — `/api/build` runs `next build` and parses per-file errors.
3. **Auto-fix** — `lib/executor/errorFixer.ts` sends failing files back to the LLM with their error messages for targeted regeneration.

---

## Export Options

### ZIP Download

`lib/export/zipExport.ts` fetches all project files from `/api/fs/export`, bundles them with JSZip (DEFLATE level 6), and triggers a browser download via `file-saver`.

### GitHub Push

`lib/export/githubExport.ts` uses `@octokit/rest` (dynamically imported) to:

1. Create a new repository under the authenticated user's account.
2. Create Git blobs for each file (base64-encoded).
3. Create a tree and an initial commit.
4. Point the default branch at that commit.

The GitHub personal access token is provided by the user at export time and is **never stored** on the server or in any store.

---

## Project Management

Each generated project is stored in its own subfolder under the configured output directory:

```
[outputFolder]/
└── [project-slug]/
    ├── jugaad.json               # Project manifest (ProjectPlan)
    ├── jugaad-conversation.json  # Planning conversation history
    ├── package.json
    ├── app/
    └── ...
```

`jugaad.json` is written as the very first step of the build (before any LLM calls) so the project appears in the ProjectBrowser immediately.

### ProjectBrowser

The Sidebar "Projects" tab lists all projects in the output folder by scanning for `jugaad.json` files. From here you can:

- **Open** — load the project's plan and file tree
- **Rename** — rename the folder and update `jugaad.json`
- **Delete** — permanently remove the folder and all its contents

### Opening existing folders

`FolderBrowser` lets you open any arbitrary local folder. If a `jugaad.json` is present, it loads the plan. If not, a stub plan is created so the folder can be used as an output target.

---

## Stack Registry

`components/stack/stackRegistry.ts` defines all supported packages. Each entry:

```ts
type StackOption = {
  id: string;
  label: string;
  category: "language" | "styling" | "ui" | "database" | "auth" | "utilities";
  default: boolean;
  docUrl: string; // Fetched by docFetcher.ts at task-generation time
  packageName: string;
};
```

**Available options:**

| ID            | Label           | Category  | Default    |
| ------------- | --------------- | --------- | ---------- |
| `nextjs`      | Next.js         | language  | ✓ (locked) |
| `typescript`  | TypeScript      | language  | ✓ (locked) |
| `tailwind`    | Tailwind CSS v4 | styling   | ✓ (locked) |
| `shadcn`      | shadcn/ui       | ui        | ✓          |
| `cossui`      | coss ui         | ui        | —          |
| `prisma`      | Prisma ORM      | database  | —          |
| `drizzle`     | Drizzle ORM     | database  | —          |
| `firestore`   | Cloud Firestore | database  | —          |
| `nextauth`    | NextAuth.js v5  | auth      | —          |
| `clerk`       | Clerk           | auth      | —          |
| `stripe`      | Stripe          | utilities | —          |
| `uploadthing` | UploadThing     | utilities | —          |
| `resend`      | Resend          | utilities | —          |

**Mutual exclusion rules** (enforced in `StackSelector`):

- Only one **database** at a time: Prisma, Drizzle, or Firestore.
- Only one **auth** at a time: NextAuth, Clerk, or Firebase Auth.

**Version pinning** (`lib/versioning.ts`): All generated `package.json` files have their version specifiers overridden with the values in `LATEST_VERSIONS`. This prevents the LLM from guessing outdated or incompatible versions.

---

## Security

| Concern               | Mitigation                                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| SSRF via LM proxy     | `isLocalUrl()` allowlists only `localhost`, `127.*`, `::1`, `10.*`, `172.16–31.*`, `192.168.*` — all other targets return HTTP 400 |
| LLM output injection  | `validateOutput()` rejects any response containing markdown fences, HTML tags, or conversational preamble before writing to disk   |
| GitHub token exposure | Token accepted client-side at export time only; never stored in any store, cookie, or sent to any server other than GitHub's API   |
| XSS in code preview   | Monaco editor renders code as text, not HTML                                                                                       |
| Arbitrary path writes | Write API routes validate that paths resolve within the configured project directory                                               |

---

## Development Conventions

- **Branding**: Always read from `app.config.ts`. Never hardcode names, taglines, or logo paths in components or lib files.
- **Prompts**: All LLM prompts are built in `lib/llm/prompts.ts`. Never inline prompt strings in components or the executor.
- **Types**: Import all types from `types/index.ts`. Never redefine types locally.
- **Validation**: Always call `validateOutput()` before writing any LLM-generated content to disk.
- **FileSystemDirectoryHandle**: Not serializable — store only the display name in localStorage; re-acquire the handle on page reload.
- **Stack exclusivity**: Enforce DB and auth mutual exclusion in `StackSelector`, not in the executor.
- **Version pinning**: All package versions in generated projects are controlled exclusively by `LATEST_VERSIONS` in `lib/versioning.ts`. Update that map when the ecosystem advances.

---

## Scripts

```bash
npm run dev      # Start dev server on http://localhost:9999
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint check
```
