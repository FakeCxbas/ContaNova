import { supabase } from "@/integrations/supabase/client";

export type CompanyUpdate = {
  id: string;
  name?: string;
  ruc?: string;
  address?: string;
  phone?: string;
  email?: string;
  establecimiento?: string;
  punto_emision?: string;
  logo_url?: string | null;
  auto_send_invoice_email?: boolean;
  auto_send_invoice_sri?: boolean;
  whatsapp_enabled?: boolean;
  auto_send_invoice_whatsapp?: boolean;
  whatsapp_simulation_mode?: boolean;
  whatsapp_phone_number_id?: string | null;
  whatsapp_business_account_id?: string | null;
  whatsapp_template_name?: string | null;
  whatsapp_template_language?: string | null;
  whatsapp_token_configured?: boolean;
  sri_environment?: string;
  sri_emission_enabled?: boolean;
};

const autoEmailStorageKey = (companyId: string) => `contanova:auto-send-invoice-email:${companyId}`;

const getStoredAutoEmailPreference = (companyId: string) => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(autoEmailStorageKey(companyId)) === "true";
};

const setStoredAutoEmailPreference = (companyId: string, enabled: boolean) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(autoEmailStorageKey(companyId), String(enabled));
};

export const companyService = {
  async getCompanyId(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .single();
    return data?.company_id as string | null;
  },

  async getById(companyId: string) {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single();
    if (error) throw error;
    return {
      ...data,
      auto_send_invoice_email:
        "auto_send_invoice_email" in data
          ? Boolean(data.auto_send_invoice_email)
          : getStoredAutoEmailPreference(companyId),
      auto_send_invoice_sri: "auto_send_invoice_sri" in data ? Boolean(data.auto_send_invoice_sri) : false,
      whatsapp_enabled: "whatsapp_enabled" in data ? Boolean(data.whatsapp_enabled) : false,
      auto_send_invoice_whatsapp: "auto_send_invoice_whatsapp" in data ? Boolean(data.auto_send_invoice_whatsapp) : false,
      whatsapp_simulation_mode: "whatsapp_simulation_mode" in data ? Boolean(data.whatsapp_simulation_mode) : true,
      whatsapp_phone_number_id: "whatsapp_phone_number_id" in data ? data.whatsapp_phone_number_id : "",
      whatsapp_business_account_id: "whatsapp_business_account_id" in data ? data.whatsapp_business_account_id : "",
      whatsapp_template_name: "whatsapp_template_name" in data ? data.whatsapp_template_name : "",
      whatsapp_template_language: "whatsapp_template_language" in data ? data.whatsapp_template_language : "es",
      whatsapp_token_configured: "whatsapp_token_configured" in data ? Boolean(data.whatsapp_token_configured) : false,
    };
  },

  async update({ id, ...updates }: CompanyUpdate) {
    const autoSendInvoiceEmail = updates.auto_send_invoice_email;
    if (typeof autoSendInvoiceEmail === "boolean") {
      setStoredAutoEmailPreference(id, autoSendInvoiceEmail);
    }

    const { error } = await supabase.from("companies").update(updates).eq("id", id);
    if (!error) return;

    const isMissingColumn =
      error.message?.includes("auto_send_invoice_email") ||
      error.message?.includes("auto_send_invoice_sri") ||
      error.message?.includes("whatsapp_enabled") ||
      error.message?.includes("auto_send_invoice_whatsapp") ||
      error.message?.includes("whatsapp_simulation_mode") ||
      error.message?.includes("whatsapp_phone_number_id") ||
      error.message?.includes("whatsapp_business_account_id") ||
      error.message?.includes("whatsapp_template_name") ||
      error.message?.includes("whatsapp_template_language") ||
      error.message?.includes("whatsapp_token_configured") ||
      error.message?.includes("sri_environment") ||
      error.message?.includes("sri_emission_enabled");
    if (!isMissingColumn) throw error;

    const {
      auto_send_invoice_email: _autoSendInvoiceEmail,
      auto_send_invoice_sri: _autoSendInvoiceSri,
      whatsapp_enabled: _whatsappEnabled,
      auto_send_invoice_whatsapp: _autoSendInvoiceWhatsapp,
      whatsapp_simulation_mode: _whatsappSimulationMode,
      whatsapp_phone_number_id: _whatsappPhoneNumberId,
      whatsapp_business_account_id: _whatsappBusinessAccountId,
      whatsapp_template_name: _whatsappTemplateName,
      whatsapp_template_language: _whatsappTemplateLanguage,
      whatsapp_token_configured: _whatsappTokenConfigured,
      sri_environment: _sriEnvironment,
      sri_emission_enabled: _sriEmissionEnabled,
      ...safeUpdates
    } = updates;
    const { error: retryError } = await supabase.from("companies").update(safeUpdates).eq("id", id);
    if (retryError) throw retryError;
  },

  async uploadLogo(companyId: string, file: File) {
    const ext = file.name.split(".").pop();
    const path = `${companyId}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("company-logos")
      .upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("company-logos")
      .getPublicUrl(path);

    return data.publicUrl;
  },
};
