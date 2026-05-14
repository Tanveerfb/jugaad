import { create } from "zustand";
import type { ProjectPlan, ConversationMessage } from "@/types";

type ProjectPlanStore = {
  plan: ProjectPlan | null;
  conversation: ConversationMessage[];
  isPlanning: boolean;
  isPlanConfirmed: boolean;
  setPlan: (plan: ProjectPlan) => void;
  updatePlan: (partial: Partial<ProjectPlan>) => void;
  addMessage: (msg: ConversationMessage) => void;
  confirmPlan: () => void;
  resetPlan: () => void;
  setIsPlanning: (v: boolean) => void;
};

export const useProjectPlanStore = create<ProjectPlanStore>((set) => ({
  plan: null,
  conversation: [],
  isPlanning: false,
  isPlanConfirmed: false,
  setPlan: (plan) => set({ plan }),
  updatePlan: (partial) =>
    set((state) => (state.plan ? { plan: { ...state.plan, ...partial } } : {})),
  addMessage: (msg) =>
    set((state) => ({ conversation: [...state.conversation, msg] })),
  confirmPlan: () => set({ isPlanConfirmed: true }),
  resetPlan: () =>
    set({
      plan: null,
      conversation: [],
      isPlanning: false,
      isPlanConfirmed: false,
    }),
  setIsPlanning: (v) => set({ isPlanning: v }),
}));
