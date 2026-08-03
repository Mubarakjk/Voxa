import { getSupabaseClient } from '../supabase/client';
import { getRealtimeSessionFunctionUrl } from '../../config/realtime-voice';
import {
  mapConnectionError,
  validateRealtimeSessionResponse,
} from './realtime-call-state';

export type CreateRealtimeSessionInput = {
  voice?: string;
  instructions?: string;
  companionName?: string;
};

export type CreateRealtimeSessionResult =
  | {
      ok: true;
      clientSecret: string;
      callsUrl: string;
      model?: string;
      voice?: string;
      expiresAt?: number | null;
    }
  | { ok: false; code?: string; message: string };

function createIdempotencyKey(): string {
  return `rv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function requestRealtimeClientSession(
  input: CreateRealtimeSessionInput = {},
): Promise<CreateRealtimeSessionResult> {
  const url = getRealtimeSessionFunctionUrl();
  if (!url) {
    return {
      ok: false,
      code: 'not_configured',
      message: mapConnectionError('not_configured', 'Realtime session URL is not configured.'),
    };
  }

  const { data } = await getSupabaseClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    return { ok: false, code: 'unauthorized', message: mapConnectionError('unauthorized', '') };
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-idempotency-key': createIdempotencyKey(),
      },
      body: JSON.stringify({
        voice: input.voice,
        instructions: input.instructions,
        companionName: input.companionName,
      }),
    });
  } catch {
    return {
      ok: false,
      code: 'network',
      message: 'Network error while starting the voice session.',
    };
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const code = typeof payload?.code === 'string' ? payload.code : undefined;
    const message =
      typeof payload?.message === 'string'
        ? payload.message
        : mapConnectionError(code, `Session request failed (${response.status}).`);
    return { ok: false, code, message };
  }

  const validated = validateRealtimeSessionResponse(payload);
  if (!validated.ok) return validated;
  return validated;
}
