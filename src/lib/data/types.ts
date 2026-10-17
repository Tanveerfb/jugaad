import type { AllowedFolder } from "@/schemas/allowed-folder-schema";
import type { Category, CategoryState, NewCategory } from "@/schemas/category-schema";
import type { FileClassification, FilingExample } from "@/schemas/file-classification-schema";
import type { FileSignals, NewFileSignals } from "@/schemas/file-signals-schema";
import type { DuplicateGroup, IndexSummary, IndexedFile, ScannedFile } from "@/schemas/indexed-file-schema";
import type { Job, JobStatus, NewJob, WorkerStatus } from "@/schemas/job-schema";
import type { JournalEntry, JournalOutcome, MoveMethod, NewJournalEntry } from "@/schemas/journal-schema";
import type { MoveStatus, NewPlanMove, Plan, PlanMove, PlanStatus } from "@/schemas/plan-schema";

/** The job queue and the worker's heartbeat. */
export type JobsStore = {
  /** Adds a job to the queue. */
  enqueueJob(job: NewJob): Job;
  /** Atomically takes the oldest queued job and marks it running; null when the queue is empty. */
  claimNextJob(): Job | null;
  /** Updates a running job's progress line. */
  reportProgress(id: string, progress: number | null, detail: string | null): void;
  /** Moves a job to a new status through the lifecycle; throws on an illegal move. */
  transitionJob(id: string, to: JobStatus, error?: string): Job;
  /** One job, or null. */
  getJob(id: string): Job | null;
  /** Jobs not yet finished (queued, running, paused), oldest first. */
  listActiveJobs(): Job[];
  /** The most recently changed jobs of any status, newest first. */
  listRecentJobs(limit: number): Job[];
  /** After a worker restart: jobs left "running" go back to the queue. Returns how many. */
  requeueInterruptedJobs(): number;

  /** The worker's heartbeat — written every few seconds while it runs. */
  recordWorkerBeat(beat: { pid: number; startedAt: string }): void;
  /** The worker counts as online if it beat within `staleAfterMs`. */
  getWorkerStatus(now?: Date, staleAfterMs?: number): WorkerStatus;
  /** Marks the worker as stopped (clean shutdown). */
  clearWorkerBeat(): void;
};

/**
 * The allow-list. Rules (no drive roots, no system folders, no overlaps) are checked by the
 * safety layer before `allowFolder` is called — the store only records.
 */
export type FoldersStore = {
  /** Adds a folder, or brings back one removed earlier (same path, same id, same history). */
  allowFolder(path: string): AllowedFolder;
  /** Folders currently on the list, in the order they were added. */
  listAllowedFolders(): AllowedFolder[];
  /** A folder on the list, or null — removed folders are not returned. */
  getAllowedFolder(id: string): AllowedFolder | null;
  /** The owner's "Include subfolders" tick for this folder. */
  setIncludeSubfolders(id: string, include: boolean): AllowedFolder;
  /**
   * Takes a folder off the list. Its plans and journal are kept, but nothing touches the folder
   * again — not even an undo — until it is added back.
   */
  removeAllowedFolder(id: string): void;
};

/** Plans and their moves. Statuses change only through the lifecycle in `plan-lifecycle.ts`. */
export type PlansStore = {
  /** Records a draft plan for an allowed folder. */
  createPlan(folderId: string, moves: NewPlanMove[]): Plan;
  getPlan(id: string): Plan | null;
  /** Plans for one folder, newest first. */
  listPlans(folderId: string): Plan[];
  /** A plan's moves, in the order they were proposed. */
  listPlanMoves(planId: string): PlanMove[];
  getPlanMove(moveId: string): PlanMove | null;
  /** Includes or excludes a move; only while its plan is a draft. */
  setMoveIncluded(moveId: string, included: boolean): PlanMove;
  /**
   * Points a move at a new destination — a ticked rename, or a doubtful file sent to a
   * category — recording the rename flag and the category; only while a draft.
   */
  setMoveTarget(moveId: string, target: { toPath: string; rename: boolean; category: string | null }): PlanMove;
  /** Moves a plan to a new status; throws on an illegal move. */
  transitionPlan(id: string, to: PlanStatus): Plan;
  /** Records that a move (or its undo) happened, clearing any earlier error. */
  completeMove(moveId: string, to: MoveStatus): PlanMove;
  /** Records why a move (or its undo) failed; its status is unchanged, so it is retried. */
  failMove(moveId: string, error: string): PlanMove;
};

/** The append-only record of every disk change, written before the change and closed after. */
export type JournalStore = {
  openJournalEntry(entry: NewJournalEntry): JournalEntry;
  /** Closes an open entry once. A closed entry can never change again. */
  closeJournalEntry(
    id: number,
    result: { outcome: JournalOutcome; method?: MoveMethod; size?: number; modifiedMs?: number; error?: string },
  ): JournalEntry;
  /** Entries a crash left open, oldest first — the next start reconciles them with the disk. */
  listOpenJournalEntries(): JournalEntry[];
  /** A plan's journal, oldest first. */
  listJournal(planId: string): JournalEntry[];
};

/** The shared file index (spec: "Every module reads it; nothing rescans what it already knows"). */
export type FilesStore = {
  /**
   * Records what one batch of a scan found. A file whose size and modified time are unchanged
   * keeps its hash; anything else is queued for hashing again.
   */
  recordScannedFiles(folderId: string, scanId: string, files: readonly ScannedFile[]): void;
  /** After a scan: files it didn't see are marked gone. Returns how many. */
  markUnseenGone(folderId: string, scanId: string): number;
  /** Readable files still waiting for a hash. */
  listFilesToHash(folderId: string): IndexedFile[];
  recordFileHash(fileId: string, hash: string): void;
  /** The file was open elsewhere; the next scan retries it. */
  markFileLocked(fileId: string): void;
  /**
   * A file Jugaad moved: its index row follows it to the new path, keeping its hash, signals
   * and embedding. A file the index doesn't know is left for the next scan.
   */
  relocateFile(folderId: string, fromPath: string, toPath: string): void;
  /** A project folder Jugaad moved: every file under it follows, keeping hashes and signals. */
  relocateFolder(folderId: string, fromDir: string, toDir: string): void;
  /** Every file the folder holds now (not gone), by path. */
  listIndexedFiles(folderId: string): IndexedFile[];
  /** Sets of identical files, biggest first; within a set, the oldest copy first. */
  listDuplicateGroups(folderId: string): DuplicateGroup[];
  getIndexSummary(folderId: string): IndexSummary;

  /** Hashed, readable files whose signals are missing or were read from older contents. */
  listFilesWithoutSignals(folderId: string): IndexedFile[];
  /** Stores what was read from a file's current contents, replacing anything older. */
  recordFileSignals(fileId: string, hash: string, signals: NewFileSignals): void;
  /**
   * Files to show the vision model: JPEG, PNG and WebP images, and PDFs with no text (scans) —
   * up to 20 MB — whose current contents `model` hasn't described yet.
   */
  listImagesToDescribe(folderId: string, model: string): IndexedFile[];
  /** Stores what an image shows, for the contents (hash) it was seen in. */
  recordCaption(fileId: string, hash: string, model: string, caption: string): void;
  /** Signals for every file in the folder that has them, keyed by file id. */
  listFileSignals(folderId: string): Map<string, FileSignals>;
};

/** A folder's categories (spec, Organiser step 3), and the embeddings they are suggested from. */
export type CategoriesStore = {
  /** In the order they were suggested or added. */
  listCategories(folderId: string): Category[];
  /**
   * Stores fresh suggestions (clustered, or existing subfolders), replacing earlier ones the
   * owner never acted on. Approved,
   * rejected and owner-added categories stay; a suggestion with one of their names is dropped.
   */
  replaceSuggestions(folderId: string, suggestions: readonly NewCategory[]): Category[];
  /** A category the owner typed in — suggested until approved. */
  addCategory(folderId: string, name: string): Category;
  renameCategory(id: string, name: string): Category;
  /** Moves a category through its lifecycle; throws on an illegal move. */
  setCategoryState(id: string, state: CategoryState): Category;

  /** Stored embeddings for the folder's current files from `model`, keyed by file id. */
  listEmbeddings(folderId: string, model: string): Map<string, number[]>;
  /** Stores embeddings, each tied to the content hash it was made from. */
  recordEmbeddings(model: string, entries: readonly { fileId: string; hash: string; vector: readonly number[] }[]): void;
};

/** Remembered model answers, so a rebuilt plan doesn't classify unchanged files again. */
export type ClassificationsStore = {
  /** The answer for these exact contents, model and category list, or null. */
  getClassification(fileId: string, hash: string, model: string, categoriesKey: string): FileClassification | null;
  recordClassification(fileId: string, hash: string, model: string, categoriesKey: string, result: FileClassification): void;
};

/** The owner's own filing decisions ("Send to…"), kept as examples for the classifier. */
export type ExamplesStore = {
  /** Remembers where the owner put a file; a later decision for the same file replaces it. */
  recordFilingExample(folderId: string, example: FilingExample): void;
  /** Newest first. */
  listFilingExamples(folderId: string): FilingExample[];
};

/**
 * Everything the app and the worker read or write, in domain terms (project-rules §DATA).
 * The worker and the app share it through the SQLite file — the owner's choice of channel
 * (decisions.md, 2026-10-08). Nothing outside `lib/data/` touches SQL.
 */
export type WorkbenchStore = JobsStore &
  FoldersStore &
  FilesStore &
  CategoriesStore &
  ClassificationsStore &
  ExamplesStore &
  PlansStore &
  JournalStore & {
    close(): void;
  };
