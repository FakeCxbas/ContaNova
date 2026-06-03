import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Client = Tables<"clients">;
export type ClientInput = Omit<TablesInsert<"clients">, "company_id" | "id" | "created_at">;

export type ClientUpdate = TablesUpdate<"clients"> & { id: string };

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
