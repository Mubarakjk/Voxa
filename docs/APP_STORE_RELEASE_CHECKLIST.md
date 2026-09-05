# App Store Release Checklist

Last audited: 27 August 2026.

This checklist is the V1 App Store submission gate. Do **not** mark App Store submission ready until every blocker is actually complete. A passing test suite is not enough.

---

## Identity

- [x] App name: **Voxa**
- [x] Bundle ID: `app.voxa.companion`
- [x] Version: `1.0.0` (`app.json`)
- [x] iOS build number source: `app.json` `ios.buildNumber` = `1`; EAS production/preview uses `autoIncrement`
- [ ] Apple Team ID in `eas.json` submit profiles — **OWNER ACTION** (`REPLACE_WITH_APPLE_TEAM_ID`)
- [ ] App Store Connect record created for `app.voxa.companion`
- [ ] Final screenshots, preview video (optional), and app preview assets captured on device

## Binary / EAS

- [x] Production feature flags in `eas.json` `production` and `preview`:
  - `EXPO_PUBLIC_FREE_LAUNCH_MODE=true`
  - `EXPO_PUBLIC_EXPERIMENTAL_FEATURES=false`
  - `EXPO_PUBLIC_REALTIME_VOICE_ENABLED=false`
  - `EXPO_PUBLIC_SCHEDULED_CALLS_ENABLED=false`
  - `EXPO_PUBLIC_VOICE_NOTES_ENABLED=false`
  - `EXPO_PUBLIC_MICROPHONE_CHAT_ENABLED=false`
  - `EXPO_PUBLIC_REVENUECAT_TEST_STORE=false`
- [x] WebRTC config plugin removed; `react-native-webrtc` excluded from Expo autolinking for V1
- [x] Microphone usage string removed (Play Aloud / TTS does not need the microphone)
- [ ] Confirm EAS production secrets do **not** include `EXPO_PUBLIC_OPENAI_API_KEY`
- [ ] Confirm EAS production secrets do **not** include AudD / ACRCloud tokens
- [ ] Preview build installed and smoke-tested
- [ ] TestFlight internal build installed on a physical iPhone

## Legal / App Store Connect URLs

- [ ] Privacy Policy public URL live — publish `site/` via GitHub Pages, then paste HTTPS URL in App Store Connect (**do not use voxa.app**)
- [ ] Support URL live — same Pages host `/support/` (**do not use voxa.app**)
- [ ] Terms: Apple standard EULA is acceptable for free V1 with no IAP; optional custom EULA / public Terms at `/terms/` for transparency
- [x] Support inbox monitored (`mujimoh2008@gmail.com`)

In-app Privacy Policy and Terms screens exist and are reachable from Settings.

Canonical static hosting source: `site/` (GitHub Pages). Legacy stubs in `docs/public/` point at `site/` and are not the publish root.

## Account deletion

- [x] In-app Delete account in Settings (discoverable, confirmation, not email-only)
- [x] Edge Function `delete-account` code deletes auth user, owned rows, and chat attachments
- [ ] Function deployed to **production** Supabase — **NOT VERIFIED in this audit**
- [ ] Production E2E (create account → attach photo → delete → cannot sign in → storage gone) — **NOT VERIFIED**

## App Review access

- [ ] Demo/reviewer account created
- [ ] Credentials placed in App Store Connect Review Information only — **never commit credentials**
- [ ] Confirm reviewer can complete onboarding and send a Talk message with the production AI gateway

## Privacy / permissions

- [x] App-level `ios.privacyManifests` copied from installed dependency PrivacyInfo files
- [x] `NSPrivacyTracking: false`
- [x] Remaining iOS purpose strings: Camera, Photo Library, Location When In Use
- [x] Notifications requested in context (daily check-ins)
- [ ] First TestFlight upload reviewed for Apple privacy-manifest email (ITMS-91053 / 91061)

## Do not enable for V1

- Subscriptions / IAP / paywall
- Realtime voice / WebRTC calling
- Scheduled companion calls
- Voice notes / microphone chat
- Music recognition
- Experimental screens, Health Check, Billing QA (production UI)

## Builds

```bash
npm test
npx tsc --noEmit
npx expo-doctor
```
