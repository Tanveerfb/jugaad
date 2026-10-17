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

describe.skipIf(!live)(`live ${provider} vision`, () => {
  it("captions an image it is sent", { timeout: 120_000 }, async () => {
    const { createCanvas } = await import("@napi-rs/canvas");
    const canvas = createCanvas(256, 256);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#1e3a8a";
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.arc(128, 128, 80, 0, Math.PI * 2);
    ctx.fill();
    const model = { provider: "ollama" as const, baseURL, modelId: process.env.JUGAAD_LIVE_MODEL ?? "", maxOutputTokens: 60, timeoutMs: 110_000, reasoning: "none" as const };
    const ai = createAiSdkAi(model, undefined, model, model);
    const { caption } = await ai.describeImage({ image: new Uint8Array(canvas.toBuffer("image/png")), mediaType: "image/png", fileName: "shape.png" });
    process.stdout.write(`\n[live] caption: ${caption}\n`);
    expect(caption).toMatch(/circle|red|round|dot/i);
  });
});

describe.skipIf(!live)("live embeddings", () => {
  it("puts similar files closer together than unrelated ones", { timeout: 120_000 }, async () => {
    const { createOllamaEmbedder } = await import("./ollama-embedder");
    const { dot } = await import("@/lib/domain/vectors");
    const embedder = createOllamaEmbedder({
      baseURL,
      modelId: process.env.JUGAAD_LIVE_EMBED_MODEL ?? "qwen3-embedding:0.6b",
      numCtx: 4096,
      batchSize: 32,
      timeoutMs: 110_000,
      forGrouping: (t) => t,
    });
    const started = performance.now();
    const [invoiceA, invoiceB, photo] = await embedder.embedTexts([
      "Invoice_0423_final.pdf — Tax invoice no. 0423, total due $412.00",
      "electricity-bill-march.pdf — Amount payable 186.40, due 14 April",
      "IMG_2001.jpg — photo taken 2024-05-01 on Google Pixel 8",
    ]);
    const ms = Math.round(performance.now() - started);
    process.stdout.write(
      `\n[live] invoice~bill ${dot(invoiceA, invoiceB).toFixed(3)}, invoice~photo ${dot(invoiceA, photo).toFixed(3)} in ${ms} ms\n`,
    );
    expect(dot(invoiceA, invoiceB)).toBeGreaterThan(dot(invoiceA, photo));
    expect(Math.hypot(...invoiceA)).toBeCloseTo(1);
  });
});
