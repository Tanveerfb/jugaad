"use client";

import { useState } from "react";
import { approvePlan, discardPlan, sendMoveTo, setIncluded, setMoveRename } from "@/app/organiser/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServerAction } from "@/hooks/use-server-action";
import type { Bay } from "@/lib/domain/plan-bays";
import { cn } from "@/lib/utils";
import type { PlanMove } from "@/schemas/plan-schema";
import { countOf } from "@/lib/count-of";

/** Files shown per bay before "+ N more" — a bay stays scannable however big the plan. */
const SHOWN = 8;
const LEAVE = "__review__";

type Counts = { moves: number; included: number; toReview: number; duplicates: number; renames: number };

/**
 * The signature plan review (component round, locked): one notched bay per destination folder,
 * each approvable as a whole or file by file. Bays holding files to review glow orange. Each
 * file has its include tick, the model's confidence, a rename tick when a name was suggested
 * (R1), and — in the review bay — "Send to…" an approved category. Nothing moves until
 * "Approve and move".
 */
export function DestinationBays({
  planId,
  folderName,
  bays,
  counts,
  categories,
}: {
  planId: string;
  folderName: string;
  bays: Bay[];
  counts: Counts;
  categories: string[];
}) {
  const plan = useServerAction();
  const [reviewOnly, setReviewOnly] = useState(false);
  const shown = reviewOnly ? bays.filter((b) => b.kind === "review") : bays;

  return (
    <div className="grid gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <dl className="m-0 flex flex-wrap gap-x-[22px] gap-y-2">
          {(
            [
              [counts.moves, "moves"],
              [counts.toReview, "to review"],
              [counts.duplicates, "duplicate copies"],
              [counts.renames, "renames ticked"],
            ] as const
          ).map(([value, label]) => (
            <div key={label} className="grid">
              <dt className="order-2 text-[12.5px] text-muted-foreground">{label}</dt>
              <dd className="order-1 m-0 font-mono text-xl font-medium tabular-nums">{value.toLocaleString("en")}</dd>
            </div>
          ))}
        </dl>
        {counts.toReview > 0 && (
          <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm">
            <Checkbox checked={reviewOnly} onCheckedChange={(v) => setReviewOnly(v === true)} />
            Show only files to review
          </label>
        )}
      </div>

      <div className="grid items-start gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))]">
        {shown.map((bay) => (
          <BayPanel key={bay.folder} bay={bay} folderName={folderName} categories={categories} />
        ))}
      </div>

      <div className="sticky bottom-3 z-10 mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-surface-2 px-4 py-3 shadow-[0_10px_30px_rgb(0_0_0/0.35),inset_0_0_0_1px_var(--border)] [--chamfer:10px] shape-chamfered max-sm:bottom-2 max-sm:px-3">
        <span>
          <b className="font-mono tabular-nums">{counts.included.toLocaleString("en")}</b> of {counts.moves.toLocaleString("en")} moves
          included
        </span>
        <span className="flex flex-wrap gap-2 max-sm:w-full max-sm:justify-between">
          <Button variant="ghost" size="sm" disabled={plan.pending} onClick={() => plan.run(() => discardPlan(planId))}>
            Discard plan
          </Button>
          <Button
            disabled={counts.included === 0}
            loading={plan.pending}
            aria-label={`Approve and move ${countOf(counts.included, "file")}`}
            onClick={() => plan.run(() => approvePlan(planId))}
          >
            <span>
              Approve<span className="max-sm:hidden"> and move {countOf(counts.included, "file")}</span>
            </span>
          </Button>
        </span>
      </div>
    </div>
  );
}

function BayPanel({ bay, folderName, categories }: { bay: Bay; folderName: string; categories: string[] }) {
  const { pending, run } = useServerAction();
  const [expanded, setExpanded] = useState(false);
  const included = bay.moves.filter((m) => m.included).length;
  const all = included === bay.moves.length;
  const visible = expanded ? bay.moves : bay.moves.slice(0, SHOWN);
  const edge = bay.kind === "review" ? "bg-attention" : bay.kind === "duplicates" ? "bg-[color-mix(in_srgb,var(--muted-foreground)_60%,var(--border))]" : "bg-border";

  return (
    <section aria-label={bay.title} className={cn("p-px shape-bay", edge)}>
      <div className="grid gap-2.5 bg-card p-3.5 shape-bay" aria-busy={pending || undefined}>
        <h3 className={cn("flex items-center gap-2.5 text-base font-semibold", bay.kind === "review" && "text-attention")}>
          <Checkbox
            checked={all ? true : included === 0 ? false : "indeterminate"}
            onCheckedChange={(v) => run(() => setIncluded(bay.moves.map((m) => m.id), v === true))}
            aria-label={`Include every file in ${bay.title}`}
          />
          <span className="min-w-0 flex-1 truncate">{bay.title}</span>
          {bay.kind === "review" ? (
            <Badge variant="attention">Needs review</Badge>
          ) : (
            <Badge variant="outline" className="font-mono">
              {bay.moves.length} {bay.moves.length === 1 ? "file" : "files"}
            </Badge>
          )}
        </h3>
        <p className="m-0 truncate font-mono text-[11.5px] text-muted-foreground">
          {folderName}\{bay.folder}\
        </p>
        <ul className="m-0 grid list-none gap-[5px] p-0">
          {visible.map((move) => (
            <MoveRow key={move.id} move={move} kind={bay.kind} categories={categories} />
          ))}
        </ul>
        {bay.moves.length > SHOWN && (
          <Button variant="link" size="sm" className="justify-self-start px-2" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Show fewer" : `+ ${bay.moves.length - SHOWN} more`}
          </Button>
        )}
      </div>
    </section>
  );
}

function MoveRow({ move, kind, categories }: { move: PlanMove; kind: Bay["kind"]; categories: string[] }) {
  const { run } = useServerAction();
  const name = move.fromPath.split(/[\\/]/).at(-1)!;
  const confidence = move.confidence === null ? null : `${Math.round(move.confidence * 100)}%`;

  return (
    <li className={cn("grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 bg-background px-2.5 py-[7px]", !move.included && "opacity-50")}>
      <Checkbox
        checked={move.included}
        onCheckedChange={(v) => run(() => setIncluded([move.id], v === true))}
        aria-label={`Include ${name}`}
        className="h-3.5 w-4"
      />
      <span className={cn("truncate text-[13.5px]", !move.included && "line-through")} title={move.fromPath}>
        {name}
        {move.isFolder && <span className="ml-1.5 font-mono text-[11.5px] text-muted-foreground">\ whole folder</span>}
      </span>
      <span className="font-mono text-xs text-muted-foreground tabular-nums">{kind === "duplicates" ? "" : confidence ?? "—"}</span>

      {move.suggestedName && kind !== "duplicates" && (
        <label className="col-start-2 col-end-4 flex min-w-0 cursor-pointer items-center gap-2 text-[12.5px] text-muted-foreground">
          <Checkbox checked={move.rename} onCheckedChange={(v) => run(() => setMoveRename(move.id, v === true))} className="h-3.5 w-4" />
          <span className={cn("truncate font-mono", move.rename && "text-primary")}>Rename to {move.suggestedName}</span>
        </label>
      )}

      {kind === "review" && (
        <span className="col-start-2 col-end-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[12.5px] text-muted-foreground">
          {move.category ? `Best guess ${move.category}` : "No guess"}
          <Select
            value={LEAVE}
            onValueChange={(v) => run(() => sendMoveTo(move.id, v === LEAVE ? null : v))}
          >
            <SelectTrigger size="sm" aria-label={`Send ${name} to`} className="h-7 text-[12.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={LEAVE}>Leave in review</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  Send to {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </span>
      )}
    </li>
  );
}
