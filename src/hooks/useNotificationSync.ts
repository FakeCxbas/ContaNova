import { useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { isPendingCollection } from "@/lib/invoice-status";
import { useRecentActivity } from "@/services/activity";
import type { ActivityAction } from "@/services/activityService";
import { useCompanyId } from "@/services/companies";
import { useInvoices } from "@/services/invoices";
import { useProducts } from "@/services/products";
import { useNotifications, type NotificationInput, type NotificationType } from "@/stores/notificationStore";

const EMPTY_ITEMS: never[] = [];

const ACTIVITY_META: Partial<Record<ActivityAction, { type: NotificationType; title: string }>> = {
  crear_factura: { type: "factura", title: "Factura emitida" },
  enviar_factura: { type: "factura", title: "Factura enviada" },
  registrar_pago: { type: "pago", title: "Pago recibido" },
};

export function useNotificationSync() {
  const { user } = useAuth();
  const { data: companyId } = useCompanyId();
  const { data: invoices } = useInvoices();
  const { data: products } = useProducts();
  const { data: recentActivity } = useRecentActivity(10);
  const setScope = useNotifications((state) => state.setScope);
  const syncNotifications = useNotifications((state) => state.syncNotifications);

  const safeInvoices = invoices ?? EMPTY_ITEMS;
  const safeProducts = products ?? EMPTY_ITEMS;
  const safeRecentActivity = recentActivity ?? EMPTY_ITEMS;

  const scopeKey = useMemo(() => {
    if (!companyId || !user?.id) return "guest";
    return `${companyId}:${user.id}`;
  }, [companyId, user?.id]);

  const notifications = useMemo<NotificationInput[]>(() => {
    const nextNotifications: NotificationInput[] = [];

    const pendingInvoices = safeInvoices.filter((invoice) => isPendingCollection(invoice.status));
    if (pendingInvoices.length > 0) {
      const totalPending = pendingInvoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
      const latestPending = pendingInvoices[0];
      const latestPendingDate = latestPending?.created_at || latestPending?.date || new Date().toISOString();
      nextNotifications.push({
        id: `pending-collection-${pendingInvoices.length}-${latestPending?.id || "none"}`,
        type: "pendiente",
        title: "Cobros pendientes",
        message: `Tienes ${pendingInvoices.length} comprobante${pendingInvoices.length === 1 ? "" : "s"} pendientes de cobro por $${totalPending.toFixed(2)}.`,
        timestamp: latestPendingDate,
      });
    }

    const lowStockProducts = safeProducts
      .filter((product) => product.active && product.type === "Bien" && product.min_stock > 0 && product.stock <= product.min_stock)
      .slice(0, 5);

    lowStockProducts.forEach((product) => {
      nextNotifications.push({
        id: `inventory-low-${product.id}`,
        type: "inventario",
        title: "Stock bajo",
        message: `${product.name} tiene stock por debajo del minimo (${product.stock}/${product.min_stock}).`,
        timestamp: product.created_at || new Date(0).toISOString(),
      });
    });

    safeRecentActivity.forEach((entry) => {
      const meta = ACTIVITY_META[entry.action as ActivityAction];
      if (!meta) return;

      nextNotifications.push({
        id: `activity-${entry.id}`,
        type: meta.type,
        title: meta.title,
        message: entry.description,
        timestamp: entry.created_at,
      });
    });

    return nextNotifications
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
      .slice(0, 12);
  }, [safeInvoices, safeProducts, safeRecentActivity]);

  useEffect(() => {
    setScope(scopeKey);
  }, [scopeKey, setScope]);

  useEffect(() => {
    syncNotifications(notifications);
  }, [notifications, syncNotifications]);
}
