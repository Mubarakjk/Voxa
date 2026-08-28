-- Phase 5: Voxa Life OS Expansion
-- Idempotent migration — safe to re-run

-- Goal Planner
CREATE TABLE IF NOT EXISTS goal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL DEFAULT '',
  monthly_targets JSONB NOT NULL DEFAULT '[]',
  weekly_targets JSONB NOT NULL DEFAULT '[]',
  todays_action TEXT,
  obstacles JSONB NOT NULL DEFAULT '[]',
  success_criteria JSONB NOT NULL DEFAULT '[]',
  coach_insight TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(goal_id)
);

CREATE TABLE IF NOT EXISTS goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped')),
  sort_order INT NOT NULL DEFAULT 0,
  linked_routine_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('progress','setback','win','revision')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Future Self
CREATE TABLE IF NOT EXISTS future_self_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  target_date TIMESTAMPTZ,
  target_age INT,
  career TEXT,
  finances TEXT,
  health TEXT,
  confidence TEXT,
  lifestyle TEXT,
  relationships TEXT,
  location TEXT,
  values JSONB NOT NULL DEFAULT '[]',
  achievements JSONB NOT NULL DEFAULT '[]',
  habits_to_build JSONB NOT NULL DEFAULT '[]',
  habits_to_reduce JSONB NOT NULL DEFAULT '[]',
  identity_statement TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vision Board
CREATE TABLE IF NOT EXISTS vision_board_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  quote TEXT,
  category TEXT NOT NULL DEFAULT 'custom',
  image_uri TEXT,
  target_date TIMESTAMPTZ,
  progress INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  personal_reason TEXT,
  linked_goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  linked_bucket_id UUID,
  linked_challenge_id UUID,
  pinned BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bucket List
CREATE TABLE IF NOT EXISTS bucket_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  priority INT NOT NULL DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  target_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'idea' CHECK (status IN ('idea','planned','in_progress','completed','paused')),
  progress INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  personal_meaning TEXT,
  linked_goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  linked_vision_id UUID,
  completion_memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  progress_notes JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dream Journal
CREATE TABLE IF NOT EXISTS dream_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  mood TEXT,
  people JSONB NOT NULL DEFAULT '[]',
  places JSONB NOT NULL DEFAULT '[]',
  themes JSONB NOT NULL DEFAULT '[]',
  recurring BOOLEAN NOT NULL DEFAULT false,
  is_private BOOLEAN NOT NULL DEFAULT true,
  voice_note_uri TEXT,
  summary TEXT,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Decision Simulator
CREATE TABLE IF NOT EXISTS saved_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  recommended_next_step TEXT,
  caution TEXT,
  outcome TEXT,
  prediction_vs_reality TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','decided','revisited')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Coach Score
CREATE TABLE IF NOT EXISTS coach_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  value INT NOT NULL DEFAULT 0 CHECK (value >= 0 AND value <= 100),
  trend TEXT NOT NULL DEFAULT 'steady',
  why_changed TEXT NOT NULL DEFAULT '',
  data_used JSONB NOT NULL DEFAULT '[]',
  confidence TEXT NOT NULL DEFAULT 'insufficient',
  improve_action TEXT,
  hidden BOOLEAN NOT NULL DEFAULT false,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, domain)
);

-- Memory Connections
CREATE TABLE IF NOT EXISTS memory_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  to_kind TEXT NOT NULL,
  to_id TEXT NOT NULL,
  to_label TEXT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'medium' CHECK (confidence IN ('high','medium','low')),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Life Book
CREATE TABLE IF NOT EXISTS life_book_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month_label TEXT NOT NULL,
  year INT NOT NULL,
  month INT NOT NULL,
  summary TEXT,
  biggest_win TEXT,
  biggest_challenge TEXT,
  goals JSONB NOT NULL DEFAULT '[]',
  routine_percent INT,
  mood_trend TEXT,
  journal_excerpts JSONB NOT NULL DEFAULT '[]',
  dream_themes JSONB NOT NULL DEFAULT '[]',
  decisions JSONB NOT NULL DEFAULT '[]',
  bucket_progress JSONB NOT NULL DEFAULT '[]',
  vision_progress JSONB NOT NULL DEFAULT '[]',
  favourite_memory TEXT,
  voxa_noticed TEXT,
  next_focus TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  refreshed_at TIMESTAMPTZ,
  UNIQUE(user_id, year, month)
);

-- Memory Movie Storyboard
CREATE TABLE IF NOT EXISTS memory_movie_storyboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scenes JSONB NOT NULL DEFAULT '[]',
  total_duration_sec INT NOT NULL DEFAULT 0,
  music_placeholder TEXT NOT NULL DEFAULT 'ambient',
  export_status TEXT NOT NULL DEFAULT 'preview_only',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS goal_milestones_goal_idx ON goal_milestones(goal_id);
CREATE INDEX IF NOT EXISTS goal_notes_goal_idx ON goal_notes(goal_id);
CREATE INDEX IF NOT EXISTS vision_board_user_idx ON vision_board_items(user_id);
CREATE INDEX IF NOT EXISTS bucket_list_user_idx ON bucket_list_items(user_id);
CREATE INDEX IF NOT EXISTS dream_entries_user_idx ON dream_entries(user_id);
CREATE INDEX IF NOT EXISTS saved_decisions_user_idx ON saved_decisions(user_id);
CREATE INDEX IF NOT EXISTS memory_connections_user_idx ON memory_connections(user_id);
CREATE INDEX IF NOT EXISTS memory_connections_from_idx ON memory_connections(from_memory_id);
CREATE INDEX IF NOT EXISTS life_book_user_month_idx ON life_book_chapters(user_id, year, month);

-- RLS
ALTER TABLE goal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE future_self_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vision_board_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE dream_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_book_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_movie_storyboards ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY goal_plans_owner ON goal_plans FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY goal_milestones_owner ON goal_milestones FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY goal_notes_owner ON goal_notes FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY future_self_owner ON future_self_profiles FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY vision_board_owner ON vision_board_items FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY bucket_list_owner ON bucket_list_items FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY dream_entries_owner ON dream_entries FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY saved_decisions_owner ON saved_decisions FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY coach_scores_owner ON coach_scores FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY memory_connections_owner ON memory_connections FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY life_book_owner ON life_book_chapters FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY memory_movie_owner ON memory_movie_storyboards FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
