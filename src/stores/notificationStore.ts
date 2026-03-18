import { create } from "zustand";

export interface Notification {
  id: string;
  type: "factura" | "pago" | "inventario" | "pendiente";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  unreadCount: () => number;
}

export const useNotifications = create<NotificationStore>((set, get) => ({
  notifications: [
    {
      id: "init-1",
      type: "pendiente",
      title: "Facturas pendientes",
      message: "Tienes 2 facturas enviadas pendientes de cobro.",
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      read: false,
    },
    {
      id: "init-2",
      type: "inventario",
      title: "Stock bajo",
      message: "Impresora Térmica tiene stock por debajo del mínimo (3/5).",
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
      read: false,
    },
    {
      id: "init-3",
      type: "pago",
      title: "Pago recibido",
      message: "Farmacia San José completó el pago de la factura 001-001-000000418.",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      read: true,
    },
    {
      id: "init-4",
      type: "factura",
      title: "Factura emitida",
      message: "Factura 001-001-000000421 emitida a Distribuidora Quito S.A.",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
      read: true,
    },
  ],
  addNotification: (n) =>
    set((state) => ({
      notifications: [
        { ...n, id: `notif-${Date.now()}`, timestamp: new Date(), read: false },
        ...state.notifications,
      ],
    })),
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),
  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}));
