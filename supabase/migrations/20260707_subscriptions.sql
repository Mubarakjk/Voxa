-- Voxa Pro subscription state on profiles
-- Run in Supabase SQL Editor on existing projects.

alter table public.profiles
  add column if not exists subscription jsonb not null default '{
    "subscriptionPlan": "free",
    "trialActive": false,
    "trialUsed": false,
    "billingStatus": "none"
  }'::jsonb;
