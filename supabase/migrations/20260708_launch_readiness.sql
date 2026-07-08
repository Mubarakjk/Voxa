-- Voxa launch-readiness schema patch (idempotent)
-- Run in Supabase SQL Editor on existing projects.

alter table if exists public.messages
  add column if not exists status text not null default 'sent';

alter table if exists public.profiles
  add column if not exists subscription jsonb not null default '{
    "subscriptionPlan": "free",
    "trialActive": false,
    "trialUsed": false,
    "billingStatus": "none"
  }'::jsonb;

alter table if exists public.voice_sessions
  add column if not exists is_safe_call boolean not null default false;

create index if not exists idx_messages_conversation_created
  on public.messages (conversation_id, created_at);

create index if not exists idx_voice_sessions_user_created
  on public.voice_sessions (user_id, created_at desc);

insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', false)
on conflict (id) do nothing;
