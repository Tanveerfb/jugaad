// RULES (enforced here):
// 1. Never inline prompt strings — all prompts are built in lib/llm/prompts.ts
// 2. System prompt always says: "Respond with only the raw file content. No explanations, no markdown fences, no commentary."
// 3. Validate before writing — never call writeFile on unvalidated LLM output
// 4. Pause on error — if a task fails after 3 retries, stop. Do not silently skip.
// 5. Doc chunks are injected per task, not globally.

import { streamChat } from "@/lib/llm/client";
import { buildTaskExecutorPrompt, buildRetryPrompt } from "@/lib/llm/prompts";
import { validateOutput } from "./validator";
import { writeFile, readFile } from "@/lib/fs/writer";
import type { LLMConfig, Task } from "@/types";
import type { useTaskStore } from "@/stores/taskStore";

type TaskStoreActions = ReturnType<typeof useTaskStore.getState>;

export async function executeAll(
  tasks: Task[],
  projectHandle: FileSystemDirectoryHandle,
  config: LLMConfig,
  store: TaskStoreActions,
): Promise<void> {
  store.setIsExecuting(true);

  for (const task of tasks) {
    // 1. Verify dependencies are done
    const deps = tasks.filter((t) => task.dependsOn.includes(t.id));
    const unmet = deps.find((d) => d.status !== "done");
    if (unmet) {
      store.setTaskError(task.id, `Dependency "${unmet.title}" is not done.`);
      store.updateTaskStatus(task.id, "error");
      store.setIsExecuting(false);
      return;
    }

    // 2. Mark as running
    store.setActiveTask(task.id);
    store.updateTaskStatus(task.id, "running");
    store.clearStream();

    // 3. Read dependency file contents
    const depContents: Record<string, string> = {};
    for (const depId of task.dependsOn) {
      const depTask = tasks.find((t) => t.id === depId);
      if (depTask?.output) {
        depContents[depTask.filePath] = depTask.output;
      } else if (depTask) {
        try {
          depContents[depTask.filePath] = await readFile(
            projectHandle,
            depTask.filePath,
          );
        } catch {
          // File might not exist yet — skip
        }
      }
    }

    let currentTask = { ...task };
    let succeeded = false;

    while (currentTask.retryCount <= 3) {
      // 4. Build prompt
      const prompt =
        currentTask.retryCount === 0
          ? buildTaskExecutorPrompt(currentTask, depContents)
          : buildRetryPrompt(currentTask.output ?? "", currentTask.error ?? "");

      // 5. Stream response
      let fullOutput = "";
      await streamChat(
        [{ id: "exec", role: "user", content: prompt, timestamp: Date.now() }],
        config,
        (chunk) => {
          fullOutput += chunk;
          store.appendToStream(chunk);
        },
      );

      // 6. Validate
      const { valid, error } = validateOutput(currentTask.filePath, fullOutput);

      if (valid) {
        // 7a. Write file
        await writeFile(projectHandle, currentTask.filePath, fullOutput);
        store.setTaskOutput(currentTask.id, fullOutput);
        store.updateTaskStatus(currentTask.id, "done");
        succeeded = true;
        break;
      }

      // 7b. Retry
      if (currentTask.retryCount < 3) {
        currentTask = {
          ...currentTask,
          retryCount: currentTask.retryCount + 1,
          output: fullOutput,
          error: error,
        };
        store.clearStream();
      } else {
        // 7c. Failure after 3 retries — pause
        store.setTaskError(currentTask.id, error ?? "Unknown validation error");
        store.updateTaskStatus(currentTask.id, "error");
        store.clearStream();
        store.setActiveTask(null);
        store.setIsExecuting(false);
        return;
      }
    }

    if (!succeeded) {
      store.setIsExecuting(false);
      return;
    }

    store.clearStream();
    store.setActiveTask(null);
  }

  store.setIsExecuting(false);
}
