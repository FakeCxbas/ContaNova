import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NotificationType = "factura" | "pago" | "inventario" | "pendiente";

export interface NotificationInput {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date | string;
}

export interface Notification extends Omit<NotificationInput, "timestamp"> {
  timestamp: Date;
  read: boolean;
}

interface StoredNotification extends Omit<NotificationInput, "timestamp"> {
  timestamp: string;
}

interface NotificationStore {
  scopeKey: string;
  notifications: Notification[];
  readByScope: Record<string, string[]>;
  manualByScope: Record<string, StoredNotification[]>;
  setScope: (scopeKey: string) => void;
  syncNotifications: (incoming: NotificationInput[]) => void;
  addNotification: (notification: Omit<NotificationInput, "id" | "timestamp"> & { id?: string; timestamp?: Date | string }) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  unreadCount: () => number;
}

const DEFAULT_SCOPE = "guest";

function normalizeTimestamp(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function serializeNotification(notification: NotificationInput): StoredNotification {
  return {
    ...notification,
    timestamp: normalizeTimestamp(notification.timestamp).toISOString(),
  };
}

function hydrateNotification(
  notification: StoredNotification,
  readIds: Set<string>,
): Notification {
  return {
    ...notification,
    timestamp: normalizeTimestamp(notification.timestamp),
    read: readIds.has(notification.id),
  };
}

function buildNotifications(
  scopeKey: string,
  readByScope: Record<string, string[]>,
  manualByScope: Record<string, StoredNotification[]>,
  incoming: NotificationInput[],
) {
  const readIds = new Set(readByScope[scopeKey] ?? []);
  const manual = manualByScope[scopeKey] ?? [];
  const derived = incoming.map(serializeNotification);
  const merged = [...manual, ...derived].reduce<Record<string, StoredNotification>>((accumulator, notification) => {
    accumulator[notification.id] = notification;
    return accumulator;
  }, {});

  return Object.values(merged)
    .map((notification) => hydrateNotification(notification, readIds))
    .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime());
}

function sameNotifications(left: Notification[], right: Notification[]) {
  if (left.length !== right.length) return false;

  for (let index = 0; index < left.length; index += 1) {
    const current = left[index];
    const next = right[index];
    if (
      current.id !== next.id ||
      current.type !== next.type ||
      current.title !== next.title ||
      current.message !== next.message ||
      current.read !== next.read ||
      current.timestamp.getTime() !== next.timestamp.getTime()
    ) {
      return false;
    }
  }

  return true;
}

export const useNotifications = create<NotificationStore>()(
  persist(
    (set, get) => ({
      scopeKey: DEFAULT_SCOPE,
      notifications: [],
      readByScope: {},
      manualByScope: {},

      setScope: (scopeKey) =>
        set((state) => {
          const nextNotifications = buildNotifications(scopeKey, state.readByScope, state.manualByScope, []);
          if (state.scopeKey === scopeKey && sameNotifications(state.notifications, nextNotifications)) {
            return state;
          }

          return {
            scopeKey,
            notifications: nextNotifications,
          };
        }),

      syncNotifications: (incoming) =>
        set((state) => {
          const nextNotifications = buildNotifications(state.scopeKey, state.readByScope, state.manualByScope, incoming);
          if (sameNotifications(state.notifications, nextNotifications)) {
            return state;
          }

          return {
            notifications: nextNotifications,
          };
        }),

      addNotification: (notification) =>
        set((state) => {
          const scopeKey = state.scopeKey || DEFAULT_SCOPE;
          const nextNotification = serializeNotification({
            id: notification.id || `manual-${Date.now()}`,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            timestamp: notification.timestamp || new Date(),
          });
          const nextManual = [nextNotification, ...(state.manualByScope[scopeKey] ?? []).filter((item) => item.id !== nextNotification.id)];
          const manualByScope = {
            ...state.manualByScope,
            [scopeKey]: nextManual,
          };

          return {
            manualByScope,
            notifications: buildNotifications(scopeKey, state.readByScope, manualByScope, []),
          };
        }),

      markAsRead: (id) =>
        set((state) => {
          const scopeKey = state.scopeKey || DEFAULT_SCOPE;
          const current = new Set(state.readByScope[scopeKey] ?? []);
          current.add(id);
          const readByScope = {
            ...state.readByScope,
            [scopeKey]: [...current],
          };

          return {
            readByScope,
            notifications: state.notifications.map((notification) =>
              notification.id === id ? { ...notification, read: true } : notification,
            ),
          };
        }),

      markAllAsRead: () =>
        set((state) => {
          const scopeKey = state.scopeKey || DEFAULT_SCOPE;
          const readByScope = {
            ...state.readByScope,
            [scopeKey]: state.notifications.map((notification) => notification.id),
          };

          return {
            readByScope,
            notifications: state.notifications.map((notification) => ({ ...notification, read: true })),
          };
        }),

      unreadCount: () => get().notifications.filter((notification) => !notification.read).length,
    }),
    {
      name: "contanova-notifications",
      partialize: (state) => ({
        readByScope: state.readByScope,
        manualByScope: state.manualByScope,
      }),
    },
  ),
);
