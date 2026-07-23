// Supabase Edge Function: protected AI gateway
// Deploy: supabase functions deploy ai-gateway
// Secrets: OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY (auto)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  ABUSE_LIMITS,
  checkUsageAllowance,
  getDayKey,
  getMonthKey,
  resolvePlanFromSubscription,
  validatePayloadSize,
} from '../_shared/usage-guard.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
};

type ChatRequest = {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  model?: string;
  maxTokens?: number;
  metric?: string;
  amount?: number;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  if (req.method === 'GET' && url.pathname.endsWith('/health')) {
    return new Response(JSON.stringify({ ok: true, service: 'ai-gateway' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userId = authData.user.id;
  let payload: ChatRequest;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const messageChars = payload.messages.reduce((sum, msg) => sum + msg.content.length, 0);
  const sizeCheck = validatePayloadSize({ messageChars });
  if (!sizeCheck.allowed) {
    return new Response(JSON.stringify(sizeCheck), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const metric = payload.metric ?? 'ai_messages';
  const amount = payload.amount ?? 1;
  const idempotencyKey = req.headers.get('x-idempotency-key');
  if (!idempotencyKey) {
    return new Response(JSON.stringify({ error: 'Missing x-idempotency-key' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: existingEvent } = await supabase
    .from('usage_events')
    .select('id')
    .eq('event_ref_id', idempotencyKey)
    .maybeSingle();

  if (existingEvent) {
    return new Response(JSON.stringify({ ok: true, duplicate: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .maybeSingle();

  const plan = resolvePlanFromSubscription(subscription?.status);
  const dayKey = getDayKey();
  const monthKey = getMonthKey();

  const { data: limitsRow } = await supabase
    .from('entitlement_limits')
    .select('daily_limit, monthly_limit, fair_use_limit')
    .eq('plan', plan)
    .eq('metric', metric)
    .maybeSingle();

  const { data: dailyUsage } = await supabase
    .from('daily_usage')
    .select('daily_requests')
    .eq('user_id', userId)
    .eq('day_key', dayKey)
    .maybeSingle();

  const { data: monthlyUsage } = await supabase
    .from('monthly_usage')
    .select('monthly_requests')
    .eq('user_id', userId)
    .eq('month_key', monthKey)
    .maybeSingle();

  const allowance = checkUsageAllowance({
    plan,
    metric,
    amount,
    dailyUsed: dailyUsage?.daily_requests ?? 0,
    monthlyUsed: monthlyUsage?.monthly_requests ?? 0,
    limits: {
      plan,
      metric,
      dailyLimit: limitsRow?.daily_limit ?? null,
      monthlyLimit: limitsRow?.monthly_limit ?? null,
      fairUseLimit: limitsRow?.fair_use_limit ?? null,
    },
  });

  if (!allowance.allowed) {
    return new Response(JSON.stringify(allowance), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const openAiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAiKey) {
    return new Response(JSON.stringify({ error: 'AI provider not configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const model = payload.model ?? Deno.env.get('OPENAI_CHAT_MODEL') ?? 'gpt-4o-mini';
  const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: payload.messages,
      max_tokens: payload.maxTokens ?? 500,
      temperature: 0.8,
    }),
  });

  if (!openAiResponse.ok) {
    const errorText = await openAiResponse.text();
    console.error('[AI gateway] OpenAI error', openAiResponse.status, errorText.slice(0, 200));
    return new Response(JSON.stringify({ error: 'AI provider error' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const completion = await openAiResponse.json();
  const content = completion.choices?.[0]?.message?.content ?? '';
  const inputTokens = completion.usage?.prompt_tokens ?? 0;
  const outputTokens = completion.usage?.completion_tokens ?? 0;

  await supabase.from('usage_events').insert({
    user_id: userId,
    event_ref_id: idempotencyKey,
    metric,
    amount,
    model,
    metadata: { inputTokens, outputTokens, messageChars },
  });

  await supabase.from('daily_usage').upsert(
    {
      user_id: userId,
      day_key: dayKey,
      daily_requests: (dailyUsage?.daily_requests ?? 0) + amount,
      ai_input_tokens: inputTokens,
      ai_output_tokens: outputTokens,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,day_key' },
  );

  await supabase.from('monthly_usage').upsert(
    {
      user_id: userId,
      month_key: monthKey,
      monthly_requests: (monthlyUsage?.monthly_requests ?? 0) + amount,
      ai_input_tokens: inputTokens,
      ai_output_tokens: outputTokens,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,month_key' },
  );

  return new Response(
    JSON.stringify({
      ok: true,
      content,
      usage: { inputTokens, outputTokens, plan },
      limits: ABUSE_LIMITS,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
