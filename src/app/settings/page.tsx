import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BackToWorkbench } from "@/components/back-to-workbench";
import { FreeVramButton } from "@/components/free-vram-button";
import { NotchedPanel } from "@/components/motif/notched-panel";
import { Roundel } from "@/components/motif/roundel";
import { StatusLight } from "@/components/motif/status-light";
import { Skeleton } from "@/components/ui/skeleton";
import { WarnNote } from "@/components/warn-note";
import { ModelSettings } from "@/features/settings/model-settings";
import { getSettingsView } from "@/lib/settings-view";

export const metadata: Metadata = { title: "Settings — Jugaad" };

const SECTION = "grid grid-cols-[minmax(0,1fr)] gap-3.5 bg-background p-[18px] shape-chamfered [--chamfer:14px]";

/**
 * Settings (locked design docs/design/settings.html): Ollama's state, the model per job, and
 * graphics memory. Read per request — what Ollama has installed and loaded changes outside Jugaad.
 */
export default function SettingsPage() {
  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 pb-24 pt-[22px] sm:px-7 sm:pt-9">
      <NotchedPanel innerClassName="p-3.5 sm:p-[22px]">
        <div className="mb-[18px] flex items-center gap-3.5">
          <BackToWorkbench />
          <Roundel glowing={false} />
          <h1 className="text-[25px] font-semibold tracking-[-0.01em] sm:text-[30px]">Settings</h1>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-[22px] lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto lg:sticky lg:top-20 lg:grid">
            {[
              ["#models", "Models"],
              ["#memory", "Graphics memory"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="flex items-center gap-2.5 bg-background px-3 py-2.5 text-sm font-semibold whitespace-nowrap text-muted-foreground shape-cut [--chamfer-sm:8px] before:h-2.5 before:w-3 before:bg-surface-2 before:shape-hex before:content-[''] hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                {label}
              </a>
            ))}
          </nav>
          <Suspense fallback={<SettingsSkeleton />}>
            <Sections />
          </Suspense>
        </div>
      </NotchedPanel>
    </main>
  );
}

async function Sections() {
  await connection();
  const view = await getSettingsView();
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-[22px]">
      <section className={SECTION} aria-labelledby="ollama">
        <h2 id="ollama" className="text-xl">Ollama</h2>
        {view.reachable ? (
          <div className="flex flex-wrap items-center gap-x-4.5 gap-y-2 text-[13.5px]">
            <StatusLight tone="working">Connected</StatusLight>
            <span className="font-mono text-muted-foreground">
              {view.address} · Ollama {view.version} · {view.installedCount} models installed
            </span>
          </div>
        ) : (
          <WarnNote tone="destructive">
            <b>Ollama isn&apos;t answering</b> at <span className="font-mono">{view.address}</span>. Start the Ollama app,
            then reload this page.
          </WarnNote>
        )}
      </section>

      <section id="models" className={SECTION} aria-labelledby="models-h">
        <h2 id="models-h" className="text-xl">Models</h2>
        <p className="m-0 max-w-[72ch] text-[13.5px] text-muted-foreground">
          Which installed model does each job. Only models that can do the job are listed. A change applies from the next job.
        </p>
        {view.reachable ? <ModelSettings view={view} /> : <p className="m-0 text-[13.5px] text-muted-foreground">Models are listed once Ollama answers.</p>}
      </section>

      <section id="memory" className={SECTION} aria-labelledby="memory-h">
        <h2 id="memory-h" className="text-xl">Graphics memory</h2>
        <p className="m-0 max-w-[72ch] text-[13.5px] text-muted-foreground">
          Jugaad&apos;s models stay loaded for a few minutes after a job, so the next one starts quickly. Free them sooner here;
          they load again when a job needs them. Models other apps loaded are left alone.
        </p>
        {view.reachable && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[13.5px]">Jugaad {view.jugaadLoadedGb.toFixed(1)} GB loaded</span>
            <FreeVramButton gb={view.jugaadLoadedGb} busy={!!view.busy} />
            {view.busy && <span className="text-[13px] text-muted-foreground">{view.busy.detail} — free it when the job ends.</span>}
          </div>
        )}
      </section>
    </div>
  );
}

/** Matches the three sections, so nothing jumps when Ollama answers. */
function SettingsSkeleton() {
  return (
    <div className="grid gap-[22px]" aria-busy="true" aria-label="Loading settings">
      {[90, 360, 120].map((h, i) => (
        <Skeleton key={i} style={{ height: h, animationDelay: `${i * 90}ms` }} />
      ))}
    </div>
  );
}
