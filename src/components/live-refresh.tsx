"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Re-renders the page from the server every couple of seconds while a job runs, so progress
 * the worker writes to the store shows up — the store is the app's only channel to the worker
 * (owner's choice). Stops as soon as nothing is running.
 */
export function LiveRefresh({ active, everyMs = 1500 }: { active: boolean; everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => router.refresh(), everyMs);
    return () => clearInterval(timer);
  }, [active, everyMs, router]);
  return null;
}
