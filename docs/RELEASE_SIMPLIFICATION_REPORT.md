# Voxa — Release Simplification Report

**Date:** 2026-08-03  
**Scope:** Final cleanup before RevenueCat production, physical-device QA, TestFlight.  
**Constraint:** No new product features. Voice/call code retained behind flags.

---

## 1. Voice / call UI hidden

Production UI no longer shows:

- Call Voxa / Realtime WebRTC call console
- Scheduled companion calls (Home card, You settings when flag off)
- Test microphone / Reset audio / call history / waveforms / Safe Call controls
- In-chat microphone / voice-note recorder (requires explicit env flags)
- Journey “Start a voice call” unless experimental **and** realtime flag on

**Kept visible:**

- Text Talk
- “Voxa speaks replies” (TTS playback)
- Companion voice picker & previews
- Camera/photo when `cameraPhoto` is stable
- Companion personality, memory, Notes, Journey, Life Book, My Companion

---

## 2. Code retained for future release

Not deleted (dormant when flags are false):

- `src/services/realtime-voice/*`
- `src/services/scheduled-calls/*`
- `src/screens/realtime-call-screen.tsx`, scheduled-call screens
- `src/services/voice-notes/*`, voice call controllers
- Stack routes remain registered; disabled entry redirects to Talk

---

## 3. Feature flags confirmed

Central gate: `src/config/release-voice.ts`

| Flag | Release value |
|---|---|
| `EXPO_PUBLIC_REALTIME_VOICE_ENABLED` | `false` |
| `EXPO_PUBLIC_SCHEDULED_CALLS_ENABLED` | `false` |
| `EXPO_PUBLIC_VOICE_NOTES_ENABLED` | `false` |
| `EXPO_PUBLIC_MICROPHONE_CHAT_ENABLED` | `false` |

Also document in `.env.example`. Local `.env` updated to match release defaults.

When disabled:

- No call UI on Voxa tab / Home / Talk mic
- Scheduled-call hook does not register listeners or reconcile
- One-time notification cleanup runs
- RealtimeCall deep entry → Talk
- No mic UI unless voice-notes **and** microphone-chat flags are true

---

## 4. Voxa tab redesign summary

`VoxaCentreScreen` is now a **Companion profile**, not an audio console:

- Header: Your companion · name · personality · voice · status line  
- Hero: idle breathing orb (no Listening / waveform / testing)  
- Primary: **Talk to Voxa** → Talk tab  
- Secondary: Change voice · Customise · My Companion · Memories  
- Optional: bond line, active goal, one evidence-based insight  

Tab bar always shows **Voxa** (sparkles). Routine moved to stack route `RoutineCoach`.

---

## 5. Talk composer cleanup

- Text input + send  
- Camera when feature-visible  
- Mic / voice-note button only if `VOICE_NOTES` **and** `MICROPHONE_CHAT`  
- AI bubble play/stop / save retained  
- Live-call side-effects only when `canStartLiveVoice` / `canStartSafeCall`

---

## 6. Navigation removed (from user paths)

- Center tab no longer switches between Call console and Routine via realtime flag  
- Home scheduled-call card gated (flag off → not rendered)  
- You → Scheduled calls only when flag on  
- Command bar routines → `RoutineCoach`  
- Disabled RealtimeCall → Talk  

Routes kept registered for future re-enable.

---

## 7. Notifications cancelled

`runScheduledCallNotificationCleanup` (one-time, AsyncStorage key `@voxa/mig_cancel_scheduled_call_notifs_v1`):

- Cancels presented + scheduled notifications with `SCHEDULED_CALL_NOTIFICATION_KIND` or `voxa-scall-*` ids  
- Does **not** clear ordinary reminders / check-ins  
- Runs from `App.tsx` when scheduled calls are disabled  

Scheduled-call Answer/Snooze/Decline category is not registered when the feature hook is off.

---

## 8. Permission behaviour

- Release paths (startup, Home, Talk, Voxa tab, TTS) do **not** request microphone  
- Mic permission only if a future-enabled recorder/call path runs  
- TTS / spoken replies never request microphone  

---

## 9. Startup services disabled

With flags false, startup does **not** initialise:

- WebRTC / Realtime controller (lazy, screen-gated)  
- Scheduled-call reconcile / notification listeners  
- Voice-note / mic recorder UI  
- Call timers / diagnostic polling  

TTS remains lazy via companion speech services.

---

## 10. Performance impact

- Voxa tab no longer mounts `useVoiceCallController` or call history  
- Scheduled-call hook short-circuits when disabled  
- Fewer listeners on AppState for calling  
- Expected: faster cold path vs call-enabled builds (no WebRTC until flag + screen)

---

## 11. Files changed

- `src/config/release-voice.ts` (new)
- `src/config/realtime-voice.ts`, `scheduled-calls.ts`
- `src/screens/voxa-centre-screen.tsx` (Companion profile)
- `src/navigation/main-tabs.tsx`, `premium-tab-bar.tsx`, `root-navigator.tsx`
- `src/utils/home-navigation.ts`, `command-bar-navigation.ts`, `voice-navigation.ts`
- `src/components/chat/chat-input-bar.tsx`
- `src/screens/chat-screen.tsx`, `journey-screen.tsx`
- `src/services/voice-notes/voice-note-access.ts`
- `src/services/scheduled-calls/scheduled-call-notification-cleanup.ts` (new)
- `App.tsx`
- `.env.example`, `.env` (flags only)
- `tests/release-voice-gates.test.ts`
- `package.json` (test script)

---

## 12. Tests passed

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Pass |
| `npm test` | **65/65** |
| `npx expo-doctor` | **18/18** |
| `npm run lint --if-present` | No lint script / skipped |

---

## 13. Remaining P0 issues

None identified in automated checks for this cleanup.

---

## 14. Remaining P1 issues

- Native `NSMicrophoneUsageDescription` / WebRTC plugins remain in `app.json` for dormant code (acceptable; no runtime prompt in release flows)
- Feature Discovery copy may still mention voice notes in marketing lists if that screen is opened under experimental
- Life Book image share still text-only (pre-existing)

---

## 15. Manual device QA remaining

On a physical iPhone:

- Cold start, auth, onboarding  
- Home / Talk / Voxa companion tab / Journey / You  
- Spoken replies play/stop/replay; mute setting  
- Confirm **no** mic permission prompt  
- Confirm **no** Call / Schedule Call UI  
- Notes, Memories, My Companion, Life Book, check-in, paywall restore  
- Background / force-quit / re-open  

---

## 16. Billing configuration remaining

- RevenueCat production API keys  
- App Store / Play product IDs wired in RC  
- Sandbox purchase + restore validation  
- Entitlement `voxa_pro` end-to-end  

---

## Verdict

**READY FOR PHYSICAL DEVICE QA**

FEATURE FREEZE CONFIRMED.
