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
    return data;
  },

  async update({ id, ...updates }: CompanyUpdate) {
    const { error } = await supabase.from("companies").update(updates).eq("id", id);
    if (error) throw error;
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
