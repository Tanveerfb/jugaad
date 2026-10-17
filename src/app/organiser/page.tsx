import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ModuleView } from "@/components/module-view";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AddFolderForm } from "@/features/organiser/add-folder-form";
import { FolderRail } from "@/features/organiser/folder-rail";
import { FolderStage } from "@/features/organiser/folder-stage";
import { LiveRefresh } from "@/components/live-refresh";
import { WorkerNotice } from "@/features/organiser/worker-notice";
import { getModule } from "@/lib/modules";
import { getFolderView, listFolders } from "@/lib/organiser/organiser-view";

export const metadata: Metadata = { title: "Organiser — Jugaad" };

export default function OrganiserPage({ searchParams }: PageProps<"/organiser">) {
  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 pb-24 pt-[22px] sm:px-7 sm:pt-9">
      <ModuleView module={getModule("organiser")}>
        <Suspense fallback={<OrganiserSkeleton />}>
          <Organiser searchParams={searchParams} />
        </Suspense>
      </ModuleView>
    </main>
  );
}

async function Organiser({ searchParams }: Pick<PageProps<"/organiser">, "searchParams">) {
  await connection(); // the store is live data: read it per request, never at build time
  const folders = listFolders();

  if (folders.length === 0) {
    return (
      <div className="grid gap-2">
        <EmptyState
          title="Add a folder to organise"
          description="Jugaad only ever sees the folders on this list. It never deletes a file — duplicates and doubtful files go to a review folder for you."
        />
        <div className="mx-auto mb-2.5 w-full max-w-[640px]">
          <AddFolderForm />
        </div>
      </div>
    );
  }

  const { folder: wanted } = await searchParams;
  const selected = folders.find((f) => f.folder.id === wanted) ?? folders[0];
  const view = getFolderView(selected.folder.id)!;
  const anyWorking = folders.some((f) => f.status.tone === "working");

  return (
    <div className="grid items-start gap-[18px] lg:grid-cols-[300px_minmax(0,1fr)]">
      <LiveRefresh active={anyWorking} />
      <div className="empty:hidden lg:col-span-2">
        <WorkerNotice worker={view.worker} />
      </div>
      <FolderRail folders={folders} selectedId={selected.folder.id} />
      <FolderStage view={view} />
    </div>
  );
}

/** Matches the rail and stage, so nothing jumps when the data arrives. */
function OrganiserSkeleton() {
  return (
    <div className="grid items-start gap-[18px] lg:grid-cols-[300px_minmax(0,1fr)]" aria-busy="true" aria-label="Loading folders">
      <div className="grid gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[62px]" style={{ animationDelay: `${i * 90}ms` }} />
        ))}
      </div>
      <Skeleton className="h-[260px]" style={{ animationDelay: "120ms" }} />
    </div>
  );
}
