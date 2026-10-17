import type { FolderView } from "@/lib/organiser/organiser-view";
import { FolderActions, type MoreAction, type NextAction } from "./folder-actions";
import { IndexFacts } from "./index-facts";
import { JobProgress } from "./job-progress";
import { StepTrack } from "./step-track";
import { RemoveFolder } from "./remove-folder";
import { SubfolderToggle } from "./subfolder-toggle";

/**
 * The selected folder (locked design, layout A's stage): name and path, the step track, what
 * the index knows, a running job, and the next thing to do.
 */
export function FolderStage({ view }: { view: FolderView }) {
  const { folder, name, summary, status, activeJob, failedJob, worker } = view;
  const { next, more, note } = actionsFor(view);

  return (
    <section
      aria-labelledby="stage-title"
      className="grid min-w-0 content-start gap-[18px] bg-background p-[18px] [--chamfer-sm:14px] shape-cut"
    >
      <div className="min-w-0">
        <h2 id="stage-title" className="text-[22px] font-semibold">
          {name}
        </h2>
        <p className="m-0 truncate font-mono text-[13px] text-muted-foreground" title={folder.path}>
          {folder.path}
        </p>
      </div>
      <StepTrack current={status.step} />
      {summary.files > 0 && <IndexFacts summary={summary} />}
      {summary.files > 0 && <SubfolderToggle folderId={folder.id} include={folder.includeSubfolders} busy={!!activeJob} />}
      {activeJob && <JobProgress job={activeJob} worker={worker} />}
      {failedJob && !activeJob && (
        <p role="alert" className="m-0 text-[13.5px] text-destructive">
          The last {failedJob.kind === "scan-folder" ? "scan" : "job"} stopped: {failedJob.error ?? "no reason was recorded"}
        </p>
      )}
      <div className="grid gap-2">
        <FolderActions folderId={folder.id} next={next} more={more} busy={!!activeJob} />
        <div className="flex justify-end">
          <RemoveFolder folderId={folder.id} name={name} busy={!!activeJob} />
        </div>
        {note && <p className="m-0 text-[13.5px] text-muted-foreground">{note}</p>}
      </div>
    </section>
  );
}

/** The next step for where the folder stands, and the ways back to earlier steps. */
function actionsFor({ summary, status, categories, plans }: FolderView): { next: NextAction | null; more: MoreAction[]; note?: string } {
  const latest = plans[0];
  const hasHistory = plans.some((p) => !["draft", "approved"].includes(p.status));
  const more: MoreAction[] = [];
  if (summary.files > 0) more.push("scan-again");
  if (categories.length) more.push("categories");
  if (hasHistory) more.push("history");

  switch (status.step) {
    case "scan":
      return { next: "scan", more: [], note: "Scanning reads names, sizes and dates, then the contents of new or changed files. Nothing moves." };
    case "categories":
      return categories.some((c) => c.state === "suggested")
        ? { next: "categories", more: more.filter((m) => m !== "categories") }
        : { next: "suggest", more, note: "Groups the files by what they're about and names each group. You approve the list." };
    case "plan":
      return latest && (latest.status === "draft" || latest.status === "approved")
        ? { next: "review", more }
        : { next: "build", more };
    case "applied":
      return { next: "history", more: [...more.filter((m) => m !== "history"), "plan"] };
  }
}
