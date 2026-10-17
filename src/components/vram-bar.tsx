import { cn } from "@/lib/utils";

export type VramSegment = { label: string; gb: number; tone: "jugaad" | "jugaad-2" | "other" };

/**
 * A bar of the card's memory split into who holds it, with a legend — the VRAM panel and the
 * settings page's "fits together" bar. Jugaad's share is lit, other apps' hatched, so the two
 * read apart without colour.
 */
export function VramBar({ segments, totalGb, className }: { segments: VramSegment[]; totalGb: number; className?: string }) {
  const swatch = (tone: VramSegment["tone"]) =>
    tone === "jugaad" ? "bg-primary" : tone === "jugaad-2" ? "bg-[color-mix(in_srgb,var(--primary)_60%,var(--working))]" : "bg-hatched";
  return (
    <div className={cn("grid gap-1.5", className)}>
      <div aria-hidden="true" className="flex h-3 overflow-hidden bg-surface-2 shadow-[inset_0_0_0_1px_var(--border)]">
        {segments.map((s) => (
          <span key={s.label} className={cn("block h-full", swatch(s.tone))} style={{ width: `${Math.min(100, (s.gb / totalGb) * 100)}%` }} />
        ))}
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-x-3.5 gap-y-1 p-0 text-xs text-muted-foreground">
        {segments.map((s) => (
          <li key={s.label} className="inline-flex items-center gap-1.5">
            <i aria-hidden="true" className={cn("inline-block size-2.5", swatch(s.tone))} />
            {s.label} {s.gb.toFixed(1)} GB
          </li>
        ))}
      </ul>
    </div>
  );
}
