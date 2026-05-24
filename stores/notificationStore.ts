import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NotificationType = "success" | "error" | "warning" | "info";

export type NotificationEntry = {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: number;
};

type NotificationStore = {
  notifications: NotificationEntry[];
  lastSeenAt: number;
  addNotification: (entry: Omit<NotificationEntry, "id" | "timestamp">) => void;
  markAllSeen: () => void;
  clearAll: () => void;
};

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      notifications: [],
      lastSeenAt: 0,
      addNotification: ({ type, message }) =>
        set((state) => ({
          notifications: [
            {
              id: crypto.randomUUID(),
              type,
              message,
              timestamp: Date.now(),
            },
            ...state.notifications,
          ].slice(0, 200),
        })),
      markAllSeen: () => set({ lastSeenAt: Date.now() }),
      clearAll: () => set({ notifications: [], lastSeenAt: Date.now() }),
    }),
    { name: "jugaad-notifications" },
  ),
);
