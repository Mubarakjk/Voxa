# Voxa — Final Release Hardening Report

**Milestone:** Feature freeze before RevenueCat production config → physical iPhone QA → TestFlight → App Store.  
**Date:** 2026-07-29  
**Scope:** Hardening only. No new product features. No redesign. No Vision AI.

---

## 1. Temporary code removed

Removed:

- `src/services/dev/dev-companion-intelligence-force-clear.ts`
- Startup call in `voxa-context.tsx` that wiped `@voxa/companion_intelligence`
- Home EmptyState embedding raw error strings in UI

Kept permanently:

- Array normalisation (`as-array`, intelligence hydrate, delight shownIds)
- In-place companion intelligence / delight migrations
- Repository `readAll` array guards
- `__DEV__` stack logging for Home dashboard failures (console only)
- Non-blocking billing bootstrap
- SecureStore auth session chunking

**Confirmed:** startup no longer clears valid user data.

---

## 2. Core regression status

Navigation routes for Home, Talk, Voxa/RealtimeCall, Routine, Journey, You, Life OS, Memory, Notes, Scheduled Calls, Paywall, Settings, onboarding, and auth remain wired.  
Scheduled Calls date/time pickers polished (toggle-to-show). Home upcoming-call card has accessibility labels.

Automated static checks pass; full UI regression requires physical device (see `FINAL_DEVICE_QA.md`).

---

## 3. Realtime voice status

Audit (no rebuild):

- Feature flag: `EXPO_PUBLIC_REALTIME_VOICE_ENABLED`
- Session mint: Supabase Edge `create-realtime-session` (permanent OpenAI key server-side only)
- Auth: Bearer user JWT required
- Token validation: `ek_` client secret contract
- Lifecycle: mic → token → WebRTC; mute/barge-in via existing controller
- Idempotent cleanup: `RealtimeCallController.endCall` + `RealtimeWebRTCSession.cleanup` releases tracks, PC, data channel, listeners, audio session, temporary secret reference
- Scheduled Answer routes to Call screen; mic starts only after screen `begin()` / `startCall`
- Talk TTS path unchanged

Device QA still required for audio, Bluetooth, second call, mic indicator.

---

## 4. Scheduled calls status

Hardened:

- Deterministic notification identifiers (`voxa-scall-{id}-{timestamp}`)
- Edit / disable / cancel cancel pending notifications before rewrite
- Snooze schedules **exactly one** replacement alert
- Decline / answered / cancelled skip reschedule
- Rolling window capped at 7
- Idempotent reconcile mutex (no duplicate concurrent rewrites)
- Missed detection returns honest pre-advance snapshot for prompt
- Past-date rejection retained
- Privacy preview generic vs contextual retained
- Notifications-denied: schedule saved + Open Settings path

---

## 5. Billing status

- Init remains non-blocking when keys missing
- Entitlement id SSOT: **`voxa_pro`** (`src/constants/voxa-pricing.ts`)
- No fake Pro / hardcoded entitlement unlock found in client gates
- Restore / foreground refresh / friendly errors exist in billing services
- Paywall uses live offerings when RevenueCat configured

**Still required for production (configuration, not code):**

1. App Store Connect products matching RevenueCat packages  
2. RevenueCat app + entitlement `voxa_pro` + offering  
3. Public iOS/Android SDK keys in EAS secrets  
4. Sandbox purchase + restore QA on device  
5. Optional webhook auth secret for server entitlement sync  

---

## 6. Security findings

| Check | Result |
|-------|--------|
| `.env` gitignored | Yes |
| Tracked `.env` | No (only `.env.example`) |
| Service-role in app bundle | Not found; Edge Function uses Deno env |
| Permanent OpenAI in `EXPO_PUBLIC_` for production | Documented as **dev-only**; must be empty in release |
| Realtime permanent key | Server-side only (`OPENAI_API_KEY` secret) |
| RevenueCat keys | Public SDK keys — expected as `EXPO_PUBLIC_*` |
| Notification payload secrets/memories | Not included; safe routing metadata only |
| Accidental sk-/service_role in tracked source | No real secrets found (docs use placeholders) |

**Rotation:** Not required based on current tracked files. If a production `sk-` was ever shipped in a client binary historically, rotate that OpenAI key before release.

---

## 7. Storage / migration findings

- Auth sessions: chunked SecureStore adapter  
- Large companion intelligence: AsyncStorage + hydrate normalisation  
- Delight `shownIds`: coerce + migrate non-arrays  
- Scheduled calls: AsyncStorage user-scoped list + preferences  
- `clearAllLocalVoxaData` clears all `STORAGE_KEYS` (includes scheduled calls)  
- Logout with Supabase clears local cache (account isolation)  
- Delete account invokes Edge Function then sign-out cleanup  

---

## 8. Performance findings

High-impact only:

- Scheduled reconcile is mutexed (avoids duplicate notification churn on focus storms)
- Home secondary warm-up remains `Promise.allSettled` (non-blocking vs dashboard)

No risky architecture rewrites.

---

## 9. Accessibility findings

- Scheduled call Home card: labels for schedule/edit/call/cancel  
- Schedule date/time controls: accessibility labels  
- Call screen control buttons already labeled  
- Destructive cancel uses confirmation Alert  

Remaining device check: Dynamic Type / VoiceOver pass on physical iPhone.

---

## 10. Files changed (this milestone)

- Removed: `src/services/dev/dev-companion-intelligence-force-clear.ts`
- `src/context/voxa-context.tsx`
- `src/screens/home-screen.tsx`
- `src/services/scheduled-calls/scheduled-call-service.ts`
- `src/screens/scheduled-calls-screen.tsx`
- `src/screens/schedule-companion-call-screen.tsx`
- `src/components/home/upcoming-scheduled-call-card.tsx`
- `tests/scheduled-calls.test.ts`
- `.env.example`
- `docs/FINAL_DEVICE_QA.md`
- `docs/FINAL_RELEASE_HARDENING.md`

---

## Tests passed

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Pass |
| `npm test` | Pass (49/49) |
| `npx expo-doctor` | Pass (18/18) |
| `npm run lint --if-present` | No lint script |

---

## 12. P0 blockers

**None identified in code audit.**

Device-only P0 risks to watch: crash, mic left active, cross-account leak, payment entitlement wrong, secret exposure.

---

## 13. P1 blockers

**None confirmed in code.** Unresolved until device QA:

- Realtime connect on physical device  
- Scheduled Answer → Realtime with app killed  
- Billing sandbox purchase/restore  

---

## 14. P2 issues

- Custom ringtone asset not bundled (default system sound)
- Timezone math is device wall-clock + stored IANA (not a full tz database engine)
- Focus/DND suppression is OS-owned
- Home/You Visual Polish is intentionally frozen (no redesign)

---

## 15. Physical-device QA remaining

Complete `docs/FINAL_DEVICE_QA.md` on a real iPhone (locked phone + force-quit Answer is mandatory for scheduled calls).

---

## 16. Production configuration remaining

1. EAS secrets: Supabase, RevenueCat public keys, AI gateway URL  
2. Empty / omit `EXPO_PUBLIC_OPENAI_API_KEY` in release  
3. Supabase secrets: `OPENAI_API_KEY`, service role (functions only), optional RevenueCat webhook auth  
4. Deploy Edge Functions: `create-realtime-session`, `delete-account`, billing webhook if used  
5. App Store privacy nutrition labels + screenshots  
6. Feature flags for release: decide `EXPO_PUBLIC_SCHEDULED_CALLS_ENABLED` / `EXPO_PUBLIC_REALTIME_VOICE_ENABLED` for the ship build  

---

## 17. Honest verdict

**READY FOR PHYSICAL DEVICE QA**

Also ready to begin **billing sandbox QA** in parallel once RevenueCat products/keys exist.

**Not** ready for TestFlight until physical QA shows no P0/P1.  
**Not** ready for public release until TestFlight + billing sandbox pass.

---

## FEATURE FREEZE

No additional product features should be implemented before TestFlight unless a P0/P1 fix is required.
