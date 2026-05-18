import { auth } from "./config";
import type { User } from "firebase/auth";

export async function signInWithGoogle(): Promise<User> {
  const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signInAnonymously(): Promise<User> {
  const { signInAnonymously: firebaseSignInAnon } =
    await import("firebase/auth");
  const result = await firebaseSignInAnon(auth);
  return result.user;
}

export async function signOut(): Promise<void> {
  const { signOut: firebaseSignOut } = await import("firebase/auth");
  await firebaseSignOut(auth);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}
