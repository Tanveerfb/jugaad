"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { addCategory, approveCategories, suggestCategories } from "@/app/organiser/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { WarnNote } from "@/components/warn-note";
import { Input } from "@/components/ui/input";
import { useServerAction } from "@/hooks/use-server-action";
import { cn } from "@/lib/utils";
import type { Category } from "@/schemas/category-schema";
import { countOf } from "@/lib/count-of";

type Row = { id: string; name: string; keep: boolean };

/**
 * The category list (locked design, C1 — rows): tick to keep, rename in place, examples beside
 * each; an unticked row is turned down and its files will go to review. "Approve" saves every
 * name and tick at once, then moves on to the plan. With subfolders included, an unticked folder
 * of the owner's says its files will be sorted out of it (settings round 1, locked 2026-10-17).
 */
export function CategoryEditor({
  folderId,
  categories,
  includeSubfolders,
  busy,
}: {
  folderId: string;
  categories: Category[];
  includeSubfolders: boolean;
  busy: boolean;
}) {
  const router = useRouter();
  const approve = useServerAction();
  const other = useServerAction();
  const [rows, setRows] = useState<Row[]>(() => categories.map((c) => ({ id: c.id, name: c.name, keep: c.state !== "rejected" })));
  const [newName, setNewName] = useState("");
  const addId = useId();

  // categories added or re-suggested since this page opened
  const known = new Set(rows.map((r) => r.id));
  const merged = [...rows, ...categories.filter((c) => !known.has(c.id)).map((c) => ({ id: c.id, name: c.name, keep: c.state !== "rejected" }))];
  const byId = new Map(categories.map((c) => [c.id, c]));
  const kept = merged.filter((r) => r.keep).length;
  const isFolder = (r: Row) => byId.get(r.id)?.source === "folder";
  const turnedDown = merged.filter((r) => !r.keep && !isFolder(r)).length;
  // the owner's folders left unticked: with subfolders included, their files get sorted out of them
  const foldersLeft = merged.filter((r) => !r.keep && isFolder(r));
  const filesLeaving = foldersLeft.reduce((sum, r) => sum + (byId.get(r.id)?.fileCount ?? 0), 0);

  const update = (id: string, patch: Partial<Row>) =>
    setRows(merged.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="grid gap-3">
      <ul className="m-0 grid list-none gap-1.5 p-0" aria-label="Categories">
        {merged.map((row) => {
          const category = byId.get(row.id);
          return (
            <li
              key={row.id}
              className={cn(
                "grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-0.5 bg-background px-3 py-2 sm:grid-cols-[22px_minmax(140px,220px)_72px_minmax(0,1fr)]",
                !row.keep && category?.source !== "folder" && "opacity-55",
              )}
            >
              <Checkbox
                checked={row.keep}
                onCheckedChange={(v) => update(row.id, { keep: v === true })}
                aria-label={`Keep ${row.name}`}
              />
              <input
                value={row.name}
                onChange={(e) => update(row.id, { name: e.target.value })}
                disabled={!row.keep}
                aria-label="Category name"
                maxLength={40}
                className={cn(
                  "h-8 min-w-0 bg-transparent px-2 font-semibold outline-none transition-shadow",
                  "hover:shadow-[inset_0_-1px_0_var(--border)] focus:shadow-[inset_0_-2px_0_var(--primary)]",
                  !row.keep && category?.source !== "folder" && "line-through",
                )}
              />
              <span className="font-mono text-sm tabular-nums max-sm:col-start-3 max-sm:row-start-1">
                {category?.source === "owner" ? "—" : countOf(category?.fileCount ?? 0, "file")}
              </span>
              <span
                className={cn(
                  "truncate font-mono text-xs text-muted-foreground max-sm:col-span-2 max-sm:col-start-2",
                  !row.keep && category?.source === "folder" && includeSubfolders && "font-sans whitespace-normal text-attention",
                )}
              >
                {!row.keep && category?.source === "folder"
                  ? includeSubfolders
                    ? `your folder — unticked, its ${countOf(category.fileCount, "file")} will be sorted into other categories`
                    : "your folder — tick to let new files join it"
                  : !row.keep
                  ? "turned down — its files will go to review"
                  : category?.source === "owner"
                    ? "added by you"
                    : category?.source === "folder"
                      ? includeSubfolders
                        ? "your folder — stays as it is, new files can join it"
                        : "your folder — new files can join it"
                      : category?.examples.slice(0, 2).join(", ")}
              </span>
            </li>
          );
        })}
      </ul>

      <form
        className="grid max-w-[640px] gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newName.trim()) return;
          other.run(async () => {
            const result = await addCategory(folderId, newName);
            if (result.ok) setNewName("");
            return result;
          });
        }}
      >
        <div className="grid gap-1.5">
          <label htmlFor={addId} className="text-[12.5px] font-semibold text-muted-foreground">
            Add a category
          </label>
          <Input id={addId} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Car" maxLength={40} />
        </div>
        <Button type="submit" variant="secondary" loading={other.pending} className="justify-self-start">
          Add
        </Button>
      </form>

      {includeSubfolders && foldersLeft.length > 0 && (
        <WarnNote className="mt-1.5">
          <b>
            {countOf(filesLeaving, "file")} in {foldersLeft.length} of your folders
          </b>{" "}
          will be sorted out of them. Tick a folder to keep it.
        </WarnNote>
      )}
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2.5 bg-surface-2 px-3.5 py-3">
        <span>
          <b className="font-mono tabular-nums">{kept}</b> {kept === 1 ? "category" : "categories"}
          {turnedDown > 0 && ` · ${turnedDown} turned down`}
          {foldersLeft.length > 0 && ` · ${foldersLeft.length} of your folders unticked`}
        </span>
        <span className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" disabled={busy} loading={other.pending} onClick={() => other.run(() => suggestCategories(folderId))}>
            Suggest again
          </Button>
          <Button
            disabled={kept === 0 || busy}
            loading={approve.pending}
            onClick={() =>
              approve.run(async () => {
                const result = await approveCategories(folderId, merged);
                if (result.ok) router.push(`/organiser/${folderId}/plan`);
                return result;
              })
            }
          >
            Approve {kept} {kept === 1 ? "category" : "categories"}
          </Button>
        </span>
      </div>
    </div>
  );
}
