import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { SonicControl } from "@/components/motif/sonic-control";
import { ThemeToggle } from "@/components/motif/theme-toggle";
import { VramGauge } from "@/components/motif/vram-gauge";

import { readGpuPicture } from "@/lib/ai/model-manager";
import { serverEnv } from "@/lib/env";

/** Shown until the card is measured, and when it can't be (no NVIDIA tools, Ollama off). */
const VRAM_TOTAL_GB = 16;
const GB = 1024 ** 3;

/** The app's navigation: wordmark home, VRAM gauge, the sonic control, theme switch. */
export function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2.5 border-b border-border/60 bg-background/90 px-4 py-2.5 sm:gap-4 sm:px-7 sm:py-3">
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
      <ThemeToggle />
    </header>
  );
}

/** The card's real memory use, read per request (nvidia-smi, else what Ollama holds). */
async function LiveVram() {
  await connection();
  const gpu = await readGpuPicture(serverEnv.JUGAAD_OLLAMA_URL).catch(() => null);
  return gpu ? (
    <VramGauge usedGb={gpu.usedBytes / GB} totalGb={Math.round(gpu.totalBytes / GB)} />
  ) : (
    <VramGauge usedGb={null} totalGb={VRAM_TOTAL_GB} />
  );
}
