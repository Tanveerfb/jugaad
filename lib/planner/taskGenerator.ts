import { z } from "zod";
import { streamChat } from "@/lib/llm/client";
import { buildTaskGeneratorPrompt } from "@/lib/llm/prompts";
import { fetchStackDocs } from "@/lib/llm/docFetcher";
import { stackOptions } from "@/components/stack/stackRegistry";
import type { LLMConfig, ProjectPlan, Task } from "@/types";

const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  filePath: z.string(),
  instruction: z.string(),
  dependsOn: z.array(z.string()),
  docsContext: z.string(),
  status: z.enum(["pending", "running", "done", "error"]),
  retryCount: z.number(),
});

function extractTasks(response: string): Task[] {
  const match = response.match(/<tasks>([\s\S]*?)<\/tasks>/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1].trim());
    return z.array(TaskSchema).parse(parsed) as Task[];
  } catch {
    return [];
  }
}

function getRelevantDocIds(filePath: string, allIds: string[]): string[] {
  const fp = filePath.toLowerCase();

  if (fp.includes("app/api/") || fp.includes("route")) {
    return allIds.filter((id) =>
      ["nextjs", "nextauth", "clerk", "prisma", "drizzle"].includes(id),
    );
  }
  if (fp.endsWith(".prisma")) {
    return allIds.filter((id) => id === "prisma");
  }
  if (fp.includes("components/")) {
    return allIds.filter((id) => ["shadcn", "tailwind", "framer"].includes(id));
  }
  if (
    fp === "package.json" ||
    fp.includes("config") ||
    fp.includes("tsconfig")
  ) {
    return allIds;
  }
  return allIds.filter((id) => id === "nextjs");
}

export async function generateTasks(
  plan: ProjectPlan,
  config: LLMConfig,
  onProgress: (status: string) => void,
): Promise<Task[]> {
  // Step 1: Fetch docs
  onProgress("Fetching documentation...");
  const docCache = await fetchStackDocs(plan.stack.selected);

  // Step 2: Build docsContext string for the generator prompt
  const selectedOptions = stackOptions.filter((o) =>
    plan.stack.selected.includes(o.id),
  );
  const docsContext = selectedOptions
    .map((o) => `=== ${o.label} ===\n${docCache[o.id] ?? ""}`)
    .join("\n\n");

  // Step 3: Build prompt
  onProgress("Building generation prompt...");
  const prompt = buildTaskGeneratorPrompt(plan, docsContext);

  // Step 4: Call LLM (collect via streaming)
  onProgress("Generating task list...");
  let fullResponse = "";
  await streamChat(
    [{ id: "gen", role: "user", content: prompt, timestamp: Date.now() }],
    config,
    (chunk) => {
      fullResponse += chunk;
    },
  );

  // Step 5: Parse + validate
  const match = fullResponse.match(/<tasks>([\s\S]*?)<\/tasks>/);
  if (!match) throw new Error("LLM did not return a <tasks> block");

  const parsed = JSON.parse(match[1].trim());
  const tasks = z.array(TaskSchema).parse(parsed) as Task[];

  // Step 6: Assign doc context slices per task
  const allDocIds = plan.stack.selected;
  const tasksWithDocs = tasks.map((task) => {
    const relevantIds = getRelevantDocIds(task.filePath, allDocIds);
    const relevantOptions = selectedOptions.filter((o) =>
      relevantIds.includes(o.id),
    );
    const taskDocsContext = relevantOptions
      .map((o) => `=== ${o.label} ===\n${docCache[o.id] ?? ""}`)
      .join("\n\n");
    return { ...task, docsContext: taskDocsContext };
  });

  // Step 7: Return
  onProgress("Task list ready.");
  return tasksWithDocs;
}
