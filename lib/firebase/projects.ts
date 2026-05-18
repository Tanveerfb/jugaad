import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { z } from "zod";
import { db, auth } from "./config";
import { writeFile } from "@/lib/fs/writer";
import { useFsStore } from "@/stores/fsStore";
import type { ProjectPlan } from "@/types";

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------
function requireAuth(): string {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  return user.uid;
}

// ---------------------------------------------------------------------------
// Zod schema — validates Firestore data before use
// ---------------------------------------------------------------------------
const ProjectPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  stack: z.object({ selected: z.array(z.string()) }),
  features: z.array(
    z.object({ id: z.string(), title: z.string(), description: z.string() }),
  ),
  pages: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      route: z.string(),
      description: z.string(),
    }),
  ),
  dataModels: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      fields: z.array(
        z.object({
          name: z.string(),
          type: z.string(),
          required: z.boolean(),
        }),
      ),
    }),
  ),
  authStrategy: z.enum(["none", "nextauth", "clerk", "firebase", "custom"]),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// The collection path — user-scoped
function projectsRef(uid: string) {
  return collection(db, "users", uid, "projects");
}

function projectDoc(uid: string, projectId: string) {
  return doc(db, "users", uid, "projects", projectId);
}

// ---------------------------------------------------------------------------
// CRUD helpers
// ---------------------------------------------------------------------------

export async function saveProject(
  plan: ProjectPlan,
  uid: string,
): Promise<void> {
  requireAuth(); // must be logged in before writing Firestore
  const data = { ...plan, updatedAt: Date.now() };
  await setDoc(projectDoc(uid, plan.id), data);

  // Also persist jugaad.json to the local project folder (if open)
  const projectHandle = useFsStore.getState().projectHandle;
  if (projectHandle) {
    await writeFile(
      projectHandle,
      "jugaad.json",
      JSON.stringify(data, null, 2),
    );
  }
}

export async function getProject(
  projectId: string,
  uid: string,
): Promise<ProjectPlan | null> {
  const snap = await getDoc(projectDoc(uid, projectId));
  if (!snap.exists()) return null;
  const result = ProjectPlanSchema.safeParse(snap.data());
  return result.success ? (result.data as ProjectPlan) : null;
}

export async function listProjects(uid: string): Promise<ProjectPlan[]> {
  const q = query(projectsRef(uid), orderBy("updatedAt", "desc"), limit(50));
  const snap = await getDocs(q);
  const plans: ProjectPlan[] = [];
  for (const d of snap.docs) {
    const result = ProjectPlanSchema.safeParse(d.data());
    if (result.success) plans.push(result.data as ProjectPlan);
    // silently skip invalid documents
  }
  return plans;
}

export async function deleteProject(
  projectId: string,
  uid: string,
): Promise<void> {
  requireAuth();
  await deleteDoc(projectDoc(uid, projectId));
}
