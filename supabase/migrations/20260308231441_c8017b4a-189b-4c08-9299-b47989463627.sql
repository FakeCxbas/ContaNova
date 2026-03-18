
-- Activity log table
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text DEFAULT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast company queries
CREATE INDEX idx_activity_logs_company ON public.activity_logs(company_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can view activity for their company
CREATE POLICY "Users can view company activity"
ON public.activity_logs FOR SELECT
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

-- Users can insert activity for their company
CREATE POLICY "Users can insert company activity"
ON public.activity_logs FOR INSERT
TO authenticated
WITH CHECK (company_id = get_user_company_id(auth.uid()));
