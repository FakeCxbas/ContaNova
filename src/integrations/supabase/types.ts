export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string
          user_name: string
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id: string
          user_name?: string
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string
          company_id: string
          created_at: string
          email: string
          id: string
          identification: string
          name: string
          phone: string
        }
        Insert: {
          address?: string
          company_id: string
          created_at?: string
          email?: string
          id?: string
          identification?: string
          name: string
          phone?: string
        }
        Update: {
          address?: string
          company_id?: string
          created_at?: string
          email?: string
          id?: string
          identification?: string
          name?: string
          phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string
          auto_send_invoice_email: boolean
          auto_send_invoice_sri: boolean
          auto_send_invoice_whatsapp: boolean
          created_at: string
          email: string
          establecimiento: string
          id: string
          logo_url: string | null
          name: string
          phone: string
          punto_emision: string
          ruc: string
          sri_certificate_filename: string | null
          sri_certificate_password_ciphertext: string | null
          sri_certificate_password_iv: string | null
          sri_certificate_path: string | null
          sri_certificate_uploaded_at: string | null
          sri_emission_enabled: boolean
          sri_environment: string
          whatsapp_business_account_id: string | null
          whatsapp_enabled: boolean
          whatsapp_phone_number_id: string | null
          whatsapp_simulation_mode: boolean
          whatsapp_template_language: string
          whatsapp_template_name: string | null
          whatsapp_token_configured: boolean
        }
        Insert: {
          address?: string
          auto_send_invoice_email?: boolean
          auto_send_invoice_sri?: boolean
          auto_send_invoice_whatsapp?: boolean
          created_at?: string
          email?: string
          establecimiento?: string
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string
          punto_emision?: string
          ruc?: string
          sri_certificate_filename?: string | null
          sri_certificate_password_ciphertext?: string | null
          sri_certificate_password_iv?: string | null
          sri_certificate_path?: string | null
          sri_certificate_uploaded_at?: string | null
          sri_emission_enabled?: boolean
          sri_environment?: string
          whatsapp_business_account_id?: string | null
          whatsapp_enabled?: boolean
          whatsapp_phone_number_id?: string | null
          whatsapp_simulation_mode?: boolean
          whatsapp_template_language?: string
          whatsapp_template_name?: string | null
          whatsapp_token_configured?: boolean
        }
        Update: {
          address?: string
          auto_send_invoice_email?: boolean
          auto_send_invoice_sri?: boolean
          auto_send_invoice_whatsapp?: boolean
          created_at?: string
          email?: string
          establecimiento?: string
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string
          punto_emision?: string
          ruc?: string
          sri_certificate_filename?: string | null
          sri_certificate_password_ciphertext?: string | null
          sri_certificate_password_iv?: string | null
          sri_certificate_path?: string | null
          sri_certificate_uploaded_at?: string | null
          sri_emission_enabled?: boolean
          sri_environment?: string
          whatsapp_business_account_id?: string | null
          whatsapp_enabled?: boolean
          whatsapp_phone_number_id?: string | null
          whatsapp_simulation_mode?: boolean
          whatsapp_template_language?: string
          whatsapp_template_name?: string | null
          whatsapp_token_configured?: boolean
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          iva: number
          price: number
          product_id: string | null
          product_name: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          iva?: number
          price?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          iva?: number
          price?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string | null
          client_name: string
          company_id: string
          created_at: string
          date: string
          delivery_status: string
          email_recipient: string | null
          email_sent_at: string | null
          document_type: string
          id: string
          iva: number
          number: string
          sri_access_key: string | null
          sri_authorization_number: string | null
          sri_authorized_at: string | null
          sri_environment: string | null
          sri_messages: Json
          sri_status: string | null
          sri_xml: string | null
          status: string
          subtotal: number
          total: number
        }
        Insert: {
          client_id?: string | null
          client_name?: string
          company_id: string
          created_at?: string
          date?: string
          delivery_status?: string
          email_recipient?: string | null
          email_sent_at?: string | null
          document_type?: string
          id?: string
          iva?: number
          number?: string
          sri_access_key?: string | null
          sri_authorization_number?: string | null
          sri_authorized_at?: string | null
          sri_environment?: string | null
          sri_messages?: Json
          sri_status?: string | null
          sri_xml?: string | null
          status?: string
          subtotal?: number
          total?: number
        }
        Update: {
          client_id?: string | null
          client_name?: string
          company_id?: string
          created_at?: string
          date?: string
          delivery_status?: string
          email_recipient?: string | null
          email_sent_at?: string | null
          document_type?: string
          id?: string
          iva?: number
          number?: string
          sri_access_key?: string | null
          sri_authorization_number?: string | null
          sri_authorized_at?: string | null
          sri_environment?: string | null
          sri_messages?: Json
          sri_status?: string | null
          sri_xml?: string | null
          status?: string
          subtotal?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          date: string
          id: string
          invoice_id: string
          method: string
          note: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          date?: string
          id?: string
          invoice_id: string
          method?: string
          note?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          date?: string
          id?: string
          invoice_id?: string
          method?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          id: string
          iva: number
          min_stock: number
          name: string
          price: number
          stock: number
          type: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          id?: string
          iva?: number
          min_stock?: number
          name: string
          price?: number
          stock?: number
          type?: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          id?: string
          iva?: number
          min_stock?: number
          name?: string
          price?: number
          stock?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          must_change_password: boolean
          password_changed_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          must_change_password?: boolean
          password_changed_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          must_change_password?: boolean
          password_changed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_next_document_number: {
        Args: { _company_id: string; _document_type: string }
        Returns: string
      }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "superadmin" | "admin" | "contador" | "empleado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["superadmin", "admin", "contador", "empleado"],
    },
  },
} as const
