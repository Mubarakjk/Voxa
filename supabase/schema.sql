-- Voxa production schema
-- Run in Supabase SQL Editor after creating your project.

create extension if not exists "pgcrypto";

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text,
  age integer,
  main_reason text,
  timezone text not null default 'UTC',
  onboarding_complete boolean not null default false,
  preferences jsonb not null default '{}'::jsonb,
  companion jsonb not null default '{}'::jsonb,
  companion_identity jsonb,
  onboarding jsonb,
  subscription jsonb not null default '{"subscriptionPlan":"free","trialActive":false,"trialUsed":false,"billingStatus":"none"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memories (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  title text not null,
  content text not null,
  mood text not null default 'neutral',
  importance smallint not null default 3,
  tags text[] not null default '{}',
  source text not null default 'manual',
  related_mode text,
  occurred_at timestamptz,
  last_used_at timestamptz,
  use_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  category text not null,
  status text not null default 'active',
  progress smallint not null default 0,
  target_date timestamptz,
  linked_reminder_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  scheduled_at timestamptz not null,
  recurrence text not null default 'none',
  status text not null default 'scheduled',
  mode text,
  allow_proactive_call boolean not null default false,
  completed_at timestamptz,
  goal_id text,
  notification_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null,
  channel text not null,
  title text,
  status text not null default 'active',
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id text primary key,
  conversation_id text not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  content text not null,
  mode text not null,
  status text not null default 'sent',
  metadata jsonb,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.voice_sessions (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id text not null references public.conversations(id) on delete cascade,
  mode text not null,
  state text not null default 'idle',
  is_safe_call boolean not null default false,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer not null default 0,
  transcript_message_ids text[] not null default '{}',
  check_in_interval_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trusted_contacts (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  relation text not null,
  status text not null default 'Available',
  phone text,
  is_emergency boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_memories_user on public.memories(user_id);
create index if not exists idx_goals_user on public.goals(user_id);
create index if not exists idx_reminders_user on public.reminders(user_id);
create index if not exists idx_conversations_user on public.conversations(user_id);
create index if not exists idx_messages_conversation on public.messages(conversation_id);
create index if not exists idx_voice_sessions_user on public.voice_sessions(user_id);

-- RLS
alter table public.profiles enable row level security;
alter table public.memories enable row level security;
alter table public.goals enable row level security;
alter table public.reminders enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.voice_sessions enable row level security;
alter table public.trusted_contacts enable row level security;

create policy "profiles_own" on public.profiles for all using (auth.uid() = id);
create policy "memories_own" on public.memories for all using (auth.uid() = user_id);
create policy "goals_own" on public.goals for all using (auth.uid() = user_id);
create policy "reminders_own" on public.reminders for all using (auth.uid() = user_id);
create policy "conversations_own" on public.conversations for all using (auth.uid() = user_id);
create policy "messages_own" on public.messages for all using (auth.uid() = user_id);
create policy "voice_sessions_own" on public.voice_sessions for all using (auth.uid() = user_id);
create policy "trusted_contacts_own" on public.trusted_contacts for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
