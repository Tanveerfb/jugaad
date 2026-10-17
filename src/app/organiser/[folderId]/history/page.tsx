import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ModuleView } from "@/components/module-view";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { JobProgress } from "@/features/organiser/job-progress";
import { LiveRefresh } from "@/components/live-refresh";
import { WorkerNotice } from "@/features/organiser/worker-notice";
import { PlanHistory } from "@/features/organiser/plan-history";
import { getModule } from "@/lib/modules";
import { getFolderView, getHistory } from "@/lib/organiser/organiser-view";

export const metadata: Metadata = { title: "History — Organiser — Jugaad" };

export default function HistoryPage({ params }: PageProps<"/organiser/[folderId]/history">) {
  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 pb-24 pt-[22px] sm:px-7 sm:pt-9">
      <Suspense fallback={<HistorySkeleton />}>
        <History params={params} />
      </Suspense>
    </main>
  );
}

async function History({ params }: Pick<PageProps<"/organiser/[folderId]/history">, "params">) {
  await connection();
  const { folderId } = await params;
  const view = getFolderView(folderId);
  if (!view) notFound();
  const entries = getHistory(folderId);
  const { name, activeJob, worker } = view;

  return (
    <ModuleView module={getModule("organiser")} title={`${name} · history`} back={{ href: `/organiser?folder=${folderId}`, label: `Back to ${name}` }}>
      <LiveRefresh active={!!activeJob} />
      <div className="grid gap-4">
        <WorkerNotice worker={worker} />
        {activeJob && <JobProgress job={activeJob} worker={worker} />}
        {entries.length === 0 ? (
          <EmptyState title="Nothing moved yet" description="Applied plans appear here, each with its undo.">
            <Button asChild>
              <Link href={`/organiser/${folderId}/plan`}>Go to the plan</Link>
            </Button>
          </EmptyState>
        ) : (
          <PlanHistory entries={entries} busy={!!activeJob} />
        )}
      </div>
    </ModuleView>
  );
}

function HistorySkeleton() {
  return (
    <div className="grid max-w-[720px] gap-4" aria-busy="true" aria-label="Loading history">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-16" style={{ animationDelay: `${i * 90}ms` }} />
      ))}
    </div>
  );
}
