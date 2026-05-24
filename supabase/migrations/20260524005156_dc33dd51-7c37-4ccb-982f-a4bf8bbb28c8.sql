ALTER TABLE public.dpr_entries
  ADD COLUMN IF NOT EXISTS total_tickets integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_tickets integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS in_progress_tickets integer NOT NULL DEFAULT 0;