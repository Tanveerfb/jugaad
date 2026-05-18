import { create } from "zustand";
import { auth } from "@/lib/firebase/config";
import type { User } from "firebase/auth";

type AuthStore = {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setIsLoading: (val: boolean) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setIsLoading: (isLoading) => set({ isLoading }),
}));

// Sync Firebase auth state to store — runs once on module load (client-side only
// because studio/settings pages use force-dynamic which skips SSR)
auth.onAuthStateChanged((user) => {
  useAuthStore.getState().setUser(user);
  useAuthStore.getState().setIsLoading(false);
});
