import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/types";

const STATUS_STYLES: Record<TaskStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-blue-500/20 text-blue-400 animate-pulse",
  done: "bg-green-500/20 text-green-400",
  error: "bg-red-500/20 text-red-400",
  split: "bg-purple-500/20 text-purple-400",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  running: "Running",
  done: "Done",
  error: "Error",
  split: "Split",
};

type StatusBadgeProps = {
  status: TaskStatus;
  className?: string;
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
