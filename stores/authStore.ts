import { create } from "zustand";
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

// Sync Firebase auth state to store — client-side only
if (typeof window !== "undefined") {
  import("@/lib/firebase/config").then(({ auth }) => {
    auth.onAuthStateChanged((user: User | null) => {
      useAuthStore.getState().setUser(user);
      useAuthStore.getState().setIsLoading(false);
    });
  });
}
