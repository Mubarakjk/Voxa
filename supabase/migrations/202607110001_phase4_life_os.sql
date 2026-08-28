-- Phase 4: Life OS local-first entities (optional cloud sync later)
-- Mirrors local storage keys: bucket_list, vision_board, future_self, life_book, life_challenges

CREATE TABLE IF NOT EXISTS life_os_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('bucket_list', 'vision_board', 'future_self', 'life_book', 'challenge')),
  title TEXT NOT NULL,
  body TEXT,
  emoji TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  metadata JSONB DEFAULT '{}',
  linked_goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  linked_memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS life_os_items_user_kind_idx ON life_os_items(user_id, kind);

ALTER TABLE memories
  ADD COLUMN IF NOT EXISTS user_corrected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS merged_into_id UUID REFERENCES memories(id) ON DELETE SET NULL;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS canvas_json JSONB;
