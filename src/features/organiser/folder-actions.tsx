"use client";

import Link from "next/link";
import { startScan, suggestCategories } from "@/app/organiser/actions";
import { Button } from "@/components/ui/button";
import { useServerAction } from "@/hooks/use-server-action";

export type NextAction = "scan" | "suggest" | "categories" | "build" | "review" | "history";
export type MoreAction = "scan-again" | "categories" | "plan" | "history";

const LINKS: Record<"categories" | "plan" | "history", (id: string) => string> = {
  categories: (id) => `/organiser/${id}/categories`,
  plan: (id) => `/organiser/${id}/plan`,
  history: (id) => `/organiser/${id}/history`,
};

/** The stage's one primary action, and the secondary ones beside it. */
export function FolderActions({
  folderId,
  next,
  more,
  busy,
}: {
  folderId: string;
  next: NextAction | null;
  more: MoreAction[];
  /** A job is running for the folder: actions that would queue another are disabled. */
  busy: boolean;
}) {
  const { pending, run } = useServerAction();
  const primary = (() => {
    switch (next) {
      case "scan":
        return (
          <Button loading={pending} disabled={busy} onClick={() => run(() => startScan(folderId))}>
            Scan folder
          </Button>
        );
      case "suggest":
        return (
          <Button loading={pending} disabled={busy} onClick={() => run(() => suggestCategories(folderId))}>
            Suggest categories
          </Button>
        );
      case "categories":
        return <LinkKey href={LINKS.categories(folderId)}>Review categories</LinkKey>;
      case "build":
        return <LinkKey href={LINKS.plan(folderId)}>Build plan</LinkKey>;
      case "review":
        return <LinkKey href={LINKS.plan(folderId)}>Review plan</LinkKey>;
      case "history":
        return <LinkKey href={LINKS.history(folderId)}>Open history</LinkKey>;
      default:
        return null;
    }
  })();

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {primary}
      <span className="flex-1" />
      {more.map((m) =>
        m === "scan-again" ? (
          <Button key={m} variant="ghost" size="sm" disabled={busy || pending} onClick={() => run(() => startScan(folderId))}>
            Scan again
          </Button>
        ) : (
          <Button key={m} asChild variant="ghost" size="sm">
            <Link href={LINKS[m](folderId)}>{m === "categories" ? "Categories" : m === "plan" ? "Plan" : "History"}</Link>
          </Button>
        ),
      )}
    </div>
  );
}

function LinkKey({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button asChild>
      <Link href={href}>{children}</Link>
    </Button>
  );
}
