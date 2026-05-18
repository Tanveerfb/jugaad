// RULES (enforced here):
// 1. Never inline prompt strings — all prompts are built in lib/llm/prompts.ts
// 2. System prompt always says: "Respond with only the raw file content. No explanations, no markdown fences, no commentary."
// 3. Validate before writing — never call writeFile on unvalidated LLM output
// 4. Pause on error — if a task fails after 3 retries, stop. Do not silently skip.
// 5. Doc chunks are injected per task, not globally.

import { streamChat } from "@/lib/llm/client";
import { buildTaskExecutorPrompt, buildRetryPrompt } from "@/lib/llm/prompts";
import { validateOutput } from "./validator";
import { writeFile } from "@/lib/fs/writer";
import { enforceLatestVersions } from "@/lib/versioning";
import { useTaskStore } from "@/stores/taskStore";
import { toast } from "sonner";
import type { LLMConfig, Task } from "@/types";

export async function executeAll(
  tasks: Task[],
  projectPath: string,
  config: LLMConfig,
): Promise<void> {
  const store = useTaskStore.getState();
  store.setIsExecuting(true);

  for (const task of tasks) {
    // 1. Pre-check: all declared dependencies must be "done" in the store
    const storeTasks = useTaskStore.getState().tasks;
    for (const depId of task.dependsOn) {
      const dep = storeTasks.find((t) => t.id === depId);
      if (!dep || dep.status !== "done") {
        const msg = `Dependency ${depId} not complete for task ${task.id}`;
        useTaskStore.getState().setTaskError(task.id, msg);
        useTaskStore.getState().updateTaskStatus(task.id, "error");
        useTaskStore.getState().setIsExecuting(false);
        toast.error(`Task failed: ${task.title} — dependency not complete`);
        return;
      }
    }

    // 2. Mark running
    useTaskStore.getState().setActiveTask(task.id);
    useTaskStore.getState().updateTaskStatus(task.id, "running");
    useTaskStore.getState().clearStream();

    // 3. Build dependency file contents from already-completed task outputs
    const depContents: Record<string, string> = {};
    for (const depId of task.dependsOn) {
      const completedTask = useTaskStore
        .getState()
        .tasks.find((t) => t.id === depId);
      if (completedTask?.output) {
        depContents[completedTask.filePath] = completedTask.output;
      }
    }

    let lastOutput = "";
    let lastError = "";
    let succeeded = false;

    // 4. Retry loop — max 3 attempts (attempts 0, 1, 2)
    for (let attempt = 0; attempt < 3; attempt++) {
      const prompt =
        attempt === 0
          ? buildTaskExecutorPrompt(task, depContents)
          : buildRetryPrompt(lastOutput, lastError);

      let fullOutput = "";
      await streamChat(
        [{ id: "exec", role: "user", content: prompt, timestamp: Date.now() }],
        config,
        (chunk) => {
          fullOutput += chunk;
          useTaskStore.getState().appendToStream(chunk);
        },
      );

      const { valid, error } = validateOutput(task.filePath, fullOutput);

      if (valid) {
        // Enforce latest package versions in generated package.json
        const outputToWrite =
          task.filePath === "package.json"
            ? enforceLatestVersions(fullOutput)
            : fullOutput;
        await writeFile(projectPath, task.filePath, outputToWrite);
        useTaskStore.getState().setTaskOutput(task.id, outputToWrite);
        useTaskStore.getState().updateTaskStatus(task.id, "done");
        succeeded = true;
        break;
      }

      // Validation failed
      lastOutput = fullOutput;
      lastError = error ?? "Unknown validation error";

      if (attempt < 2) {
        useTaskStore.getState().incrementRetry(task.id);
        useTaskStore.getState().clearStream();
      } else {
        // All 3 attempts exhausted
        useTaskStore.getState().setTaskError(task.id, lastError);
        useTaskStore.getState().updateTaskStatus(task.id, "error");
        useTaskStore.getState().clearStream();
        useTaskStore.getState().setActiveTask(null);
        useTaskStore.getState().setIsExecuting(false);
        toast.error(
          `Task failed: ${task.title} — fix required before continuing`,
        );
        return;
      }
    }

    if (!succeeded) {
      useTaskStore.getState().setIsExecuting(false);
      return;
    }

    useTaskStore.getState().clearStream();
    useTaskStore.getState().setActiveTask(null);
  }

  useTaskStore.getState().setIsExecuting(false);
  toast.success("Project built successfully!");
}
