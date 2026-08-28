-- Phase 6: Premium Companion Experience
-- Idempotent migration

CREATE TABLE IF NOT EXISTS proactive_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  prompt TEXT NOT NULL,
  source_message TEXT,
  scheduled_for TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed','ignored')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS activity_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL,
  title TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  summary TEXT,
  favourite BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','abandoned'))
);

CREATE TABLE IF NOT EXISTS relationship_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  framing TEXT NOT NULL DEFAULT 'friend',
  proactive_enabled BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_start INT,
  quiet_hours_end INT,
  sensitive_topics TEXT[] DEFAULT '{}',
  boundaries TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sports_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  favourite_teams JSONB NOT NULL DEFAULT '[]',
  favourite_athletes JSONB NOT NULL DEFAULT '[]',
  favourite_sports JSONB NOT NULL DEFAULT '[]',
  notify_on_results BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sports_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  query_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(user_id, query_key)
);

CREATE TABLE IF NOT EXISTS conversation_drafts (
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS proactive_follow_ups_user_idx ON proactive_follow_ups(user_id);
CREATE INDEX IF NOT EXISTS activity_sessions_user_idx ON activity_sessions(user_id);
CREATE INDEX IF NOT EXISTS sports_cache_user_idx ON sports_cache(user_id);

ALTER TABLE proactive_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_drafts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY proactive_follow_ups_owner ON proactive_follow_ups FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY activity_sessions_owner ON activity_sessions FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY relationship_prefs_owner ON relationship_preferences FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY sports_prefs_owner ON sports_preferences FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY sports_cache_owner ON sports_cache FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY conversation_drafts_owner ON conversation_drafts FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
