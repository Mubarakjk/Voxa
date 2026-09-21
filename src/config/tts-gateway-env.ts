import { getSupabaseUrl, hasSupabaseConfig } from './env';

/** TTS Edge Function URL — same project as ai-gateway. */
export function getTtsGatewayUrlFromEnv(): string | undefined {
  const explicit = process.env.EXPO_PUBLIC_TTS_GATEWAY_URL?.trim();
  if (explicit) return explicit;
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) return undefined;
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/tts-gateway`;
}

export function isTtsGatewayConfiguredFromEnv(): boolean {
  return Boolean(getTtsGatewayUrlFromEnv() && hasSupabaseConfig());
}
