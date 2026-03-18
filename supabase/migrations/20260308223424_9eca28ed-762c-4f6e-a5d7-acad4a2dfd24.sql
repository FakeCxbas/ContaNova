
-- Companies table
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  ruc text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Add company_id to profiles
ALTER TABLE public.profiles ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

-- Helper function to get user's company (now column exists)
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- Clients table
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  identification text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Products table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(12,2) NOT NULL DEFAULT 0,
  iva numeric(5,2) NOT NULL DEFAULT 15,
  type text NOT NULL DEFAULT 'Bien',
  active boolean NOT NULL DEFAULT true,
  stock integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Invoices table
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text NOT NULL DEFAULT '',
  number text NOT NULL DEFAULT '',
  date date NOT NULL DEFAULT CURRENT_DATE,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  iva numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'borrador',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Invoice items table
CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  price numeric(12,2) NOT NULL DEFAULT 0,
  iva numeric(5,2) NOT NULL DEFAULT 15,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Payments table
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  method text NOT NULL DEFAULT 'transferencia',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
CREATE POLICY "Users can view own company" ON public.companies
  FOR SELECT TO authenticated USING (id = get_user_company_id(auth.uid()));
CREATE POLICY "Users can update own company" ON public.companies
  FOR UPDATE TO authenticated USING (id = get_user_company_id(auth.uid()));

-- RLS Policies for clients
CREATE POLICY "Users can view company clients" ON public.clients
  FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Users can insert company clients" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Users can update company clients" ON public.clients
  FOR UPDATE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Users can delete company clients" ON public.clients
  FOR DELETE TO authenticated USING (company_id = get_user_company_id(auth.uid()));

-- RLS Policies for products
CREATE POLICY "Users can view company products" ON public.products
  FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Users can insert company products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Users can update company products" ON public.products
  FOR UPDATE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Users can delete company products" ON public.products
  FOR DELETE TO authenticated USING (company_id = get_user_company_id(auth.uid()));

-- RLS Policies for invoices
CREATE POLICY "Users can view company invoices" ON public.invoices
  FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Users can insert company invoices" ON public.invoices
  FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Users can update company invoices" ON public.invoices
  FOR UPDATE TO authenticated USING (company_id = get_user_company_id(auth.uid()));

-- RLS Policies for invoice_items
CREATE POLICY "Users can view company invoice items" ON public.invoice_items
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.company_id = get_user_company_id(auth.uid())
  ));
CREATE POLICY "Users can insert company invoice items" ON public.invoice_items
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.company_id = get_user_company_id(auth.uid())
  ));

-- RLS Policies for payments
CREATE POLICY "Users can view company payments" ON public.payments
  FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Users can insert company payments" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- Update handle_new_user to create a company automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id uuid;
BEGIN
  INSERT INTO public.companies (name, ruc)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', '') || ' - Empresa', '')
  RETURNING id INTO new_company_id;

  INSERT INTO public.profiles (id, full_name, email, company_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email, new_company_id);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'empleado');

  RETURN NEW;
END;
$$;
