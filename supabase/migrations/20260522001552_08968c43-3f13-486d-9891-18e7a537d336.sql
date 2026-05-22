
CREATE TYPE public.recorder_role AS ENUM ('prepared_by', 'reviewed_by', 'approved_by');

CREATE TABLE public.absentees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name text NOT NULL,
  department text,
  designation text,
  absent_date date NOT NULL DEFAULT CURRENT_DATE,
  remarks text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.absentees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view absentees" ON public.absentees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert absentees" ON public.absentees FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owner or admin update absentees" ON public.absentees FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owner or admin delete absentees" ON public.absentees FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER absentees_set_updated_at BEFORE UPDATE ON public.absentees FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_absentees_date ON public.absentees(absent_date);

CREATE TABLE public.recorded_by (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  designation text,
  department text,
  role public.recorder_role NOT NULL DEFAULT 'prepared_by',
  signature_url text,
  dpr_date date NOT NULL DEFAULT CURRENT_DATE,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recorded_by ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view recorded_by" ON public.recorded_by FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert recorded_by" ON public.recorded_by FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner or admin update recorded_by" ON public.recorded_by FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owner or admin delete recorded_by" ON public.recorded_by FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER recorded_by_set_updated_at BEFORE UPDATE ON public.recorded_by FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_recorded_by_date ON public.recorded_by(dpr_date);

INSERT INTO storage.buckets (id, name, public) VALUES ('signatures', 'signatures', true);

CREATE POLICY "Signatures public read" ON storage.objects FOR SELECT USING (bucket_id = 'signatures');
CREATE POLICY "Users upload own signatures" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own signatures" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own signatures" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);
