import type { FileClassification } from "@/schemas/file-classification-schema";

/**
 * Below this confidence a classification is shown as "needs review" instead of a proposed
 * move (spec, Organiser step 4). A starting value; becomes a setting when trust is loosened.
 */
export const REVIEW_THRESHOLD = 0.6;

/** True when the owner should look at this file before it joins a plan. */
export function needsReview(classification: FileClassification, threshold: number = REVIEW_THRESHOLD): boolean {
  return classification.confidence < threshold;
}
