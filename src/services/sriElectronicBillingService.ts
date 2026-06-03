import { supabase } from "@/integrations/supabase/client";

export type SriEmissionResult = {
  ok: boolean;
  status: string;
  accessKey?: string;
  authorizationNumber?: string | null;
  authorizedAt?: string | null;
  environment?: "pruebas" | "produccion";
  messages: string[];
  requiresConfiguration?: boolean;
};

type EmitParams = {
  invoiceId: string;
  action?: "emit" | "check_authorization";
};

export const sriElectronicBillingService = {
  async emit({ invoiceId, action = "emit" }: EmitParams) {
    const { data, error } = await supabase.functions.invoke<SriEmissionResult>("sri-electronic-billing", {
      body: { action, invoiceId },
    });

    if (error) {
      throw new Error(error.message || "No se pudo conectar con la funcion de facturacion electronica.");
    }

    if (!data) {
      throw new Error("La funcion de facturacion electronica no devolvio respuesta.");
    }

    if (!data.ok && !data.requiresConfiguration) {
      throw new Error(data.messages?.join(" ") || "El SRI rechazo el comprobante.");
    }

    return data;
  },
};
