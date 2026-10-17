"use client";

import Link from "next/link";
import { buildPlan } from "@/app/organiser/actions";
import { Button } from "@/components/ui/button";
import { useServerAction } from "@/hooks/use-server-action";

/**
 * Before a plan exists: how many files would be sorted into how many folders, which files —
 * the folder's "Include subfolders" tick, set on the folder so suggestions and the plan agree
 * (owner's choice, 2026-10-17) — and Build plan. Nothing moves yet.
 */
export function BuildPlanPanel({
  folderId,
  folderName,
  files,
  includeSubfolders,
  categoryCount,
  busy,
}: {
  folderId: string;
  folderName: string;
  files: number;
  includeSubfolders: boolean;
  categoryCount: number;
  busy: boolean;
}) {
  const { pending, run } = useServerAction();

  return (
    <section className="grid max-w-[720px] gap-4 bg-background p-[18px] [--chamfer-sm:14px] shape-cut">
      <h2 className="text-[22px] font-semibold">
        Sort {files.toLocaleString("en")} {files === 1 ? "file" : "files"} into {categoryCount} {categoryCount === 1 ? "folder" : "folders"}
      </h2>
      <p className="m-0 text-[13.5px] text-muted-foreground">
        {includeSubfolders
          ? `Files in ${folderName} and its subfolders, except those already in a category folder.`
          : `Only the files sitting directly in ${folderName}.`}{" "}
        <Link href={`/organiser?folder=${folderId}`} className="font-semibold text-primary underline-offset-4 hover:underline">
          Change on the folder
        </Link>
      </p>
      <p className="m-0 text-[13.5px] text-muted-foreground">
        Each file is read by the local model — about a second a file, and files it has already sorted are remembered.
        Nothing moves until you approve the plan.
      </p>
      <div>
        <Button disabled={busy || files === 0} loading={pending} onClick={() => run(() => buildPlan(folderId))}>
          Build plan
        </Button>
      </div>
    </section>
  );
}
