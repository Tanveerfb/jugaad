import { connection } from "next/server";
import { Suspense } from "react";
import { LiveRefresh } from "@/components/live-refresh";
import { JobPanel } from "@/features/workbench/job-panel";
import { ModuleComb } from "@/features/workbench/module-comb";
import { MODULES } from "@/lib/modules";
import { getWorkbenchView } from "@/lib/workbench-view";

export default function WorkbenchPage() {
  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 pb-24 pt-[22px] sm:px-7 sm:pt-9">
      <Suspense fallback={<Workbench modules={MODULES} job={null} folderCount={null} />}>
        <LiveWorkbench />
      </Suspense>
    </main>
  );
}

async function LiveWorkbench() {
  await connection(); // live state: read per request, never at build time
  const view = getWorkbenchView();
  return (
    <>
      <LiveRefresh active={view.job !== null} everyMs={2000} />
      <Workbench {...view} />
    </>
  );
}

function Workbench({
  modules,
  job,
  folderCount,
}: {
  modules: Parameters<typeof ModuleComb>[0]["modules"];
  job: Parameters<typeof JobPanel>[0]["job"];
  folderCount: number | null;
}) {
  return (
    <>
      <div className="mb-7">
        <h1 className="text-[30px] font-semibold tracking-[-0.02em] sm:text-[40px]">Workbench</h1>
        <p className="mt-1.5 max-w-[56ch] text-pretty text-muted-foreground">
          {folderCount === null || folderCount === 0
            ? "The Organiser comes first — it asks which folders it may see, and nothing outside that list is ever read."
            : folderCount === 1
              ? "The Organiser looks after 1 folder. Nothing outside it is ever read."
              : `The Organiser looks after ${folderCount} folders. Nothing outside them is ever read.`}
        </p>
      </div>
      <div className="grid items-center gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-10">
        <ModuleComb modules={modules} />
        <JobPanel job={job} />
      </div>
    </>
  );
}
