"use client";

import { useNotificationStore } from "@/stores/notificationStore";
import type { NotificationEntry } from "@/stores/notificationStore";
import { useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

function typeIcon(type: NotificationEntry["type"]) {
  switch (type) {
    case "success":
      return <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />;
    case "error":
      return <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />;
    case "warning":
      return (
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
      );
    case "info":
      return <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />;
  }
}

function typeLabel(type: NotificationEntry["type"]) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const notifications = useNotificationStore((s) => s.notifications);
  const markAllSeen = useNotificationStore((s) => s.markAllSeen);
  const clearAll = useNotificationStore((s) => s.clearAll);

  // Mark all as seen when this page is opened
  useEffect(() => {
    markAllSeen();
  }, [markAllSeen]);

  return (
    <div className="max-w-2xl mx-auto py-10 px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/studio"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-lg font-semibold">Notification Log</h1>
          {notifications.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {notifications.length}
            </span>
          )}
        </div>
        {notifications.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-muted-foreground gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear all
          </Button>
        )}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Info className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                "flex items-start gap-3 px-4 py-3 bg-background hover:bg-muted/30 transition-colors",
              )}
            >
              {typeIcon(n.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug wrap-break-word">
                  {n.message}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {typeLabel(n.type)} &middot; {formatTime(n.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
