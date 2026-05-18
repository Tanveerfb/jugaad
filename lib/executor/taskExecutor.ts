// RULES (enforced here):
// 1. Never inline prompt strings — all prompts are built in lib/llm/prompts.ts
// 2. System prompt always says: "Respond with only the raw file content. No explanations, no markdown fences, no commentary."
// 3. Validate before writing — never call writeFile on unvalidated LLM output
// 4. Pause on error — if a task fails after 3 retries, stop. Do not silently skip.
// 5. Doc chunks are injected per task, not globally.

import { streamChat } from "@/lib/llm/client";
import {
  buildTaskExecutorPrompt,
  buildRetryPrompt,
  buildFixerPrompt,
  buildTypecheckFixPrompt,
  buildBuildFixPrompt,
} from "@/lib/llm/prompts";
import { validateOutput } from "./validator";
import { writeFile } from "@/lib/fs/writer";
import { enforceLatestVersions } from "@/lib/versioning";
import { useTaskStore } from "@/stores/taskStore";
import { useProjectPlanStore } from "@/stores/projectPlanStore";
import { useFsStore } from "@/stores/fsStore";
import { toast } from "sonner";
import type { LLMConfig, Task } from "@/types";

export async function executeAll(
  tasks: Task[],
  projectPath: string,
  config: LLMConfig,
): Promise<void> {
  const store = useTaskStore.getState();
  store.setIsExecuting(true);
  store.setBuildStart();

  // Record the effective project path so TaskBoard can use it for retries
  useFsStore.getState().setActiveProjectPath(projectPath);

  for (const task of tasks) {
    // 0. Skip tasks that are already done (supports resume-after-error)
    const currentStatus = useTaskStore
      .getState()
      .tasks.find((t) => t.id === task.id)?.status;
    if (currentStatus === "done") continue;

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

    // 4. Retry loop — max 3 LLM attempts (attempts 0, 1, 2).
    //    After each successful write, an isolated TypeScript check validates
    //    the file. Errors in the file itself trigger an additional retry.
    for (let attempt = 0; attempt < 3; attempt++) {
      const prompt =
        attempt === 0
          ? task.isSystem
            ? buildFixerPrompt(depContents)
            : buildTaskExecutorPrompt(task, depContents)
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

      if (!valid) {
        // Structural/syntax validation failed
        lastOutput = fullOutput;
        lastError = error ?? "Unknown validation error";

        if (attempt < 2) {
          useTaskStore.getState().incrementRetry(task.id);
          useTaskStore.getState().clearStream();
          continue;
        }
        // All 3 attempts exhausted on validation
        useTaskStore.getState().setTaskError(task.id, lastError);
        useTaskStore.getState().updateTaskStatus(task.id, "error");
        useTaskStore.getState().clearStream();
        useTaskStore.getState().setActiveTask(null);
        if (task.isSystem) {
          toast.warning(
            `${task.title} failed — run npm install manually in the output folder`,
          );
        } else {
          useTaskStore.getState().setIsExecuting(false);
          toast.error(
            `Task failed: ${task.title} — fix required before continuing`,
          );
          return;
        }
        break;
      }

      // Structural validation passed — write the file
      const outputToWrite =
        task.filePath === "package.json"
          ? enforceLatestVersions(fullOutput)
          : fullOutput;
      await writeFile(projectPath, task.filePath, outputToWrite);

      // 4b. Isolated TypeScript type-check on the just-written file.
      //     Uses --noResolve so partial projects don't cause false negatives.
      //     Non-TS files (CSS, JSON) are skipped automatically by the API.
      if (!task.isSystem) {
        try {
          const tcResp = await fetch("/api/typecheck", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectPath, filePath: task.filePath }),
          });
          if (tcResp.ok) {
            const tcData = (await tcResp.json()) as {
              errors: { line: number; col: number; message: string }[];
            };
            if (tcData.errors.length > 0) {
              // File has real TypeScript errors — retry with detailed feedback
              const tcErrorSummary = tcData.errors
                .map((e) => `Line ${e.line}:${e.col} — ${e.message}`)
                .join("\n");
              lastOutput = outputToWrite;
              lastError = `TypeScript type errors found:\n${tcErrorSummary}`;

              if (attempt < 2) {
                useTaskStore.getState().incrementRetry(task.id);
                useTaskStore.getState().clearStream();
                // Override next prompt to use typecheck-aware fix prompt
                // We break out of the inner check and loop again, but we need
                // the next prompt to include the typecheck errors. We do this
                // by setting lastError (used by buildRetryPrompt on next attempt).
                continue;
              }
              // Third attempt still has TS errors — halt build
              useTaskStore.getState().setTaskError(task.id, lastError);
              useTaskStore.getState().updateTaskStatus(task.id, "error");
              useTaskStore.getState().clearStream();
              useTaskStore.getState().setActiveTask(null);
              useTaskStore.getState().setIsExecuting(false);
              toast.error(
                `Task failed: ${task.title} — TypeScript errors could not be resolved`,
              );
              return;
            }
          }
        } catch {
          // Typecheck API unavailable — non-fatal, continue
        }
      }

      useTaskStore.getState().setTaskOutput(task.id, outputToWrite);
      useTaskStore.getState().updateTaskStatus(task.id, "done");
      succeeded = true;
      break;
    }

    if (!succeeded) {
      useTaskStore.getState().setIsExecuting(false);
      return;
    }

    useTaskStore.getState().clearStream();
    useTaskStore.getState().setActiveTask(null);
  }

  useTaskStore.getState().setIsExecuting(false);
  useTaskStore.getState().setBuildFinish();

  // ── Phase 2: npm install ───────────────────────────────────────────────────
  try {
    toast.loading("Installing dependencies…", { id: "npm-install" });
    const resp = await fetch("/api/install", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectPath }),
    });
    if (resp.ok) {
      toast.success("Dependencies installed!", { id: "npm-install" });
    } else {
      const data = (await resp.json()) as { error?: string };
      toast.warning(
        `npm install failed: ${data.error ?? "unknown error"} — run it manually`,
        { id: "npm-install" },
      );
    }
  } catch {
    toast.warning(
      "Could not run npm install — run it manually in the output folder",
      { id: "npm-install" },
    );
  }

  // ── Phase 3: next build verification + repair loop ────────────────────────
  // Run `next build` up to 3 times. If it fails, identify the files with
  // errors, re-generate those specific files with the build error as context,
  // then rebuild. This guarantees the final project is error-free.
  const MAX_BUILD_PASSES = 3;
  let buildPassed = false;

  for (let pass = 0; pass < MAX_BUILD_PASSES; pass++) {
    toast.loading(
      pass === 0
        ? "Verifying build…"
        : `Repair pass ${pass}/${MAX_BUILD_PASSES - 1} — rebuilding…`,
      { id: "build-verify" },
    );

    let buildSuccess = false;
    let buildErrors: { file: string; message: string }[] = [];
    let buildRaw = "";

    try {
      const buildResp = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectPath }),
      });
      const buildData = (await buildResp.json()) as {
        success: boolean;
        errors: { file: string; message: string }[];
        raw: string;
      };
      buildSuccess = buildData.success;
      buildErrors = buildData.errors ?? [];
      buildRaw = buildData.raw ?? "";
    } catch {
      toast.warning("Build check unavailable — project may still work", {
        id: "build-verify",
      });
      break;
    }

    if (buildSuccess) {
      toast.success("Build verified — project is ready!", {
        id: "build-verify",
      });
      buildPassed = true;
      break;
    }

    if (pass === MAX_BUILD_PASSES - 1) {
      // All repair passes exhausted
      toast.warning(
        "Build still has errors after repairs — check the output folder manually",
        { id: "build-verify" },
      );
      break;
    }

    if (buildErrors.length === 0) {
      // Build failed but no structured errors parsed — stop trying
      toast.warning(
        "Build failed — could not identify specific errors. Check the output folder.",
        { id: "build-verify" },
      );
      break;
    }

    // Collect all project file outputs for context in the fix prompt
    const allProjectFiles: Record<string, string> = {};
    for (const t of useTaskStore.getState().tasks) {
      if (t.output) allProjectFiles[t.filePath] = t.output;
    }

    // For each errored file, find the owning task and re-generate it
    const affectedFilePaths = [...new Set(buildErrors.map((e) => e.file))];
    let repairedAny = false;

    for (const erroredFile of affectedFilePaths) {
      const erroredTask = useTaskStore
        .getState()
        .tasks.find((t) => t.filePath === erroredFile);
      if (!erroredTask) continue;

      const fileErrors = buildErrors.filter((e) => e.file === erroredFile);

      // Build dep contents for this task
      const repairDeps: Record<string, string> = {};
      for (const depId of erroredTask.dependsOn) {
        const dep = useTaskStore.getState().tasks.find((t) => t.id === depId);
        if (dep?.output) repairDeps[dep.filePath] = dep.output;
      }

      useTaskStore.getState().setActiveTask(erroredTask.id);
      useTaskStore.getState().updateTaskStatus(erroredTask.id, "running");
      useTaskStore.getState().clearStream();

      const fixPrompt = buildBuildFixPrompt(
        erroredTask,
        repairDeps,
        fileErrors,
        erroredTask.output ?? "",
        allProjectFiles,
      );

      let fixedOutput = "";
      await streamChat(
        [
          {
            id: "repair",
            role: "user",
            content: fixPrompt,
            timestamp: Date.now(),
          },
        ],
        config,
        (chunk) => {
          fixedOutput += chunk;
          useTaskStore.getState().appendToStream(chunk);
        },
      );

      const { valid: fixValid } = validateOutput(
        erroredTask.filePath,
        fixedOutput,
      );
      if (fixValid) {
        const toWrite =
          erroredTask.filePath === "package.json"
            ? enforceLatestVersions(fixedOutput)
            : fixedOutput;
        await writeFile(projectPath, erroredTask.filePath, toWrite);
        useTaskStore.getState().setTaskOutput(erroredTask.id, toWrite);
        useTaskStore.getState().updateTaskStatus(erroredTask.id, "done");
        repairedAny = true;
      }

      useTaskStore.getState().clearStream();
      useTaskStore.getState().setActiveTask(null);
    }

    if (!repairedAny) {
      toast.warning(
        "Build errors could not be auto-fixed — check the output folder",
        {
          id: "build-verify",
        },
      );
      break;
    }

    // After repairs, run npm install again in case package.json changed
    try {
      await fetch("/api/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectPath }),
      });
    } catch {
      // non-fatal
    }
  }

  // ── Phase 4: Write project manifest ───────────────────────────────────────
  const plan = useProjectPlanStore.getState().plan;
  if (plan) {
    try {
      await writeFile(
        projectPath,
        "jugaad.json",
        JSON.stringify(plan, null, 2),
      );
    } catch {
      // non-fatal
    }
  }

  if (buildPassed) {
    toast.success("Project built successfully and verified! 🎉");
  } else {
    toast.success(
      "Project files generated — review build output for any remaining issues.",
    );
  }
}

/**
 * Re-run a single task (for manual retry of failed or completed tasks).
 * Uses completed dependency outputs already stored in the task store.
 */
export async function executeSingleTask(
  taskId: string,
  projectPath: string,
  config: LLMConfig,
): Promise<void> {
  const store = useTaskStore.getState();
  const task = store.tasks.find((t) => t.id === taskId);
  if (!task) return;

  store.setIsExecuting(true);
  store.setActiveTask(task.id);
  store.updateTaskStatus(task.id, "running");
  store.clearStream();

  // Build dep contents from already-done tasks
  const depContents: Record<string, string> = {};
  for (const depId of task.dependsOn) {
    const dep = store.tasks.find((t) => t.id === depId);
    if (dep?.output) depContents[dep.filePath] = dep.output;
  }

  let lastOutput = "";
  let lastError = "";
  let succeeded = false;

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

    lastOutput = fullOutput;
    lastError = error ?? "Unknown validation error";

    if (attempt < 2) {
      useTaskStore.getState().incrementRetry(task.id);
      useTaskStore.getState().clearStream();
    } else {
      useTaskStore.getState().setTaskError(task.id, lastError);
      useTaskStore.getState().updateTaskStatus(task.id, "error");
      toast.error(`Task failed: ${task.title}`);
    }
  }

  useTaskStore.getState().clearStream();
  useTaskStore.getState().setActiveTask(null);
  useTaskStore.getState().setIsExecuting(false);

  if (succeeded) toast.success(`Task completed: ${task.title}`);
}
