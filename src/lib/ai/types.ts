import type { CategoryNames, NameCategoriesInput } from "@/schemas/category-schema";
import type { DescribeImageInput, ImageCaption } from "@/schemas/image-caption-schema";
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
  /**
   * Organiser step 3: one vector per text, in order, unit length — so similar files sit close
   * together and can be clustered into suggested categories.
   */
  embedTexts(texts: readonly string[], options?: AiCallOptions): Promise<number[][]>;
  /**
   * Organiser step 3: a sample of every cluster's files → one short name per cluster, chosen
   * side by side so no two names mean the same thing.
   */
  nameCategories(input: NameCategoriesInput, options?: AiCallOptions): Promise<CategoryNames>;
  /** Organiser step 2: one image → a one-line caption of what it shows and what it is for. */
  describeImage(input: DescribeImageInput, options?: AiCallOptions): Promise<ImageCaption>;
};

export type AiProviderName = "mock" | "ollama";

export type AiCallOptions = {
  signal?: AbortSignal;
};

/**
 * A model call that failed after its retry. Carries what to tell the owner, never the content.
 * `rejected`: the server answered but refused this input — skip the item, keep going.
 * `unreachable`: no server to talk to — stop, the job reports it.
 */
export class AiTaskError extends Error {
  constructor(
    readonly task: string,
    readonly reason: "invalid-output" | "rejected" | "unreachable" | "timeout" | "unknown",
    options?: { cause?: unknown },
  ) {
    super(`${task} failed: ${reason}`, options);
    this.name = "AiTaskError";
  }
}
