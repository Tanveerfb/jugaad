import { StatusLight } from "@/components/motif/status-light";
import type { WorkerStatus } from "@/schemas/job-schema";

/**
 * Said once, at the top, when the worker isn't running: scans and sorting would otherwise sit
 * in the queue with nothing to say why. Nothing shows while it runs.
 */
export function WorkerNotice({ worker }: { worker: WorkerStatus }) {
  if (worker.online) return null;
  return (
    <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-surface-2 px-3.5 py-2.5 text-[13.5px] shadow-[inset_3px_0_0_var(--attention)]">
      <StatusLight tone="attention">Worker not running</StatusLight>
      <span className="text-muted-foreground">
        Scans and sorting wait until it starts. Start Jugaad with <code className="font-mono text-foreground">npm run app</code>,
        or run <code className="font-mono text-foreground">npm run worker</code> beside the app.
      </span>
    </div>
  );
}
