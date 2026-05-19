import { z } from "zod";
import { streamChat } from "@/lib/llm/client";
import { buildTaskGeneratorPrompt } from "@/lib/llm/prompts";
import { fetchStackDocs, TASK_GEN_MAX_CHARS } from "@/lib/llm/docFetcher";
import { stackOptions } from "@/components/stack/stackRegistry";
import type { LLMConfig, ProjectPlan, Task } from "@/types";

/** Hard cap on tokens for the task-generation LLM call.
 *  Scaled for 128K-context models — complex apps can produce 30+ tasks. */
const TASK_GEN_MAX_TOKENS = 32_768;

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
    .map(
      (o) =>
        `=== ${o.label} ===\n${(docCache[o.id] ?? "").slice(0, TASK_GEN_MAX_CHARS)}`,
    )
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
    TASK_GEN_MAX_TOKENS,
  );

  // Step 5: Parse + validate
  const match = fullResponse.match(/<tasks>([\s\S]*?)<\/tasks>/);
  if (!match) throw new Error("LLM did not return a <tasks> block");

  const parsed = JSON.parse(match[1].trim());
  const tasks = z.array(TaskSchema).parse(parsed) as Task[];

  // Step 5b: Repair broken dependsOn references.
  // The LLM sometimes uses inconsistent IDs (e.g. "schema-1" when the actual task ID
  // is "state-1"). Build a filePath→id lookup and remap any unknown dep IDs.
  const filePathToId = new Map(tasks.map((t) => [t.filePath, t.id]));
  const validIds = new Set(tasks.map((t) => t.id));
  // Build a "stem" lookup: normalise each task's filePath to a short key for fuzzy matching
  const stemToId = new Map(
    tasks.map((t) => {
      const stem = t.filePath
        .replace(/^.*[/\\]/, "")
        .replace(/\.[^.]+$/, "")
        .toLowerCase();
      return [stem, t.id];
    }),
  );
  const repairedTasks = tasks.map((task) => {
    const repairedDeps = task.dependsOn.filter((dep) => {
      if (validIds.has(dep)) return true;
      // Attempt to remap: the LLM may have used a filePath or a slug derived from the title
      const byPath = filePathToId.get(dep);
      if (byPath) {
        task.dependsOn = task.dependsOn.map((d) => (d === dep ? byPath : d));
        return true;
      }
      const byStem = stemToId.get(dep.toLowerCase());
      if (byStem) {
        task.dependsOn = task.dependsOn.map((d) => (d === dep ? byStem : d));
        return true;
      }
      // Unknown dep — drop it rather than halting the whole build
      console.warn(
        `[taskGenerator] dropping unknown dep "${dep}" from task "${task.id}"`,
      );
      return false;
    });
    return { ...task, dependsOn: repairedDeps };
  });

  // Step 6: Assign doc context slices per task
  const allDocIds = plan.stack.selected;
  const tasksWithDocs = repairedTasks.map((task) => {
    const relevantIds = getRelevantDocIds(task.filePath, allDocIds);
    const relevantOptions = selectedOptions.filter((o) =>
      relevantIds.includes(o.id),
    );
    const taskDocsContext = relevantOptions
      .map((o) => `=== ${o.label} ===\n${docCache[o.id] ?? ""}`)
      .join("\n\n");
    return { ...task, docsContext: taskDocsContext };
  });

  // Step 7: Append uncancellable system fix task
  const systemTask: Task = {
    id: "__system_fix__",
    title: "Fix errors & install dependencies",
    filePath: "package.json",
    instruction:
      "SYSTEM: Scan all generated files and output a corrected package.json that includes every npm package imported in the project. See the system prompt for exact version requirements.",
    dependsOn: tasksWithDocs.map((t) => t.id),
    docsContext: "",
    status: "pending",
    retryCount: 0,
    isSystem: true,
  };

  onProgress("Task list ready.");
  return [...tasksWithDocs, systemTask];
}
