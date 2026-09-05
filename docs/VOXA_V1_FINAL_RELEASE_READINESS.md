# VOXA V1 FINAL RELEASE READINESS

Overnight stability / crash-prevention / App Store hardening pass.  
Date: 27–28 August 2026.  
HEAD at start of pass: `7d521a76387188e3c6a6ca72a4462dc7f8a4c7cc`  
Branch: `main` (dirty tree already contained P0–P5 + prior App Store pass work). **This pass did not commit.**

## 1. Executive verdict

CODE READY: **YES for a local release candidate**, with owner/external work remaining  
CRASH-HARDENING: **CODE VERIFIED** (not physical-device proven)  
LOCAL RELEASE VALIDATION: **PASS** (271 tests, TypeScript, iOS export)  
IOS EXPORT: **PASS** (`npx expo export --platform ios` → `dist/`, exit 0)  
PREVIEW BUILD READY: **NO** — owner must confirm EAS secrets (especially no `EXPO_PUBLIC_OPENAI_API_KEY`)  
TESTFLIGHT READY: **NO**  
APP STORE READY: **NO**

Never treat this as App Store submission ready.

## 2. Baseline before this pass

Tests: **260 passing, 0 failed** (prior audit; this machine re-ran 260 before overnight fixes)  
TypeScript: **PASS**  
Expo Doctor: **17/18** — patch-version mismatch (`expo` 54.0.36 vs expected ~54.0.37, plus `expo-constants` / `expo-file-system` patch drift). Classified **SAFE V1 WARNING** (not upgraded).  
Git state: Dirty working tree vs `7d521a7`. Staged items were unrelated supabase migration renames. Overnight work did **not** overwrite unrelated owner diffs.

## 3. Changes made

This overnight pass only. Large pre-existing diffs (onboarding, auth screens, companion intelligence, etc.) were already dirty and were **not** rewritten.

| File | Reason |
|------|--------|
| `src/components/ui/app-error-boundary.tsx` | Add one top-level production-safe render error boundary (no stack/PII). |
| `App.tsx` | Wrap `AuthProvider` with the boundary. |
| `src/config/ai-routing.ts` | Missing `EXPO_PUBLIC_APP_ENV` on a store binary fails closed to **production**, not development. |
| `src/context/auth-context.tsx` | `getSession()` throw no longer infinite-spins; signup logs/dev warns gated; duplicate signup guard kept. |
| `src/context/voxa-context.tsx` | Startup/reset errors use friendly copy in production; sign-out log gated. |
| `src/utils/auth-error-copy.ts` | Auth UI never shows JWT/postgres/fetch internals. |
| `src/utils/friendly-error.ts` | Guard `typeof __DEV__` so Node/test and odd runtimes do not throw. |
| `src/screens/chat-screen.tsx` | Conversation load uses friendly errors (Talk send already used `formatTalkErrorForUser`). |
| `src/screens/onboarding-screen.tsx` | Save failure uses friendly errors (minimal). |
| `src/screens/create-goal-screen.tsx` | Save failure uses friendly errors. |
| `src/screens/memory-screen.tsx` | Load/update/delete failures use friendly errors. |
| `src/screens/auth/login-screen.tsx` | `formatAuthUserError`. |
| `src/screens/auth/signup-screen.tsx` | `formatAuthUserError`. |
| `src/screens/auth/forgot-password-screen.tsx` | `formatAuthUserError`. |
| `src/screens/party-game-screen.tsx` | Missing/invalid `gameId` empty state + Back; loading Back; PartyGameId guard. |
| `src/screens/arcade-game-session-screen.tsx` | Missing game no longer traps; Back header. |
| `src/config/feature-status.ts` | Roadmap no longer lists hidden V1 voice/music/gallery as “coming soon”. |
| `src/screens/features-screen.tsx` | Back control accessibility label. |
| `src/services/auth/auth-service.ts` | Duplicate-signup warn gated to `__DEV__`. |
| `src/services/audio/audio-session-manager.ts` | `audioLog` already `__DEV__`-only (verified). |
| `src/components/chat/chat-input-bar.tsx` | Camera `accessibilityLabel`. |
| `tests/stability-release.test.ts` | Fail-closed env, fail-safe Talk, auth/Talk sanitization, legal, EAS env, error boundary. |
| `tests/ai-gateway-routing.test.ts` | Store binary missing APP_ENV → production. |
| `tests/app-store-release-gate.test.ts` | Hidden features not advertised as coming soon. |
| `package.json` | Include `tests/stability-release.test.ts`. |
| `docs/public/privacy.html` `terms.html` `support.html` | Static legal/support pages from in-app copy. **Not live.** |
| `docs/RELEASE_ENV_CHECKLIST.md` | Variable names only. |
| `docs/APP_STORE_SCREENSHOT_PLAN.md` | Capture plan. |
| `docs/V1_RELEASE_RECOVERY_PLAN.md` | Incident/OTA guidance. |
| `docs/APP_STORE_RELEASE_CHECKLIST.md` | Point at static HTML drafts. |
| `docs/VOXA_V1_FINAL_RELEASE_READINESS.md` | This report. |

Not changed (frozen / working): companion intelligence, memory ranking, AI gateway architecture, chat persistence, auth architecture, DB schema, billing, Home/Notes visuals.

## 4. Crash-risk audit

Potential crash paths reviewed: throws, JSON.parse (AsyncStorage already try/catch), navigation params, auth restore, Talk send, TTS logs, listeners, feature-gated native screens, attachments, weather mock flag.  
Confirmed issues found: auth restore spinner if `getSession` throws; raw error strings on several screens; PartyGame/Arcade missing params; no error boundary; missing APP_ENV treated as development on store binaries; Features roadmap advertising disabled voice/music.  
Issues fixed: listed in §3.  
Remaining risks: native iOS modules on device; TTS/`expo-av` playback; image picker cancellation on device; long Talk lists under memory pressure; corrupted SecureStore sessions (AuthStorage already has `__DEV__` logs + chunking); `getSocialGameDefinition` still uses `!` after a valid id (party path now validates id first).

## 5. Startup reliability

Fresh install: **CODE VERIFIED** — auth off or on leads to Auth or app; fonts/providers; no network required to avoid crash (`hasSupabaseConfig` local path seeds profile).  
Returning user: **CODE VERIFIED** — session restore + `VoxaProvider`; `refreshAuth` always clears loading.  
Expired session: **CODE VERIFIED** — failed session → signed-out Auth navigator.  
Offline launch: **CODE VERIFIED** — init catch shows friendly error + Try again; hybrid repos warn and use cache. **MANUAL TEST REQUIRED** on device.  
Corrupt local state: **CODE VERIFIED** for AsyncStorage JSON (`getItem` returns null on parse failure). Profile cache mismatch clears local data then continues. **MANUAL TEST REQUIRED** for SecureStore chunk corruption.

## 6. Error boundary

Present: **YES** (`AppErrorBoundary` around `AuthProvider`).  
Behaviour: Calm “Something went wrong” + Try again remount (`retryKey`). No stack in UI. `componentDidCatch` empty.  
Changes: Added this pass.  
Remaining risk: Does not catch native crashes, unhandled promise rejections, or errors outside React render. Not a substitute for fixing bugs.

## 7. Async/race-condition audit

Duplicate actions: Signup in-flight reuse; Talk send blocked while `isTyping`; chat input `disabled={isTyping}`.  
Unmount handling: Chat stops voice-note player on unmount; auth subscription unsubscribed.  
Listeners: Auth `onAuthStateChange` cleaned up; AppState billing refresh cleaned up; scheduled-call notifications only when flag on.  
Timers: Talk thinking interval cleared when not typing.  
Network requests: Failures generally friendly; no new retry storms added.

## 8. Talk reliability

Send: Empty ignored; in-flight blocked by `isTyping`.  
Gateway failure / timeout / malformed: `formatTalkErrorForUser` — no JSON/stacks/function names.  
Long threads: Existing P5 FlatList path unchanged. **MANUAL TEST REQUIRED**.  
TTS: Play Aloud remains; logs `__DEV__`-gated. If `EXPO_PUBLIC_OPENAI_API_KEY` is in the binary, TTS may still call OpenAI from the client — **do not ship that variable**. Fallback expo-speech remains.  
Memory failure degradation: Existing companion path; Memory screen errors are friendly. Talk must not crash if memory load fails (architecture already degrades). **Do not invent memories.**

## 9. Data integrity

Local storage: JSON parse failures return null/empty rather than crash.  
SecureStore: Chunked auth storage; errors logged only in `__DEV__`.  
Supabase: Hybrid repos fall back to local on remote failure.  
Notes: Local; treat as user data — no wipe in this pass.  
Memory: Friendly errors; no schema change.  
Attachments: Upload failure keeps local URI (existing); status helper is diagnostics-oriented (Health Check `__DEV__` only).

## 10. Authentication

Signup: Duplicate guard; user-facing errors sanitized.  
Login: Sanitized errors.  
Restore: try/finally; failure → signed out, not spinner.  
Logout: Local session cleared; cache clear errors swallowed in production.  
Account deletion: See §11. Production logging of emails/JWTs is gated on signup success paths.

## 11. Account deletion

Code: Edge Function validates JWT, derives user UUID, purges `chat-attachments/{userId}/`, deletes DB rows, deletes auth user, returns generic failure on any step.  
Attachment purge: Pagination + batch + failure blocks success (unit tests).  
Database: Failures block success.  
Auth: Auth delete failure returns 500.  
Local cleanup: Client wipes only after server success (existing P0).  
Production deployment: **NOT VERIFIED**  
Production E2E: **NOT VERIFIED**  

**OWNER ACTION REQUIRED — PRODUCTION DEPLOY + E2E**

## 12. Navigation

Routes audited: Root stack + tabs vs flags (`__DEV__` Health Check / Billing QA / diagnostics; paywall only if `isPaywallEnabled()`; Music/SafeCall/VoiceCall only if experimental; RealtimeCall only if live calling; ScheduledCalls only if flag). No linking config found.  
Broken routes: Features → Routine Coach was previously a dead `Routine` tab (fixed in prior pass).  
Trapped screens: PartyGame / Arcade missing params — **fixed**.  
Fixes: Roadmap no longer teases disabled live voice/music.  
Remaining: Features still has a **Coming soon** list for document/calendar/email assistants (possible App Review question). No deep-link scheme to bypass flags found.

## 13. Permissions

| Permission | V1 | Justification |
|------------|----|----------------|
| Camera | Yes | Attach a photo in Talk. |
| Photo Library | Declared | Chat photo library attach; gallery picker UI is **hidden** in V1 — string still accurate if the picker can be reached later; plugin keeps photos permission. |
| Location When In Use | Optional | Weather / morning brief; city can be chosen instead. |
| Notifications | Optional | Daily check-ins (contextual). |
| Background audio | Yes | Play Aloud / TTS. |
| Microphone | **Absent** | No `NSMicrophoneUsageDescription`. Plugins set `microphonePermission: false`. |

Purpose strings do not mention video or future voice calls.

## 14. Privacy manifest

Status: Present in `app.json` (`NSPrivacyTracking: false`).  
Reason APIs: UserDefaults `CA92.1`; FileTimestamp `C617.1`, `0A2A.1`, `3B52.1`; DiskSpace `E174.1`, `85F4.1` (copied from installed dependency manifests, not invented).  
Tracking: **false**.  
Remaining Apple-upload verification: First upload may still email ITMS-91053/91061. **RevenueCat / Purchases native framework** is linked while dormant — Apple may ask. Do not activate ATT.

## 15. Security/secrets

Tracked secrets: **No live secret values found in tracked source.** Matches are variable names, docs, tests (`sk-test`), server `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`.  
Client OpenAI: Release Talk uses gateway or fail-safe. Direct client OpenAI is development-only. **LOCAL `.env` may still define `EXPO_PUBLIC_OPENAI_API_KEY` — must not be in EAS preview/production.** TTS can still use it if baked in.  
Service role: Server-only in Edge Functions.  
Logging: Auth/signup/audio/feature logs gated or sanitized; remaining `console.*` in unused/disabled paths (music, billing when dormant).  
Remaining owner env checks: See `docs/RELEASE_ENV_CHECKLIST.md`.

DO NOT print values.

## 16. Feature gates

**Realtime voice**  
FLAG: `EXPO_PUBLIC_REALTIME_VOICE_ENABLED` must be `true`  
UI: Hidden  
ROUTE: `RealtimeCall` not registered  
SERVICE: Not started from Home/Talk  
PRODUCTION RESULT: **DISABLED (fail closed)**

**Scheduled calls**  
FLAG: `EXPO_PUBLIC_SCHEDULED_CALLS_ENABLED`  
UI: Off  
ROUTE: Not registered when flag false  
SERVICE: Notification hook disabled  
PRODUCTION RESULT: **DISABLED**

**Voice notes**  
FLAG: `EXPO_PUBLIC_VOICE_NOTES_ENABLED`  
UI: Chat recorder hidden (`isFeatureVisible('voiceNote')` + flags)  
ROUTE: Diagnostic `__DEV__` only  
SERVICE: Not presented  
PRODUCTION RESULT: **DISABLED**

**Mic chat**  
FLAG: `EXPO_PUBLIC_MICROPHONE_CHAT_ENABLED`  
UI: Off  
ROUTE: N/A  
SERVICE: Off  
PRODUCTION RESULT: **DISABLED**

**Experimental**  
FLAG: `EXPO_PUBLIC_EXPERIMENTAL_FEATURES`  
UI: Music / legacy voice / Safe Call hidden  
ROUTE: Those screens not registered  
SERVICE: N/A  
PRODUCTION RESULT: **DISABLED**

**Music recognition**  
FLAG: experimental + feature status `hidden`  
UI: Hidden; not on roadmap anymore  
ROUTE: Not registered  
SERVICE: AudD not required  
PRODUCTION RESULT: **DISABLED**

**Safe Call / legacy voice**  
FLAG: experimental / realtime  
UI: Hidden  
ROUTE: Not registered  
SERVICE: Not launched  
PRODUCTION RESULT: **DISABLED**

**Health Check / Billing QA / Diagnostics**  
FLAG: `__DEV__`  
UI: You-screen diagnostics `__DEV__` only  
ROUTE: Not registered in production  
SERVICE: N/A  
PRODUCTION RESULT: **DISABLED**

**Paywall / subscriptions / RevenueCat test store**  
FLAG: `EXPO_PUBLIC_FREE_LAUNCH_MODE` not `false`; `EXPO_PUBLIC_REVENUECAT_TEST_STORE` false  
UI: Paywall not registered; upgrade cards return null  
ROUTE: No Paywall  
SERVICE: Billing dormant (`isBillingDormant`)  
PRODUCTION RESULT: **DISABLED** (native SDK still linked)

**Mock AI**  
FLAG: Only when not release **and** no gateway **and** no OpenAI key  
UI: Not labelled in production You screen  
SERVICE: `resolveTalkAIProvider` → `fail-safe` in release without gateway  
PRODUCTION RESULT: **NOT USED in preview/production**

**Mock weather**  
FLAG: `EXPO_PUBLIC_WEATHER_PROVIDER === 'mock'`  
UI: N/A  
SERVICE: Default Open-Meteo  
PRODUCTION RESULT: **DISABLED unless explicitly set (EAS profiles do not set it)**

## 17. Privacy/legal alignment

Privacy policy: In-app `legal-content.ts` + `docs/public/privacy.html` (unpublished).  
Terms: In-app + `docs/public/terms.html` (unpublished).  
Privacy Label: `docs/APP_STORE_PRIVACY_LABEL.md` — **do not select Data Not Collected**; tracking NO.  
Account deletion wording: Settings → Delete account; in-app + support HTML.  
Remaining: Host public URLs; counsel review; operator legal name/address still “published at voxa.app” (not invented here).

## 18. External URLs

Privacy: `https://voxa.app/privacy` — **BLOCKED** (HTTP 404 this pass)  
Terms: `https://voxa.app/terms` — **BLOCKED** (HTTP 404)  
Support: `https://voxa.app/support` — **BLOCKED** (HTTP 404)

**OWNER ACTION REQUIRED — LEGAL HOSTING**  
Drafts: `docs/public/*.html` (no cookies, no JS, no tracking, system fonts).

## 19. Accessibility

Audited: BackButton default “Go back”; Talk send; camera; Features back; error Try again; You settings rows.  
Fixed: Camera label; Features back; Party/Arcade exit.  
Remaining: Not every icon-only control in Journey drill-downs was labelled. Dynamic Type clipping **MANUAL TEST REQUIRED**.

## 20. Performance

Long Talk: Existing virtualization unchanged.  
Large local state: No new unbounded loads.  
Images: No new processing.  
Render loops: None introduced.  
Resource cleanup: Auth and AppState listeners cleaned up.  
Remaining: Device memory with huge threads / many attachments **MANUAL TEST REQUIRED**.

## 21. Dependencies

RELEASE BLOCKERS: **None identified** in the Expo 54 patch drift.  
SAFE V1 WARNINGS: Expo Doctor patch mismatch (`expo` 54.0.36 vs ~54.0.37). `react-native-webrtc` excluded from autolinking. `react-native-purchases` present but dormant. `expo-av` not migrated.  
POST-V1 DEBT: Drop unused WebRTC package; migrate expo-av when planned; RevenueCat unlink or activate with a real billing pass.

Did **not** run `npm audit fix --force`. Did **not** upgrade Expo major.

## 22. Automated validation

Tests BEFORE: 260 pass / 0 fail  
Tests AFTER: **271 pass / 0 fail**  
Failed: none (final run)

TypeScript: **PASS** (`npx tsc --noEmit`)

Expo Doctor: **17/18 WARN** (patch versions) — SAFE V1 WARNING

iOS export: **PASS** (`npx expo export --platform ios`, Hermes bundle written to `dist/`)

## 23. Apple reviewer simulation

LIKELY REJECTION: Public Privacy/Support URLs 404; account deletion not proven on production; possible “incomplete app” if reviewer finds Coming soon (documents/calendar/email) or dormant RevenueCat questions. Missing Team ID blocks **submit**, not review of a TestFlight binary.  
POSSIBLE QUESTIONS: RevenueCat linked while free; photo library string vs hidden gallery picker; Features “Coming soon”; AI accuracy claims; TTS vs microphone.  
LOW RISK: Dark premium UI; in-app Privacy/Terms; free V1 copy; microphone absent.  
PASS: Local automated gates (tests, tsc, export, fail-closed flags). **Not** a physical review pass.

## 24. App Store metadata

**OWNER ACTION REQUIRED**  
Drafts exist: `docs/APP_STORE_METADATA_DRAFT.md`, `docs/APP_REVIEW_NOTES.md`. Free V1. URLs blocked until hosted. Do not invent reviewer passwords.

## 25. Screenshots

Plan: `docs/APP_STORE_SCREENSHOT_PLAN.md`  
Still required: Owner capture on device. No fake screenshots generated.

## 26. CODE BLOCKERS

NONE FOUND that prevent a **local** release candidate.

Unresolved but not silent: production deletion unverified; EAS client OpenAI risk; legal URLs 404; Team ID placeholder; TTS client-key if baked into a binary.

## 27. MANUAL QA REQUIRED

- Real physical iPhone behaviour (cold start, background/resume, memory pressure)
- Permissions: camera, photos, location, notifications
- Camera attach + cancel + deny
- TTS / Play Aloud / silent switch / headphones
- Real network transitions (airplane mode mid-Talk)
- Production account deletion E2E
- EAS-signed preview/production binary
- Apple upload / privacy-manifest email
- App Review with a dedicated account
- Keyboard vs Talk composer / Notes / Auth on device
- Long conversation scroll

Simulator automation: **SKIPPED** (not straightforward in this environment; not worth fighting Xcode overnight).

## 28. OWNER / EXTERNAL BLOCKERS

- Apple Developer access
- Apple Team ID (`eas.json` still `REPLACE_WITH_APPLE_TEAM_ID`)
- Publish `docs/public/{privacy,terms,support}.html` (or equivalent) at `https://voxa.app/...`
- Legal operator details (name/address) on the live site — not invented here
- EAS env verification: **no** `EXPO_PUBLIC_OPENAI_API_KEY`, AudD, ACRCloud in preview/production
- Production `ai-gateway` + `delete-account` deploy
- Account deletion E2E on production
- Reviewer account in App Store Connect only
- App Store Connect record, privacy questionnaire, screenshots
- Physical-device QA
- Support inbox monitoring (`support@voxa.app`)

## 29. Tomorrow morning exact sequence

Shortest safe order:

1. Read this file and `docs/RELEASE_ENV_CHECKLIST.md`.
2. Confirm EAS secrets (dashboard), **do not print values**:
   - preview/production have `EXPO_PUBLIC_APP_ENV`
   - **no** `EXPO_PUBLIC_OPENAI_API_KEY`
   - flags match `eas.json` (free launch true, voice flags false)
3. Host legal pages from `docs/public/` then `curl -I https://voxa.app/privacy https://voxa.app/terms https://voxa.app/support`
4. Deploy production Edge Functions only when ready (`ai-gateway`, `delete-account`) — **destructive if misused; not run in this pass**.
5. Local confirm:

```bash
npm test
npx tsc --noEmit
npx expo-doctor
```

6. Preview binary (does **not** submit to App Store):

```bash
eas build --platform ios --profile preview
```

7. Install on a physical iPhone. Smoke: signup, onboarding, Home, Talk send, Memory, Notes, Privacy, Terms, **do not** run production account deletion until E2E plan is ready.
8. Fill Apple Team ID only with the real value. Do not guess.
9. Do **not** run `eas submit` until URLs are live, deletion E2E passed, and metadata is final.

## 30. Final release gate

**B — LOCAL RELEASE CANDIDATE READY; EXTERNAL/MANUAL WORK REMAINS**

Not C: EAS secrets and production deletion are unproven; Team ID and legal URLs are missing.  
Not D/E: No TestFlight or App Review has occurred.
