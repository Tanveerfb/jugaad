# Phase 4 — Task Generator + Executor + File System

Attach alongside `#file:CONTEXT.md` for this session.
Phases 1, 2, and 3 must be fully verified before starting this phase.

---

## Goal

A confirmed `ProjectPlan` becomes a real Next.js project written to the user's local disk. The task generator produces an ordered file list, the executor runs tasks one by one with retry logic, and the file tree updates in real time as files land on disk.

---

## Tasks

### 1. `lib/fs/handle.ts`

```ts
// openBaseFolder(): Promise<FileSystemDirectoryHandle>
//   Calls window.showDirectoryPicker({ mode: "readwrite", startIn: "documents" })
//   Calls fsStore.setBaseFolderHandle(handle)
//   Calls setStoredFolderName(handle.name) (the localStorage helper from Phase 1)
//   Returns the handle

// requestPermission(handle: FileSystemDirectoryHandle): Promise<boolean>
//   Calls handle.queryPermission({ mode: "readwrite" })
//   If result is "granted" return true
//   If result is "prompt", calls handle.requestPermission({ mode: "readwrite" })
//   Returns true if granted, false otherwise

// createProjectFolder(
//   base: FileSystemDirectoryHandle,
//   projectName: string
// ): Promise<FileSystemDirectoryHandle>
//   Sanitizes projectName: lowercase, replace spaces with hyphens, strip special chars
//   Calls base.getDirectoryHandle(sanitizedName, { create: true })
//   Calls fsStore.setProjectHandle(handle)
//   Returns the handle
```

---

### 2. `lib/fs/writer.ts`

```ts
// writeFile(
//   root: FileSystemDirectoryHandle,
//   filePath: string,
//   content: string
// ): Promise<void>
//   Splits filePath by "/" into segments
//   For all segments except the last: calls root.getDirectoryHandle(segment, { create: true }) recursively
//   For the last segment: calls dirHandle.getFileHandle(filename, { create: true })
//   Creates a writable via fileHandle.createWritable()
//   Writes content and closes the writable
//   After write: calls tree.rebuildFileTree(fsStore.projectHandle) and updates fsStore.fileTree

// readFile(
//   root: FileSystemDirectoryHandle,
//   filePath: string
// ): Promise<string>
//   Traverses path segments via getDirectoryHandle
//   Gets file handle via getFileHandle
//   Returns file.text()

// deleteFile(
//   root: FileSystemDirectoryHandle,
//   filePath: string
// ): Promise<void>
//   Traverses to parent directory
//   Calls parentDir.removeEntry(filename)
//   Rebuilds file tree after deletion
```

---

### 3. `lib/fs/tree.ts`

```ts
// rebuildFileTree(
//   root: FileSystemDirectoryHandle
// ): Promise<FileTreeNode[]>
//   Recursively walks the directory using root.values() (AsyncIterable)
//   For each FileSystemDirectoryHandle: recurse and create a node with type: "directory"
//   For each FileSystemFileHandle: create a node with type: "file"
//   Sort: directories before files, then alphabetically within each group
//   Returns the full FileTreeNode[] tree
//   Calls fsStore.setFileTree(tree) after building

// getFileLanguage(filePath: string): string
//   Maps file extension to Monaco language identifier:
//   .ts / .tsx → "typescript"
//   .js / .jsx → "javascript"
//   .json      → "json"
//   .css       → "css"
//   .md        → "markdown"
//   .html      → "html"
//   .env*      → "plaintext"
//   default    → "plaintext"
```

---

### 4. `components/filesystem/FolderPicker.tsx`

Shown when `fsStore.baseFolderHandle === null`.

Layout:

- Centered card with icon, heading "Choose a base folder", subtext "All your Jugaad projects will be created inside this folder"
- "Choose Folder" button — calls `openBaseFolder()`
- After selection: shows the folder name with a green checkmark and a "Change" button
- If `getStoredFolderName()` returns a value (from a previous session), show: "Last used: [folderName]" with a "Reconnect" button that calls `openBaseFolder()` again (re-request is required by the browser on each session)

---

### 5. `components/filesystem/FileTree.tsx`

Reads `fsStore.fileTree` and `taskStore.tasks`.

- Renders a collapsible tree using recursive components
- Directories are collapsible (default: expanded)
- File nodes: show filename, and if a matching task exists in `taskStore.tasks` (match by `task.filePath`), show a `StatusBadge` inline
- Clicking a file node:
  1. Calls `readFile(fsStore.projectHandle, node.path)`
  2. Calls `fsStore.selectFile(node.path, content)`
- Right-click context menu (use shadcn `DropdownMenu`):
  - "Copy path"
  - "Delete file" (calls `deleteFile`, shows confirmation dialog first)
- Show a subtle folder icon for directories and a file icon (from lucide-react) for files — use the correct icon per extension where possible

---

### 6. `components/editor/CodePreview.tsx`

```tsx
// Dynamic import — MUST use next/dynamic with ssr: false
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

// Props: none — reads from fsStore

// Behavior:
// - If fsStore.selectedFilePath is null: show centered placeholder "Select a file to preview"
// - Otherwise: render MonacoEditor with:
//     value={fsStore.selectedFileContent}
//     language={getFileLanguage(fsStore.selectedFilePath)}
//     theme="vs-dark"
//     options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: "on" }}
// - On editor content change: debounce 500ms, then call writeFile(fsStore.projectHandle, selectedFilePath, newContent)
// - Show a "Saved ✓" indicator for 2 seconds after a successful write
// - Show the file path in a top bar above the editor (monospace, with a copy button)
// - While Monaco is loading: show a skeleton placeholder matching the panel dimensions
```

---

### 7. `lib/executor/validator.ts`

````ts
// validateOutput(filePath: string, content: string): { valid: boolean; error?: string }
//
// Rule 1 — All files:
//   content must not be empty string → error: "Generated file is empty"
//   content must not contain the string "```" anywhere → error: "Output contains markdown fences — LLM leaked formatting"
//
// Rule 2 — .ts and .tsx files:
//   Must contain at least one export keyword → error: "No exports found"
//   Brace balance: count of "{" must equal count of "}" → error: "Mismatched braces"
//   If filePath includes "page" or "layout": must match /export default/ → error: "Missing default export"
//   If filePath includes "route": must match /export (const|async function) (GET|POST|PUT|DELETE|PATCH)/ → error: "Missing route handler export"
//
// Rule 3 — .json files:
//   JSON.parse(content) must not throw → error: "Invalid JSON: [parse error message]"
//
// Rule 4 — .css files:
//   content must not be empty
//   Brace balance check (same as .ts rule)
//
// All other file types: only apply Rule 1
````

---

### 8. `lib/planner/taskGenerator.ts` (full implementation — replaces Phase 3 stub)

```ts
// generateTasks(
//   plan: ProjectPlan,
//   config: LLMConfig,
//   onProgress: (status: string) => void
// ): Promise<Task[]>
//
// Step 1: Fetch docs
//   onProgress("Fetching documentation...")
//   const docCache = await fetchStackDocs(plan.stack.selected)
//   Concatenate all values into a single docsContext string with headers:
//   "=== [LIBRARY LABEL] ===\n[doc chunk]\n\n"
//
// Step 2: Build prompt
//   onProgress("Building generation prompt...")
//   const prompt = buildTaskGeneratorPrompt(plan, docsContext)
//
// Step 3: Call LLM (non-streaming)
//   onProgress("Generating task list...")
//   POST to ${config.baseUrl}/v1/chat/completions with stream: false
//   messages: [{ role: "user", content: prompt }]
//
// Step 4: Parse response
//   Extract content from response.choices[0].message.content
//   Match /<tasks>([\s\S]*?)<\/tasks>/
//   If no match: throw Error("LLM did not return a <tasks> block")
//   JSON.parse the matched content
//
// Step 5: Validate each task
//   Import TaskSchema (create a Zod schema matching the Task type — add to planSchema.ts)
//   z.array(TaskSchema).parse(parsed) — throw if invalid
//
// Step 6: Assign doc context slices per task
//   For each task, determine which stack libraries are relevant based on task.filePath:
//   - Any file in app/api/ or containing "route": inject nextjs + auth + database docs
//   - Any file ending in .prisma: inject prisma docs only
//   - Any file in components/: inject shadcn + tailwind docs
//   - package.json or config files: inject all docs
//   - Default: inject nextjs docs
//   Set task.docsContext to the relevant concatenated chunks from docCache
//
// Step 7: Return tasks
//   onProgress("Task list ready.")
//   return tasks
```

---

### 9. `lib/executor/taskExecutor.ts`

```ts
// executeAll(params: {
//   tasks: Task[];
//   projectHandle: FileSystemDirectoryHandle;
//   config: LLMConfig;
// }): Promise<void>
//
// Reads and writes task status via taskStore actions imported directly
// (do not pass the store as a parameter — import it inside the function)
//
// For each task in array order:
//
//   Pre-check: verify all task.dependsOn IDs have status "done" in taskStore
//   If not: throw Error(`Dependency ${id} not complete for task ${task.id}`)
//   (This should never happen if tasks are in correct order — it's a safety check)
//
//   taskStore.setActiveTask(task.id)
//   taskStore.updateTaskStatus(task.id, "running")
//   taskStore.clearStream()
//
//   Build dependency contents:
//   const depContents: Record<string, string> = {}
//   For each id in task.dependsOn:
//     const completedTask = taskStore.tasks.find(t => t.id === id)
//     if completedTask?.output: depContents[completedTask.filePath] = completedTask.output
//
//   Retry loop (max 3 attempts):
//     Build prompt:
//       attempt === 0: buildTaskExecutorPrompt(task, depContents)
//       attempt > 0:   buildRetryPrompt(lastOutput, lastValidationError)
//     Stream via streamChat, pipe chunks to taskStore.appendToStream
//     Collect full output string
//     Run validateOutput(task.filePath, output)
//     If valid:
//       writeFile(projectHandle, task.filePath, output)
//       taskStore.setTaskOutput(task.id, output)
//       taskStore.updateTaskStatus(task.id, "done")
//       break retry loop
//     If invalid and attempt < 2:
//       taskStore.incrementRetry(task.id)   ← add this action to taskStore
//       continue retry loop
//     If invalid after 3 attempts:
//       taskStore.setTaskError(task.id, validationError)
//       taskStore.updateTaskStatus(task.id, "error")
//       taskStore.setActiveTask(null)
//       STOP execution — do not continue to next task
//       Emit a Sonner error toast: "Task failed: [task.title] — fix required before continuing"
//       return
//
//   taskStore.clearStream()
//   taskStore.setActiveTask(null)
//
// After all tasks complete:
//   Sonner success toast: "Project built successfully!"
//   taskStore.isExecuting = false
```

---

### 10. Add `incrementRetry` to `taskStore.ts`

```ts
incrementRetry(taskId: string): void
// Finds the task by id and increments task.retryCount by 1
```

---

### 11. `components/tasks/TaskLog.tsx`

Shown in the center panel while a task is executing (replaces `ChatInterface` during execution).

Reads: `taskStore.activeTaskId`, `taskStore.streamBuffer`, `taskStore.tasks`

Layout:

- Top bar: "Building [task.title]..." with a spinner, and the file path in monospace
- Main area: scrollable `<pre>` showing `streamBuffer` in real time — auto-scrolls to bottom as chunks arrive
- Below the log: "Retry [1/3]" indicator if `task.retryCount > 0`

---

### 12. `components/tasks/TaskBoard.tsx` (update from Phase 3 stub)

Full implementation:

- "Start Building" button is now enabled
- Clicking it:
  1. Checks if `fsStore.baseFolderHandle` is set — if not, shows `FolderPicker` in a dialog
  2. If base folder is set, calls `createProjectFolder(base, plan.name)`
  3. Sets `taskStore.isExecuting = true`
  4. Calls `executeAll({ tasks, projectHandle, config })`
- While executing: "Start Building" becomes a disabled "Building..." button
- After all tasks done: shows a "Build Complete" banner with the project folder path
- On error: shows the failed task highlighted in red with three action buttons:
  - "Retry Task" — resets that task to pending and resumes execution from that task
  - "Skip Task" — marks it done with a warning, continues (use with caution — may break dependents)
  - "Open Folder" — opens the project folder in the OS file explorer via `window.showDirectoryPicker` workaround (note: direct folder open is not possible via browser — instead show the path and a "Copy Path" button)

---

### 13. Update `app/studio/[projectId]/page.tsx`

Full workspace for this phase:

- Center panel: shows `ChatInterface` when not executing, `TaskLog` when `taskStore.isExecuting`
- Left sidebar: shows `FileTree` populated from `fsStore.fileTree`
- Right panel: shows `CodePreview`
- Top bar: shows project name and a "View Tasks" button that opens `TaskBoard` in a sheet (shadcn `Sheet` component from the right)
- If `fsStore.projectHandle === null` and `taskStore.tasks.length > 0`: show `FolderPicker` dialog automatically

---

### 14. Update `components/layout/Sidebar.tsx`

Replace placeholder from Phase 1:

- Top: `FileTree` component
- If `fsStore.fileTree` is empty: show "No files yet — start building" placeholder
- Bottom: show base folder name from `getStoredFolderName()` with a change icon button

---

## Verification

1. `/studio/new` full flow: select stack → fetch docs → chat → confirm plan → loading overlay → navigate to `/studio/[projectId]`
2. `/studio/[projectId]` shows the task board with generated tasks (real LLM output, not stubs)
3. First run: `FolderPicker` dialog appears, folder selection works, folder name persists in sidebar
4. "Start Building" creates a subfolder in the base folder named after the project
5. Tasks execute one by one — `TaskLog` streams output in real time
6. Files appear in the `FileTree` as each task completes
7. Clicking a file in `FileTree` opens it in `CodePreview` (Monaco)
8. Editing a file in Monaco auto-saves to disk after 500ms
9. If the LLM returns a file with markdown fences, the validator catches it and retries
10. After all tasks complete: success toast fires, "Build Complete" banner shows project path
11. Open the generated project in a separate VS Code window — `npm install && npm run dev` should start without errors
12. No TypeScript errors on `npm run dev` for Jugaad itself
