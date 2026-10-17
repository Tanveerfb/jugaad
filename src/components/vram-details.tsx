import Link from "next/link";
import { FreeVramButton } from "@/components/free-vram-button";
import { VramBar } from "@/components/vram-bar";
import type { VramView } from "@/lib/settings-view";

/**
 * What the VRAM panel says (locked V1): a bar split into Jugaad's models and other apps, each
 * of Jugaad's models with the jobs it is doing, and "Free" — or why it can't free now.
 */
export function VramDetails({ view }: { view: Extract<VramView, { reachable: true }> }) {
  const jugaadGb = view.jugaad.reduce((sum, m) => sum + m.gb, 0);
  return (
    <>
      <h3 className="text-base font-semibold">Graphics memory</h3>
      <VramBar
        totalGb={view.totalGb}
        segments={[
          { label: "Jugaad", gb: jugaadGb, tone: "jugaad" },
          { label: "Other apps", gb: view.otherGb, tone: "other" },
        ]}
      />
      <p className="m-0 -mt-1.5 text-xs text-muted-foreground">Free {view.freeGb.toFixed(1)} GB</p>
      {view.busy && (
        <div className="grid gap-0.5 bg-background px-3 py-2.5 shadow-[inset_0_0_0_1px_var(--border)]">
          <b className="text-sm font-semibold">{view.busy.detail}</b>
          <span className="text-[13px] text-muted-foreground">The model is in use — free it when the job ends, or after Stop.</span>
        </div>
      )}
      <ul className="m-0 grid list-none gap-1.5 p-0">
        {view.jugaad.map((m) => (
          <li key={m.name} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 bg-background px-2.5 py-2">
            <span aria-hidden="true" className="h-3 w-3.5 bg-primary shape-hex" />
            <span className="truncate font-mono text-[13px]">{m.name}</span>
            <span className="font-mono text-[12.5px] tabular-nums">{m.gb.toFixed(1)} GB</span>
            <span className="col-span-2 col-start-2 text-xs text-muted-foreground">
              Jugaad{m.jobs.length ? ` · ${m.jobs.join(", ")}` : ""}
            </span>
          </li>
        ))}
        <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 bg-background px-2.5 py-2">
          <span aria-hidden="true" className="h-3 w-3.5 bg-muted-foreground shape-hex" />
          <span className="truncate text-[13px]">Other apps</span>
          <span className="font-mono text-[12.5px] tabular-nums">{view.otherGb.toFixed(1)} GB</span>
          <span className="col-span-2 col-start-2 text-xs text-muted-foreground">Not Jugaad&apos;s — left alone</span>
        </li>
      </ul>
      {view.jugaad.length === 0 && <p className="m-0 text-[13px] text-muted-foreground">No Jugaad models loaded. They load on their own when a job needs them.</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FreeVramButton gb={jugaadGb} busy={!!view.busy} />
        <Link href="/settings" className="text-[13.5px] font-semibold text-working underline-offset-4 hover:underline">
          Model settings →
        </Link>
      </div>
    </>
  );
}
