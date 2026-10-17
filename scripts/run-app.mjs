/*
 * Starts Jugaad in one go: the app (production build, on 127.0.0.1) and the worker beside it.
 * `npm run app`. Ctrl+C stops both; if either stops on its own, the other is stopped too, so
 * the app never runs without the worker that does its jobs. Builds first if there is no build.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const run = (args, name) => {
  const child = spawn(npm, args, { stdio: "inherit", shell: process.platform === "win32" });
  child.on("exit", (code) => {
    console.log(`\n${name} stopped${code ? ` (exit ${code})` : ""} — stopping Jugaad.`);
    shutdown(code ?? 0);
  });
  return child;
};

if (!existsSync(".next/BUILD_ID")) {
  console.log("No build yet — building Jugaad first (about a minute)…");
  const build = spawn(npm, ["run", "build"], { stdio: "inherit", shell: process.platform === "win32" });
  const code = await new Promise((resolve) => build.on("exit", resolve));
  if (code !== 0) process.exit(code ?? 1);
}

const children = [run(["run", "start"], "The app"), run(["run", "worker"], "The worker")];
console.log("\nJugaad is starting: open http://127.0.0.1:3000 — Ctrl+C here stops it.\n");

let stopping = false;
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill("SIGINT");
  setTimeout(() => process.exit(code), 3000).unref();
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
