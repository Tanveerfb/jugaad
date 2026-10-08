import { NotchedPanel } from "@/components/motif/notched-panel";
import { Rotor } from "@/components/motif/rotor";

/**
 * The running-job panel around the rotor. Phase 0 has no job queue yet, so it shows the idle
 * state; the queue (phase 1) will pass the current job in.
 */
export function JobPanel() {
  return (
    <NotchedPanel innerClassName="grid justify-items-center gap-3.5 px-6 pb-6 pt-7 text-center">
      <Rotor progress={null} caption="idle" label="No job running" className="max-sm:size-[188px]" />
      <div>
        <h2 className="text-lg font-semibold">No jobs running</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Scans and indexing show here while they run.</p>
      </div>
    </NotchedPanel>
  );
}
