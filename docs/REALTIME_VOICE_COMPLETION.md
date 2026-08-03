# Realtime Voice — Implementation Report

**Date:** 2026-07-27

## 1. Root cause of the old failed attempt

The previous “voice call” was never OpenAI Realtime/WebRTC. It used `FallbackVoicePipeline`: record ~4.5s → Whisper → chat → TTS. `realtime-voice-service.ts` was a stub (`isSupported() === false`). No ephemeral token backend, no `react-native-webrtc`.

See [REALTIME_VOICE_AUDIT.md](./REALTIME_VOICE_AUDIT.md).

## 2. Architecture implemented

```
Voxa iOS (dev build)
  → Supabase Edge Function create-realtime-session (auth + rate limit)
  → OpenAI client_secrets (ek_)
  → WebRTC peer connection to /v1/realtime/calls
  → live mic + remote audio + oai-events data channel
```

## 3. Backend endpoint status

Implemented: `supabase/functions/create-realtime-session/index.ts`  
Returns only ephemeral client secret + metadata. Never returns permanent API key.

**Deploy required** before device testing.

## 4. WebRTC status

`react-native-webrtc` + `@config-plugins/react-native-webrtc` added; `app.json` plugin registered.  
Requires `expo prebuild` / `expo run:ios` or EAS build.

## 5–8. Runtime status (code complete; device unproven)

| Area | Code | Device |
|------|------|--------|
| Live microphone | Wired via getUserMedia | Pending iPhone QA |
| Remote audio | ontrack + PlayAndRecord session | Pending iPhone QA |
| Interruption | server_vad + `response.cancel` on speech_started | Pending iPhone QA |
| Cleanup | Idempotent `endCall` / session cleanup | Pending iPhone QA |

## 9. Memory context status

Minimal non-blocking instructions: user name, companion name, tone, top goal, up to 4 high-importance/pinned memories. Failures do not block connect.

## 10. Files changed (primary)

- `docs/REALTIME_VOICE_AUDIT.md`
- `docs/REALTIME_VOICE_SETUP.md`
- `docs/REALTIME_VOICE_QA.md`
- `docs/REALTIME_VOICE_SECURITY.md`
- `docs/REALTIME_VOICE_COMPLETION.md`
- `supabase/functions/create-realtime-session/index.ts`
- `src/services/realtime-voice/*`
- `src/screens/realtime-call-screen.tsx`
- `src/hooks/use-realtime-call.ts`
- `src/config/realtime-voice.ts`
- `src/utils/voice-navigation.ts`
- `src/navigation/*` (RealtimeCall route)
- `app.json`, `.env.example`, `package.json`
- `tests/realtime-voice.test.ts`

## 11. Dependencies added

- `react-native-webrtc`
- `@config-plugins/react-native-webrtc` (dev)

## 12. Environment variables required

**Client:** `EXPO_PUBLIC_REALTIME_VOICE_ENABLED`, Supabase URL/anon key  
**Server:** `OPENAI_API_KEY`, `OPENAI_REALTIME_MODEL` (optional `OPENAI_REALTIME_VOICE`)

## 13. Tests

Unit tests cover state machine, error mapping, session validation, context fallback, reconnect limit, duplicate start. Run `npm test` / `tsc` / `expo-doctor`.

## 14. Device tests remaining

Full checklist in [REALTIME_VOICE_QA.md](./REALTIME_VOICE_QA.md).

## 15. Known errors / risks

- Expo Go will fail WebRTC (expected).
- Edge Function must be deployed or token fetch fails.
- Remote audio routing on some Bluetooth devices may need follow-up (InCallManager).
- OpenAI Realtime model/voice names may need env adjustment per account access.

## 16. Release blockers

- Physical iPhone QA not yet run
- Edge Function deploy + secrets
- Native rebuild with WebRTC plugin
- Billing/cost monitoring for Realtime minutes

## 17. Honest verdict

**READY FOR INTERNAL DEVICE TESTING**

Do not claim **REAL-TIME VOICE WORKING ON DEVICE** until the physical iPhone checklist passes.
