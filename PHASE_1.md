# Phase 1 — Foundation

Attach alongside `#file:CONTEXT.md` for this session.
Complete every task in order. Do not skip ahead. Do not create files outside this phase.

---

## Goal

A working app shell with a configured LLM connection, streaming chat UI, and a functioning overlay Q&A component. By the end of this phase the app must render, connect to Ollama or LM Studio, stream a response, and show the overlay Q&A correctly.

---

## Tasks

### 1. Project Init

- Init a new Next.js project: `npx create-next-app@latest jugaad --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"`
- Install all dependencies:
  ```
  npm install framer-motion zustand react-hook-form zod @monaco-editor/react react-markdown remark-gfm sonner lucide-react firebase jszip file-saver @types/file-saver
  ```
- Initialize shadcn/ui: `npx shadcn@latest init` — use default style, slate base color, CSS variables enabled
- Install shadcn components needed for this phase:
  ```
  npx shadcn@latest add button input label textarea dialog sheet separator scroll-area badge
  ```

---

### 2. `app.config.ts`

Create at project root. Exact content is in `CONTEXT.md` section "App Config".

---

### 3. `types/index.ts`

Create with all types from `CONTEXT.md` section "TypeScript Types". No additions, no omissions.

---

### 4. Zustand Stores

Create all four stores. Use the shapes from `CONTEXT.md` section "Zustand Stores — Shape Reference".

**`stores/llmConfigStore.ts`**

- Use `zustand/middleware` `persist` to save to `localStorage` under key `"jugaad-llm-config"`
- `reset()` must import `appConfig` and restore from `appConfig.defaults.llm`

**`stores/projectPlanStore.ts`**

- No persistence — in-memory only

**`stores/taskStore.ts`**

- No persistence — in-memory only

**`stores/fsStore.ts`**

- No persistence — in-memory only
- Add a separate non-store helper: `getStoredFolderName(): string | null` and `setStoredFolderName(name: string): void` that read/write only the folder display name string to localStorage under key `"jugaad-base-folder-name"`. This is the only localStorage interaction for the FS.

---

### 5. `lib/llm/client.ts`

```ts
// Exports one function:
// streamChat(
//   messages: ConversationMessage[],
//   config: LLMConfig,
//   onChunk: (chunk: string) => void
// ): Promise<string>
//
// Implementation:
// - POST to `${config.baseUrl}/v1/chat/completions`
// - Body: { model, messages, stream: true, temperature, max_tokens }
// - Map ConversationMessage[] to { role, content }[] (strip id and timestamp)
// - Parse the SSE stream line by line
//   Each line starting with "data: " contains JSON
//   Extract delta.content from choices[0].delta.content
//   Call onChunk(delta) for each non-empty delta
//   Stop on "data: [DONE]"
// - Return the full assembled string when stream ends
// - On fetch error or non-200 response, throw:
//   class LLMConnectionError extends Error { constructor(public baseUrl: string) { super(`Cannot connect to LLM at ${baseUrl}`) } }
// Export LLMConnectionError as a named export alongside streamChat
```

---

### 6. `lib/llm/prompts.ts`

Create with these four exported functions. Full implementations below.

```ts
import type { ProjectPlan, StackConfig, Task } from "@/types";

export function buildPlanAgentSystemPrompt(stack: StackConfig): string {
  return `You are a project planning assistant for Jugaad, an AI scaffolding studio.
Your job is to help the user design a Next.js web application.
Selected stack: ${stack.selected.join(", ")}.
Ask clarifying questions one at a time. Keep responses concise.
When the user is satisfied with the plan, output a JSON object wrapped in <plan></plan> tags.
The JSON must match this exact shape:
{
  "id": "<uuid>",
  "name": "<project name>",
  "description": "<one sentence>",
  "stack": { "selected": [<array of stack option ids>] },
  "features": [{ "id": "<uuid>", "title": "", "description": "" }],
  "pages": [{ "id": "<uuid>", "name": "", "route": "", "description": "" }],
  "dataModels": [{ "id": "<uuid>", "name": "", "fields": [{ "name": "", "type": "", "required": true }] }],
  "authStrategy": "none" | "nextauth" | "clerk" | "firebase" | "custom",
  "createdAt": <unix ms>,
  "updatedAt": <unix ms>
}
Output the <plan> block only when the user explicitly confirms they are ready.`;
}

export function buildTaskGeneratorPrompt(
  plan: ProjectPlan,
  docsContext: string,
): string {
  return `You are a task generator for a Next.js project scaffolding tool.
Given the project plan below, output an ordered array of file generation tasks.
Each task maps to exactly one file. Tasks must be in dependency order — no task may import from a file that appears later in the list.
Use Next.js App Router file conventions (app/ directory, page.tsx, layout.tsx, route.ts).

PROJECT PLAN:
${JSON.stringify(plan, null, 2)}

RELEVANT DOCUMENTATION:
${docsContext}

Output only a JSON array wrapped in <tasks></tasks> tags. Each task must match this shape exactly:
{
  "id": "<uuid>",
  "title": "<short description>",
  "filePath": "<relative path from project root, e.g. app/dashboard/page.tsx>",
  "instruction": "<detailed instruction for what this file should contain>",
  "dependsOn": ["<task id>"],
  "docsContext": "",
  "status": "pending",
  "retryCount": 0
}
The docsContext field must be left as an empty string — it will be filled in by the caller.
Do not output anything outside the <tasks></tasks> block.`;
}

export function buildTaskExecutorPrompt(
  task: Task,
  dependencyFileContents: Record<string, string>,
): string {
  const depSection = Object.entries(dependencyFileContents)
    .map(([path, content]) => `// FILE: ${path}\n${content}`)
    .join("\n\n---\n\n");

  return `You are a file generator.
Respond with only the raw file content for the file described below.
Do not include any explanation, commentary, or markdown fences.
Do not wrap the output in backticks. Output only the file content itself.

TARGET FILE: ${task.filePath}

TASK: ${task.instruction}

RELEVANT DOCS:
${task.docsContext}

${depSection ? `DEPENDENCY FILE CONTENTS (for reference — these files already exist):\n${depSection}` : ""}`;
}

export function buildRetryPrompt(
  previousOutput: string,
  validationError: string,
): string {
  return `The file you generated has an error. Fix only the specific error described below.
Return the complete corrected file content with no explanation, no markdown fences, no backticks.

VALIDATION ERROR:
${validationError}

YOUR PREVIOUS OUTPUT:
${previousOutput}`;
}
```

---

### 7. `hooks/useLLMStream.ts`

```ts
// Exports one hook: useLLMStream()
// Returns: { stream, isStreaming, error, send, clear }
//
// send(messages: ConversationMessage[]): void
//   - Reads LLMConfig from llmConfigStore
//   - Calls streamChat, piping onChunk to a local state string
//   - Sets isStreaming true/false around the call
//   - On LLMConnectionError sets error state with the message
//
// stream: string — the accumulated streamed response so far
// clear(): void — resets stream and error to empty/null
```

---

### 8. `hooks/useOverlayQA.ts`

```ts
// Manages a queue of OverlayQuestion[]
// Exports: { questions, isOpen, enqueue, resolve, dismiss }
//
// enqueue(questions: OverlayQuestion[], onComplete: (answered: OverlayQuestion[]) => void): void
//   Adds questions to queue, sets isOpen = true, stores onComplete callback
//
// resolve(questionId: string, answer: string | string[]): void
//   Sets the answer on the matching question
//   If all questions in the current batch are answered, calls onComplete and closes overlay
//
// dismiss(): void
//   Clears queue, closes overlay, calls onComplete with unanswered questions as-is
```

---

### 9. `components/shared/BrandLogo.tsx`

- Reads `name`, `logo.icon`, `logo.full`, `logo.alt` from `appConfig`
- Props: `variant: "icon" | "full"`, `className?: string`
- `"icon"` renders just the icon SVG via `<Image>`
- `"full"` renders the full logo SVG via `<Image>`
- Falls back to the app name as text if the image fails to load

---

### 10. `components/shared/ProviderBadge.tsx`

- Reads from `llmConfigStore`
- Renders: `[provider icon] [model name]` as a small badge
- Ollama icon: a simple green circle dot
- LM Studio icon: a simple purple circle dot
- Clicking it navigates to `/settings`

---

### 11. `components/shared/StatusBadge.tsx`

- Props: `status: TaskStatus`
- `pending` → gray badge, text "Pending"
- `running` → blue badge with a spinning loader icon, text "Running"
- `done` → green badge, text "Done"
- `error` → red badge, text "Error"

---

### 12. `components/layout/AppShell.tsx`

Three-panel layout. All widths are fixed:

- Left sidebar: `w-60` (240px), not resizable for now
- Center panel: `flex-1`
- Right panel: `w-[420px]`, not resizable for now

Top bar spans full width, height `h-14`, contains:

- Left: `BrandLogo variant="full"`
- Center: active project name (reads from `projectPlanStore.plan?.name`, falls back to "No project open")
- Right: `ProviderBadge` + Settings icon button (links to `/settings`)

Import `Toaster` from `sonner` and render it inside `AppShell` (not in root layout).

---

### 13. `components/layout/Sidebar.tsx`

Left panel content for this phase (placeholder structure, filled in Phase 4):

- Top section: "Projects" heading + "New Project" button that links to `/studio/new`
- Middle section: empty file tree placeholder with text "No project open"
- Bottom: Settings link

---

### 14. `components/layout/CenterPanel.tsx`

Wrapper for the center panel. Accepts `children`. Adds correct padding and scroll behavior. No logic in this phase — just layout.

---

### 15. `components/layout/RightPanel.tsx`

Placeholder for this phase:

- Shows "Select a file to preview" centered text when no file is selected
- Reads `fsStore.selectedFilePath` — if null, show placeholder

---

### 16. `components/agent/ChatMessage.tsx`

Props: `message: ConversationMessage`

- `role === "user"`: right-aligned bubble, neutral background
- `role === "assistant"`: left-aligned, slightly different background, renders `content` through `react-markdown` with `remark-gfm`
- `role === "system"`: hidden (do not render system messages)
- Show a relative timestamp below each message

---

### 17. `components/agent/ChatInterface.tsx`

Props: `onSend: (message: string) => void`, `isStreaming: boolean`, `streamBuffer: string`

- Renders `ConversationMessage[]` from `projectPlanStore.conversation` using `ChatMessage`
- While `isStreaming`, renders a live assistant bubble showing `streamBuffer`
- Input area at bottom: textarea (auto-resize), send button (disabled while streaming)
- Send on Enter (without Shift), new line on Shift+Enter
- Auto-scrolls to bottom on new messages

---

### 18. `components/agent/OverlayQA.tsx`

This is the most important UI component in Phase 1.

Props:

```ts
type OverlayQAProps = {
  questions: OverlayQuestion[];
  isOpen: boolean;
  onResolve: (questionId: string, answer: string | string[]) => void;
  onDismiss: () => void;
};
```

Behavior:

- Renders as a panel that slides up from the bottom of the center panel using Framer Motion (`y: "100%" → y: 0`, `AnimatePresence`)
- Shows questions one at a time (tracks current index internally)
- `single_select`: renders option buttons, clicking one auto-advances to next question
- `multi_select`: renders checkboxes, requires a "Continue" button to advance
- `text`: renders a text input with a "Submit" button
- Shows question progress: "Question 2 of 4"
- "Skip all" button in top-right dismisses the overlay
- After the last question is answered, calls `onResolve` for the final answer (prior answers were already resolved inline)

---

### 19. `app/layout.tsx`

- Standard root layout
- Sets `<html lang="en">`
- Imports global CSS
- Does NOT include Toaster here (it's in AppShell)

---

### 20. `app/studio/layout.tsx`

- Renders `<AppShell>` wrapping `{children}`
- This layout applies to all `/studio/*` routes

---

### 21. `app/studio/new/page.tsx`

For this phase: renders `ChatInterface` in the center panel with a wired `useLLMStream` hook.
The plan agent logic is wired in Phase 3 — for now just verify streaming works end to end:

- User types a message
- Message is added to `projectPlanStore.conversation`
- `useLLMStream.send()` is called with the conversation
- Streamed response appears live in the chat
- Completed response is added to conversation as an assistant message

Also render `OverlayQA` connected to `useOverlayQA` — add a temporary dev button "Test Overlay" that enqueues 3 test questions (one of each type) so you can verify the overlay works without completing the full plan agent.

---

### 22. `app/settings/page.tsx`

Fields (all wired to `llmConfigStore`):

- Provider toggle: "Ollama" / "LM Studio" (radio buttons or segmented control)
- Base URL input — auto-populated from provider selection, editable
- Model name input
- Temperature slider (0.0 – 1.0, step 0.1)
- Max tokens input
- "Test Connection" button:
  - Sends a minimal `streamChat` call with a single message: `[{ role: "user", content: "ping" }]`
  - On success: green success toast via Sonner: "Connected to [model] at [baseUrl]"
  - On `LLMConnectionError`: red error toast: "Cannot connect — is your LLM running?"
- "Reset to defaults" button calls `llmConfigStore.reset()`

---

### 23. `app/page.tsx`

Simple redirect: `redirect("/studio/new")` — using Next.js `redirect()` from `next/navigation`.

---

## Verification

After completing all tasks above, verify the following manually before marking Phase 1 done:

1. `npm run dev` starts without TypeScript errors
2. App redirects from `/` to `/studio/new`
3. `/settings` renders all fields, populated with defaults from `appConfig`
4. "Test Connection" on `/settings` shows a success or connection error toast (depending on whether your LLM is running)
5. `/studio/new` renders the three-panel shell with the top bar showing the Jugaad logo placeholder and ProviderBadge
6. Typing a message and pressing Enter sends it and streams a response back in the chat (requires LLM running)
7. Clicking "Test Overlay" shows the overlay sliding up, all three question types render correctly, answering all questions dismisses the overlay
8. No console errors on any of the above steps
