import { supabase } from "@/integrations/supabase/client";

export type ActivityAction =
  | "crear_factura"
  | "editar_factura"
  | "crear_cliente"
  | "editar_cliente"
  | "eliminar_cliente"
  | "registrar_pago"
  | "crear_producto"
  | "editar_producto";

export type EntityType = "factura" | "cliente" | "pago" | "producto";

const ACTION_LABELS: Record<ActivityAction, string> = {
  crear_factura: "Creó una factura",
  editar_factura: "Editó una factura",
  crear_cliente: "Creó un cliente",
  editar_cliente: "Editó un cliente",
  eliminar_cliente: "Eliminó un cliente",
  registrar_pago: "Registró un pago",
  crear_producto: "Creó un producto",
  editar_producto: "Editó un producto",
};

export const activityService = {
  async log(params: {
    companyId: string;
    action: ActivityAction;
    entityType: EntityType;
    entityId?: string;
    description?: string;
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const desc = params.description || ACTION_LABELS[params.action] || params.action;

    await supabase.from("activity_logs").insert({
      company_id: params.companyId,
      user_id: user.id,
      user_name: profile?.full_name || user.email || "",
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      description: desc,
    });
  },

  async getRecent(limit = 20) {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },
};
