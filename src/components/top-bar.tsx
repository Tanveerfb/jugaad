import { SettingsIcon } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { SonicControl } from "@/components/motif/sonic-control";
import { ThemeToggle } from "@/components/motif/theme-toggle";
import { VramGauge } from "@/components/motif/vram-gauge";
import { Button } from "@/components/ui/button";
import { VramDetails } from "@/components/vram-details";
import { VramPanel } from "@/components/vram-panel";
import { getVramView } from "@/lib/settings-view";

/** Shown until the card is measured, and when it can't be (no NVIDIA tools, Ollama off). */
const VRAM_TOTAL_GB = 16;

/** The app's navigation: wordmark home, VRAM gauge (opens the VRAM panel), the sonic control, settings, theme switch. */
export function TopBar() {
  return (
    <header className="sticky top-(--titlebar-h) z-20 flex items-center gap-2 border-b border-border/60 bg-background/90 px-4 py-2.5 sm:gap-4 sm:px-7 sm:py-3">
      <Link
        href="/"
        className="flex items-center gap-2.5 font-heading text-xl font-bold tracking-[0.01em] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        <span aria-hidden="true" className="h-[19px] w-[22px] bg-primary shape-hex" />
        Jugaad
      </Link>
      <div className="flex-1" />
      <Suspense fallback={<VramGauge usedGb={null} totalGb={VRAM_TOTAL_GB} />}>
        <LiveVram />
      </Suspense>
      <SonicControl available={false} unavailableReason="Voice arrives in phase 2" />
      <Button asChild variant="secondary" size="icon">
        <Link href="/settings" aria-label="Settings">
          <SettingsIcon aria-hidden="true" />
        </Link>
      </Button>
      <ThemeToggle />
    </header>
  );
}

/** The card's real memory use, read per request (nvidia-smi, else what Ollama holds), and the panel it opens. */
async function LiveVram() {
  await connection();
  const view = await getVramView();
  if (!view.reachable) return <VramGauge usedGb={null} totalGb={VRAM_TOTAL_GB} />;
  return (
    <VramPanel usedGb={view.usedGb} totalGb={Math.round(view.totalGb)}>
      <VramDetails view={view} />
    </VramPanel>
  );
}
