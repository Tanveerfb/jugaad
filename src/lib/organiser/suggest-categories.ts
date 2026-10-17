import type { WorkbenchAi } from "@/lib/ai";
import type { WorkbenchStore } from "@/lib/data";
import { toCategoryName, sameCategoryName } from "@/lib/domain/category-rules";
import { clusterVectors } from "@/lib/domain/cluster";
import { describeFile } from "@/lib/domain/describe-file";
import { REVIEW_FOLDER, inScope, topFolder } from "@/lib/domain/plan-rules";
import { findProjectRoots, insideDir } from "@/lib/domain/projects";
import { describeImages } from "./describe-images";
import { dot, normalise } from "@/lib/domain/vectors";
import type { Category, NewCategory } from "@/schemas/category-schema";
import type { IndexedFile } from "@/schemas/indexed-file-schema";

export type SuggestOptions = {
  /** The embedding model's id — embeddings are cached per model. */
  embedModel: string;
  /** Makes room on the GPU for a model before its first call (the model manager). */
  prepareModel: (model: string) => Promise<void>;
  /** The naming model's id, prepared before naming starts. */
  nameModel: string;
  /** The vision model that captions images first; leave out to group on names and text alone. */
  describeModel?: string;
  signal?: AbortSignal;
  onProgress?: (progress: number | null, detail: string) => void;
};

/** Files shown to the model per group — the ones nearest its centre, so the most typical. */
const SAMPLE_PER_GROUP = 8;
/**
 * Part of the embedding cache key: bump it when the text embedded or its grouping instruction
 * changes, so vectors made the old way are not reused.
 */
const EMBEDDING_RECIPE = "grouping-2"; // 2: image captions are part of the description
/** Inputs per embedding call, between progress updates. */
const EMBED_CHUNK = 128;

/**
 * Suggests categories for a scanned folder (spec, Organiser step 3): embed every file's
 * description (cached by content, so a re-run only embeds what changed), cluster the vectors,
 * and ask the model for a short name per cluster. The owner then edits and approves the list;
 * nothing is approved here. Duplicate copies count once.
 */
export async function suggestCategories(
  store: WorkbenchStore,
  ai: WorkbenchAi,
  folderId: string,
  options: SuggestOptions,
): Promise<Category[] | { stopped: true }> {
  const { signal, onProgress = () => {} } = options;
  const files = filesToGroup(store, folderId);
  if (files.length === 0) throw new Error("Nothing to sort yet — scan the folder first.");

  // 0. look at the images, so pictures group by what they show (captions are remembered)
  if (options.describeModel) {
    const model = options.describeModel;
    // only the files this suggestion groups: a folder's other images aren't being sorted
    const only = new Set(files.map((f) => f.id));
    const pending = store.listImagesToDescribe(folderId, model).filter((f) => only.has(f.id)).length;
    if (pending) await options.prepareModel(model);
    await describeImages(store, ai, folderId, {
      model,
      only,
      signal,
      onProgress: (done, total) => onProgress((done / total) * 0.3, `Looking at images: ${done.toLocaleString("en")} of ${total.toLocaleString("en")}`),
    });
    if (signal?.aborted) return { stopped: true };
  }
  const signals = store.listFileSignals(folderId);

  // 1. embeddings, cached
  const cacheKey = `${options.embedModel}#${EMBEDDING_RECIPE}`;
  const cached = store.listEmbeddings(folderId, cacheKey);
  const missing = files.filter((f) => !cached.has(f.id));
  if (missing.length) await options.prepareModel(options.embedModel);
  for (let i = 0; i < missing.length; i += EMBED_CHUNK) {
    if (signal?.aborted) return { stopped: true };
    onProgress(0.3 + (i / missing.length) * 0.3, `Reading meaning: ${i.toLocaleString("en")} of ${missing.length.toLocaleString("en")} files`);
    const chunk = missing.slice(i, i + EMBED_CHUNK);
    const vectors = await ai.embedTexts(
      chunk.map((f) => describeFile(f, signals.get(f.id))),
      { signal },
    );
    store.recordEmbeddings(
      cacheKey,
      chunk.map((f, j) => ({ fileId: f.id, hash: f.hash!, vector: vectors[j] })),
    );
    chunk.forEach((f, j) => cached.set(f.id, vectors[j]));
  }

  // 2. clusters, biggest first
  onProgress(0.6, "Grouping similar files");
  const vectors = files.map((f) => cached.get(f.id)!);
  const labels = clusterVectors(vectors);
  const groups = [...new Set(labels)]
    .map((label) => files.map((f, i) => ({ file: f, vector: vectors[i] })).filter((_, i) => labels[i] === label))
    .sort((a, b) => b.length - a.length);

  // 3. every cluster named in one call, side by side, so the names set the groups apart
  if (signal?.aborted) return { stopped: true };
  await options.prepareModel(options.nameModel);
  onProgress(0.75, `Naming ${groups.length} groups`);
  const samples = groups.map((members) => typical(members, SAMPLE_PER_GROUP));
  const existing = existingFolders(store, folderId);
  // categories the owner already chose or turned down: a group that is one of them takes its
  // name and is not suggested again (re-suggesting beside "Study" offered "University notes")
  const kept = store
    .listCategories(folderId)
    .filter((c) => c.source !== "folder" && (c.state !== "suggested" || c.source === "owner"))
    .map((c) => c.name)
    .filter((name) => !existing.some((e) => sameCategoryName(e.name, name)));
  const { names } = await ai.nameCategories(
    {
      existing: [...existing.map((e) => e.name), ...kept].slice(0, 60),
      groups: samples.map((sample) => ({
        files: sample.map((m) => {
          const s = signals.get(m.file.id);
          return { name: fileName(m.file), excerpt: (s?.excerpt ?? s?.caption)?.slice(0, 160) };
        }),
      })),
    },
    { signal },
  );
  // the owner's own folders come first: a group that belongs in one adds to it
  // an existing folder is pre-ticked only when a group of files belongs in it (the namer reused
  // its name); the rest are offered unticked — on Downloads, ticking all 15 subfolders made a
  // list of 24 (audit, 2026-10-17)
  const matched = new Set<string>();
  const fresh: NewCategory[] = [];
  for (const [g, members] of groups.entries()) {
    const sample = samples[g];
    const name = toCategoryName(names[g]) ?? `Group ${g + 1}`;
    const folder = existing.find((e) => sameCategoryName(e.name, name));
    if (folder) {
      matched.add(folder.name);
      continue;
    }
    if (kept.some((k) => sameCategoryName(k, name))) continue;
    const same = fresh.find((s) => sameCategoryName(s.name, name));
    if (same) {
      // two clusters the model calls the same thing are one category
      same.fileCount += members.length;
      continue;
    }
    fresh.push({ name, source: "suggested", fileCount: members.length, examples: sample.slice(0, 5).map((m) => m.file.path) });
  }
  const suggestions: NewCategory[] = [
    ...existing.filter((e) => matched.has(e.name)),
    ...fresh,
    ...existing.filter((e) => !matched.has(e.name)).map((e) => ({ ...e, state: "rejected" as const })),
  ];

  onProgress(1, `${fresh.length + matched.size} categories suggested`);
  return store.replaceSuggestions(folderId, suggestions);
}

/**
 * The files a plan would sort (the folder's "Include subfolders" tick, `inScope`) that are local
 * and hashed — one copy of each set of duplicates. Grouping these, not every file in the
 * folder, keeps categories fitted to what gets sorted: on the owner's Downloads, a group of 213
 * photos almost all in subfolders fitted 3 loose files (audit, 2026-10-17).
 */
function filesToGroup(store: WorkbenchStore, folderId: string): IndexedFile[] {
  const extraCopies = new Set(
    store.listDuplicateGroups(folderId).flatMap((g) => g.files.slice(1).map((f) => f.id)),
  );
  const includeSubfolders = store.getAllowedFolder(folderId)?.includeSubfolders ?? false;
  const settled = new Set(
    [REVIEW_FOLDER, ...store.listCategories(folderId).filter((c) => c.state === "approved").map((c) => c.name)].map((n) =>
      n.toLowerCase(),
    ),
  );
  const all = store.listIndexedFiles(folderId);
  // a project's files are not grouped one by one — the project is sorted whole
  const projects = findProjectRoots(all.map((f) => f.path));
  return all.filter(
    (f) =>
      f.state === "indexed" &&
      f.hash &&
      !extraCopies.has(f.id) &&
      inScope(f.path, includeSubfolders, settled) &&
      !projects.some((p) => insideDir(f.path, p.path)),
  );
}

/**
 * The folder's existing top-level subfolders, as categories the owner already made (2026-10-17:
 * both of the owner's folders are partly organised already). Jugaad's own `_review` and names
 * too long for a category are left out.
 */
function existingFolders(store: WorkbenchStore, folderId: string): NewCategory[] {
  const all = store.listIndexedFiles(folderId);
  // a top-level project is not a category: it's something to be sorted, whole
  const projects = new Set(findProjectRoots(all.map((f) => f.path)).map((p) => p.path.toLowerCase()));
  const byFolder = new Map<string, string[]>();
  for (const f of all) {
    const top = topFolder(f.path);
    // Jugaad's own `_review`, hidden folders (`.remember`), names too long, and projects are not categories
    if (!top || top.startsWith("_") || top.startsWith(".") || top.length > 40 || projects.has(top.toLowerCase())) continue;
    byFolder.set(top, [...(byFolder.get(top) ?? []), f.path]);
  }
  return [...byFolder]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([name, paths]) => ({ name, source: "folder" as const, fileCount: paths.length, examples: paths.slice(0, 5) }));
}

/** The `count` members closest to the group's centre. */
function typical<T extends { vector: number[] }>(members: readonly T[], count: number): T[] {
  const centre = normalise(members[0].vector.map((_, d) => members.reduce((s, m) => s + m.vector[d], 0)));
  return [...members].sort((a, b) => dot(b.vector, centre) - dot(a.vector, centre)).slice(0, count);
}

function fileName(file: IndexedFile): string {
  return file.path.split(/[\\/]/).at(-1) ?? file.path;
}
