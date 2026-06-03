import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Product = Tables<"products">;
export type ProductInput = Omit<TablesInsert<"products">, "company_id" | "id" | "created_at" | "active">;

export type ProductUpdate = TablesUpdate<"products"> & { id: string };

export const productService = {
  async getAll() {
    const { data, error } = await supabase.from("products").select("*").order("name");
    if (error) throw error;
    return data;
  },

  async create(product: ProductInput, companyId: string) {
    const { data, error } = await supabase
      .from("products")
      .insert({ ...product, company_id: companyId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update({ id, ...updates }: ProductUpdate) {
    const { error } = await supabase.from("products").update(updates).eq("id", id);
    if (error) throw error;
  },
};
