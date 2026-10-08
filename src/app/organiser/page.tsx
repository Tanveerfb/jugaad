import type { Metadata } from "next";
import { ModuleView } from "@/components/module-view";
import { EmptyState } from "@/components/ui/empty-state";
import { getModule } from "@/lib/modules";

export const metadata: Metadata = { title: "Organiser — Jugaad" };

export default function OrganiserPage() {
  const organiser = getModule("organiser");
  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 pb-24 pt-[22px] sm:px-7 sm:pt-9">
      <ModuleView module={organiser}>
        <EmptyState
          title="No folders yet"
          description="The Organiser is being built. Once it is, add a folder here and Jugaad can see it — nothing outside your list is ever read, and no file is ever deleted."
        />
      </ModuleView>
    </main>
  );
}
