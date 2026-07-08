-- Voxa Routine Coach (optional Supabase sync)
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS public.routine_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'custom',
  title TEXT NOT NULL,
  time TEXT NOT NULL,
  repeat_days INTEGER[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6],
  mode TEXT,
  strictness TEXT NOT NULL DEFAULT 'balanced',
  reminder_style TEXT NOT NULL DEFAULT 'notification',
  goal_id UUID,
  reminder_id UUID,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.routine_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES public.routine_blocks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  completed_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, block_id, date)
);

CREATE INDEX IF NOT EXISTS idx_routine_blocks_user ON public.routine_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_routine_completions_user_date ON public.routine_completions(user_id, date);

ALTER TABLE public.routine_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_completions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'routine_blocks' AND policyname = 'routine_blocks_own'
  ) THEN
    CREATE POLICY routine_blocks_own ON public.routine_blocks
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'routine_completions' AND policyname = 'routine_completions_own'
  ) THEN
    CREATE POLICY routine_completions_own ON public.routine_completions
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
