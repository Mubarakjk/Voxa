-- Phase 13: RevenueCat subscription mirror + usage protection tables

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  revenuecat_app_user_id text not null,
  entitlement_id text not null default 'voxa_pro',
  product_id text,
  platform text,
  status text not null default 'none',
  purchase_date timestamptz,
  expiration_date timestamptz,
  trial_end timestamptz,
  will_renew boolean,
  store_environment text,
  original_transaction_id text,
  last_event_id text unique,
  raw_event jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
create index if not exists subscriptions_last_event_id_idx on public.subscriptions(last_event_id);

alter table public.subscriptions enable row level security;

create policy if not exists "Users can read own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Webhook/service role writes only — no direct client insert/update policies

create table if not exists public.monthly_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key text not null,
  ai_input_tokens bigint not null default 0,
  ai_output_tokens bigint not null default 0,
  transcription_seconds bigint not null default 0,
  image_analyses bigint not null default 0,
  voice_note_bytes bigint not null default 0,
  storage_bytes bigint not null default 0,
  daily_requests bigint not null default 0,
  monthly_requests bigint not null default 0,
  estimated_cost_micros bigint not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, month_key)
);

create table if not exists public.daily_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_key text not null,
  ai_input_tokens bigint not null default 0,
  ai_output_tokens bigint not null default 0,
  transcription_seconds bigint not null default 0,
  image_analyses bigint not null default 0,
  voice_note_bytes bigint not null default 0,
  daily_requests bigint not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, day_key)
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_ref_id text not null unique,
  metric text not null,
  amount bigint not null default 1,
  model text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.entitlement_limits (
  id uuid primary key default gen_random_uuid(),
  plan text not null,
  metric text not null,
  daily_limit bigint,
  monthly_limit bigint,
  fair_use_limit bigint,
  updated_at timestamptz not null default now(),
  unique (plan, metric)
);

insert into public.entitlement_limits (plan, metric, daily_limit, monthly_limit, fair_use_limit)
values
  ('free', 'ai_messages', 20, 200, null),
  ('free', 'voice_notes', 5, 50, null),
  ('free', 'image_analyses', 2, 30, null),
  ('pro', 'ai_messages', null, null, 500),
  ('pro', 'voice_notes', null, null, 500),
  ('pro', 'image_analyses', null, null, 50)
on conflict (plan, metric) do nothing;

alter table public.monthly_usage enable row level security;
alter table public.daily_usage enable row level security;
alter table public.usage_events enable row level security;
alter table public.entitlement_limits enable row level security;

create policy if not exists "Users can read own monthly usage"
  on public.monthly_usage for select using (auth.uid() = user_id);

create policy if not exists "Users can read own daily usage"
  on public.daily_usage for select using (auth.uid() = user_id);

create policy if not exists "Users can read own usage events"
  on public.usage_events for select using (auth.uid() = user_id);

create policy if not exists "Anyone can read entitlement limits"
  on public.entitlement_limits for select using (true);
