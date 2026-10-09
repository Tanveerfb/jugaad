import { describe, expect, it } from "vitest";
import type { ClassifyFileInput } from "@/schemas/file-classification-schema";
import { createAiSdkAi } from "./ai-sdk";

/*
 * Opt-in check against a real local model. Skipped unless JUGAAD_LIVE_AI=1, so `npm test`
 * never needs a GPU. Example:
 *   JUGAAD_LIVE_AI=1 JUGAAD_LIVE_MODEL=gemma4:12b-it-qat npx vitest run src/lib/ai/live.test.ts
 */
const live = process.env.JUGAAD_LIVE_AI === "1";
const provider = "ollama";
const baseURL = "http://localhost:11434/v1";

const INPUT: ClassifyFileInput = {
  fileName: "Invoice_0423_final(2).pdf",
  extension: "pdf",
  sizeBytes: 81_920,
  modifiedAt: "2026-04-23T10:00:00Z",
  excerpt: "Tax invoice no. 0423 — total due $412.00 — payment within 14 days",
  categories: ["Invoices", "Photos", "Installers"],
};

describe.skipIf(!live)(`live ${provider} model`, () => {
  it("classifies a file into an approved category with a valid result", { timeout: 120_000 }, async () => {
    const ai = createAiSdkAi({
      provider,
      baseURL,
      modelId: process.env.JUGAAD_LIVE_MODEL ?? "",
      maxOutputTokens: 256,
      timeoutMs: 110_000,
      reasoning: "none",
    });
    const started = performance.now();
    const result = await ai.classifyFile(INPUT);
    const ms = Math.round(performance.now() - started);
    // reported so the owner sees what the model actually said and how long it took
    process.stdout.write(`\n[live] ${JSON.stringify(result)} in ${ms} ms\n`);
    expect(INPUT.categories).toContain(result.category);
    expect(result.suggestedName.endsWith(".pdf")).toBe(true);
  });
});
