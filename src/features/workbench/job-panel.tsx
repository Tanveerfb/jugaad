import { NotchedPanel } from "@/components/motif/notched-panel";
import { Rotor } from "@/components/motif/rotor";
import type { RunningJob } from "@/lib/workbench-view";

/** The running-job panel around the rotor: the job running now, or the idle ring. */
export function JobPanel({ job }: { job: RunningJob | null }) {
  return (
    <NotchedPanel innerClassName="grid justify-items-center gap-3.5 px-6 pb-6 pt-7 text-center">
      <Rotor
        progress={job?.progress ?? null}
        caption={job ? (job.progress === null ? "queued" : "working") : "idle"}
        label={job ? `${job.title}: ${job.detail ?? "running"}` : "No job running"}
        className="max-sm:size-[188px]"
      />
      <div aria-live="polite">
        <h2 className="text-lg font-semibold">{job ? job.title : "No jobs running"}</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {job ? (job.detail ?? "Starting…") : "Scans, suggestions and sorting show here while they run."}
        </p>
      </div>
    </NotchedPanel>
  );
}
