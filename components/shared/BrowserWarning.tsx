"use client";

import { useEffect, useState } from "react";
import { X, AlertTriangle } from "lucide-react";

const DISMISSED_KEY = "jugaad-browser-warning-dismissed";

export default function BrowserWarning() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const notSupported =
      typeof window !== "undefined" &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (window as any).showDirectoryPicker === "undefined";
    const dismissed = sessionStorage.getItem(DISMISSED_KEY) === "1";
    if (notSupported && !dismissed) {
      setShow(true);
    }
  }, []);

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="relative flex items-center gap-3 bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 text-sm text-amber-200">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
      <span>
        <strong className="font-semibold">Unsupported browser.</strong> File
        System Access API is not available. Please use Chrome, Edge, or another
        Chromium browser.
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss warning"
        className="ml-auto shrink-0 text-amber-400 hover:text-amber-200 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
