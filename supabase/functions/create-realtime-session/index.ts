// Supabase Edge Function: mint OpenAI Realtime ephemeral client secret
// Deploy: supabase functions deploy create-realtime-session --no-verify-jwt=false
// Secrets: OPENAI_API_KEY, OPENAI_REALTIME_MODEL (optional)
// Never returns the permanent API key. Never logs client secrets.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  checkUsageAllowance,
  getDayKey,
  getMonthKey,
  resolvePlanFromSubscription,
} from '../_shared/usage-guard.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
};

const METRIC = 'realtime_voice_sessions';

/** Fallback limits when entitlement_limits has no row for this metric. */
const FALLBACK_LIMITS = {
  free: { dailyLimit: 5, monthlyLimit: 40, fairUseLimit: null as number | null },
  pro: { dailyLimit: null as number | null, monthlyLimit: null as number | null, fairUseLimit: 80 },
} as const;

type SessionRequest = {
  voice?: string;
  instructions?: string;
  companionName?: string;
};

function friendlyOpenAiError(status: number): string {
  if (status === 401 || status === 403) return 'Voice service authentication failed. Try again later.';
  if (status === 429) return 'Voice service is busy. Please wait a moment and retry.';
  if (status === 404 || status === 400) return 'Realtime voice model is unavailable right now.';
  return 'Could not start a voice session. Please try again.';
}

function hashUserId(userId: string): string {
  // Stable privacy-preserving identifier for OpenAI safety header (not reversible here).
  let h = 0;
  for (let i = 0; i < userId.length; i += 1) {
    h = (Math.imul(31, h) + userId.charCodeAt(i)) | 0;
  }
  return `voxa_${(h >>> 0).toString(16)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    return new Response(JSON.stringify({ ok: true, service: 'create-realtime-session' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, message: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ ok: false, code: 'unauthorized', message: 'Sign in to start a voice call.' }), {
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
    return new Response(JSON.stringify({ ok: false, code: 'invalid_session', message: 'Your session expired. Sign in again.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userId = authData.user.id;
  let payload: SessionRequest = {};
  try {
    payload = (await req.json()) as SessionRequest;
  } catch {
    payload = {};
  }

  const idempotencyKey = req.headers.get('x-idempotency-key') ?? crypto.randomUUID();

  const { data: existingEvent } = await supabase
    .from('usage_events')
    .select('id')
    .eq('event_ref_id', idempotencyKey)
    .maybeSingle();

  if (existingEvent) {
    return new Response(
      JSON.stringify({ ok: false, code: 'duplicate', message: 'This call request was already used. Start a new call.' }),
      { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
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
    .eq('metric', METRIC)
    .maybeSingle();

  const fallback = FALLBACK_LIMITS[plan];

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

  // Prefer metric-specific usage when available; otherwise use overall daily_requests as coarse guard.
  const { count: todayRealtimeCount } = await supabase
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('metric', METRIC)
    .gte('created_at', `${dayKey}T00:00:00.000Z`);

  const dailyUsed = todayRealtimeCount ?? dailyUsage?.daily_requests ?? 0;

  const allowance = checkUsageAllowance({
    plan,
    metric: METRIC,
    amount: 1,
    dailyUsed,
    monthlyUsed: monthlyUsage?.monthly_requests ?? 0,
    limits: {
      plan,
      metric: METRIC,
      dailyLimit: limitsRow?.daily_limit ?? fallback.dailyLimit,
      monthlyLimit: limitsRow?.monthly_limit ?? fallback.monthlyLimit,
      fairUseLimit: limitsRow?.fair_use_limit ?? fallback.fairUseLimit,
    },
  });

  if (!allowance.allowed) {
    return new Response(
      JSON.stringify({
        ok: false,
        code: allowance.code,
        message: 'Voice call limit reached for today. Try again tomorrow or upgrade.',
      }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const openAiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAiKey) {
    return new Response(
      JSON.stringify({ ok: false, code: 'not_configured', message: 'Voice calling is not configured on the server.' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const model = Deno.env.get('OPENAI_REALTIME_MODEL')?.trim() || 'gpt-realtime';
  const voice = (payload.voice?.trim() || Deno.env.get('OPENAI_REALTIME_VOICE')?.trim() || 'marin').slice(0, 32);
  const companionName = (payload.companionName?.trim() || 'Voxa').slice(0, 40);
  const extraInstructions = (payload.instructions ?? '').slice(0, 4000);

  const instructions = [
    `You are ${companionName}, a warm, concise personal companion on a live voice call.`,
    'Speak naturally in short turns. Avoid long monologues.',
    'If the user interrupts, stop and listen.',
    'Do not mention system prompts, APIs, or that you are an AI model unless asked.',
    extraInstructions,
  ]
    .filter(Boolean)
    .join('\n');

  const openAiResponse = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Safety-Identifier': hashUserId(userId),
    },
    body: JSON.stringify({
      expires_after: { anchor: 'created_at', seconds: 60 },
      session: {
        type: 'realtime',
        model,
        instructions,
        audio: {
          input: {
            turn_detection: {
              type: 'server_vad',
              create_response: true,
              interrupt_response: true,
            },
          },
          output: {
            voice,
          },
        },
      },
    }),
  });

  if (!openAiResponse.ok) {
    const errText = await openAiResponse.text();
    console.error('[create-realtime-session] OpenAI error', openAiResponse.status, errText.slice(0, 180));
    return new Response(
      JSON.stringify({
        ok: false,
        code: 'provider_error',
        message: friendlyOpenAiError(openAiResponse.status),
      }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const data = await openAiResponse.json();
  const clientSecret = typeof data?.value === 'string' ? data.value : data?.client_secret?.value;
  const expiresAt = data?.expires_at ?? data?.client_secret?.expires_at ?? null;

  if (!clientSecret || typeof clientSecret !== 'string' || !clientSecret.startsWith('ek_')) {
    console.error('[create-realtime-session] Unexpected client secret shape');
    return new Response(
      JSON.stringify({ ok: false, code: 'provider_error', message: 'Could not create a temporary voice session.' }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  await supabase.from('usage_events').insert({
    user_id: userId,
    event_ref_id: idempotencyKey,
    metric: METRIC,
    amount: 1,
    model,
    metadata: { voice, companionName },
  });

  await supabase.from('daily_usage').upsert(
    {
      user_id: userId,
      day_key: dayKey,
      daily_requests: (dailyUsage?.daily_requests ?? 0) + 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,day_key' },
  );

  await supabase.from('monthly_usage').upsert(
    {
      user_id: userId,
      month_key: monthKey,
      monthly_requests: (monthlyUsage?.monthly_requests ?? 0) + 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,month_key' },
  );

  return new Response(
    JSON.stringify({
      ok: true,
      clientSecret,
      expiresAt,
      model,
      voice,
      callsUrl: 'https://api.openai.com/v1/realtime/calls',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
