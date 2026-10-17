"use client";

import { stopJob } from "@/app/organiser/actions";
import { Rotor } from "@/components/motif/rotor";
import { Button } from "@/components/ui/button";
import { jobWord } from "@/lib/domain/folder-status";
import { useServerAction } from "@/hooks/use-server-action";
import type { Job, WorkerStatus } from "@/schemas/job-schema";

/** What each kind of job tells the owner while it runs. */
const NOTES: Record<string, string> = {
  "scan-folder": "Duplicates are found by content. Online-only files are listed, never downloaded.",
  "suggest-categories": "Grouping files by what they're about, then naming each group.",
  "build-plan": "Nothing moves until you approve the plan. You can leave this page.",
  "apply-plan": "Every move is journalled and can be undone.",
  "undo-plan": "Files changed since they were moved are left where they are.",
};

/** Jobs that can stop part-way and leave everything consistent. Moving files runs to the end. */
const STOPPABLE = new Set(["scan-folder", "suggest-categories", "build-plan"]);

/**
 * A running or queued job on the compact rotor (locked design). On a phone it stacks — rotor,
 * then text, then Stop (owner's feedback, round 1). A job waiting on a stopped worker says so.
 */
export function JobProgress({ job, worker }: { job: Job; worker: WorkerStatus }) {
  const { pending, run } = useServerAction();
  const waiting = job.status === "queued";
  const title = job.detail ?? (waiting ? `${jobWord(job)} — waiting to start` : `${jobWord(job)}…`);

  return (
    <div className="flex min-w-0 items-center gap-3.5 bg-card px-3.5 py-3 shadow-[inset_0_0_0_1px_var(--border)] max-sm:flex-col max-sm:items-start">
      <Rotor compact progress={waiting ? null : job.progress ?? 0} caption="" label={`${jobWord(job)}: ${title}`} />
      <div className="grid min-w-0 flex-1 gap-0.5" aria-live="polite">
        <b className="font-semibold">{title}</b>
        <span className="text-[13px] text-muted-foreground">
          {waiting && !worker.online
            ? "The worker isn't running, so this hasn't started. Start it with npm run worker."
            : NOTES[job.kind]}
        </span>
      </div>
      {STOPPABLE.has(job.kind) && (
        <Button variant="ghost" size="sm" loading={pending} onClick={() => run(() => stopJob(job.id))}>
          Stop
        </Button>
      )}
    </div>
  );
}
