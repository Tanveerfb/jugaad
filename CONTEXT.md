# Jugaad — Persistent Agent Context

Attach this file (`#file:CONTEXT.md`) at the start of every Copilot session alongside the current phase file.
Do not modify this file unless the stack or architecture changes.

---

## What This Project Is

Jugaad is a local-first AI scaffolding studio. Users describe a web app idea, refine it through a conversational planning agent, select a tech stack, and the app autonomously generates a working Next.js project file by file using a locally running LLM (Ollama or LM Studio). All generated files are written directly to the user's local filesystem via the File System Access API.

---

## App Config

All branding, metadata, and default settings are read from `app.config.ts` in the project root.
Never hardcode the app name, tagline, logo paths, or default LLM URLs anywhere in components or lib files.

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
      provider: "ollama" as "ollama" | "lmstudio",
      ollamaBaseUrl: "http://localhost:11434",
      lmstudioBaseUrl: "http://localhost:1234",
      model: "llama3",
      temperature: 0.3,
      maxTokens: 4096,
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

## Tech Stack

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

---

## File Structure

```
/
├── app.config.ts
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── studio/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── new/
│   │   │   └── page.tsx
│   │   └── [projectId]/
│   │       └── page.tsx
│   └── settings/
│       └── page.tsx
├── components/
│   ├── ui/
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   ├── CenterPanel.tsx
│   │   └── RightPanel.tsx
│   ├── agent/
│   │   ├── ChatInterface.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── OverlayQA.tsx
│   │   └── PlanSummary.tsx
│   ├── tasks/
│   │   ├── TaskBoard.tsx
│   │   ├── TaskItem.tsx
│   │   └── TaskLog.tsx
│   ├── editor/
│   │   └── CodePreview.tsx
│   ├── filesystem/
│   │   ├── FileTree.tsx
│   │   └── FolderPicker.tsx
│   ├── stack/
│   │   ├── StackSelector.tsx
│   │   └── stackRegistry.ts
│   └── shared/
│       ├── BrandLogo.tsx
│       ├── ProviderBadge.tsx
│       └── StatusBadge.tsx
├── lib/
│   ├── llm/
│   │   ├── client.ts
│   │   ├── prompts.ts
│   │   └── docFetcher.ts
│   ├── fs/
│   │   ├── handle.ts
│   │   ├── writer.ts
│   │   └── tree.ts
│   ├── planner/
│   │   ├── planAgent.ts
│   │   └── taskGenerator.ts
│   ├── executor/
│   │   ├── taskExecutor.ts
│   │   └── validator.ts
│   ├── export/
│   │   ├── zipExport.ts
│   │   └── githubExport.ts
│   └── firebase/
│       ├── config.ts
│       └── projects.ts
├── stores/
│   ├── llmConfigStore.ts
│   ├── projectPlanStore.ts
│   ├── taskStore.ts
│   └── fsStore.ts
├── types/
│   └── index.ts
├── hooks/
│   ├── useLLMStream.ts
│   ├── useFileSystem.ts
│   └── useOverlayQA.ts
└── public/
    ├── logo-icon.svg
    └── logo-full.svg
```

---

## TypeScript Types (`types/index.ts`)

These are the canonical types. Always import from here, never redefine locally.

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
  selected: string[];
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
  filePath: string;
  instruction: string;
  dependsOn: string[];
  docsContext: string;
  status: TaskStatus;
  output?: string;
  error?: string;
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
  taskStatus?: TaskStatus;
};
```

---

## Zustand Stores — Shape Reference

### `stores/llmConfigStore.ts`

- State: `LLMConfig`
- Persisted to `localStorage` via zustand `persist` middleware
- Actions: `setProvider`, `setBaseUrl`, `setModel`, `setTemperature`, `setMaxTokens`, `reset`
- `reset()` restores values from `appConfig.defaults.llm`

### `stores/projectPlanStore.ts`

- State: `plan: ProjectPlan | null`, `conversation: ConversationMessage[]`, `isPlanning: boolean`, `isPlanConfirmed: boolean`
- Actions: `setPlan`, `updatePlan`, `addMessage`, `confirmPlan`, `resetPlan`

### `stores/taskStore.ts`

- State: `tasks: Task[]`, `activeTaskId: string | null`, `isExecuting: boolean`, `streamBuffer: string`
- Actions: `setTasks`, `updateTaskStatus`, `setTaskOutput`, `setTaskError`, `setActiveTask`, `appendToStream`, `clearStream`, `resetTasks`

### `stores/fsStore.ts`

- State: `baseFolderHandle: FileSystemDirectoryHandle | null`, `projectHandle: FileSystemDirectoryHandle | null`, `fileTree: FileTreeNode[]`, `selectedFilePath: string | null`, `selectedFileContent: string | null`
- Actions: `setBaseFolderHandle`, `setProjectHandle`, `setFileTree`, `selectFile`, `clearSelection`, `reset`
- **Critical**: `FileSystemDirectoryHandle` is NOT serializable. Never pass it to `localStorage`. Store only the folder display name string for UI. The handle lives in Zustand in-memory only.

---

## Non-Negotiable Rules

These apply to every file in every phase. Never violate them.

1. All prompt strings are built in `lib/llm/prompts.ts`. Never inline prompt strings in components or stores.
2. The task executor system prompt must always include: "Respond with only the raw file content. No explanations, no markdown fences, no commentary."
3. Never call `writeFile` on unvalidated LLM output. Validate first, always.
4. If a task fails after 3 retries, the executor must stop. Do not silently skip and continue.
5. Doc chunks are injected per task, not globally. Keep task context lean.
6. All branding reads from `app.config.ts`. Zero hardcoded strings for name, logo, tagline, or links.
7. `FileSystemDirectoryHandle` is not serializable. Never JSON.stringify or localStorage.setItem a handle.
8. Stack selector enforces mutual exclusion: only one database ORM and one auth provider selected at a time.
9. Task order is a contract. No task may import from a file that hasn't been generated by a prior task.
10. Notifications use `sonner` only. Never use shadcn's built-in toast.
11. Monaco Editor is always dynamically imported with `ssr: false`.
12. `@octokit/rest` is always dynamically imported. Never in a static import at the top of a file.

---

## LLM Backend Note

Both Ollama (`http://localhost:11434`) and LM Studio (`http://localhost:1234`) expose an OpenAI-compatible `/v1/chat/completions` endpoint. One fetch wrapper in `lib/llm/client.ts` covers both. Only the base URL and model name differ. No SDK is needed.
