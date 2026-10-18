/*
 * Starts and stops Jugaad's two processes for the desktop app — the app (`next start` on
 * 127.0.0.1:3000) and the worker — on Electron's own Node (`ELECTRON_RUN_AS_NODE`, Node 24 like
 * the project pin), so the shortcut needs no Node on PATH. Builds first if there is no build,
 * as `npm run app` does. Output goes to a log file the startup screen can open.
 */
import { spawn } from "node:child_process";
import { createWriteStream, existsSync } from "node:fs";
import { join } from "node:path";

export const APP_URL = "http://127.0.0.1:3000";

/**
 * What answers on the app's address: Jugaad already running (from `npm run app`, or an earlier
 * desktop start), something else, or nothing.
 * @returns {Promise<"jugaad" | "other" | "free">}
 */
export async function probeApp() {
  try {
    const res = await fetch(APP_URL, { signal: AbortSignal.timeout(3000) });
    return (await res.text()).includes("<title>Jugaad</title>") ? "jugaad" : "other";
  } catch (error) {
    // nothing listening is the only "free"; a timeout means something holds the port
    return error?.cause?.code === "ECONNREFUSED" ? "free" : "other";
  }
}

/**
 * Runs the build and starts the app and worker, reporting each step.
 * @param {{ root: string, logPath: string, onStep: (step: string) => void,
 *   onWorkerEvent: (event: string) => void, onExit: (name: string, code: number | null) => void }} options
 */
export async function startJugaad({ root, logPath, onStep, onWorkerEvent, onExit }) {
  const log = createWriteStream(logPath, { flags: "a" });
  log.write(`\n=== Jugaad desktop start ${new Date().toISOString()} ===\n`);
  const node = (args, ipc = false) =>
    spawn(process.execPath, args, {
      cwd: root,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
      stdio: ["ignore", "pipe", "pipe", ...(ipc ? ["ipc"] : [])],
      windowsHide: true,
    });
  const next = join(root, "node_modules", "next", "dist", "bin", "next");
  const pipe = (child) => {
    child.stdout.pipe(log, { end: false });
    child.stderr.pipe(log, { end: false });
  };

  if (!existsSync(join(root, ".next", "BUILD_ID"))) {
    onStep("build");
    const build = node([next, "build"]);
    pipe(build);
    const code = await new Promise((resolve) => build.on("exit", resolve));
    if (code !== 0) throw new StartError("The build failed.");
  }

  onStep("app");
  const app = node([next, "start", "-H", "127.0.0.1", "-p", "3000"]);
  pipe(app);
  const appExit = new Promise((resolve) => app.on("exit", resolve));
  if (!(await waitFor(async () => (await probeApp()) === "jugaad", appExit, 60_000))) {
    app.kill();
    throw new StartError("The app didn't start.");
  }

  onStep("worker");
  const worker = node(["--import", "tsx", join("src", "worker", "index.ts")], true);
  pipe(worker);
  let started = false;
  worker.stdout.on("data", (chunk) => {
    for (const event of String(chunk).matchAll(/ (worker\.started|job\.\w+)/g)) {
      if (event[1] === "worker.started") started = true;
      onWorkerEvent(event[1]);
    }
  });
  const workerExit = new Promise((resolve) => worker.on("exit", resolve));
  if (!(await waitFor(() => started, workerExit, 30_000))) {
    worker.kill();
    app.kill();
    throw new StartError("The worker didn't start.");
  }

  let stopping = false;
  for (const [name, child] of [["app", app], ["worker", worker]]) {
    child.on("exit", (code) => {
      if (!stopping) onExit(name, code);
    });
  }

  return {
    /** Stops both: the worker over IPC so it frees its models, then the app. */
    async stop() {
      stopping = true;
      if (worker.exitCode === null && worker.connected) worker.send("shutdown");
      const gone = await Promise.race([workerExit.then(() => true), delay(15_000).then(() => false)]);
      if (!gone) worker.kill();
      if (app.exitCode === null) app.kill();
      await appExit;
      log.end();
    },
  };
}

export class StartError extends Error {}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Polls `check` until it passes, the process exits, or time runs out. */
async function waitFor(check, exited, timeoutMs) {
  let done = false;
  exited.then(() => (done = true));
  const until = Date.now() + timeoutMs;
  while (!done && Date.now() < until) {
    if (await check()) return true;
    await delay(400);
  }
  return false;
}
