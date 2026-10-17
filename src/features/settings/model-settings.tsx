"use client";

import { useState } from "react";
import { resetModels, saveModels } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VramBar } from "@/components/vram-bar";
import { WarnNote } from "@/components/warn-note";
import { useServerAction } from "@/hooks/use-server-action";
import { countOf } from "@/lib/count-of";
import { changeNotes, JOB_LABELS, modelsToLoad, type ResolvedModels } from "@/lib/domain/model-jobs";
import type { SettingsView } from "@/lib/settings-view";
import { cn } from "@/lib/utils";
import type { ModelJob } from "@/schemas/settings-schema";

/** Radix Select can't hold null: "Don't look at images" travels as this value. */
const OFF = "__off__";

const WHAT: Record<ModelJob, string> = {
  classifyFile: "One answer per file when a plan is built",
  nameCategories: "Names the suggested categories",
  describeImage: "Describes pictures and scanned PDFs",
  embed: "Finds files about the same thing",
};

type Ready = Extract<SettingsView, { reachable: true }>;

/**
 * The model per job (settings round 1, locked M1 — rows with a dropdown). Only models that can
 * do the job are offered; a change says what it will redo before it is saved, and the bar shows
 * whether the chosen models fit in the card together.
 */
export function ModelSettings({ view }: { view: Ready }) {
  const [picked, setPicked] = useState<ResolvedModels>(view.current);
  const save = useServerAction();
  const reset = useServerAction();
  const notes = changeNotes(view.current, picked);
  const changed = (Object.keys(picked) as ModelJob[]).filter((job) => picked[job] !== view.current[job]);
  const atDefaults = (Object.keys(picked) as ModelJob[]).every((job) => view.defaults[job] === view.current[job]);

  const loads = modelsToLoad(picked);
  const neededGb = loads.reduce((sum, name) => sum + (view.vramGb[name] ?? 0), 0);
  const fits = neededGb + view.otherGb <= view.totalGb;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3.5">
      <ul className="m-0 grid list-none grid-cols-[minmax(0,1fr)] gap-1.5 p-0">
        {view.jobs.map(({ job, options }) => {
          const value = picked[job];
          const note = notes[job];
          const isChanged = changed.includes(job);
          return (
            <li
              key={job}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)] items-center gap-x-4 gap-y-1.5 bg-card px-3.5 py-3 md:grid-cols-[minmax(150px,220px)_minmax(0,1fr)] xl:grid-cols-[minmax(170px,240px)_minmax(0,1fr)_170px]",
                isChanged && "shadow-[inset_3px_0_0_var(--attention)]",
              )}
            >
              <div>
                <b className="block font-semibold">{JOB_LABELS[job]}</b>
                <span className="text-[12.5px] text-muted-foreground">{WHAT[job]}</span>
              </div>
              <Select
                value={value ?? OFF}
                onValueChange={(v) => setPicked({ ...picked, [job]: v === OFF ? null : v })}
              >
                <SelectTrigger aria-label={`Model for ${JOB_LABELS[job].toLowerCase()}`} className="w-full font-mono text-[13.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((m) => (
                    <SelectItem key={m.name} value={m.name} className="font-mono">
                      {m.name} · {m.gb.toFixed(1)} GB{m.name === view.defaults[job] ? " (default)" : ""}
                    </SelectItem>
                  ))}
                  {job === "describeImage" && <SelectItem value={OFF}>Don&apos;t look at images</SelectItem>}
                </SelectContent>
              </Select>
              <span className="text-[12.5px] text-muted-foreground md:col-start-2 xl:col-start-auto">
                {isChanged
                  ? "changed"
                  : job === "nameCategories" && value === picked.classifyFile
                    ? "same as sorting — loads once"
                    : job === "describeImage"
                      ? "vision models only"
                      : job === "embed"
                        ? "embedding models only"
                        : `takes ${(view.vramGb[value ?? ""] ?? 0).toFixed(1)} GB`}
              </span>
              {options.length === 0 && (
                <span className="text-[12.5px] text-attention md:col-span-2 xl:col-span-3">
                  No installed model can do this. Install one with <code className="font-mono">ollama pull</code>.
                </span>
              )}
              {note && (
                <WarnNote className="md:col-span-2 xl:col-span-3">{note}</WarnNote>
              )}
            </li>
          );
        })}
      </ul>

      <div className="grid gap-2 bg-card px-3.5 py-3">
        <b className="text-sm font-semibold">
          {fits
            ? `Fits together: ${neededGb.toFixed(1)} of ${Math.round(view.totalGb)} GB, beside ${view.otherGb.toFixed(1)} GB of other apps`
            : `Too big together: ${neededGb.toFixed(1)} GB with ${view.otherGb.toFixed(1)} GB of other apps — over ${Math.round(view.totalGb)} GB`}
        </b>
        <VramBar
          totalGb={view.totalGb}
          segments={[
            ...loads.map((name, i) => ({ label: name, gb: view.vramGb[name] ?? 0, tone: i === 0 ? ("jugaad" as const) : ("jugaad-2" as const) })),
            { label: "other apps now", gb: view.otherGb, tone: "other" as const },
          ]}
        />
        {!fits && (
          <span className="text-[13px] text-muted-foreground">
            Jugaad loads one at a time when it must, so this still works — just slower, as models swap between jobs.
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2.5 bg-surface-2 px-3.5 py-3">
        <span className="text-[13.5px] text-muted-foreground">{changed.length ? countOf(changed.length, "change") : "No changes"}</span>
        <span className="flex flex-wrap gap-2">
          {changed.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setPicked(view.current)}>
              Undo changes
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={atDefaults && changed.length === 0}
            loading={reset.pending}
            onClick={() =>
              reset.run(async () => {
                const result = await resetModels();
                if (result.ok) setPicked(view.defaults);
                return result;
              })
            }
          >
            Reset to defaults
          </Button>
          <Button disabled={changed.length === 0} loading={save.pending} onClick={() => save.run(() => saveModels(picked))}>
            Save
          </Button>
        </span>
      </div>
    </div>
  );
}
