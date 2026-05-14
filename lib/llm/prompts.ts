// RULE: All prompts are built here. Never inline prompt strings in components or stores.

import type { StackConfig, ProjectPlan, Task } from "@/types";
import { stackOptions } from "@/components/stack/stackRegistry";

export function buildPlanAgentSystemPrompt(stack: StackConfig): string {
  const selectedItems = stackOptions.filter((o) =>
    stack.selected.includes(o.id),
  );
  const stackList = selectedItems
    .map((o) => `- ${o.label} (${o.packageName})`)
    .join("\n");

  return `You are an expert web application planning assistant for a local-first AI scaffolding studio called Jugaad.

Your role is to help the user plan their Next.js web application through a conversational flow.

Selected tech stack:
${stackList}

Guidelines:
- Ask clarifying questions to understand the app's purpose, features, pages, and data models.
- Keep questions focused and conversational — one topic at a time.
- When you have enough information to produce a complete plan, output it wrapped in <plan> tags as valid JSON matching this TypeScript type:

type ProjectPlan = {
  id: string;           // generate a UUID v4
  name: string;
  description: string;
  stack: { selected: string[] };
  features: { id: string; title: string; description: string }[];
  pages: { id: string; name: string; route: string; description: string }[];
  dataModels: { id: string; name: string; fields: { name: string; type: string; required: boolean }[] }[];
  authStrategy: "none" | "nextauth" | "clerk" | "firebase" | "custom";
  createdAt: number;    // Date.now()
  updatedAt: number;    // Date.now()
};

Example output when ready:
<plan>
{ "id": "...", "name": "...", ... }
</plan>

Do not produce the plan until you have gathered sufficient detail about features, pages, and data models.`;
}

export function buildTaskGeneratorPrompt(
  plan: ProjectPlan,
  docsContext: string,
): string {
  return `You are a senior Next.js developer. Decompose the following project plan into an ordered list of file generation tasks.

Project Plan:
${JSON.stringify(plan, null, 2)}

Relevant Documentation:
${docsContext}

Rules:
1. Each task maps to exactly ONE file.
2. Output tasks in the order they must be created. A task may only import from files created by EARLIER tasks in this list.
3. File paths use the Next.js App Router convention (e.g. "app/dashboard/page.tsx").
4. Every page.tsx and layout.tsx must have a default export.
5. Every route.ts must export at least one of GET/POST/PUT/DELETE.
6. Include package.json, tsconfig.json, and tailwind config as the first tasks.
7. Include all necessary config files, type files, utility files, components, and pages.

Output the tasks as a JSON array wrapped in <tasks> tags. No other text outside the tags.

<tasks>
[
  {
    "id": "uuid-here",
    "title": "Short descriptive title",
    "filePath": "relative/path/to/file.tsx",
    "instruction": "Detailed instruction for generating this file",
    "dependsOn": [],
    "docsContext": "",
    "status": "pending",
    "retryCount": 0
  }
]
</tasks>`;
}

export function buildTaskExecutorPrompt(
  task: Task,
  dependencyFileContents: Record<string, string>,
): string {
  // RULE: The task executor system prompt must always say:
  // "Respond with only the raw file content. No explanations, no markdown fences, no commentary."
  const depsSection =
    Object.keys(dependencyFileContents).length > 0
      ? Object.entries(dependencyFileContents)
          .map(([path, content]) => `// FILE: ${path}\n${content}`)
          .join("\n\n---\n\n")
      : "None";

  return `You are a file generator. Respond with only the raw file content. No explanations, no markdown fences, no commentary whatsoever.

Target file: ${task.filePath}

Relevant documentation:
${task.docsContext || "N/A"}

Dependency file contents (already written — your imports must resolve to these):
${depsSection}

Instruction:
${task.instruction}`;
}

export function buildRetryPrompt(
  previousOutput: string,
  validationError: string,
): string {
  return `The previously generated file content failed validation. Fix ONLY the specific error described below. Return the full corrected file content with no explanations, no markdown fences, no commentary.

Validation error:
${validationError}

Previous output:
${previousOutput}`;
}
