import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ModuleView } from "@/components/module-view";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryEditor } from "@/features/organiser/category-editor";
import { FolderActions } from "@/features/organiser/folder-actions";
import { JobProgress } from "@/features/organiser/job-progress";
import { LiveRefresh } from "@/components/live-refresh";
import { WorkerNotice } from "@/features/organiser/worker-notice";
import { getModule } from "@/lib/modules";
import { getFolderView } from "@/lib/organiser/organiser-view";

export const metadata: Metadata = { title: "Categories — Organiser — Jugaad" };

export default function CategoriesPage({ params }: PageProps<"/organiser/[folderId]/categories">) {
  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 pb-24 pt-[22px] sm:px-7 sm:pt-9">
      <Suspense fallback={<CategoriesSkeleton />}>
        <Categories params={params} />
      </Suspense>
    </main>
  );
}

async function Categories({ params }: Pick<PageProps<"/organiser/[folderId]/categories">, "params">) {
  await connection();
  const { folderId } = await params;
  const view = getFolderView(folderId);
  if (!view) notFound();
  const { name, categories, activeJob, worker } = view;
  const suggesting = activeJob?.kind === "suggest-categories";

  return (
    <ModuleView module={getModule("organiser")} title={`${name} · categories`} back={{ href: `/organiser?folder=${folderId}`, label: `Back to ${name}` }}>
      <LiveRefresh active={!!activeJob} />
      <div className="grid gap-3.5">
        <WorkerNotice worker={worker} />
        {activeJob && <JobProgress job={activeJob} worker={worker} />}
        {categories.length === 0 && !suggesting ? (
          <EmptyState
            title="No categories yet"
            description={
              view.summary.files === 0
                ? "Scan the folder first, then Jugaad can suggest categories from what the files are about."
                : "Jugaad groups the files by what they're about and names each group. You rename, turn down or add your own, then approve the list."
            }
          >
            <FolderActions folderId={folderId} next={view.summary.files === 0 ? "scan" : "suggest"} more={[]} busy={!!activeJob} />
          </EmptyState>
        ) : (
          categories.length > 0 && (
            <>
              <p className="m-0 max-w-[70ch] text-muted-foreground">
                Suggested from what the files are about. Each one becomes a folder inside {name}. Rename, turn down or add your
                own, then approve the list.
              </p>
              {/* a fresh list from "suggest again" replaces the editor's state */}
              <CategoryEditor
                key={categories.map((c) => c.id).join()}
                folderId={folderId}
                categories={categories}
                includeSubfolders={view.folder.includeSubfolders}
                busy={!!activeJob}
              />
            </>
          )
        )}
      </div>
    </ModuleView>
  );
}

function CategoriesSkeleton() {
  return (
    <div className="grid gap-1.5" aria-busy="true" aria-label="Loading categories">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-12" style={{ animationDelay: `${i * 70}ms` }} />
      ))}
    </div>
  );
}
