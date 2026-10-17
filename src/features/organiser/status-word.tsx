import { StatusLight, type StatusTone } from "@/components/motif/status-light";
import type { FolderStatus } from "@/lib/domain/folder-status";

/** A folder's status as a light and a word. "Organised" reads as plain text — nothing waits. */
const TONE: Record<FolderStatus["tone"], StatusTone> = {
  working: "working",
  attention: "attention",
  done: "idle",
  idle: "idle",
};

export function StatusWord({ status }: { status: FolderStatus }) {
  return (
    <StatusLight tone={TONE[status.tone]} className={status.tone === "done" ? "text-foreground" : undefined}>
      {status.word}
    </StatusLight>
  );
}
