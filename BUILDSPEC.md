# AI Scaffolding Studio — Full Build Specification

> Drop this file into VS Code and work through it phase by phase.
> All placeholder names, colors, and copy come from `app.config.ts` — do not hardcode them anywhere.

---

## 1. Project Overview

A local-first AI scaffolding studio that takes a user's web app idea through a conversational planning flow, generates an ordered task list, then autonomously builds a working Next.js project file by file using a locally running LLM (Ollama or LM Studio). All generated files are written directly to the user's local filesystem via the File System Access API.

---

## 2. Tech Stack

| Category       | Package                                              |
| -------------- | ---------------------------------------------------- |
| Framework      | `next@latest` (App Router, TypeScript)               |
| Styling        | `tailwindcss@latest` (v4)                            |
| Components     | `shadcn/ui` + coss ui (copy-paste, built on Base UI) |
| Animation      | `framer-motion`                                      |
| State          | `zustand`                                            |
| Forms          | `react-hook-form` + `zod`                            |
| Code Editor    | `@monaco-editor/react`                               |
| Markdown       | `react-markdown` + `remark-gfm`                      |
| Notifications  | `sonner`                                             |
| Icons          | `lucide-react`                                       |
| Backend / Auth | `firebase` (Web SDK v10+)                            |
| LLM            | Native `fetch` — OpenAI-compatible API               |
| ZIP Export     | `jszip` + `file-saver`                               |
| GitHub Export  | `@octokit/rest` (dynamic import only)                |

**LLM note**: Ollama (`http://localhost:11434`) and LM Studio (`http://localhost:1234`) both expose an OpenAI-compatible `/v1/chat/completions` endpoint. One unified fetch wrapper covers both — only the base URL and model name differ.

---

## 3. App Config

Create `app.config.ts` in the project root. Every piece of branding, metadata, and default setting must be read from here. Nothing is hardcoded in components.

```ts
// app.config.ts
const appConfig = {
  name: "Jugaad",
  tagline: "Hack it together. Ship it fast.",
  description: "Local-first AI scaffolding studio for Next.js projects.",
  logo: {
    icon: "/logo-icon.svg", // placeholder asset
    full: "/logo-full.svg", // placeholder asset
    alt: "DevForge logo",
  },
  version: "0.1.0",
  defaults: {
    llm: {
      provider: "ollama" as "ollama" | "lmstudio",
      ollamaBaseUrl: "http://localhost:11434",
      lmstudioBaseUrl: "http://localhost:1234",
      model: "llama3",
      temperature: 0.3,
      maxTokens: 4096,
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

export default appConfig;
```

---

## 4. File Structure

```
/
├── app.config.ts
├── app/
│   ├── layout.tsx                  # Root layout, Sonner Toaster, providers
│   ├── page.tsx                    # Landing / onboarding entry
│   ├── studio/
│   │   ├── layout.tsx              # Three-panel workspace shell
│   │   ├── page.tsx                # Redirects to /studio/new
│   │   ├── new/
│   │   │   └── page.tsx            # New project flow (plan agent)
│   │   └── [projectId]/
│   │       └── page.tsx            # Active project workspace
│   └── settings/
│       └── page.tsx                # App settings (LLM config, base folder)
├── components/
│   ├── ui/                         # shadcn/ui + coss ui components live here
│   ├── layout/
│   │   ├── AppShell.tsx            # Three-panel layout wrapper
│   │   ├── Sidebar.tsx             # Left panel — file tree + project nav
│   │   ├── CenterPanel.tsx         # Chat + task log
│   │   └── RightPanel.tsx          # Monaco editor preview
│   ├── agent/
│   │   ├── ChatInterface.tsx       # Conversation UI for plan agent
│   │   ├── ChatMessage.tsx         # Single message bubble (markdown rendered)
│   │   ├── OverlayQA.tsx           # Claude-style overlay follow-up questions
│   │   └── PlanSummary.tsx         # Rendered project plan card
│   ├── tasks/
│   │   ├── TaskBoard.tsx           # Full task list with status badges
│   │   ├── TaskItem.tsx            # Single task row
│   │   └── TaskLog.tsx             # Streaming output log for running task
│   ├── editor/
│   │   └── CodePreview.tsx         # Monaco editor, dynamic import, read/edit mode
│   ├── filesystem/
│   │   ├── FileTree.tsx            # Renders virtual FS as a tree
│   │   └── FolderPicker.tsx        # Base folder selection UI
│   ├── stack/
│   │   ├── StackSelector.tsx       # Tech stack toggle grid
│   │   └── stackRegistry.ts        # All available stack options with doc URLs
│   └── shared/
│       ├── BrandLogo.tsx           # Reads from app.config.ts
│       ├── ProviderBadge.tsx       # Shows active LLM provider + model
│       └── StatusBadge.tsx         # pending | running | done | error
├── lib/
│   ├── llm/
│   │   ├── client.ts               # Core fetch wrapper, streaming handler
│   │   ├── prompts.ts              # All system + user prompt templates
│   │   └── docFetcher.ts           # Live doc fetching + chunking
│   ├── fs/
│   │   ├── handle.ts               # FileSystemDirectoryHandle persistence
│   │   ├── writer.ts               # Write / read / delete files via FSAPI
│   │   └── tree.ts                 # Build a tree structure from directory handle
│   ├── planner/
│   │   ├── planAgent.ts            # Orchestrates plan agent conversation turns
│   │   └── taskGenerator.ts        # ProjectPlan → ordered Task[]
│   ├── executor/
│   │   ├── taskExecutor.ts         # Runs tasks in order, handles retries
│   │   └── validator.ts            # Syntax + structure validation per file type
│   ├── export/
│   │   ├── zipExport.ts            # Reads FS handle → jszip → download
│   │   └── githubExport.ts         # Dynamic import @octokit/rest → push to repo
│   └── firebase/
│       ├── config.ts               # Firebase app init
│       └── projects.ts             # Firestore CRUD for saved project metadata
├── stores/
│   ├── llmConfigStore.ts           # Provider, base URL, model, temperature
│   ├── projectPlanStore.ts         # Active ProjectPlan, conversation history
│   ├── taskStore.ts                # Task[], current task index, status map
│   └── fsStore.ts                  # Base folder handle, active project handle
├── types/
│   └── index.ts                    # All shared TypeScript types
├── hooks/
│   ├── useLLMStream.ts             # Streaming fetch hook
│   ├── useFileSystem.ts            # FS handle operations
│   └── useOverlayQA.ts             # Overlay queue management
└── public/
    ├── logo-icon.svg               # Placeholder
    └── logo-full.svg               # Placeholder
```

---

## 5. TypeScript Types (`types/index.ts`)

```ts
export type LLMProvider = "ollama" | "lmstudio";

export type LLMConfig = {
  provider: LLMProvider;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
};

export type StackOption = {
  id: string;
  label: string;
  category: "language" | "styling" | "ui" | "database" | "auth" | "utilities";
  default: boolean;
  docUrl: string;
  packageName: string;
};

export type StackConfig = {
  selected: string[]; // StackOption ids
};

export type Feature = {
  id: string;
  title: string;
  description: string;
};

export type Page = {
  id: string;
  name: string;
  route: string;
  description: string;
};

export type DataModel = {
  id: string;
  name: string;
  fields: { name: string; type: string; required: boolean }[];
};

export type ProjectPlan = {
  id: string;
  name: string;
  description: string;
  stack: StackConfig;
  features: Feature[];
  pages: Page[];
  dataModels: DataModel[];
  authStrategy: "none" | "nextauth" | "clerk" | "firebase" | "custom";
  createdAt: number;
  updatedAt: number;
};

export type TaskStatus = "pending" | "running" | "done" | "error";

export type Task = {
  id: string;
  title: string;
  filePath: string; // e.g. "app/dashboard/page.tsx"
  instruction: string;
  dependsOn: string[]; // task IDs that must complete first
  docsContext: string; // relevant doc chunk injected at runtime
  status: TaskStatus;
  output?: string; // generated file content
  error?: string; // error message if status === "error"
  retryCount: number;
};

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
};

export type OverlayQuestion = {
  id: string;
  question: string;
  type: "single_select" | "multi_select" | "text";
  options?: string[];
  answer?: string | string[];
};

export type FileTreeNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
  taskStatus?: TaskStatus; // badge on file if it was generated by a task
};
```

---

## 6. Zustand Stores

### `stores/llmConfigStore.ts`

```ts
// State: LLMConfig (from types)
// Actions:
//   setProvider(provider: LLMProvider)
//   setBaseUrl(url: string)
//   setModel(model: string)
//   setTemperature(t: number)
//   setMaxTokens(n: number)
//   reset()                       // resets to appConfig.defaults.llm
// Persistence: persist to localStorage via zustand/middleware persist
```

### `stores/projectPlanStore.ts`

```ts
// State:
//   plan: ProjectPlan | null
//   conversation: ConversationMessage[]
//   isPlanning: boolean
//   isPlanConfirmed: boolean
// Actions:
//   setPlan(plan: ProjectPlan)
//   updatePlan(partial: Partial<ProjectPlan>)
//   addMessage(msg: ConversationMessage)
//   confirmPlan()
//   resetPlan()
```

### `stores/taskStore.ts`

```ts
// State:
//   tasks: Task[]
//   activeTaskId: string | null
//   isExecuting: boolean
//   streamBuffer: string           // live streamed output for active task
// Actions:
//   setTasks(tasks: Task[])
//   updateTaskStatus(id: string, status: TaskStatus)
//   setTaskOutput(id: string, output: string)
//   setTaskError(id: string, error: string)
//   setActiveTask(id: string | null)
//   appendToStream(chunk: string)
//   clearStream()
//   resetTasks()
```

### `stores/fsStore.ts`

```ts
// State:
//   baseFolderHandle: FileSystemDirectoryHandle | null
//   projectHandle: FileSystemDirectoryHandle | null
//   fileTree: FileTreeNode[]
//   selectedFilePath: string | null
//   selectedFileContent: string | null
// Actions:
//   setBaseFolderHandle(handle: FileSystemDirectoryHandle)
//   setProjectHandle(handle: FileSystemDirectoryHandle)
//   setFileTree(tree: FileTreeNode[])
//   selectFile(path: string, content: string)
//   clearSelection()
//   reset()
// Note: FileSystemDirectoryHandle cannot be serialized to localStorage.
//       Persist only the folder name as a display label. Re-request the
//       handle on each app load via a "Reconnect folder" prompt.
```

---

## 7. Core Library Modules

### `lib/llm/client.ts`

Single export: `streamChat(messages: ConversationMessage[], config: LLMConfig, onChunk: (chunk: string) => void): Promise<string>`

- POSTs to `${config.baseUrl}/v1/chat/completions` with `stream: true`
- Parses the SSE stream (`data: {...}` lines)
- Calls `onChunk` for each token delta
- Returns the full assembled response string when stream ends
- Throws a typed `LLMConnectionError` if the endpoint is unreachable (used to show a friendly "is your LLM running?" UI state)

### `lib/llm/prompts.ts`

Exports named prompt builder functions — never inline prompt strings in components or stores:

- `buildPlanAgentSystemPrompt(stack: StackConfig): string`
  - Instructs the LLM to act as a project planning assistant
  - Lists the selected stack items and their versions
  - Tells it to output structured `ProjectPlan` JSON when the user confirms
  - Format: `<plan>{ ...json }</plan>` so it can be parsed reliably

- `buildTaskGeneratorPrompt(plan: ProjectPlan, docsContext: string): string`
  - Instructs the LLM to decompose the plan into an ordered `Task[]`
  - Injects the fetched docs context
  - Strict output format: `<tasks>[...json array]</tasks>`
  - Rules it must follow: each task maps to exactly one file, tasks listed in dependency order (no task depends on a future task), file paths use the Next.js App Router convention

- `buildTaskExecutorPrompt(task: Task, dependencyFileContents: Record<string, string>): string`
  - System: "You are a file generator. Respond with only the raw file content. No explanations, no markdown fences, no commentary whatsoever."
  - Injects `task.docsContext` for relevant library APIs
  - Injects contents of any files listed in `task.dependsOn` so imports resolve correctly
  - Specifies the exact `task.filePath` being generated
  - Appends full instruction from `task.instruction`

- `buildRetryPrompt(previousOutput: string, validationError: string): string`
  - Used when validator rejects a task output
  - Shows the previous output and the specific error
  - Instructs: fix only the error, return the full corrected file

### `lib/llm/docFetcher.ts`

```ts
// fetchDocChunk(url: string, keyword?: string): Promise<string>
//
// 1. fetch(url) with a 10s timeout
// 2. Strip all HTML tags, scripts, styles, nav elements
// 3. Normalize whitespace
// 4. If keyword provided, extract the ±50 lines surrounding the keyword match
// 5. Hard truncate to 2000 tokens (approx 8000 chars) to protect context window
// 6. Cache result in a module-level Map<url, string> for the session
//    (do not persist to localStorage — docs should be re-fetched each session)
//
// Called by taskGenerator.ts once per selected stack item before task generation starts.
```

### `lib/fs/handle.ts`

```ts
// openBaseFolder(): Promise<FileSystemDirectoryHandle>
//   Calls window.showDirectoryPicker({ mode: "readwrite" })
//   Stores handle in fsStore
//   Saves folder name string to localStorage for display

// reconnectBaseFolder(): Promise<boolean>
//   Reads handle from fsStore (in-memory only — not persisted)
//   If null, returns false → UI shows reconnect prompt
//   If present, calls handle.requestPermission({ mode: "readwrite" })
//   Returns true if permission granted

// createProjectFolder(base: FileSystemDirectoryHandle, name: string):
//   Promise<FileSystemDirectoryHandle>
//   Calls base.getDirectoryHandle(name, { create: true })
```

### `lib/fs/writer.ts`

```ts
// writeFile(
//   root: FileSystemDirectoryHandle,
//   filePath: string,          // e.g. "app/dashboard/page.tsx"
//   content: string
// ): Promise<void>
//   Splits filePath by "/" and creates intermediate directories recursively
//   Gets or creates the final FileHandle
//   Creates a writable stream and writes content
//   Updates fsStore.fileTree after write

// readFile(root: FileSystemDirectoryHandle, filePath: string): Promise<string>
//   Traverses path, gets file handle, reads as text

// deleteFile(root: FileSystemDirectoryHandle, filePath: string): Promise<void>
```

### `lib/planner/planAgent.ts`

Manages one conversation turn with the plan agent LLM.

```ts
// sendMessage(
//   userMessage: string,
//   history: ConversationMessage[],
//   config: LLMConfig,
//   onChunk: (chunk: string) => void
// ): Promise<{ response: string; extractedPlan: ProjectPlan | null }>
//
// After each assistant response, attempt to parse <plan>...</plan> from the output.
// If found and valid JSON matching ProjectPlan schema (validate with Zod),
// return it as extractedPlan. Otherwise return null.
// The UI watches for a non-null extractedPlan to show the confirm button.
```

### `lib/planner/taskGenerator.ts`

```ts
// generateTasks(
//   plan: ProjectPlan,
//   config: LLMConfig,
//   onProgress: (status: string) => void
// ): Promise<Task[]>
//
// Steps:
// 1. For each selected stack item, call docFetcher.fetchDocChunk(stackOption.docUrl)
//    Show progress: "Fetching Next.js docs...", "Fetching Tailwind docs...", etc.
// 2. Concatenate all doc chunks into a single docsContext string
// 3. Build prompt via prompts.buildTaskGeneratorPrompt(plan, docsContext)
// 4. Call LLM (non-streaming is fine here — this is a one-shot generation)
// 5. Parse <tasks>...</tasks> from response
// 6. Validate each task against Task schema using Zod
// 7. Assign each task its relevant docsContext slice based on its filePath
//    (e.g. a task writing a Prisma schema gets the Prisma doc chunk)
// 8. Return validated Task[]
```

### `lib/executor/taskExecutor.ts`

```ts
// executeAll(
//   tasks: Task[],
//   projectHandle: FileSystemDirectoryHandle,
//   config: LLMConfig,
//   store: TaskStore            // zustand store actions passed in
// ): Promise<void>
//
// For each task in order:
// 1. Check dependsOn — all must have status "done" before proceeding
// 2. store.setActiveTask(task.id), store.updateTaskStatus(task.id, "running")
// 3. Read file contents for each task in task.dependsOn from FS
// 4. Build prompt via prompts.buildTaskExecutorPrompt(task, dependencyContents)
// 5. Stream response via llmClient.streamChat, piping chunks to store.appendToStream
// 6. Once complete, run validator.validateOutput(task.filePath, fullOutput)
// 7a. If valid: writeFile(projectHandle, task.filePath, fullOutput)
//              store.setTaskOutput, store.updateTaskStatus("done")
// 7b. If invalid and retryCount < 3:
//              increment task.retryCount
//              rebuild prompt with buildRetryPrompt(output, error)
//              go back to step 5
// 7c. If invalid after 3 retries:
//              store.setTaskError(task.id, error)
//              store.updateTaskStatus("error")
//              PAUSE execution — do not continue to next task
//              UI must show error state and offer manual fix or skip
// 8. store.clearStream(), store.setActiveTask(null)
```

### `lib/executor/validator.ts`

````ts
// validateOutput(filePath: string, content: string): { valid: boolean; error?: string }
//
// Validation rules by file type:
//
// .ts / .tsx files:
//   - Must not start with ``` (LLM leaked markdown fence)
//   - Must contain at least one export statement
//   - Basic brace balance check ({ count === } count)
//   - If filePath includes "page" or "layout": must have a default export
//   - If filePath includes "route": must export at least one of GET/POST/PUT/DELETE
//
// .json files:
//   - JSON.parse must not throw
//
// .css files:
//   - Basic brace balance check
//   - Must not be empty
//
// All files:
//   - Must not be empty string
//   - Must not contain the literal string "```" anywhere
````

### `lib/export/zipExport.ts`

```ts
// exportToZip(projectHandle: FileSystemDirectoryHandle, projectName: string): Promise<void>
//
// 1. Recursively read all files from projectHandle using a DFS traversal
// 2. Add each file to a JSZip instance preserving directory structure
// 3. Generate blob with compression DEFLATE
// 4. Trigger download via file-saver saveAs(blob, `${projectName}.zip`)
```

### `lib/export/githubExport.ts`

```ts
// exportToGitHub(params: {
//   projectHandle: FileSystemDirectoryHandle;
//   repoName: string;
//   token: string;
//   org?: string;
//   isPrivate: boolean;
// }): Promise<{ url: string }>
//
// Dynamically imported: const { Octokit } = await import("@octokit/rest")
// 1. Create repo via octokit.repos.createForAuthenticatedUser (or org)
// 2. Recursively read all files from projectHandle
// 3. Batch create blobs, build tree, create commit, update ref
// 4. Return the repo HTML URL for display in a success toast
```

---

## 8. Component Specs

### `components/agent/OverlayQA.tsx`

The most important UI component. Mimics the Claude follow-up question overlay.

**Behavior:**

- Triggered by the plan agent when it needs structured input
- Slides up from the bottom of the chat panel (Framer Motion `y` animation)
- Renders one question at a time OR a batch of questions depending on the `mode` prop
- For `single_select`: renders clickable option buttons, selection auto-advances
- For `multi_select`: renders checkboxes, requires a "Continue" button
- For `text`: renders a text input with a submit button
- Has a `skipAll` button that dismisses the overlay and lets the user type freely

**Props:**

```ts
type OverlayQAProps = {
  questions: OverlayQuestion[];
  onComplete: (answers: OverlayQuestion[]) => void;
  onDismiss: () => void;
  mode: "sequential" | "batch";
};
```

**Hook:** `hooks/useOverlayQA.ts` manages the queue externally. Components that need to trigger an overlay call `enqueueQuestions(questions, onComplete)`.

### `components/editor/CodePreview.tsx`

- Dynamic import: `const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false })`
- Default theme: `vs-dark`
- Language auto-detected from `fsStore.selectedFilePath` extension
- `readOnly` prop defaults to `false` — user can edit generated files
- On edit, calls `writer.writeFile` to persist changes back to disk immediately (debounced 500ms)
- Shows a "Saved" indicator after successful write

### `components/filesystem/FileTree.tsx`

- Reads `fsStore.fileTree`
- Renders a collapsible tree
- File nodes show a `StatusBadge` if they were generated by a task (reads from `taskStore`)
- Click on a file: reads its content via `readFile`, sets `fsStore.selectedFilePath` and `selectedFileContent`
- Right-click context menu: "Open in editor", "Copy path", "Delete file"

### `components/layout/AppShell.tsx`

Three-panel layout:

```
┌─────────────┬──────────────────────┬──────────────────┐
│  Sidebar    │   Center Panel       │  Right Panel     │
│  (240px)    │   (flex-1)           │  (420px)         │
│             │                      │                  │
│  File tree  │  Chat messages       │  Monaco editor   │
│  Project    │  Task log when       │  for selected    │
│  nav        │  executing           │  file            │
│             │                      │                  │
│  Bottom:    │  Bottom:             │  Top bar:        │
│  Settings   │  Input / controls    │  file path +     │
│  link       │                      │  save indicator  │
└─────────────┴──────────────────────┴──────────────────┘
```

Top bar spans full width: app logo (from `BrandLogo`), active project name, `ProviderBadge`, export buttons (ZIP, GitHub), Settings icon.

---

## 9. Stack Registry (`components/stack/stackRegistry.ts`)

Each entry includes the doc URL that `docFetcher` will hit at generation time:

```ts
export const stackOptions: StackOption[] = [
  // Always included (locked, not toggleable)
  {
    id: "nextjs",
    label: "Next.js",
    category: "language",
    default: true,
    docUrl: "https://nextjs.org/docs/app/api-reference/file-conventions",
    packageName: "next",
  },
  {
    id: "typescript",
    label: "TypeScript",
    category: "language",
    default: true,
    docUrl:
      "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html",
    packageName: "typescript",
  },
  {
    id: "tailwind",
    label: "Tailwind CSS v4",
    category: "styling",
    default: true,
    docUrl: "https://tailwindcss.com/docs/installation",
    packageName: "tailwindcss",
  },

  // Toggleable
  {
    id: "shadcn",
    label: "shadcn/ui",
    category: "ui",
    default: true,
    docUrl: "https://ui.shadcn.com/docs/components/button",
    packageName: "shadcn-ui",
  },
  {
    id: "cossui",
    label: "coss ui",
    category: "ui",
    default: false,
    docUrl: "https://coss.com/ui/docs/get-started.md",
    packageName: "coss-ui",
  },
  {
    id: "prisma",
    label: "Prisma ORM",
    category: "database",
    default: false,
    docUrl: "https://www.prisma.io/docs/orm/reference/prisma-schema-reference",
    packageName: "prisma",
  },
  {
    id: "drizzle",
    label: "Drizzle ORM",
    category: "database",
    default: false,
    docUrl: "https://orm.drizzle.team/docs/overview",
    packageName: "drizzle-orm",
  },
  {
    id: "nextauth",
    label: "NextAuth.js v5",
    category: "auth",
    default: false,
    docUrl: "https://authjs.dev/getting-started",
    packageName: "next-auth",
  },
  {
    id: "clerk",
    label: "Clerk",
    category: "auth",
    default: false,
    docUrl: "https://clerk.com/docs/quickstarts/nextjs",
    packageName: "@clerk/nextjs",
  },
  {
    id: "stripe",
    label: "Stripe",
    category: "utilities",
    default: false,
    docUrl: "https://docs.stripe.com/api",
    packageName: "stripe",
  },
  {
    id: "zod",
    label: "Zod",
    category: "utilities",
    default: true,
    docUrl: "https://zod.dev/?id=basic-usage",
    packageName: "zod",
  },
  {
    id: "rhf",
    label: "React Hook Form",
    category: "utilities",
    default: true,
    docUrl: "https://react-hook-form.com/docs/useform",
    packageName: "react-hook-form",
  },
  {
    id: "zustand",
    label: "Zustand",
    category: "utilities",
    default: false,
    docUrl: "https://docs.pmnd.rs/zustand/getting-started/introduction",
    packageName: "zustand",
  },
  {
    id: "framer",
    label: "Framer Motion",
    category: "utilities",
    default: false,
    docUrl: "https://motion.dev/docs/react-quick-start",
    packageName: "framer-motion",
  },
  {
    id: "uploadthing",
    label: "UploadThing",
    category: "utilities",
    default: false,
    docUrl: "https://docs.uploadthing.com/getting-started/appdir",
    packageName: "uploadthing",
  },
  {
    id: "resend",
    label: "Resend",
    category: "utilities",
    default: false,
    docUrl: "https://resend.com/docs/send-with-nextjs",
    packageName: "resend",
  },
];
```

Constraint: only one database option and one auth option can be selected at a time. `StackSelector.tsx` enforces this with mutual exclusion logic — selecting Prisma deselects Drizzle, selecting Clerk deselects NextAuth, etc.

---

## 10. Build Phases

Work through these in order. Do not start a phase until the previous one is fully working.

---

### Phase 1 — Foundation

**Goal**: A working app shell with LLM connection, chat UI, and overlay Q&A.

Tasks:

1. Init Next.js project with TypeScript and Tailwind v4
2. Install all dependencies listed in section 2
3. Initialize shadcn/ui (`npx shadcn@latest init`)
4. Create `app.config.ts` with placeholder values
5. Create all TypeScript types in `types/index.ts`
6. Create all four Zustand stores (sections 6)
7. Implement `lib/llm/client.ts` — streaming fetch wrapper
8. Implement `lib/llm/prompts.ts` — all prompt builder functions
9. Build `AppShell.tsx` — three-panel layout, top bar with `BrandLogo` and `ProviderBadge`
10. Build `ChatInterface.tsx` and `ChatMessage.tsx` with react-markdown rendering
11. Build `OverlayQA.tsx` and `useOverlayQA.ts` hook
12. Build Settings page — LLM provider toggle, base URL input, model name input, connection test button
13. Verify: open app, configure Ollama/LM Studio URL, send a message, receive a streamed response, overlay Q&A renders and resolves correctly

---

### Phase 2 — Stack Selector + Doc Fetcher

**Goal**: User can select their tech stack and the app fetches relevant docs.

Tasks:

1. Create `stackRegistry.ts` with all entries from section 9
2. Build `StackSelector.tsx` with category grouping and mutual exclusion logic
3. Implement `lib/llm/docFetcher.ts` — fetch, strip HTML, truncate, cache
4. Add a "Test doc fetch" dev utility (can be a hidden `/dev` route) that fetches and displays each doc URL so you can verify the output quality before wiring it to the generator
5. Integrate stack state into `projectPlanStore`
6. Verify: toggle stack options, check mutual exclusion works, manually trigger doc fetches and inspect output

---

### Phase 3 — Plan Agent

**Goal**: Full conversational planning flow that produces a confirmed `ProjectPlan`.

Tasks:

1. Implement `lib/planner/planAgent.ts`
2. Build `/studio/new/page.tsx` — entry point, shows stack selector first then opens chat
3. Wire `OverlayQA` into the plan agent: after the user describes their app, the agent triggers structured follow-up questions (auth strategy, number of pages, data models needed, etc.) via the overlay
4. After each LLM response, attempt `<plan>` tag extraction and Zod validation
5. When a valid plan is extracted, show `PlanSummary.tsx` — a card rendering the plan in readable form with an "Edit" and "Confirm & Generate Tasks" button
6. "Edit" reopens the chat for refinement
7. "Confirm" calls `taskGenerator.generateTasks()` and transitions to Phase 4 UI
8. Verify: full planning conversation, overlay questions fire, plan is extracted and displayed correctly

---

### Phase 4 — Task Generator + Executor

**Goal**: Confirmed plan becomes a working Next.js project on disk.

Tasks:

1. Implement `lib/planner/taskGenerator.ts`
2. Implement `lib/executor/validator.ts`
3. Implement `lib/executor/taskExecutor.ts`
4. Build `TaskBoard.tsx` and `TaskItem.tsx` — shows full task list with statuses
5. Build `TaskLog.tsx` — streams the live output of the currently executing task in the center panel (replace chat UI during execution)
6. Implement `lib/fs/handle.ts`, `lib/fs/writer.ts`, `lib/fs/tree.ts`
7. Build `FolderPicker.tsx` — shown on first launch (or if no base folder set) to select the output directory
8. Build `FileTree.tsx` — updates in real time as tasks write files
9. Build `CodePreview.tsx` with Monaco, auto language detection, edit + auto-save
10. Wire execution: Confirm Plan → generate tasks → show TaskBoard → user clicks "Start Building" → executor runs
11. Handle the error state: execution pauses on task error, user sees the error, gets "Retry", "Skip task", or "Fix manually" options
12. After all tasks done: show completion screen with project path, ZIP export button, GitHub export button
13. Verify: run a small test plan (e.g. "a simple Next.js landing page with Tailwind"), watch files appear on disk, open project in VS Code and verify it runs with `npm run dev`

---

### Phase 5 — Export + Firebase Persistence

**Goal**: ZIP and GitHub export work. Projects are saved to Firestore.

Tasks:

1. Implement `lib/export/zipExport.ts`
2. Implement `lib/export/githubExport.ts` (dynamic import)
3. Build GitHub export modal: asks for repo name, visibility (public/private), token input (with link to GitHub token docs)
4. Set up Firebase project, add `lib/firebase/config.ts` and `lib/firebase/projects.ts`
5. Save `ProjectPlan` metadata to Firestore when a project is created
6. Build project history in the sidebar: list past projects from Firestore, click to reopen
7. Verify: export ZIP downloads correctly, GitHub push creates repo with correct file structure, past projects load from Firestore

---

### Phase 6 — Polish + SaaS Prep (defer until core is solid)

Tasks (in order of priority):

1. Add Firebase Auth — anonymous + Google sign-in
2. Gate Firestore project saves behind auth
3. Landing page at `/` — describes the app, CTA to open studio
4. Settings page: profile section, sign out, danger zone (delete all projects)
5. Add a "Plan from existing project" flow: user picks an existing folder, app reads the file tree and generates a plan summary from it, then allows the user to continue or extend it
6. Add browser compatibility warning banner for Firefox users (File System Access API not supported)
7. Performance: lazy load Monaco, lazy load Octokit, add Suspense boundaries around heavy panels

---

## 11. Key Implementation Rules

These must be followed throughout — include them as a comment block at the top of `lib/executor/taskExecutor.ts` and `lib/llm/prompts.ts` as a reminder:

1. **Never inline prompt strings in components or stores.** All prompts are built in `lib/llm/prompts.ts`.
2. **The task executor system prompt must always say:** "Respond with only the raw file content. No explanations, no markdown fences, no commentary."
3. **Validate before writing.** Never call `writeFile` on unvalidated LLM output.
4. **Pause on error.** If a task fails after 3 retries, stop the executor. Do not silently skip and continue — a broken dependency will cascade.
5. **Doc chunks are injected per task, not globally.** A task writing a Prisma schema gets the Prisma chunk. A task writing a page component gets the Next.js App Router chunk. Keep context lean — local models have limited context windows.
6. **All branding reads from `app.config.ts`.** Zero hardcoded strings for name, logo, tagline, or links.
7. **FileSystemDirectoryHandle is not serializable.** Never attempt to JSON.stringify or localStorage.setItem a handle. Store only the display name string for UI. The handle lives in the Zustand store in memory only.
8. **Mutual exclusion in stack selector.** Only one database ORM and one auth provider can be selected at once. Enforce in UI and re-validate in `taskGenerator` before generation.
9. **Task order is a contract.** The task generator prompt must explicitly state: "Output tasks in the order they must be created. A task may only import from files created by earlier tasks in this list." Enforce in `validator.ts` by checking that imports in a generated file only reference files that exist in the FS at that point.

---

## 12. Environment Variables

```env
# .env.local

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Optional: default LLM settings can be overridden in app settings UI
# These are just fallback defaults if the user hasn't configured anything
NEXT_PUBLIC_DEFAULT_LLM_PROVIDER=ollama
NEXT_PUBLIC_DEFAULT_OLLAMA_URL=http://localhost:11434
NEXT_PUBLIC_DEFAULT_LMSTUDIO_URL=http://localhost:1234
```

---

## 13. Testing Checklist (before calling each phase "done")

**Phase 1**: Chat sends a message → LLM streams a response → overlay Q&A renders → answers are returned to the caller correctly.

**Phase 2**: Select "Prisma" → "Drizzle" gets deselected. Trigger doc fetch for Next.js → output is plain text, under 8000 chars, contains API reference content.

**Phase 3**: Describe "a task manager app" → agent asks structured follow-up questions via overlay → plan JSON is extracted and passes Zod validation → `PlanSummary` renders all fields.

**Phase 4**: Confirm a simple 3-page plan → task list generates with correct file paths and no circular dependencies → executor writes all files to disk → generated project runs with `npm install && npm run dev` without errors.

**Phase 5**: ZIP download contains correct directory structure. GitHub push creates a public repo with all files. Past projects load from Firestore on app restart.
