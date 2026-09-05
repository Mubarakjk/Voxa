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
  validateChatPayloadSize,
  validatePayloadSize,
} from '../_shared/usage-guard.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
};

const ALLOWED_MODELS = ['gpt-4o-mini', 'gpt-4o'] as const;
const MAX_MESSAGES = 25;
const MAX_OUTPUT_TOKENS = 500;
const DEFAULT_MODEL = 'gpt-4o-mini';

type ChatRequest = {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  model?: string;
  maxTokens?: number;
  metric?: string;
  amount?: number;
};

type ErrorBody = { ok: false; code: string; message: string };

function jsonError(status: number, code: string, message: string): Response {
  const body: ErrorBody = { ok: false, code, message };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function jsonSuccess(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ ok: true, ...body }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function resolveModel(requested?: string): string {
  const candidate = requested?.trim();
  if (candidate && ALLOWED_MODELS.includes(candidate as (typeof ALLOWED_MODELS)[number])) {
    return candidate;
  }
  const envModel = Deno.env.get('OPENAI_CHAT_MODEL')?.trim();
  if (envModel && ALLOWED_MODELS.includes(envModel as (typeof ALLOWED_MODELS)[number])) {
    return envModel;
  }
  return DEFAULT_MODEL;
}

function resolveMaxTokens(requested?: number): number {
  if (typeof requested !== 'number' || !Number.isFinite(requested) || requested <= 0) {
    return MAX_OUTPUT_TOKENS;
  }
  return Math.min(Math.floor(requested), MAX_OUTPUT_TOKENS);
}

function parseChatRequest(payload: unknown): ChatRequest | null {
  if (!payload || typeof payload !== 'object') return null;
  const raw = payload as Record<string, unknown>;
  if (!Array.isArray(raw.messages) || raw.messages.length === 0 || raw.messages.length > MAX_MESSAGES) {
    return null;
  }

  const messages: ChatRequest['messages'] = [];
  for (const item of raw.messages) {
    if (!item || typeof item !== 'object') return null;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== 'system' && role !== 'user' && role !== 'assistant') return null;
    if (typeof content !== 'string' || content.trim().length === 0) return null;
    messages.push({ role, content });
  }

  const metric = typeof raw.metric === 'string' ? raw.metric.trim() : undefined;
  const amount =
    typeof raw.amount === 'number' && Number.isFinite(raw.amount) && raw.amount > 0
      ? Math.min(Math.floor(raw.amount), 10)
      : undefined;

  return {
    messages,
    model: typeof raw.model === 'string' ? raw.model : undefined,
    maxTokens: typeof raw.maxTokens === 'number' ? raw.maxTokens : undefined,
    metric: metric || undefined,
    amount,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  if (req.method === 'GET' && url.pathname.endsWith('/health')) {
    return jsonSuccess({ service: 'ai-gateway' });
  }

  if (req.method !== 'POST') {
    return jsonError(405, 'method_not_allowed', 'Method not allowed');
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonError(401, 'unauthorized', 'Unauthorized');
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    return jsonError(401, 'invalid_session', 'Invalid session');
  }

  const userId = authData.user.id;
  let rawPayload: unknown;
  try {
    rawPayload = await req.json();
  } catch {
    return jsonError(400, 'invalid_json', 'Invalid JSON');
  }

  const payload = parseChatRequest(rawPayload);
  if (!payload) {
    return jsonError(400, 'invalid_request', 'Invalid chat request');
  }

  try {
    return await handleGatewayChat({
      supabase,
      userId,
      payload,
      idempotencyKey: req.headers.get('x-idempotency-key')?.trim(),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[AI gateway] unhandled error', detail.slice(0, 240));
    return jsonError(500, 'gateway_error', 'AI gateway error');
  }
});

async function handleGatewayChat(input: {
  supabase: ReturnType<typeof createClient>;
  userId: string;
  payload: ChatRequest;
  idempotencyKey?: string;
}): Promise<Response> {
  const { supabase, userId, payload } = input;
  const idempotencyKey = input.idempotencyKey;
  if (!idempotencyKey || idempotencyKey.length > 128) {
    return jsonError(400, 'missing_idempotency_key', 'Missing or invalid x-idempotency-key');
  }

  const messageChars = payload.messages.reduce((sum, msg) => sum + msg.content.length, 0);
  const sizeCheck = validateChatPayloadSize(payload.messages);
  if (!sizeCheck.allowed) {
    return new Response(JSON.stringify({ ok: false, ...sizeCheck }), {
      status: 413,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const metric = payload.metric ?? 'ai_messages';
  const amount = payload.amount ?? 1;

  let existingEvent: { id: string } | null = null;
  try {
    const { data, error } = await supabase
      .from('usage_events')
      .select('id')
      .eq('event_ref_id', idempotencyKey)
      .maybeSingle();
    if (error) throw error;
    existingEvent = data;
  } catch (err) {
    console.error('[AI gateway] usage_events lookup failed', String(err).slice(0, 200));
    return jsonError(503, 'database_error', 'Usage tracking unavailable');
  }

  if (existingEvent) {
    return new Response(JSON.stringify({ ok: false, duplicate: true, code: 'duplicate', message: 'Duplicate request' }), {
      status: 409,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let subscription: { status?: string | null } | null = null;
  let limitsRow: {
    daily_limit: number | null;
    monthly_limit: number | null;
    fair_use_limit: number | null;
  } | null = null;
  let dailyUsage: { daily_requests?: number | null } | null = null;
  let monthlyUsage: { monthly_requests?: number | null } | null = null;

  try {
    const subscriptionResult = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle();
    if (subscriptionResult.error) throw subscriptionResult.error;
    subscription = subscriptionResult.data;

    const plan = resolvePlanFromSubscription(subscription?.status);
    const dayKey = getDayKey();
    const monthKey = getMonthKey();

    const [limitsResult, dailyResult, monthlyResult] = await Promise.all([
      supabase
        .from('entitlement_limits')
        .select('daily_limit, monthly_limit, fair_use_limit')
        .eq('plan', plan)
        .eq('metric', metric)
        .maybeSingle(),
      supabase
        .from('daily_usage')
        .select('daily_requests')
        .eq('user_id', userId)
        .eq('day_key', dayKey)
        .maybeSingle(),
      supabase
        .from('monthly_usage')
        .select('monthly_requests')
        .eq('user_id', userId)
        .eq('month_key', monthKey)
        .maybeSingle(),
    ]);

    if (limitsResult.error) throw limitsResult.error;
    if (dailyResult.error) throw dailyResult.error;
    if (monthlyResult.error) throw monthlyResult.error;

    limitsRow = limitsResult.data;
    dailyUsage = dailyResult.data;
    monthlyUsage = monthlyResult.data;

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
      return new Response(JSON.stringify({ ok: false, ...allowance }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) {
      return jsonError(503, 'provider_not_configured', 'AI provider not configured');
    }

    const model = resolveModel(payload.model);
    const maxTokens = resolveMaxTokens(payload.maxTokens);

    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: payload.messages,
        max_tokens: maxTokens,
        temperature: 0.8,
      }),
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      console.error('[AI gateway] OpenAI error', openAiResponse.status, errorText.slice(0, 200));
      return jsonError(502, 'provider_error', 'AI provider error');
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

    return jsonSuccess({
      content,
      usage: { inputTokens, outputTokens, plan },
      limits: ABUSE_LIMITS,
    });
  } catch (err) {
    console.error('[AI gateway] billing tables unavailable', String(err).slice(0, 200));
    return jsonError(503, 'database_error', 'Usage tracking unavailable');
  }
}
