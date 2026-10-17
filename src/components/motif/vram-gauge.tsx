import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type VramGaugeProps = {
  /** Gigabytes in use, or null until the model manager measures it. */
  usedGb: number | null;
  totalGb: number;
};

/** The gauge's look — the reading and the bar — without behaviour, so a trigger can wrap it. */
export function VramMeter({ usedGb, totalGb }: VramGaugeProps) {
  const measured = usedGb !== null;
  const ratio = measured ? Math.min(1, Math.max(0, usedGb / totalGb)) : 0;
  const text = measured ? `VRAM ${usedGb.toFixed(1)} / ${totalGb} GB` : `VRAM — / ${totalGb} GB`;
  return (
    <>
      <span className="hidden font-mono sm:inline">{text}</span>
      <span
        role="meter"
        aria-label="Graphics memory in use"
        aria-valuemin={0}
        aria-valuemax={totalGb}
        aria-valuenow={measured ? usedGb : undefined}
        aria-valuetext={measured ? `${usedGb.toFixed(1)} of ${totalGb} gigabytes` : "Not measured yet"}
        className={cn("h-2 w-14 overflow-hidden rounded-full border bg-surface-2 sm:w-[120px]", !measured && "border-dashed")}
      >
        <span className="block h-full bg-linear-to-r from-working to-primary" style={{ width: `${ratio * 100}%` }} />
      </span>
    </>
  );
}

/**
 * The graphics-memory gauge in the top bar when it can't be opened — before the card is
 * measured, or with Ollama off: aqua through to orange as it fills. Once measured, the top bar
 * shows `VramPanel`, which opens from the same gauge.
 */
export function VramGauge({ usedGb, totalGb }: VramGaugeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div tabIndex={0} className="flex items-center gap-2.5 rounded-sm text-[13px] text-muted-foreground">
          <VramMeter usedGb={usedGb} totalGb={totalGb} />
        </div>
      </TooltipTrigger>
      <TooltipContent>{usedGb !== null ? "Graphics memory in use" : "Ollama isn't answering, so nothing is measured"}</TooltipContent>
    </Tooltip>
  );
}
