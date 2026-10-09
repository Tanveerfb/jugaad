import type { ClassifyFileInput, FileClassification } from "@/schemas/file-classification-schema";

/**
 * Everything Jugaad asks a model, in domain terms (project-rules §AI). Components and jobs
 * call this; nothing else imports a model SDK. Add a method per narrow task as modules need
 * one — never a general "chat" escape hatch (spec: no open-ended agent).
 */
export type WorkbenchAi = {
  /** Which implementation answered — shown in logs and, later, the model manager. */
  readonly provider: AiProviderName;
  /** Organiser step 4: one file → one approved category, a tidier name, a confidence. */
  classifyFile(input: ClassifyFileInput, options?: AiCallOptions): Promise<FileClassification>;
};

export type AiProviderName = "mock" | "ollama";

export type AiCallOptions = {
  signal?: AbortSignal;
};

/** A model call that failed after its retry. Carries what to tell the owner, never the content. */
export class AiTaskError extends Error {
  constructor(
    readonly task: string,
    readonly reason: "invalid-output" | "unreachable" | "timeout" | "unknown",
    options?: { cause?: unknown },
  ) {
    super(`${task} failed: ${reason}`, options);
    this.name = "AiTaskError";
  }
}
