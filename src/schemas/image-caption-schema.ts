import { z } from "zod";

/**
 * Seeing an image (owner's choice, 2026-10-17: images, not videos yet). The classifier, Gemma 4
 * 12B, has vision built in — no second model, no extra VRAM (checked on the PC). Its one-line
 * caption is stored with the file's signals and feeds grouping and sorting, so a folder of
 * pictures can be told apart by what they show rather than by their names.
 */
export const describeImageInputSchema = z.object({
  /** The image's bytes. They go only to the local model. */
  image: z.instanceof(Uint8Array),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  /** Shown to the model too: a name often says what a picture is for. */
  fileName: z.string().min(1),
});
export type DescribeImageInput = z.infer<typeof describeImageInputSchema>;

/** One short line: what the image shows and what it is for. */
export const imageCaptionSchema = z.string().trim().min(1).max(200);
export type ImageCaption = { caption: string };
