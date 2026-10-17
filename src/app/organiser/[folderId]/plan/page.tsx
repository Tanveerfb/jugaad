import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ModuleView } from "@/components/module-view";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { BuildPlanPanel } from "@/features/organiser/build-plan-panel";
import { DestinationBays } from "@/features/organiser/destination-bays";
import { JobProgress } from "@/features/organiser/job-progress";
import { LiveRefresh } from "@/components/live-refresh";
import { WorkerNotice } from "@/features/organiser/worker-notice";
import { getModule } from "@/lib/modules";
import { getFolderView, getPlanSetup, getPlanView } from "@/lib/organiser/organiser-view";

export const metadata: Metadata = { title: "Plan — Organiser — Jugaad" };

export default function PlanPage({ params }: PageProps<"/organiser/[folderId]/plan">) {
  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 pb-24 pt-[22px] sm:px-7 sm:pt-9">
      <Suspense fallback={<PlanSkeleton />}>
        <Plan params={params} />
      </Suspense>
    </main>
  );
}

async function Plan({ params }: Pick<PageProps<"/organiser/[folderId]/plan">, "params">) {
  await connection();
  const { folderId } = await params;
  const view = getFolderView(folderId);
  if (!view) notFound();
  const planView = getPlanView(folderId);
  const setup = getPlanSetup(folderId);
  const { name, activeJob, worker } = view;
  const status = planView?.plan.status;

  return (
    <ModuleView module={getModule("organiser")} title={`${name} · plan`} back={{ href: `/organiser?folder=${folderId}`, label: `Back to ${name}` }}>
      <LiveRefresh active={!!activeJob} />
      <div className="grid gap-4">
        <WorkerNotice worker={worker} />
        {activeJob && <JobProgress job={activeJob} worker={worker} />}

        {!activeJob && status === "draft" && planView && (
          <DestinationBays
            planId={planView.plan.id}
            folderName={name}
            bays={planView.bays}
            counts={planView.counts}
            categories={planView.approvedCategories}
          />
        )}

        {!activeJob && planView && status !== "draft" && (
          <p className="m-0 max-w-[70ch] text-muted-foreground">
            The last plan {status === "applied" ? "was applied" : status === "undone" ? "was undone" : "needs you"}.{" "}
            <Link href={`/organiser/${folderId}/history`} className="font-semibold text-primary underline-offset-4 hover:underline">
              Open history
            </Link>{" "}
            to undo it or retry what didn&apos;t move.
          </p>
        )}

        {!activeJob && status !== "draft" &&
          (setup.categoryCount === 0 ? (
            <EmptyState
              title="Approve categories first"
              description="A plan sorts files into the categories you approved. Review the suggested ones, then come back."
            >
              <Button asChild>
                <Link href={`/organiser/${folderId}/categories`}>Review categories</Link>
              </Button>
            </EmptyState>
          ) : (
            <BuildPlanPanel
              folderId={folderId}
              folderName={name}
              files={setup.files}
              includeSubfolders={setup.includeSubfolders}
              categoryCount={setup.categoryCount}
              busy={!!activeJob}
            />
          ))}
      </div>
    </ModuleView>
  );
}

function PlanSkeleton() {
  return (
    <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))]" aria-busy="true" aria-label="Loading the plan">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-[220px]" style={{ animationDelay: `${i * 90}ms` }} />
      ))}
    </div>
  );
}
