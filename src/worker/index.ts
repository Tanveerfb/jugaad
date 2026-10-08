import { getAi } from "@/lib/ai";
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
const worker = startWorker({ store, ai: getAi() });

let stopping = false;
async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  log("worker.stopping", { signal });
  await worker.stop();
  store.close();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
