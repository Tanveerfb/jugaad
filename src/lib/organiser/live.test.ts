import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createAiSdkAi } from "@/lib/ai/ai-sdk";
import { groupingPrefix } from "@/lib/ai/models";
import { createOllamaEmbedder } from "@/lib/ai/ollama-embedder";
import type { WorkbenchAi } from "@/lib/ai/types";
import { openSqliteStore } from "@/lib/data/sqlite";
import { scanFolder } from "@/lib/files/scan-folder";
import { REVIEW_THRESHOLD } from "@/lib/domain/classification";
import { SAMPLE_CATEGORIES, SAMPLE_FILES, writeSampleFolder } from "./fixtures/sample-folder";
import { suggestCategories } from "./suggest-categories";

/*
 * Opt-in: the Organiser against real models on the sample folder. Skipped unless
 * JUGAAD_LIVE_AI=1, so `npm test` never needs a GPU. Example:
 *   JUGAAD_LIVE_AI=1 JUGAAD_LIVE_MODEL=gemma4:12b-it-qat npx vitest run src/lib/organiser/live.test.ts
 */
const live = process.env.JUGAAD_LIVE_AI === "1";
const baseURL = "http://localhost:11434/v1";
const chatModel = process.env.JUGAAD_LIVE_MODEL ?? "gemma4:12b-it-qat";
const embedModel = process.env.JUGAAD_LIVE_EMBED_MODEL ?? "qwen3-embedding:0.6b";

function liveAi(): WorkbenchAi {
  const task = { provider: "ollama" as const, baseURL, modelId: chatModel, timeoutMs: 110_000, reasoning: "none" as const };
  return {
    ...createAiSdkAi({ ...task, maxOutputTokens: 256 }, undefined, { ...task, maxOutputTokens: 64 }),
    ...createOllamaEmbedder({
      baseURL,
      modelId: embedModel,
      numCtx: 4096,
      batchSize: 32,
      timeoutMs: 110_000,
      forGrouping: groupingPrefix(embedModel),
    }),
  };
}

describe.skipIf(!live)(`live organiser (${chatModel}, ${embedModel})`, () => {
  it("suggests categories for the sample folder", { timeout: 600_000 }, async () => {
    const dir = mkdtempSync(join(tmpdir(), "jugaad-live-"));
    const store = openSqliteStore(":memory:");
    try {
      await writeSampleFolder(dir);
      const folderId = store.allowFolder(dir).id;
      await scanFolder(store, folderId, { protectedPaths: [] });
      const started = performance.now();
      const result = await suggestCategories(store, liveAi(), folderId, {
        embedModel,
        nameModel: chatModel,
        prepareModel: async () => {},
      });
      const seconds = ((performance.now() - started) / 1000).toFixed(1);
      if ("stopped" in result) throw new Error("stopped");
      process.stdout.write(`\n[live] ${result.length} categories in ${seconds} s:\n`);
      for (const c of result) process.stdout.write(`  ${c.name} (${c.fileCount}): ${c.examples.slice(0, 3).join(", ")}\n`);
      expect(result.length).toBeGreaterThanOrEqual(4);
      expect(result.reduce((s, c) => s + c.fileCount, 0)).toBe(SAMPLE_FILES.length);
    } finally {
      store.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe.skipIf(!live)(`live classification (${chatModel})`, () => {
  it("sorts the sample folder into its 8 categories", { timeout: 900_000 }, async () => {
    const dir = mkdtempSync(join(tmpdir(), "jugaad-live-"));
    const store = openSqliteStore(":memory:");
    try {
      const expected = await writeSampleFolder(dir);
      const folderId = store.allowFolder(dir).id;
      await scanFolder(store, folderId, { protectedPaths: [] });
      const signals = store.listFileSignals(folderId);
      const ai = liveAi();
      const files = store.listIndexedFiles(folderId);

      // warm the model so the timing is per file, not the cold load
      const coldStart = performance.now();
      await ai.classifyFile({ fileName: "warm-up.txt", extension: "txt", sizeBytes: 1, modifiedAt: new Date().toISOString(), categories: [...SAMPLE_CATEGORIES] });
      const coldMs = Math.round(performance.now() - coldStart);

      let right = 0;
      let doubtful = 0;
      let failed = 0;
      const wrong: string[] = [];
      const started = performance.now();
      for (const f of files) {
        const s = signals.get(f.id);
        const excerpt = s?.excerpt ?? (s?.kind === "image" ? `Photo taken ${s.takenAt?.slice(0, 10)} on ${s.camera}` : undefined);
        try {
          const answer = await ai.classifyFile({
            fileName: f.path,
            extension: f.extension,
            sizeBytes: f.size,
            modifiedAt: new Date(f.modifiedMs).toISOString(),
            excerpt: excerpt ?? undefined,
            categories: [...SAMPLE_CATEGORIES],
          });
          if (answer.confidence < REVIEW_THRESHOLD) doubtful++;
          if (answer.category === expected.get(f.path)) right++;
          else wrong.push(`${f.path} → ${answer.category} (${answer.confidence}), expected ${expected.get(f.path)}`);
        } catch {
          failed++;
          wrong.push(`${f.path} → failed`);
        }
      }
      const perFile = Math.round((performance.now() - started) / files.length);
      process.stdout.write(
        `
[live] ${chatModel}: ${right}/${files.length} right, ${doubtful} below ${REVIEW_THRESHOLD}, ${failed} failed; ` +
          `${perFile} ms a file warm, ${coldMs} ms first call
` +
          wrong.map((w) => `  ${w}
`).join(""),
      );
      expect(right).toBeGreaterThanOrEqual(files.length * 0.8);
    } finally {
      store.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
