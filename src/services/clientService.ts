import { supabase } from "@/integrations/supabase/client";

export type ClientInput = {
  name: string;
  identification: string;
  email: string;
  phone: string;
  address: string;
};

export type ClientUpdate = Partial<ClientInput> & { id: string };

export const clientService = {
  async getAll() {
    const { data, error } = await supabase.from("clients").select("*").order("name");
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase.from("clients").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  },

  async create(client: ClientInput, companyId: string) {
    const { data, error } = await supabase
      .from("clients")
      .insert({ ...client, company_id: companyId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update({ id, ...updates }: ClientUpdate) {
    const { error } = await supabase.from("clients").update(updates).eq("id", id);
    if (error) throw error;
  },

  async remove(id: string) {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) throw error;
  },
};
