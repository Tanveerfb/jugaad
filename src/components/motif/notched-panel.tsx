import { cn } from "@/lib/utils";

type NotchedPanelProps = React.ComponentProps<"div"> & {
  /** "notched": chamfers plus the top-centre notch. "chamfered": chamfers only. */
  shape?: "notched" | "chamfered";
  innerClassName?: string;
};

/**
 * The motif's panel — never a plain rectangle. Two layers share one clip-path: the outer in
 * the border colour, the inner inset by 1px, so the edge stays crisp along the diagonals
 * where a CSS border would be clipped away.
 */
export function NotchedPanel({
  shape = "notched",
  className,
  innerClassName,
  children,
  ...props
}: NotchedPanelProps) {
  const clip = shape === "notched" ? "shape-notched" : "shape-chamfered";
  return (
    <div className={cn("bg-border p-px", clip, className)} {...props}>
      <div className={cn("h-full bg-card", clip, innerClassName)}>{children}</div>
    </div>
  );
}
