import "./load-env-file"; // first: the settings below read process.env as they load
import { getAi } from "@/lib/ai";
import { releaseModels } from "@/lib/ai/model-manager";
import { databasePath, getStore } from "@/lib/data";
import { log } from "@/lib/log";
import { startWorker } from "./run-worker";

/*
 * The worker process (spec: "a separate Node worker process" for hour-long scans and
 * embedding runs). Start with `npm run worker` beside `npm run dev`. Stops cleanly on Ctrl+C;
 * a hard kill leaves jobs "running", which the next start puts back in the queue.
 */
const store = getStore();
log("worker.database", { path: databasePath() });
// each job uses the models chosen on the settings page when it starts
const worker = startWorker({ store, ai: () => getAi(store.getModelChoices()) });

let stopping = false;
async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  log("worker.stopping", { signal });
  await worker.stop();
  await releaseModels(store); // hand the GPU back
  store.close();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
// the desktop app (desktop/jugaad-processes.mjs) asks over IPC — Windows has no SIGINT to send
// a child — and if the desktop app itself goes away, the worker stops rather than lingering
process.on("message", (message) => {
  if (message === "shutdown") void shutdown("desktop");
});
process.on("disconnect", () => void shutdown("desktop-gone"));
