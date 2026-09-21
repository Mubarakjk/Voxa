// Supabase Edge Function: protected TTS gateway (OpenAI speech, server-side key)
// Deploy (when approved): supabase functions deploy tts-gateway
// Secrets: OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY (auto)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import {
  ALLOWED_OPENAI_TTS_VOICES,
  resolveAllowedTtsVoice,
  resolveTtsSpeed,
  TTS_ABUSE_LIMITS,
  TTS_OPENAI_MODEL,
  TTS_USAGE_METRIC,
  validateTtsText,
} from '../_shared/tts-guard.ts';
import { getDayKey } from '../_shared/usage-guard.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  if (req.method === 'GET' && url.pathname.endsWith('/health')) {
    return jsonSuccess({
      service: 'tts-gateway',
      voices: ALLOWED_OPENAI_TTS_VOICES,
      maxTextChars: TTS_ABUSE_LIMITS.maxTextChars,
    });
  }

  if (req.method !== 'POST') {
    return jsonError(405, 'method_not_allowed', 'Method not allowed');
  }

  const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
  if (!authHeader || !/^Bearer\s+\S+/i.test(authHeader)) {
    return jsonError(401, 'unauthorized', 'Unauthorized');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonError(500, 'gateway_error', 'TTS gateway error');
  }

  // Same hardened pattern as ai-gateway / delete-account:
  // anon client + Authorization header → getUser(); service role only after auth.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return jsonError(401, 'invalid_session', 'Invalid session');
  }

  const userId = authData.user.id;
  const supabase = createClient(supabaseUrl, serviceKey);

  let rawPayload: unknown;
  try {
    rawPayload = await req.json();
  } catch {
    return jsonError(400, 'invalid_json', 'Invalid JSON');
  }

  if (!rawPayload || typeof rawPayload !== 'object') {
    return jsonError(400, 'invalid_request', 'Invalid TTS request');
  }

  const payload = rawPayload as Record<string, unknown>;
  const textResult = validateTtsText(payload.text);
  if (!textResult.ok) {
    return jsonError(400, textResult.code, textResult.message);
  }

  const voice = resolveAllowedTtsVoice(payload.voice);
  if (!voice) {
    return jsonError(400, 'invalid_voice', 'Voice is not allowed');
  }

  const speed = resolveTtsSpeed(payload.speed);
  const idempotencyKey = (req.headers.get('x-idempotency-key') ?? '').trim();
  if (!idempotencyKey || idempotencyKey.length > TTS_ABUSE_LIMITS.maxIdempotencyKeyLength) {
    return jsonError(400, 'missing_idempotency_key', 'Missing or invalid x-idempotency-key');
  }

  try {
    const { data: existing, error: existingError } = await supabase
      .from('usage_events')
      .select('id')
      .eq('event_ref_id', idempotencyKey)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      return jsonError(409, 'duplicate', 'Duplicate request');
    }

    const dayKey = getDayKey();
    const dayStart = `${dayKey}T00:00:00.000Z`;
    const { count, error: countError } = await supabase
      .from('usage_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('metric', TTS_USAGE_METRIC)
      .gte('created_at', dayStart);
    if (countError) throw countError;

    const usedToday = count ?? 0;
    if (usedToday >= TTS_ABUSE_LIMITS.dailyRequestLimit) {
      return jsonError(429, 'daily_limit', 'Daily speech limit reached. Try again tomorrow.');
    }

    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) {
      return jsonError(503, 'provider_not_configured', 'Speech provider not configured');
    }

    const openAiResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: TTS_OPENAI_MODEL,
        voice,
        input: textResult.text,
        response_format: 'mp3',
        speed,
      }),
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      console.error('[TTS gateway] OpenAI error', openAiResponse.status, errorText.slice(0, 120));
      return jsonError(502, 'provider_error', 'Speech provider error');
    }

    const bytes = new Uint8Array(await openAiResponse.arrayBuffer());
    if (!bytes.byteLength) {
      return jsonError(502, 'provider_error', 'Speech provider returned empty audio');
    }

    // Do not log audio bytes or base64.
    await supabase.from('usage_events').insert({
      user_id: userId,
      event_ref_id: idempotencyKey,
      metric: TTS_USAGE_METRIC,
      amount: 1,
      model: TTS_OPENAI_MODEL,
      metadata: { voice, textChars: textResult.text.length },
    });

    // Binary audio — avoids embedding huge base64 in JSON logs/proxies.
    return new Response(bytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'X-Voxa-Voice': voice,
        'X-Voxa-Ok': 'true',
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[TTS gateway] unhandled error', detail.slice(0, 200));
    return jsonError(500, 'gateway_error', 'TTS gateway error');
  }
});
