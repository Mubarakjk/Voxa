import { getSupabaseClient } from '../supabase/client';
import { shouldPreferAiGateway, isAiGatewayConfigured } from '../billing/billing-validation';

export type GatewayChatRequest = {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  model?: string;
  maxTokens?: number;
  metric?: string;
  amount?: number;
  idempotencyKey: string;
};

export type GatewayChatResponse =
  | { ok: true; content: string }
  | { ok: false; code?: string; message: string };

export async function invokeAiGatewayChat(request: GatewayChatRequest): Promise<GatewayChatResponse> {
  const baseUrl = process.env.EXPO_PUBLIC_AI_GATEWAY_URL?.trim();
  if (!baseUrl) {
    return { ok: false, message: 'AI gateway URL not configured' };
  }

  const { data } = await getSupabaseClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    return { ok: false, message: 'Not authenticated' };
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-idempotency-key': request.idempotencyKey,
    },
    body: JSON.stringify({
      messages: request.messages,
      model: request.model,
      maxTokens: request.maxTokens,
      metric: request.metric,
      amount: request.amount,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      code: payload.code,
      message: payload.message ?? `Gateway error (${response.status})`,
    };
  }

  return { ok: true, content: payload.content ?? '' };
}

export function isProductionGatewayPreferred(): boolean {
  return shouldPreferAiGateway();
}

export function isGatewayConfigured(): boolean {
  return isAiGatewayConfigured();
}
