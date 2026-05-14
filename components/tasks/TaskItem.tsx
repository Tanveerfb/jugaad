import StatusBadge from "@/components/shared/StatusBadge";
import type { Task } from "@/types";
import { cn } from "@/lib/utils";

type TaskItemProps = {
  task: Task;
  isActive: boolean;
};

export default function TaskItem({ task, isActive }: TaskItemProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition-colors",
        isActive && "bg-muted/50",
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.title}</p>
        <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">
          {task.filePath}
        </p>
        {task.error && (
          <p className="text-xs text-red-400 mt-1 line-clamp-2">{task.error}</p>
        )}
      </div>
      <StatusBadge status={task.status} />
    </div>
  );
}
