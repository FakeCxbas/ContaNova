import { supabase } from "@/integrations/supabase/client";

export type ActivityAction =
  | "crear_factura"
  | "editar_factura"
  | "enviar_factura"
  | "enviar_whatsapp"
  | "emitir_sri"
  | "actualizar_configuracion"
  | "crear_cliente"
  | "editar_cliente"
  | "eliminar_cliente"
  | "registrar_pago"
  | "crear_producto"
  | "editar_producto";

export type EntityType = "factura" | "cliente" | "pago" | "producto" | "empresa";

const ACTION_LABELS: Record<ActivityAction, string> = {
  crear_factura: "Creo una factura",
  editar_factura: "Edito una factura",
  enviar_factura: "Envio una factura por correo",
  enviar_whatsapp: "Envio una factura por WhatsApp",
  emitir_sri: "Envio una factura al SRI",
  actualizar_configuracion: "Actualizo la configuracion",
  crear_cliente: "Creo un cliente",
  editar_cliente: "Edito un cliente",
  eliminar_cliente: "Elimino un cliente",
  registrar_pago: "Registro un pago",
  crear_producto: "Creo un producto",
  editar_producto: "Edito un producto",
};

export const activityService = {
  async log(params: {
    companyId: string;
    action: ActivityAction;
    entityType: EntityType;
    entityId?: string;
    description?: string;
  }) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const desc = params.description || ACTION_LABELS[params.action] || params.action;

      const { error } = await supabase.from("activity_logs").insert({
        company_id: params.companyId,
        user_id: user.id,
        user_name: profile?.full_name || user.email || "",
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId || null,
        description: desc,
      });
      if (error) {
        console.warn("No se pudo registrar la actividad", error);
      }
    } catch (error) {
      console.warn("No se pudo registrar la actividad", error);
    }
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

  async getByEntity(entityType: EntityType, entityId: string, limit = 30) {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },
};
