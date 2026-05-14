# Phase 3 — Plan Agent

Attach alongside `#file:CONTEXT.md` for this session.
Phases 1 and 2 must be fully verified before starting this phase.

---

## Goal

A full conversational planning flow that produces a confirmed, Zod-validated `ProjectPlan`. The agent asks structured follow-up questions via the overlay, extracts a plan from the response, and presents it for confirmation before handing off to task generation.

---

## Tasks

### 1. Add Zod Schema for `ProjectPlan`

Create `lib/planner/planSchema.ts`:

```ts
import { z } from "zod";

export const FeatureSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
});

export const PageSchema = z.object({
  id: z.string(),
  name: z.string(),
  route: z.string(),
  description: z.string(),
});

export const DataModelFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean(),
});

export const DataModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  fields: z.array(DataModelFieldSchema),
});

export const StackConfigSchema = z.object({
  selected: z.array(z.string()),
});

export const ProjectPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  stack: StackConfigSchema,
  features: z.array(FeatureSchema),
  pages: z.array(PageSchema),
  dataModels: z.array(DataModelSchema),
  authStrategy: z.enum(["none", "nextauth", "clerk", "firebase", "custom"]),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// Helper to extract and parse a <plan> block from an LLM response string
export function extractPlanFromResponse(response: string): ProjectPlan | null {
  const match = response.match(/<plan>([\s\S]*?)<\/plan>/);
  if (!match) return null;
  try {
    const raw = JSON.parse(match[1].trim());
    return ProjectPlanSchema.parse(raw);
  } catch {
    return null;
  }
}
```

---

### 2. `lib/planner/planAgent.ts`

```ts
// Exports one function:
// sendMessage(params: {
//   userMessage: string;
//   history: ConversationMessage[];
//   stack: StackConfig;
//   config: LLMConfig;
//   onChunk: (chunk: string) => void;
// }): Promise<{ response: string; extractedPlan: ProjectPlan | null }>
//
// Implementation:
// 1. Build system prompt via buildPlanAgentSystemPrompt(stack)
// 2. Construct messages array: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: userMessage }]
// 3. Call streamChat(messages, config, onChunk)
// 4. After stream completes, call extractPlanFromResponse(response)
// 5. Return { response, extractedPlan }
// Note: if the LLM returns a <plan> block, extractedPlan will be non-null.
//       The caller is responsible for showing the confirmation UI.
```

---

### 3. Define Structured Follow-up Questions

Create `lib/planner/followUpQuestions.ts`:

```ts
import type { OverlayQuestion } from "@/types";

// These are triggered by the plan agent after the user describes their app
// The agent calls triggerFollowUps() → returns to the caller which enqueues them via useOverlayQA

export const initialFollowUpQuestions: OverlayQuestion[] = [
  {
    id: "auth",
    question: "Does your app need user authentication?",
    type: "single_select",
    options: [
      "No auth needed",
      "Firebase Auth",
      "NextAuth.js v5",
      "Clerk",
      "Custom",
    ],
  },
  {
    id: "database",
    question: "Does your app need a database?",
    type: "single_select",
    options: ["No database", "Prisma ORM", "Drizzle ORM"],
  },
  {
    id: "pages",
    question: "Roughly how many pages will your app have?",
    type: "single_select",
    options: ["1–3 pages", "4–7 pages", "8–15 pages", "15+ pages"],
  },
  {
    id: "payments",
    question: "Does your app need payments?",
    type: "single_select",
    options: ["No payments", "Yes — Stripe"],
  },
  {
    id: "extras",
    question: "Any additional features to include?",
    type: "multi_select",
    options: [
      "File uploads",
      "Email sending",
      "Real-time updates",
      "Admin dashboard",
      "None",
    ],
  },
];

// Build a natural language summary of the answers to append to the conversation
export function buildFollowUpSummary(answered: OverlayQuestion[]): string {
  return answered
    .filter((q) => q.answer !== undefined)
    .map(
      (q) =>
        `${q.question}: ${Array.isArray(q.answer) ? q.answer.join(", ") : q.answer}`,
    )
    .join("\n");
}
```

---

### 4. Update `app/studio/new/page.tsx`

Replace the placeholder chat wiring from Phase 1 with the full plan agent flow.

**State machine — 3 states:**

```
STACK_SELECT → PLANNING → CONFIRMING
```

`STACK_SELECT`: Phase 2 stack selector (already built).

`PLANNING`: Full chat interface with plan agent wired up.

- On first render of this state, trigger `initialFollowUpQuestions` via `useOverlayQA`
- When the overlay resolves: call `buildFollowUpSummary(answered)` and send it as a user message automatically (do not require the user to type it)
- Continue conversation normally after that
- After each assistant response, check `extractedPlan`:
  - If non-null: transition to `CONFIRMING` state automatically
  - If null: continue conversation

`CONFIRMING`: Shows `PlanSummary` (built in task 5 below).

---

### 5. `components/agent/PlanSummary.tsx`

Props: `plan: ProjectPlan`, `onConfirm: () => void`, `onEdit: () => void`

Layout — a card or panel with sections:

**Header**: Project name + description

**Stack**: Badge list of selected stack option labels (look up labels from `stackRegistry`)

**Pages**: List of pages — name, route, and description for each

**Features**: List of feature titles and descriptions

**Data Models**: For each model, show the model name and a table of fields (name, type, required)

**Auth**: Show the selected auth strategy as a labeled badge

**Footer actions**:

- "Edit Plan" button → calls `onEdit` (returns to PLANNING state)
- "Confirm & Generate Tasks" button (primary) → calls `onConfirm`

---

### 6. Wire Confirmation to Task Generation

In `app/studio/new/page.tsx`, when the user clicks "Confirm & Generate Tasks":

1. Call `projectPlanStore.confirmPlan()`
2. Show a full-screen loading overlay with text "Generating task list..." and a progress indicator
3. Call `taskGenerator.generateTasks()` — implement a stub for now that returns a hardcoded array of 3 placeholder tasks (the real implementation is Phase 4 task 1)
4. When tasks are returned: call `taskStore.setTasks(tasks)`
5. Navigate to `/studio/[projectId]` where `projectId = plan.id`

The stub task generator to use for now:

```ts
// lib/planner/taskGenerator.ts (STUB — will be fully implemented in Phase 4)
export async function generateTasks(
  plan: ProjectPlan,
  config: LLMConfig,
  onProgress: (status: string) => void,
): Promise<Task[]> {
  onProgress("Preparing task list...");
  await new Promise((r) => setTimeout(r, 1000));
  return [
    {
      id: "task-1",
      title: "Create project structure",
      filePath: "package.json",
      instruction: "Stub",
      dependsOn: [],
      docsContext: "",
      status: "pending",
      retryCount: 0,
    },
    {
      id: "task-2",
      title: "Create root layout",
      filePath: "app/layout.tsx",
      instruction: "Stub",
      dependsOn: ["task-1"],
      docsContext: "",
      status: "pending",
      retryCount: 0,
    },
    {
      id: "task-3",
      title: "Create home page",
      filePath: "app/page.tsx",
      instruction: "Stub",
      dependsOn: ["task-2"],
      docsContext: "",
      status: "pending",
      retryCount: 0,
    },
  ];
}
```

---

### 7. `app/studio/[projectId]/page.tsx`

For this phase: a placeholder workspace page.

- Reads `taskStore.tasks` and renders `TaskBoard` (stub built below)
- Shows project name from `projectPlanStore.plan?.name`
- Shows "Tasks ready — execution coming in Phase 4" banner

---

### 8. `components/tasks/TaskBoard.tsx`

Props: none — reads from `taskStore`

For this phase: renders a simple list of tasks.

- Each task shows: file path, title, and a `StatusBadge`
- Groups tasks by status: Running first, then Pending, then Done, then Error
- Shows a summary line: "X tasks · Y done · Z pending"
- "Start Building" button (disabled in this phase — enabled in Phase 4)

---

### 9. `components/tasks/TaskItem.tsx`

Props: `task: Task`

- Shows file path as primary text (monospace font)
- Shows title as secondary text
- Shows `StatusBadge` on the right
- If `task.status === "error"`, shows the error message below in red text
- Clicking the item selects it (visual highlight only in this phase)

---

## Verification

1. `/studio/new` Step 2 (Planning): overlay fires automatically with the 5 follow-up questions on first load
2. Answering all overlay questions sends a summary message automatically into the chat
3. Continue chatting with the LLM — at some point say "generate the plan" and the LLM outputs a `<plan>` block
4. App automatically transitions to `CONFIRMING` state and shows `PlanSummary` with all plan fields rendered
5. "Edit Plan" returns to the chat with history intact
6. "Confirm & Generate Tasks" shows loading overlay, then navigates to `/studio/[projectId]`
7. `/studio/[projectId]` shows the 3 stub tasks in the task board with correct statuses
8. No TypeScript errors on `npm run dev`
