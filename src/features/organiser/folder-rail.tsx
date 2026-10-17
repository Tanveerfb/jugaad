import Link from "next/link";
import { cn } from "@/lib/utils";
import type { FolderListItem } from "@/lib/organiser/organiser-view";
import { AddFolderForm } from "./add-folder-form";
import { StatusWord } from "./status-word";

/**
 * The allow-list as a rail (locked design, layout A): each folder a cut-corner row with a hex
 * node and its status; the selected one is lit. Paste a path at the foot to add another.
 */
export function FolderRail({ folders, selectedId }: { folders: FolderListItem[]; selectedId: string }) {
  return (
    <nav aria-label="Allowed folders" className="grid content-start gap-2">
      <ul className="m-0 grid list-none gap-2 p-0">
        {folders.map(({ folder, status }) => {
          const current = folder.id === selectedId;
          return (
            <li key={folder.id}>
              <Link
                href={`/organiser?folder=${folder.id}`}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "group grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 bg-background px-3 py-[11px] shape-cut",
                  "transition-colors duration-(--duration-fast) hover:bg-[color-mix(in_srgb,var(--surface-2)_70%,var(--background))]",
                  "focus-visible:shadow-[inset_0_0_0_2px_var(--ring)] focus-visible:outline-none",
                  current && "bg-surface-2 shadow-[inset_3px_0_0_var(--primary)]",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn("row-span-2 h-[19px] w-[22px] bg-surface-2 shape-hex", current && "bg-primary shadow-[0_0_10px_var(--primary)]")}
                />
                {/* long paths lose their start, not their end — the end is the folder's name */}
                <span className="truncate text-left font-mono text-[13px] [direction:rtl]" title={folder.path}>
                  <span dir="ltr">{folder.path}</span>
                </span>
                <StatusWord status={status} />
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-2">
        <AddFolderForm compact />
      </div>
    </nav>
  );
}
