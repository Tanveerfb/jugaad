"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

/**
 * Sun / moon switch — no visible label (design rules: don't state the obvious). Which icon and
 * which accessible name show is decided by CSS from <html data-theme>, so the server render
 * and a saved light theme never disagree during hydration. A hexagonal console key.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next: Theme = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // storage blocked (private window): the switch still works for this visit
    }
  }

  return (
    <Button type="button" variant="secondary" size="icon" onClick={toggle}>
      <MoonIcon aria-hidden="true" className="light:hidden" />
      <SunIcon aria-hidden="true" className="hidden light:block" />
      <span className="sr-only light:hidden">Switch to light theme</span>
      <span className="sr-only hidden light:inline">Switch to dark theme</span>
    </Button>
  );
}
