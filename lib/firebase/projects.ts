import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import firebaseApp from "./config";
import type { ProjectPlan } from "@/types";

const db = getFirestore(firebaseApp);
const COLLECTION = "projects";

export async function saveProject(plan: ProjectPlan): Promise<void> {
  await setDoc(doc(db, COLLECTION, plan.id), plan);
}

export async function getProject(id: string): Promise<ProjectPlan | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  return snap.exists() ? (snap.data() as ProjectPlan) : null;
}

export async function listProjects(): Promise<ProjectPlan[]> {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ProjectPlan);
}

export async function deleteProject(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
