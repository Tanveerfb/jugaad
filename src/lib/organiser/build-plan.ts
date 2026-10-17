import { AiTaskError, type WorkbenchAi } from "@/lib/ai";
import type { WorkbenchStore } from "@/lib/data";
import { REVIEW_THRESHOLD } from "@/lib/domain/classification";
import { describeFile } from "@/lib/domain/describe-file";
import { nearestExamples } from "@/lib/domain/filing-examples";
import { folderSamples } from "@/lib/domain/folder-samples";
import { findProjectRoots, insideDir, type ProjectRoot } from "@/lib/domain/projects";
import { REVIEW_FOLDER, inScope, toMoves, type PlannedFile } from "@/lib/domain/plan-rules";
import type { ClassifyFileInput, FileClassification, FilingExample } from "@/schemas/file-classification-schema";
import type { FileSignals } from "@/schemas/file-signals-schema";
import type { IndexedFile } from "@/schemas/indexed-file-schema";
import type { Plan } from "@/schemas/plan-schema";

export type BuildPlanOptions = {
  /** The classification model's id, prepared on the GPU before the first call. */
  classifyModel: string;
  prepareModel: (model: string) => Promise<void>;
  signal?: AbortSignal;
  onProgress?: (progress: number | null, detail: string) => void;
};

export type BuildPlanResult = { plan: Plan; sorted: number; needsReview: number; duplicates: number } | { stopped: true };

/**
 * Builds a draft plan for a scanned folder (spec, Organiser steps 4–5): each file is classified,
 * one at a time, against the categories the owner approved. Confident answers go to their
 * category's subfolder, doubtful ones and failures to `_review`, extra copies of duplicates to
 * `_review\Duplicates`. Which files are planned follows the folder's "Include subfolders" tick
 * (`inScope`) — the same files categories were suggested from. Names are kept; a suggested name waits for the owner's tick. Nothing moves — the
 * plan waits for approval. Older plans for the folder that were never applied are discarded.
 */
export async function buildPlan(
  store: WorkbenchStore,
  ai: WorkbenchAi,
  folderId: string,
  options: BuildPlanOptions,
): Promise<BuildPlanResult> {
  const { signal, onProgress = () => {} } = options;
  const categories = store
    .listCategories(folderId)
    .filter((c) => c.state === "approved")
    .map((c) => c.name);
  if (categories.length === 0) throw new Error("Approve at least one category first.");

  const all = store.listIndexedFiles(folderId);
  const signals = store.listFileSignals(folderId);
  const settled = new Set([REVIEW_FOLDER, ...categories].map((n) => n.toLowerCase()));
  const includeSubfolders = store.getAllowedFolder(folderId)?.includeSubfolders ?? false;
  // project folders are kept whole: their files are never sorted one by one; with subfolders
  // included, each project is sorted as one folder (2026-10-17)
  const projects = findProjectRoots(all.map((f) => f.path)).filter((p) => inScope(`${p.path}\\x`, includeSubfolders, settled));
  const inProject = (path: string) => projects.some((p) => insideDir(path, p.path));
  const loose = all.filter((f) => f.state !== "locked" && inScope(f.path, includeSubfolders, settled) && !inProject(f.path));

  // extra copies of a duplicate set aren't classified: the oldest copy is, the rest go to review
  const keeperOf = new Map<string, string>();
  for (const group of store.listDuplicateGroups(folderId)) {
    const [keeper, ...copies] = [...group.files].sort((a, b) => a.createdMs - b.createdMs || a.path.localeCompare(b.path));
    for (const copy of copies) keeperOf.set(copy.id, keeper.path);
  }

  const planned: PlannedFile[] = [];
  const toClassify = loose.filter((f) => !keeperOf.has(f.id));
  // answers are remembered per contents, model and category list: a rebuild with nothing
  // changed asks the model nothing (a 525-file plan took 9 minutes on the owner's Downloads)
  // "2:": answers given before images had captions are not reused
  // "3:": answers given before the model saw what each category folder holds are not reused
  const categoriesKey = `3:${[...categories].sort().join("\u001f")}`;
  let prepared = false;
  // the owner's own filing decisions: a file they placed goes there again; for other files the
  // nearest decisions are shown to the model as examples (2026-10-17: learn from corrections)
  const approved = new Set(categories);
  const examples = store.listFilingExamples(folderId).filter((e) => approved.has(e.category));
  const examplesFor = (file: IndexedFile) => nearestExamples(describeFile(file, signals.get(file.id)), examples);
  // the cache key includes which examples a file was shown, so a new correction re-sorts only
  // the files it is close to
  const keyFor = (shown: readonly FilingExample[]) =>
    shown.length ? `${categoriesKey}|${shown.map((e) => e.fileId).sort().join(",")}` : categoriesKey;
  const memory: Memory = {
    decidedByOwner: (file) => examples.find((e) => e.fileId === file.id && e.hash === file.hash) ?? null,
    examplesFor,
    recall: (file, shown) =>
      file.hash ? store.getClassification(file.id, file.hash, options.classifyModel, keyFor(shown)) : null,
    remember: (file, shown, answer) => {
      if (file.hash) store.recordClassification(file.id, file.hash, options.classifyModel, keyFor(shown), answer);
    },
    beforeFirstCall: async () => {
      if (!prepared) await options.prepareModel(options.classifyModel);
      prepared = true;
    },
  };
  // what the owner's existing category folders already hold, so the model knows what goes there
  const holds = folderSamples(all.filter((f) => f.state !== "gone").map((f) => f.path), categories);
  const menu = { categories, holds: Object.keys(holds).length ? holds : undefined };
  for (const [i, file] of toClassify.entries()) {
    if (signal?.aborted) return { stopped: true };
    onProgress(i / toClassify.length, `Sorting ${(i + 1).toLocaleString("en")} of ${toClassify.length.toLocaleString("en")} files`);
    planned.push(await classify(ai, file, signals.get(file.id), menu, memory, signal));
  }
  for (const project of projects) {
    if (signal?.aborted) return { stopped: true };
    await memory.beforeFirstCall();
    planned.push(await classifyProject(ai, project, all, menu, signal));
  }
  for (const file of loose) {
    const keeper = keeperOf.get(file.id);
    if (keeper) planned.push({ path: file.path, kind: "duplicate", keeperPath: keeper });
  }

  const moves = toMoves(planned, new Set(all.map((f) => f.path)));
  for (const old of store.listPlans(folderId)) {
    if (old.status === "draft" || old.status === "approved") store.transitionPlan(old.id, "discarded");
  }
  const plan = store.createPlan(folderId, moves);
  onProgress(1, `${moves.length.toLocaleString("en")} moves proposed`);
  return {
    plan,
    sorted: planned.filter((p) => p.kind === "sorted").length,
    needsReview: planned.filter((p) => p.kind === "needs-review").length,
    duplicates: planned.filter((p) => p.kind === "duplicate").length,
  };
}

/**
 * A project folder is sorted as one: the model sees its name, what marks it as a project, and a
 * sample of what it holds. Not remembered between builds — there are few, and a folder has no
 * single content hash.
 */
async function classifyProject(
  ai: WorkbenchAi,
  project: ProjectRoot,
  all: readonly IndexedFile[],
  menu: CategoryMenu,
  signal?: AbortSignal,
): Promise<PlannedFile> {
  const files = all.filter((f) => insideDir(f.path, project.path));
  const name = project.path.split("\\").at(-1)!;
  try {
    const answer = await ai.classifyFile(
      {
        fileName: name,
        extension: "",
        sizeBytes: files.reduce((sum, f) => sum + f.size, 0),
        modifiedAt: new Date(Math.max(...files.map((f) => f.modifiedMs))).toISOString(),
        excerpt: `A project folder (it has ${project.marker}) holding ${project.files} files, e.g. ${files
          .slice(0, 12)
          .map((f) => f.path.slice(project.path.length + 1))
          .join(", ")}`.slice(0, 1500),
        ...menu,
      },
      { signal },
    );
    const kind = answer.confidence < REVIEW_THRESHOLD ? "needs-review" : "sorted";
    return { path: project.path, kind, category: answer.category, confidence: answer.confidence, isFolder: true };
  } catch (error) {
    if (signal?.aborted || !(error instanceof AiTaskError)) throw error;
    return { path: project.path, kind: "needs-review", category: null, confidence: 0, isFolder: true };
  }
}

/** The approved categories, and samples of what the ones that already exist as folders hold. */
type CategoryMenu = Pick<ClassifyFileInput, "categories" | "holds">;

/** What this build knows before asking the model: the owner's decisions and remembered answers. */
type Memory = {
  /** The owner already put this exact file somewhere ("Send to…"). */
  decidedByOwner(file: IndexedFile): FilingExample | null;
  examplesFor(file: IndexedFile): FilingExample[];
  recall(file: IndexedFile, shown: readonly FilingExample[]): FileClassification | null;
  remember(file: IndexedFile, shown: readonly FilingExample[], answer: FileClassification): void;
  /** Called before the first answer the model has to give — loads it onto the GPU. */
  beforeFirstCall(): Promise<void>;
};

async function classify(
  ai: WorkbenchAi,
  file: IndexedFile,
  signals: FileSignals | undefined,
  menu: CategoryMenu,
  memory: Memory,
  signal?: AbortSignal,
): Promise<PlannedFile> {
  const owner = memory.decidedByOwner(file);
  if (owner) return { path: file.path, kind: "sorted", category: owner.category, confidence: 1 };
  try {
    const shown = memory.examplesFor(file);
    let answer = memory.recall(file, shown);
    if (!answer) {
      await memory.beforeFirstCall();
      answer = await ai.classifyFile(
        {
          fileName: file.path,
          extension: file.extension,
          sizeBytes: file.size,
          modifiedAt: new Date(file.modifiedMs).toISOString(),
          excerpt: excerptFor(signals),
          ...menu,
          examples: shown.length ? shown.map((e) => ({ file: e.description.slice(0, 400), category: e.category })) : undefined,
        },
        { signal },
      );
      memory.remember(file, shown, answer);
    }
    const kind = answer.confidence < REVIEW_THRESHOLD ? "needs-review" : "sorted";
    return { path: file.path, kind, category: answer.category, confidence: answer.confidence, suggestedName: answer.suggestedName };
  } catch (error) {
    if (signal?.aborted || !(error instanceof AiTaskError)) throw error;
    // the model couldn't give a valid answer for this file: the owner decides
    return { path: file.path, kind: "needs-review", category: null, confidence: 0 };
  }
}

/** What the model reads about a file's contents: its opening text, or a photo's date and camera. */
function excerptFor(signals: FileSignals | undefined): string | undefined {
  if (!signals) return undefined;
  if (signals.excerpt) return signals.excerpt;
  if (signals.caption) {
    if (signals.kind === "pdf") return `Scanned document; its first page shows: ${signals.caption}`;
    const when = signals.takenAt ? ` (photo taken ${signals.takenAt.slice(0, 10)})` : "";
    return `Image showing: ${signals.caption}${when}`;
  }
  if (signals.kind === "image") {
    const parts = ["Photo", signals.takenAt && `taken ${signals.takenAt.slice(0, 10)}`, signals.camera && `on ${signals.camera}`];
    return parts.filter(Boolean).join(" ");
  }
  return undefined;
}
