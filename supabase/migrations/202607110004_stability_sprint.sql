-- Voxa Stability Sprint — schema/repository alignment (idempotent)
-- Run after schema.sql + prior migrations.

-- Memory intelligence fields referenced by Memory type + updateMemory
ALTER TABLE public.memories
  ADD COLUMN IF NOT EXISTS emotional_significance smallint
    CHECK (emotional_significance IS NULL OR emotional_significance BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS confidence real
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Conversation summary (written by companion service)
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS summary text;

-- Routine tables (local-only today; schema ready for future sync)
CREATE TABLE IF NOT EXISTS public.routine_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'custom',
  title text NOT NULL,
  time text NOT NULL,
  repeat_days integer[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6],
  mode text,
  strictness text NOT NULL DEFAULT 'balanced',
  reminder_style text NOT NULL DEFAULT 'notification',
  goal_id text,
  reminder_id text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.routine_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  block_id uuid NOT NULL REFERENCES public.routine_blocks(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  completed_at timestamptz,
  snoozed_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, block_id, date)
);

CREATE INDEX IF NOT EXISTS idx_routine_blocks_user ON public.routine_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_routine_completions_user_date ON public.routine_completions(user_id, date);

ALTER TABLE public.routine_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_completions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'routine_blocks' AND policyname = 'routine_blocks_owner'
  ) THEN
    CREATE POLICY routine_blocks_owner ON public.routine_blocks
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'routine_completions' AND policyname = 'routine_completions_owner'
  ) THEN
    CREATE POLICY routine_completions_owner ON public.routine_completions
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Align routine FK types with goals/reminders (text IDs)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'routine_blocks' AND column_name = 'goal_id'
  ) THEN
    ALTER TABLE public.routine_blocks
      ALTER COLUMN goal_id TYPE text USING goal_id::text,
      ALTER COLUMN reminder_id TYPE text USING reminder_id::text;
  END IF;
END $$;
