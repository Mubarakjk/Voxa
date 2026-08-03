/**
 * Realtime WebRTC voice call feature flag.
 * Requires a development / native build — not Expo Go.
 * Canonical gate: src/config/release-voice.ts
 */
export {
  isRealtimeVoiceEnabled,
  getReleaseVoiceGateSnapshot,
} from './release-voice';

export function getRealtimeSessionFunctionUrl(): string | undefined {
  const explicit = process.env.EXPO_PUBLIC_REALTIME_SESSION_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) return undefined;
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/create-realtime-session`;
}
