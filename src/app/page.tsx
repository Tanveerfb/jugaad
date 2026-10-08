import { JobPanel } from "@/features/workbench/job-panel";
import { ModuleComb } from "@/features/workbench/module-comb";
import { MODULES } from "@/lib/modules";

export default function WorkbenchPage() {
  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 pb-24 pt-[22px] sm:px-7 sm:pt-9">
      <div className="mb-7">
        <h1 className="text-[30px] font-semibold tracking-[-0.02em] sm:text-[40px]">Workbench</h1>
        <p className="mt-1.5 max-w-[56ch] text-pretty text-muted-foreground">
          Nothing is watched yet. The Organiser comes first — it will ask which folders it may see,
          and nothing outside that list is ever read.
        </p>
      </div>
      <div className="grid items-center gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-10">
        <ModuleComb modules={MODULES} />
        <JobPanel />
      </div>
    </main>
  );
}
