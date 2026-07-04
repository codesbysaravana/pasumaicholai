import { create } from "zustand";

export type NotificationType = "success" | "error" | "info";

export interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationState {
  notifications: NotificationItem[];
  pushNotification: (message: string, type?: NotificationType) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  pushNotification: (message, type = "info") =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          id: crypto.randomUUID(),
          message,
          type,
        },
      ],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((notification) => notification.id !== id),
    })),
  clearAll: () => set({ notifications: [] }),
}));
