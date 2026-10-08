import { cn } from "@/lib/utils";
import { litSegmentCount, ringMarks, ringSegments, type RingMark } from "@/lib/motif-geometry";

type RotorProps = {
  /** 0…1 while a job runs; null when nothing is running. */
  progress: number | null;
  /** Small word under the figure — what the job is doing ("scanning"), or the idle word. */
  caption: string;
  /** Accessible description of the whole ring. */
  label: string;
  className?: string;
};

const C = 116; // centre of the 232×232 viewBox
const SEGMENTS = ringSegments(C, C, 92);
const OUTER_MARKS = ringMarks(C, C, 108, 36, 2.4);
const INNER_MARKS = ringMarks(C, C, 74, 18, 2);

/**
 * The job-progress ring: 18 segments (the 2012 room's ribs) with the leading one pulsing, and
 * two rings of original marks turning in opposite directions while a job runs. Idle, nothing
 * turns — motion here means work is happening.
 */
export function Rotor({ progress, caption, label, className }: RotorProps) {
  const running = progress !== null;
  const lit = running ? litSegmentCount(progress) : 0;
  const percent = running ? `${Math.round(progress * 100)}%` : "—";

  return (
    <svg viewBox="0 0 232 232" role="img" aria-label={label} className={cn("size-[232px]", className)}>
      <g className={cn("origin-center [transform-box:view-box]", running && "animate-rotor-cw")}>
        {OUTER_MARKS.map((m, i) => (
          <Mark key={i} mark={m} />
        ))}
      </g>
      <g>
        {SEGMENTS.map((s) => {
          const on = s.index < lit;
          const head = on && s.index === lit - 1;
          return (
            <path
              key={s.index}
              d={s.d}
              className={cn(
                "fill-none [stroke-width:9]",
                on ? "stroke-primary" : "stroke-surface-2",
                head && "animate-pulse-head stroke-[color-mix(in_srgb,var(--primary)_55%,white)]",
              )}
            />
          );
        })}
      </g>
      <g className={cn("origin-center [transform-box:view-box]", running && "animate-rotor-ccw")}>
        <circle cx={C} cy={C} r={66} className="fill-none stroke-border [stroke-dasharray:2_6] [stroke-width:1]" />
        {INNER_MARKS.map((m, i) => (
          <Mark key={i} mark={m} />
        ))}
      </g>
      <text x={C} y={114} textAnchor="middle" className="fill-foreground font-mono text-[34px] font-medium">
        {percent}
      </text>
      <text x={C} y={138} textAnchor="middle" className="fill-muted-foreground font-mono text-[12px]">
        {caption}
      </text>
    </svg>
  );
}

function Mark({ mark }: { mark: RingMark }) {
  if (mark.kind === "dot") {
    return <circle cx={mark.cx} cy={mark.cy} r={mark.r} className="fill-muted-foreground opacity-70" />;
  }
  return (
    <rect
      x={mark.x}
      y={mark.y}
      width={mark.width}
      height={mark.height}
      transform={`rotate(${mark.rotate} ${mark.ox} ${mark.oy})`}
      className="fill-muted-foreground opacity-70"
    />
  );
}
