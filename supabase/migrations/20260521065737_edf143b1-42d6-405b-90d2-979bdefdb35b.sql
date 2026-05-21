
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin','project_manager','coordinator','pmc','field_engineer','viewer');
CREATE TYPE public.ticket_category AS ENUM ('rfi','worklog','drawing','hindrance','labour','machinery','grievance');
CREATE TYPE public.dpr_status AS ENUM ('open','in_progress','escalated','resolved','closed');
CREATE TYPE public.dpr_priority AS ENUM ('low','medium','high','critical');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  department TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- DPR entries
CREATE TABLE public.dpr_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  project_name TEXT NOT NULL DEFAULT 'AICCC',
  vendor TEXT,
  location TEXT,
  department TEXT NOT NULL,
  category ticket_category NOT NULL,
  activity_type TEXT,
  description TEXT NOT NULL,
  person_responsible TEXT,
  output_evidence TEXT,
  issues_noticed TEXT,
  action_required TEXT,
  status dpr_status NOT NULL DEFAULT 'open',
  priority dpr_priority NOT NULL DEFAULT 'medium',
  session TEXT DEFAULT 'morning',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dpr_entries ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_dpr_entries_date ON public.dpr_entries(entry_date DESC);
CREATE INDEX idx_dpr_entries_department ON public.dpr_entries(department);
CREATE INDEX idx_dpr_entries_category ON public.dpr_entries(category);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_dpr_updated BEFORE UPDATE ON public.dpr_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile + default viewer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies
-- profiles
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins manage profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- dpr_entries
CREATE POLICY "Authenticated view all DPRs" ON public.dpr_entries
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated create DPRs" ON public.dpr_entries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own DPRs" ON public.dpr_entries
  FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'project_manager'));
CREATE POLICY "Users delete own DPRs" ON public.dpr_entries
  FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'));
