import { supabase } from "@/integrations/supabase/client";

export type ProductInput = {
  name: string;
  price: number;
  iva: number;
  type: string;
  stock: number;
  min_stock: number;
};

export type ProductUpdate = { id: string; stock?: number; active?: boolean; [key: string]: any };

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
