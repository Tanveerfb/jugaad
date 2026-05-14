import { z } from "zod";
import { streamChat } from "@/lib/llm/client";
import { buildTaskGeneratorPrompt } from "@/lib/llm/prompts";
import { fetchDocChunk } from "@/lib/llm/docFetcher";
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

export async function generateTasks(
  plan: ProjectPlan,
  config: LLMConfig,
  onProgress: (status: string) => void,
): Promise<Task[]> {
  const selectedOptions = stackOptions.filter((o) =>
    plan.stack.selected.includes(o.id),
  );

  const docChunks: Record<string, string> = {};
  for (const option of selectedOptions) {
    onProgress(`Fetching ${option.label} docs...`);
    docChunks[option.id] = await fetchDocChunk(option.docUrl);
  }

  const docsContext = Object.entries(docChunks)
    .map(([id, chunk]) => `### ${id}\n${chunk}`)
    .join("\n\n");

  onProgress("Generating task list...");

  const prompt = buildTaskGeneratorPrompt(plan, docsContext);
  let fullResponse = "";
  await streamChat(
    [{ id: "gen", role: "user", content: prompt, timestamp: Date.now() }],
    config,
    (chunk) => {
      fullResponse += chunk;
    },
  );

  const tasks = extractTasks(fullResponse);

  // Assign relevant doc chunks per task based on filePath keywords
  return tasks.map((task) => {
    const relevantId = selectedOptions.find((o) =>
      task.filePath.toLowerCase().includes(o.id.toLowerCase()),
    )?.id;
    return {
      ...task,
      docsContext: relevantId ? (docChunks[relevantId] ?? "") : "",
    };
  });
}
