"use client";

import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

/**
 * Back from a module view to the workbench. Runs the reverse morph (panel → hexagon) via the
 * `module-close` transition type; Escape does the same.
 */
export function BackToWorkbench() {
  const link = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Escape closes the module, unless something inside (a menu, a dialog) handled it first
      if (e.key === "Escape" && !e.defaultPrevented) link.current?.click();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Button asChild variant="secondary" size="icon">
      <Link ref={link} href="/" transitionTypes={["module-close"]} aria-label="Back to workbench">
        <ChevronLeftIcon aria-hidden="true" />
      </Link>
    </Button>
  );
}
