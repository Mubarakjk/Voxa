# Realtime Voice — Physical Device QA

**Cannot be signed off in the simulator alone.**

## Pre-flight

- [ ] Development / EAS build installed (not Expo Go)
- [ ] `EXPO_PUBLIC_REALTIME_VOICE_ENABLED=true`
- [ ] Signed in (Supabase session)
- [ ] `create-realtime-session` deployed
- [ ] `OPENAI_API_KEY` + `OPENAI_REALTIME_MODEL` set as Supabase secrets
- [ ] Microphone permission prompt will appear on first call

## Checklist

1. Tap **Call Voxa**
2. Grant microphone permission
3. Speak normally
4. Confirm Voxa replies with streamed audio (no record/send wait screen)
5. Interrupt Voxa mid-sentence — audio should stop / truncate; call stays alive
6. Mute and unmute
7. End call
8. Start a second call
9. Deny microphone permission (Settings → Voxa → Mic off) — friendly failure
10. Lose network during call — one reconnect attempt or clean Retry
11. Background and reopen — mic released after End; no zombie session
12. Speaker / Bluetooth if available
13. Confirm normal Talk text + play aloud still works
14. Confirm microphone is released after ending (other apps can use mic)

## Metrics (record for 10 calls)

| Metric | Target | Observed |
|--------|--------|----------|
| Tap → connected | < 5s typical | |
| End of user speech → first Voxa audio | low latency (not multi-second TTS) | |
| Interruption response | prompt truncate | |
| Failure rate / 10 calls | ≤ 1 | |

## Pass criteria

- No record → Whisper → chat → TTS loop behaviour
- No overlapping Voxa audio
- Stable repeated calls
- Natural interruption
- Cleanup after End / leave screen

## Verdict options

- NOT WORKING
- CONNECTS BUT NOT REAL TIME
- READY FOR INTERNAL DEVICE TESTING
- REAL-TIME VOICE WORKING ON DEVICE *(only after physical iPhone pass)*
