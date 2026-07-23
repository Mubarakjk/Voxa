-- Phase 12: Voxa Experiences, Coaching & Shared Memories
-- Idempotent migration

CREATE TABLE IF NOT EXISTS scheduled_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  template TEXT NOT NULL,
  style TEXT NOT NULL DEFAULT 'friendly',
  scheduled_at TIMESTAMPTZ NOT NULL,
  recurrence TEXT NOT NULL DEFAULT 'once',
  custom_days INT[] DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  opening_message TEXT,
  linked_goal_id UUID,
  linked_routine_id UUID,
  linked_event_id UUID,
  quiet_hours_respect BOOLEAN NOT NULL DEFAULT true,
  notification_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS check_in_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_in_id UUID NOT NULL REFERENCES scheduled_check_ins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'delivered',
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS photo_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  local_uri TEXT,
  remote_url TEXT,
  thumbnail_uri TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  category TEXT NOT NULL DEFAULT 'everyday',
  custom_category TEXT,
  people TEXT[] DEFAULT '{}',
  place_text TEXT,
  emotion TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  pinned BOOLEAN NOT NULL DEFAULT false,
  favourite BOOLEAN NOT NULL DEFAULT false,
  analysis_summary TEXT,
  memory_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mood_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mood INT NOT NULL CHECK (mood BETWEEN 1 AND 5),
  energy INT NOT NULL CHECK (energy BETWEEN 1 AND 5),
  stress INT NOT NULL CHECK (stress BETWEEN 1 AND 5),
  confidence INT NOT NULL CHECK (confidence BETWEEN 1 AND 5),
  sleep_quality INT NOT NULL CHECK (sleep_quality BETWEEN 1 AND 5),
  note TEXT,
  voice_note_uri TEXT,
  linked_routine_id UUID,
  linked_event_id UUID,
  linked_photo_id UUID,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS mood_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  line TEXT NOT NULL,
  data_points INT NOT NULL DEFAULT 0,
  confidence TEXT NOT NULL DEFAULT 'medium',
  metric TEXT NOT NULL,
  next_step TEXT NOT NULL DEFAULT '',
  dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coaching_profiles (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  current_focus TEXT NOT NULL DEFAULT '',
  active_plan JSONB NOT NULL DEFAULT '[]',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, coach_id)
);

CREATE TABLE IF NOT EXISTS coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  summary TEXT NOT NULL DEFAULT '',
  action_steps JSONB NOT NULL DEFAULT '[]',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS conversation_world_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  favourite_world_ids TEXT[] DEFAULT '{}',
  last_used_world_id TEXT,
  last_used_at TIMESTAMPTZ,
  reduced_motion BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS relationship_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  occurred_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL DEFAULT 'system',
  confidence TEXT NOT NULL DEFAULT 'verified',
  linked_conversation_id UUID,
  linked_memory_id UUID,
  linked_photo_id UUID,
  favourite BOOLEAN NOT NULL DEFAULT false,
  hidden BOOLEAN NOT NULL DEFAULT false,
  user_created BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS companion_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  title TEXT NOT NULL,
  duration_days INT NOT NULL DEFAULT 7,
  daily_target TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  reminder_time TEXT,
  linked_goal_id UUID,
  linked_routine_id UUID,
  coach_style TEXT NOT NULL DEFAULT 'friendly',
  accountability_level TEXT NOT NULL DEFAULT 'balanced',
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_days INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  best_streak INT NOT NULL DEFAULT 0,
  adherence_percent INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challenge_day_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES companion_challenges(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  note TEXT,
  photo_id UUID,
  voice_note_uri TEXT,
  UNIQUE(challenge_id, date)
);

CREATE TABLE IF NOT EXISTS cosmetic_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_key TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  preview_color TEXT,
  unlock_reason TEXT,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  equipped BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, reward_key)
);

CREATE TABLE IF NOT EXISTS user_reward_inventory (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES cosmetic_rewards(id) ON DELETE CASCADE,
  equipped_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, reward_id)
);

CREATE TABLE IF NOT EXISTS weekly_companion_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_key TEXT NOT NULL,
  opening TEXT NOT NULL,
  noticed TEXT NOT NULL DEFAULT '',
  achievement TEXT NOT NULL DEFAULT '',
  challenge TEXT NOT NULL DEFAULT '',
  memory TEXT NOT NULL DEFAULT '',
  observation TEXT NOT NULL DEFAULT '',
  encouragement TEXT NOT NULL DEFAULT '',
  next_week_focus TEXT NOT NULL DEFAULT '',
  closing TEXT NOT NULL DEFAULT '',
  data_sources JSONB NOT NULL DEFAULT '[]',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ,
  favourite BOOLEAN NOT NULL DEFAULT false,
  is_private BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, week_key)
);

CREATE TABLE IF NOT EXISTS composer_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  favourite_action_ids TEXT[] DEFAULT '{}',
  recent_action_ids TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scheduled_check_ins_user_idx ON scheduled_check_ins(user_id);
CREATE INDEX IF NOT EXISTS photo_memories_user_idx ON photo_memories(user_id);
CREATE INDEX IF NOT EXISTS mood_entries_user_date_idx ON mood_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS relationship_milestones_user_idx ON relationship_milestones(user_id);
CREATE INDEX IF NOT EXISTS companion_challenges_user_idx ON companion_challenges(user_id);
CREATE INDEX IF NOT EXISTS weekly_letters_user_idx ON weekly_companion_letters(user_id);

ALTER TABLE scheduled_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_in_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_world_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_day_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cosmetic_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reward_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_companion_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE composer_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY scheduled_check_ins_owner ON scheduled_check_ins FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY check_in_history_owner ON check_in_history FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY photo_memories_owner ON photo_memories FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY mood_entries_owner ON mood_entries FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY mood_insights_owner ON mood_insights FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY coaching_profiles_owner ON coaching_profiles FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY coaching_sessions_owner ON coaching_sessions FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY world_prefs_owner ON conversation_world_preferences FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY relationship_milestones_owner ON relationship_milestones FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY companion_challenges_owner ON companion_challenges FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY challenge_day_entries_owner ON challenge_day_entries FOR ALL
  USING (EXISTS (SELECT 1 FROM companion_challenges c WHERE c.id = challenge_id AND c.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY cosmetic_rewards_owner ON cosmetic_rewards FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY user_reward_inventory_owner ON user_reward_inventory FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY weekly_letters_owner ON weekly_companion_letters FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY composer_preferences_owner ON composer_preferences FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
