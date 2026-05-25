CREATE TABLE public.visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_name text NOT NULL,
  organization text,
  purpose text,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  remarks text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view visitors" ON public.visitors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert visitors" ON public.visitors FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owner or admin update visitors" ON public.visitors FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owner or admin delete visitors" ON public.visitors FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER visitors_set_updated_at BEFORE UPDATE ON public.visitors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_visitors_date ON public.visitors(visit_date);
