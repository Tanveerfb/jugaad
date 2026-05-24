// RULES (enforced here):
// 1. Never inline prompt strings — all prompts are built in lib/llm/prompts.ts
// 2. System prompt always says: "Respond with only the raw file content. No explanations, no markdown fences, no commentary."
// 3. Validate before writing — never call writeFile on unvalidated LLM output
// 4. Pause on error — if a task fails after 3 retries, stop. Do not silently skip.
// 5. Doc chunks are injected per task, not globally.

import { streamChat } from "@/lib/llm/client";

/** Per-file token budget for the task executor. Set high enough to accommodate
 *  thinking-model reasoning tokens (e.g. qwen3.5-9b reasoning_content) before
 *  the actual file content is emitted. Model context window is 96k tokens. */
const TASK_EXEC_MAX_TOKENS = 90_000;

/** Disable thinking/reasoning tokens for Qwen3-style models.
 *  0 = fully disable thinking (fast code generation).
 *  Set to a positive number to allow limited thinking tokens.
 *  undefined = no budget cap (not recommended for code tasks). */
const TASK_THINKING_BUDGET = 0;

/**
 * Prefix added to every task-executor user message.
 * `/no_think` is a qwen3 built-in that disables the <think>...</think> mode,
 * producing output immediately without a long reasoning preamble.
 * Other models silently ignore this line.
 */
const NO_THINK_PREFIX = "/no_think\n";
import {
  buildTaskExecutorPrompt,
  buildRetryPrompt,
  buildFixerPrompt,
  buildTypecheckFixPrompt,
  buildBuildFixPrompt,
  buildModularizePrompt,
} from "@/lib/llm/prompts";
import { validateOutput } from "./validator";
import { writeFile } from "@/lib/fs/writer";
import { enforceLatestVersions } from "@/lib/versioning";
import { useTaskStore } from "@/stores/taskStore";
import { useProjectPlanStore } from "@/stores/projectPlanStore";
import { useFsStore } from "@/stores/fsStore";
import { notify } from "@/lib/notify";
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

  // ── Phase 0a: Write project manifest immediately ─────────────────────────
  // Writing jugaad.json + conversation before any LLM work so the project
  // appears in ProjectBrowser as soon as the build starts.
  const plan = useProjectPlanStore.getState().plan;
  const conversation = useProjectPlanStore.getState().conversation;
  const stackSelected = plan?.stack?.selected ?? [];
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
  if (conversation.length > 0) {
    try {
      await writeFile(
        projectPath,
        "jugaad-conversation.json",
        JSON.stringify(conversation, null, 2),
      );
    } catch {
      // non-fatal
    }
  }

  // Tracks whether npm install ran mid-loop (after package.json was written).
  // A fallback install runs at the end if package.json was never generated.
  let npmInstallDone = false;

  // Use an indexed loop so we can splice sub-tasks in mid-iteration when a
  // task is auto-split. tasks.length is re-evaluated on every iteration.
  for (let taskIdx = 0; taskIdx < tasks.length; taskIdx++) {
    const task = tasks[taskIdx];
    // 0. Skip tasks that are already done or split (supports resume-after-error)
    const currentStatus = useTaskStore
      .getState()
      .tasks.find((t) => t.id === task.id)?.status;
    if (currentStatus === "done" || currentStatus === "split") continue;

    // 1. Pre-check: all declared dependencies must be "done" (or "split") in the store
    const storeTasks = useTaskStore.getState().tasks;
    for (const depId of task.dependsOn) {
      // Match by ID first; fall back to filePath for projects where the LLM
      // wrote file paths into dependsOn instead of task IDs.
      const dep = storeTasks.find(
        (t) => t.id === depId || t.filePath === depId,
      );
      if (!dep || (dep.status !== "done" && dep.status !== "split")) {
        const msg = `Dependency ${depId} not complete for task ${task.id}`;
        useTaskStore.getState().setTaskError(task.id, msg);
        useTaskStore.getState().updateTaskStatus(task.id, "error");
        useTaskStore.getState().setIsExecuting(false);
        notify.error(`Task failed: ${task.title} — dependency not complete`);
        return;
      }
    }

    // 2. Mark running
    useTaskStore.getState().setActiveTask(task.id);
    useTaskStore.getState().updateTaskStatus(task.id, "running");
    useTaskStore.getState().clearStream();

    // 3. Build dependency file contents from already-completed task outputs.
    //    For "split" deps, fall back to the task that produced the same filePath.
    const depContents: Record<string, string> = {};
    for (const depId of task.dependsOn) {
      // Also match by filePath for projects where dependsOn stores paths not IDs.
      const completedTask = useTaskStore
        .getState()
        .tasks.find((t) => t.id === depId || t.filePath === depId);
      if (completedTask?.status === "done" && completedTask.output) {
        depContents[completedTask.filePath] = completedTask.output;
      } else if (completedTask?.status === "split") {
        // Original task was auto-split — find the sub-task that wrote to the same path
        const replacement = useTaskStore
          .getState()
          .tasks.find(
            (t) =>
              t.filePath === completedTask.filePath &&
              t.status === "done" &&
              t.output,
          );
        if (replacement?.output) {
          depContents[replacement.filePath] = replacement.output;
        }
      }
    }

    let lastOutput = "";
    let lastError = "";
    let lastTcErrors: { line: number; col: number; message: string }[] = [];
    let succeeded = false;
    let wasSplit = false;

    // 4. Retry loop — max 3 LLM attempts (attempts 0, 1, 2).
    //    After each successful write, an isolated TypeScript check validates
    //    the file. Errors in the file itself trigger an additional retry.
    for (let attempt = 0; attempt < 3; attempt++) {
      const rawPrompt =
        attempt === 0
          ? task.isSystem
            ? buildFixerPrompt(depContents, stackSelected)
            : buildTaskExecutorPrompt(task, depContents, stackSelected)
          : lastTcErrors.length > 0
            ? buildTypecheckFixPrompt(
                task,
                depContents,
                lastTcErrors,
                lastOutput,
                stackSelected,
              )
            : lastOutput
              ? buildRetryPrompt(lastOutput, lastError)
              : buildTaskExecutorPrompt(task, depContents, stackSelected);
      // Prepend /no_think to suppress qwen3 extended thinking (other models ignore it).
      const prompt = NO_THINK_PREFIX + rawPrompt;

      let fullOutput = "";
      try {
        await streamChat(
          [
            {
              id: "exec",
              role: "user",
              content: prompt,
              timestamp: Date.now(),
            },
          ],
          config,
          (chunk) => {
            fullOutput += chunk;
            useTaskStore.getState().appendToStream(chunk);
          },
          TASK_EXEC_MAX_TOKENS,
          (chunk) => useTaskStore.getState().appendToThinking(chunk),
          TASK_THINKING_BUDGET,
        );
      } catch (streamErr) {
        // Treat stream errors (connection drop, stall timeout) as retryable failures.
        lastError = (streamErr as Error).message;
        lastOutput = "";
        if (attempt < 2) {
          useTaskStore.getState().incrementRetry(task.id);
          useTaskStore.getState().clearStream();
          continue;
        }
        useTaskStore.getState().setTaskError(task.id, lastError);
        useTaskStore.getState().updateTaskStatus(task.id, "error");
        useTaskStore.getState().clearStream();
        useTaskStore.getState().setActiveTask(null);
        useTaskStore.getState().setIsExecuting(false);
        notify.error(`Task failed: ${task.title} — ${lastError}`);
        return;
      }

      const { valid, error } = validateOutput(task.filePath, fullOutput);

      if (!valid) {
        // Structural/syntax validation failed
        lastTcErrors = [];
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
          notify.warning(
            `${task.title} failed — run npm install manually in the output folder`,
          );
        } else {
          // Try to auto-split the task into smaller sub-tasks
          const split = await tryModularize(task, depContents, config);
          if (split.length > 0) {
            tasks.splice(taskIdx + 1, 0, ...split);
            useTaskStore.getState().insertTasksAfter(task.id, split);
            useTaskStore.getState().markAsSplit(task.id);
            wasSplit = true;
            notify.info(
              `"${task.title}" was auto-split into ${split.length} smaller tasks`,
            );
          } else {
            useTaskStore.getState().setIsExecuting(false);
            notify.error(
              `Task failed: ${task.title} — fix required before continuing`,
            );
            return;
          }
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
              lastTcErrors = tcData.errors;
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
              // Third attempt still has TS errors — try to auto-split
              useTaskStore.getState().setTaskError(task.id, lastError);
              useTaskStore.getState().updateTaskStatus(task.id, "error");
              useTaskStore.getState().clearStream();
              useTaskStore.getState().setActiveTask(null);
              const split = await tryModularize(task, depContents, config);
              if (split.length > 0) {
                tasks.splice(taskIdx + 1, 0, ...split);
                useTaskStore.getState().insertTasksAfter(task.id, split);
                useTaskStore.getState().markAsSplit(task.id);
                wasSplit = true;
                notify.info(
                  `"${task.title}" was auto-split into ${split.length} smaller tasks`,
                );
              } else {
                useTaskStore.getState().setIsExecuting(false);
                notify.error(
                  `Task failed: ${task.title} — TypeScript errors could not be resolved`,
                );
                return;
              }
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

    if (!succeeded && !wasSplit) {
      useTaskStore.getState().setIsExecuting(false);
      return;
    }

    useTaskStore.getState().clearStream();
    useTaskStore.getState().setActiveTask(null);

    // ── Early npm install ─────────────────────────────────────────────────
    // Run immediately after package.json is written so that every subsequent
    // LLM task operates against the real installed package tree / type defs.
    if (task.filePath === "package.json" && !npmInstallDone) {
      npmInstallDone = true;
      notify.loading("Installing dependencies…", { id: "npm-install" });
      try {
        const resp = await fetch("/api/install", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectPath }),
        });
        if (resp.ok) {
          notify.success("Dependencies installed!", { id: "npm-install" });
        } else {
          const data = (await resp.json()) as { error?: string };
          notify.warning(
            `npm install failed: ${data.error ?? "unknown error"} — run it manually`,
            { id: "npm-install" },
          );
        }
      } catch {
        notify.warning(
          "Could not run npm install — run it manually in the output folder",
          { id: "npm-install" },
        );
      }
    }
  }

  useTaskStore.getState().setIsExecuting(false);
  useTaskStore.getState().setBuildFinish();

  // ── Fallback npm install (if package.json was never generated) ────────────
  if (!npmInstallDone) {
    try {
      notify.loading("Installing dependencies…", { id: "npm-install" });
      const resp = await fetch("/api/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectPath }),
      });
      if (resp.ok) {
        notify.success("Dependencies installed!", { id: "npm-install" });
      } else {
        const data = (await resp.json()) as { error?: string };
        notify.warning(
          `npm install failed: ${data.error ?? "unknown error"} — run it manually`,
          { id: "npm-install" },
        );
      }
    } catch {
      notify.warning(
        "Could not run npm install — run it manually in the output folder",
        { id: "npm-install" },
      );
    }
  }

  // ── Phase 2.5: Project-wide TypeScript check ─────────────────────────────
  // Runs `tsc --noEmit` against the full project (all imports resolved).
  // This catches cross-file type errors that the per-file --noResolve check
  // misses: wrong string literal values, non-exported symbols, prop mismatches.
  // Errors are grouped by file and each errored file is re-generated once with
  // the full project context before proceeding to next build.
  notify.loading("Type-checking project…", { id: "tsc-check" });
  try {
    const tcResp = await fetch("/api/typecheck", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectPath, filePath: "**" }),
    });
    if (tcResp.ok) {
      const tcData = (await tcResp.json()) as {
        errors: { file: string; line: number; col: number; message: string }[];
      };

      if (tcData.errors.length > 0) {
        notify.loading(`Fixing ${tcData.errors.length} type error(s)…`, {
          id: "tsc-check",
        });

        const allProjectFiles: Record<string, string> = {};
        for (const t of useTaskStore.getState().tasks) {
          if (t.output) allProjectFiles[t.filePath] = t.output;
        }

        // Group errors by file and repair each errored file once
        const errorsByFile = new Map<
          string,
          { line: number; col: number; message: string }[]
        >();
        for (const err of tcData.errors) {
          // Normalize to forward-slash relative path for task lookup
          const rel = err.file
            .replace(/\\/g, "/")
            .replace(/^.*?([^/]+\/[^/]+)$/, "$1");
          const taskFilePath = Object.keys(allProjectFiles).find((p) =>
            err.file.replace(/\\/g, "/").endsWith(p.replace(/\\/g, "/")),
          );
          if (!taskFilePath) continue;
          if (!errorsByFile.has(taskFilePath))
            errorsByFile.set(taskFilePath, []);
          errorsByFile
            .get(taskFilePath)!
            .push({ line: err.line, col: err.col, message: err.message });
        }

        for (const [erroredFilePath, fileErrors] of errorsByFile) {
          const erroredTask = useTaskStore
            .getState()
            .tasks.find((t) => t.filePath === erroredFilePath);
          if (!erroredTask) continue;

          const repairDeps: Record<string, string> = {};
          for (const depId of erroredTask.dependsOn) {
            const dep = useTaskStore
              .getState()
              .tasks.find((t) => t.id === depId);
            if (dep?.output) repairDeps[dep.filePath] = dep.output;
          }

          useTaskStore.getState().setActiveTask(erroredTask.id);
          useTaskStore.getState().updateTaskStatus(erroredTask.id, "running");
          useTaskStore.getState().clearStream();

          const fixPrompt = buildBuildFixPrompt(
            erroredTask,
            repairDeps,
            fileErrors.map((e) => ({
              file: erroredFilePath,
              message: `Line ${e.line}:${e.col} — ${e.message}`,
            })),
            erroredTask.output ?? "",
            allProjectFiles,
          );

          let fixedOutput = "";
          await streamChat(
            [
              {
                id: "tsc-repair",
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
            TASK_EXEC_MAX_TOKENS,
            (chunk) => useTaskStore.getState().appendToThinking(chunk),
            TASK_THINKING_BUDGET,
          );

          const { valid: fixValid } = validateOutput(
            erroredTask.filePath,
            fixedOutput,
          );
          if (fixValid) {
            await writeFile(projectPath, erroredTask.filePath, fixedOutput);
            useTaskStore.getState().setTaskOutput(erroredTask.id, fixedOutput);
            useTaskStore.getState().updateTaskStatus(erroredTask.id, "done");
          }

          useTaskStore.getState().clearStream();
          useTaskStore.getState().setActiveTask(null);
        }

        notify.success("Type errors repaired.", { id: "tsc-check" });
      } else {
        notify.success("Type check passed.", { id: "tsc-check" });
      }
    }
  } catch {
    // Non-fatal — proceed to next build which will surface any remaining errors
    notify.dismiss("tsc-check");
  }

  // ── Phase 3: next build verification + repair loop ────────────────────────
  // Run `next build` up to 3 times. If it fails, identify the files with
  // errors, re-generate those specific files with the build error as context,
  // then rebuild. This guarantees the final project is error-free.
  const MAX_BUILD_PASSES = 3;
  let buildPassed = false;

  for (let pass = 0; pass < MAX_BUILD_PASSES; pass++) {
    notify.loading(
      pass === 0
        ? "Verifying build…"
        : `Repair pass ${pass}/${MAX_BUILD_PASSES - 1} — rebuilding…`,
      { id: "build-verify" },
    );

    let buildSuccess = false;
    let buildErrors: { file: string; message: string }[] = [];

    try {
      const buildResp = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectPath }),
      });
      const buildData = (await buildResp.json()) as {
        success: boolean;
        errors: { file: string; message: string }[];
      };
      buildSuccess = buildData.success;
      buildErrors = buildData.errors ?? [];
    } catch {
      notify.warning("Build check unavailable — project may still work", {
        id: "build-verify",
      });
      break;
    }

    if (buildSuccess) {
      notify.success("Build verified — project is ready!", {
        id: "build-verify",
      });
      buildPassed = true;
      break;
    }

    if (pass === MAX_BUILD_PASSES - 1) {
      // All repair passes exhausted
      notify.warning(
        "Build still has errors after repairs — check the output folder manually",
        { id: "build-verify" },
      );
      break;
    }

    if (buildErrors.length === 0) {
      // Build failed but no structured errors parsed — stop trying
      notify.warning(
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
        TASK_EXEC_MAX_TOKENS,
        (chunk) => useTaskStore.getState().appendToThinking(chunk),
        TASK_THINKING_BUDGET,
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
      notify.warning(
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

  if (buildPassed) {
    notify.success("Project built successfully and verified! 🎉");
  } else {
    notify.success(
      "Project files generated — review build output for any remaining issues.",
    );
  }
}

/**
 * Ask the LLM to split a failed task into 2-4 smaller sub-tasks.
 * Returns the new Task objects ready to be spliced into the queue, or []
 * if the LLM output couldn't be parsed.
 */
async function tryModularize(
  task: Task,
  depContents: Record<string, string>,
  config: LLMConfig,
): Promise<Task[]> {
  notify.loading(`Auto-splitting "${task.title}"…`, { id: "modularize" });
  let rawOutput = "";
  try {
    await streamChat(
      [
        {
          id: "modularize",
          role: "user",
          content: NO_THINK_PREFIX + buildModularizePrompt(task, depContents),
          timestamp: Date.now(),
        },
      ],
      config,
      (chunk) => {
        rawOutput += chunk;
      },
      8_192,
      (chunk) => useTaskStore.getState().appendToThinking(chunk),
      TASK_THINKING_BUDGET,
    );
  } catch {
    notify.dismiss("modularize");
    return [];
  }

  // Extract JSON from <subtasks>…</subtasks>
  const match = rawOutput.match(/<subtasks>([\s\S]*?)<\/subtasks>/);
  if (!match) {
    notify.dismiss("modularize");
    return [];
  }

  try {
    const raw = JSON.parse(match[1].trim()) as {
      id: string;
      title: string;
      filePath: string;
      instruction: string;
      dependsOn: string[];
    }[];

    const subTasks: Task[] = raw.map((s) => ({
      id: s.id,
      title: s.title,
      filePath: s.filePath,
      instruction: s.instruction,
      dependsOn: Array.isArray(s.dependsOn) ? s.dependsOn : [],
      docsContext: task.docsContext,
      status: "pending" as const,
      retryCount: 0,
    }));

    notify.dismiss("modularize");
    return subTasks;
  } catch {
    notify.dismiss("modularize");
    return [];
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

  // Retrieve stack to produce correct prompts for the project's framework.
  const singleTaskPlan = useProjectPlanStore.getState().plan;
  const singleTaskStack = singleTaskPlan?.stack?.selected ?? [];

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
    const rawPrompt =
      attempt === 0 || !lastOutput
        ? buildTaskExecutorPrompt(task, depContents, singleTaskStack)
        : buildRetryPrompt(lastOutput, lastError);
    const prompt = NO_THINK_PREFIX + rawPrompt;

    let fullOutput = "";
    await streamChat(
      [{ id: "exec", role: "user", content: prompt, timestamp: Date.now() }],
      config,
      (chunk) => {
        fullOutput += chunk;
        useTaskStore.getState().appendToStream(chunk);
      },
      TASK_EXEC_MAX_TOKENS,
      (chunk) => useTaskStore.getState().appendToThinking(chunk),
      TASK_THINKING_BUDGET,
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
      notify.error(`Task failed: ${task.title}`);
    }
  }

  useTaskStore.getState().clearStream();
  useTaskStore.getState().setActiveTask(null);
  useTaskStore.getState().setIsExecuting(false);

  if (succeeded) notify.success(`Task completed: ${task.title}`);
}
