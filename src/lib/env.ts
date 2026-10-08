import { z } from "zod";

/**
 * Environment variables, parsed once at startup (project-rules §RUNTIME). A missing or
 * malformed value stops the app with a message naming it.
 *
 * Server values are read only by server code and the worker. They are not secrets — Jugaad's
 * model servers are local and keyless — so there is no `server-only` guard (it would stop the
 * worker, which runs outside Next.js, from importing this). If a cloud key is ever added it
 * goes in its own `server-only` module.
 */
const serverEnvSchema = z
  .object({
    /** Which model backend answers: mock (no GPU), lmstudio or ollama. */
    JUGAAD_AI_PROVIDER: z.enum(["mock", "lmstudio", "ollama"]).default("mock"),
    JUGAAD_LMSTUDIO_URL: z.url().default("http://localhost:1234/v1"),
    JUGAAD_OLLAMA_URL: z.url().default("http://localhost:11434/v1"),
    /** Model for classification, exactly as LM Studio / `ollama list` names it. */
    JUGAAD_CLASSIFY_MODEL: z.string().min(1).optional(),
    /** Where the database lives. Default: %LOCALAPPDATA%\Jugaad (see lib/data-dir.ts). */
    JUGAAD_DATA_DIR: z.string().min(1).optional(),
  })
  .refine((env) => env.JUGAAD_AI_PROVIDER === "mock" || env.JUGAAD_CLASSIFY_MODEL, {
    message: "JUGAAD_CLASSIFY_MODEL is required unless JUGAAD_AI_PROVIDER is mock",
    path: ["JUGAAD_CLASSIFY_MODEL"],
  });

const clientEnvSchema = z.object({});

/** Server-side variables — model backend and model names. Never import from a client component. */
export const serverEnv = parseOrExplain("server", serverEnvSchema, {
  JUGAAD_AI_PROVIDER: process.env.JUGAAD_AI_PROVIDER,
  JUGAAD_LMSTUDIO_URL: process.env.JUGAAD_LMSTUDIO_URL,
  JUGAAD_OLLAMA_URL: process.env.JUGAAD_OLLAMA_URL,
  JUGAAD_CLASSIFY_MODEL: process.env.JUGAAD_CLASSIFY_MODEL,
  JUGAAD_DATA_DIR: process.env.JUGAAD_DATA_DIR,
});

/** Client-safe variables. Reference each `NEXT_PUBLIC_*` explicitly — Next.js inlines them at build. */
export const clientEnv = parseOrExplain("client", clientEnvSchema, {});

function parseOrExplain<T extends z.ZodType>(side: string, schema: T, raw: Record<string, string | undefined>): z.infer<T> {
  // empty strings count as unset, so a blank line in .env.local falls back to the default
  const cleaned = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v === "" ? undefined : v]));
  const result = schema.safeParse(cleaned);
  if (!result.success) {
    throw new Error(`Invalid ${side} environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
