# Realtime Voice Call — Failure Audit

**Date:** 2026-07-27  
**Scope:** Why previous “live voice call” work was not genuine OpenAI Realtime / WebRTC  
**Verdict:** The prior attempt never shipped Realtime. Production path is a gated **record → Whisper → chat → TTS** loop with a Realtime stub that always reports unsupported.

---

## Executive summary

Voxa has voice-call UI shells (`VoiceConversation`, `VoiceCall`, `SafeCall`, Voxa Centre) and a global `VoiceCallController`, but the controller always boots `FallbackVoicePipeline`. That pipeline records ~4.5s chunks, uploads to Whisper, runs a chat completion, then plays TTS via `expo-av` / `expo-speech`.

There is:

- No `react-native-webrtc`
- No WebRTC / SDP / ICE flow
- No ephemeral Realtime client-session backend
- No WebSocket audio path
- No duplex barge-in over a live model session

Labeling this “realtime” was aspirational scaffolding. It cannot feel like a phone call.

---

## What exists today

| Layer | Status | Evidence |
|-------|--------|----------|
| Call UI | Present (gated) | `voice-conversation-screen.tsx`, `voice-call-screen.tsx`, `safe-call-screen.tsx` |
| Controller | Boots fallback only | `voice-call-controller.ts` → `FallbackVoicePipeline` |
| Realtime service | Stub `isSupported() === false` | `realtime-voice-service.ts` |
| STT | Whisper via client key | `speech-to-text-service.ts` / AI client |
| TTS | OpenAI `tts-1` + `expo-speech` | `text-to-speech-service.ts` |
| Audio session | `expo-av` mode flip record↔playback | `audio-session-manager.ts` |
| Feature gate | `voiceCall` / `safeCall` = `hidden` unless experimental | `feature-status.ts` |
| Edge Functions | Chat gateway only — no session mint | `supabase/functions/ai-gateway` |
| WebRTC | Not installed | `package.json` |

---

## Runtime architecture (actual)

```
User taps Start voice call
  → VoiceCallController.startCall
  → FallbackVoicePipeline.start
  → loop:
       record ~4500ms (expo-av)
       upload → Whisper STT
       chat completion reply
       TTS speak (mp3 / expo-speech)
       repeat
```

**Not used:** `StubRealtimeVoiceService.connect()` (throws / unused).

Latency floor is multi-second per turn by design. Interruption stops local TTS/recording and resumes listening — it is not OpenAI Realtime barge-in.

---

## Root-cause classification

| Cause | Classification | Notes |
|-------|----------------|-------|
| **record-and-upload architecture** | **PRIMARY** | `FallbackVoicePipeline` + `LISTEN_CHUNK_MS = 4500` |
| **missing WebRTC support** | **PRIMARY** | No `react-native-webrtc`; stub only |
| **invalid ephemeral token flow** | Not implemented | No `create-realtime-session` (or equivalent) |
| **WebSocket audio not connected to native playback** | Not implemented | No WS audio code |
| **API key exposed on client** | Confirmed risk | `EXPO_PUBLIC_OPENAI_API_KEY` used for Whisper/TTS |
| **duplicate speech pipelines** | Confirmed | Call TTS singleton vs chat `speech-playback-coordinator` |
| **audio session configuration** | Contributing | Aggressive record↔playback flips each turn |
| **stale event listeners** | Likely | Global controller + hook `bindEvents` remount |
| **microphone permission failure** | Possible runtime | Info.plist strings exist; denial handled |
| **incompatible Expo Go usage** | Partial | Dev client present; WebRTC still needs native rebuild; Expo Go cannot host RN WebRTC |
| **incorrect model/session configuration** | N/A for Realtime | Never configured a Realtime model/session |
| **native dependency not rebuilt** | Secondary | Would block WebRTC after install; not why stub failed |

---

## Key files

```
src/screens/voice-conversation-screen.tsx   # primary live UI today
src/screens/voice-call-screen.tsx           # older / largely orphaned
src/screens/safe-call-screen.tsx
src/hooks/use-voice-call-controller.ts
src/services/voice/voice-call-controller.ts
src/services/voice/fallback-voice-pipeline.ts   # actual call loop
src/services/voice/realtime-voice-service.ts    # stub
src/services/voice/voice-engine.ts
src/services/voice/text-to-speech-service.ts
src/services/audio/audio-session-manager.ts
src/utils/voice-navigation.ts
src/config/feature-status.ts
supabase/functions/ai-gateway/index.ts          # no realtime mint
docs/NATIVE_AUDIO_SDK54.md
```

---

## Security notes from audit

- Permanent OpenAI key is available to the client via `EXPO_PUBLIC_OPENAI_API_KEY` for STT/TTS.
- Chat can prefer `ai-gateway`, but the call pipeline does not mint short-lived Realtime credentials server-side.
- Any new Realtime path must issue **ephemeral client secrets** from a Supabase Edge Function and never ship the permanent key for WebRTC auth.

---

## Implications for the new minimal implementation

1. **Do not extend** `FallbackVoicePipeline` into “more realtime.” Replace the call path with WebRTC + OpenAI Realtime.
2. Keep Talk / chat spoken reply (`companion-speech-service`) intact and separate.
3. Add `react-native-webrtc` + **development build** (not Expo Go).
4. Add Edge Function `create-realtime-session` for ephemeral credentials + rate limiting.
5. Gate with `EXPO_PUBLIC_REALTIME_VOICE_ENABLED`.
6. Reuse orb/UI patterns if useful; do not reuse the record→transcribe→TTS loop for this feature.
7. Physical iPhone QA is mandatory before claiming “working.”

---

## Honest status before new work

| Claim | Truth |
|-------|-------|
| Real-time duplex voice | **No** |
| WebRTC to OpenAI | **No** |
| Ephemeral session backend | **No** |
| Usable call UX shell | **Yes** (experimental gate) |
| Record/upload voice loop | **Yes** (fallback) |

**Audit complete.** Implementation may proceed from this baseline.
