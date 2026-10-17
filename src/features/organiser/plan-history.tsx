"use client";

import { putBack, retryPlan, undoPlan } from "@/app/organiser/actions";
import { Button } from "@/components/ui/button";
import { WarnNote } from "@/components/warn-note";
import { countOf } from "@/lib/count-of";
import { Timeline, TimelineItem, TimelineMeta, TimelineTitle } from "@/components/ui/timeline";
import { useServerAction } from "@/hooks/use-server-action";
import type { HistoryEntry } from "@/lib/organiser/organiser-view";
import { cn } from "@/lib/utils";

const when = new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * The folder's history as a batch timeline (component round, L1): each applied plan a lit
 * node with its undo; one that couldn't finish names the files and why, with a retry; an
 * undone plan goes dark. A plan that took files out of the owner's own folders offers to put
 * just those back (locked design docs/design/history-put-back.html).
 */
export function PlanHistory({ entries, busy }: { entries: HistoryEntry[]; busy: boolean }) {
  return (
    <Timeline className="max-w-[720px]">
      {entries.map((entry) => (
        <HistoryItem key={entry.plan.id} entry={entry} busy={busy} />
      ))}
    </Timeline>
  );
}

function HistoryItem({ entry, busy }: { entry: HistoryEntry; busy: boolean }) {
  const { pending, run } = useServerAction();
  const { plan, moved, total, failed, putBack: putBackCount, outOfOwn } = entry;
  const leaving = outOfOwn.reduce((sum, g) => sum + g.files, 0);
  const at = when.format(new Date(plan.updatedAt));
  const undone = plan.status === "undone";
  const needsYou = plan.status === "incomplete" || plan.status === "undo-incomplete";

  const title = undone
    ? `${at} — ${total} ${total === 1 ? "file" : "files"}, undone`
    : plan.status === "undo-incomplete"
      ? `${at} — undo stopped: ${failed.length} ${failed.length === 1 ? "file" : "files"} couldn't go back`
      : plan.status === "applied" && putBackCount > 0
        ? `${at} — ${countOf(moved, "file")} moved, ${putBackCount} put back`
        : `${at} — ${moved} of ${countOf(total, "file")} moved`;

  return (
    <TimelineItem inactive={undone} className={cn(needsYou && "before:bg-attention")}>
      <TimelineTitle>{title}</TimelineTitle>
      <TimelineMeta>
        {undone
          ? "Moved back. Folders it made were removed if they were empty."
          : needsYou
            ? "Fix what's listed and retry; everything else stays where it is."
            : plan.status === "applying" || plan.status === "undoing"
              ? "In progress."
              : putBackCount > 0
                ? "The files from your own folders are back where they were; the rest stay sorted."
                : "Every file is where the plan put it."}
      </TimelineMeta>
      {failed.length > 0 && !undone && (
        <ul className="m-0 mt-1 grid list-none gap-0.5 p-0">
          {failed.slice(0, 12).map((m) => (
            <li key={m.id} className="font-mono text-[12.5px]">
              {m.fromPath.split(/[\\/]/).at(-1)} — {m.error}
            </li>
          ))}
          {failed.length > 12 && <li className="text-[12.5px] text-muted-foreground">and {failed.length - 12} more</li>}
        </ul>
      )}
      {outOfOwn.length > 0 && (
        <>
          <WarnNote className="mt-2">
            <b>
              {leaving} of them came out of {countOf(outOfOwn.length, "folder")} you already had.
            </b>{" "}
            Put just those back, and the other {moved - leaving} stay where they are.
          </WarnNote>
          <table className="mt-2 w-full max-w-[640px] border-collapse bg-background text-[13px]">
            <tbody>
              {outOfOwn.map((g) => (
                <tr key={g.folder}>
                  <td className="max-w-[260px] truncate py-1 pr-3.5 pl-3.5 align-top font-mono max-sm:whitespace-normal">{g.folder}</td>
                  <td className="py-1 pr-3.5 align-top text-muted-foreground">
                    {countOf(g.files, "file")} → {g.wentTo.slice(0, 3).join(", ")}
                    {g.wentTo.length > 3 ? "…" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {!undone && plan.status !== "applying" && plan.status !== "undoing" && (
        <div className="mt-1.5 flex flex-wrap gap-2">
          {outOfOwn.length > 0 && (
            <Button size="sm" disabled={busy} loading={pending} onClick={() => run(() => putBack(plan.id))}>
              Put back {countOf(leaving, "file")}
            </Button>
          )}
          {needsYou && (
            <Button size="sm" variant="secondary" disabled={busy} loading={pending} onClick={() => run(() => retryPlan(plan.id))}>
              Retry {failed.length} {failed.length === 1 ? "file" : "files"}
            </Button>
          )}
          {plan.status !== "undo-incomplete" && (
            <Button size="sm" variant="ghost" disabled={busy || pending} onClick={() => run(() => undoPlan(plan.id))}>
              {needsYou ? "Undo all" : outOfOwn.length > 0 ? `Undo all ${moved}` : putBackCount > 0 ? `Undo the other ${moved}` : "Undo"}
            </Button>
          )}
        </div>
      )}
    </TimelineItem>
  );
}
