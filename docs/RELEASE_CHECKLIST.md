# Voxa — App Store RELEASE CHECKLIST

Last updated: 23 July 2026

## Verdict gate

Do **not** mark READY FOR APP STORE REVIEW until every blocker below is checked on a physical iPhone with a production-like build and a clean install.

---

## Identity & binaries

- [ ] App name: **Voxa**
- [ ] Bundle ID: `app.voxa.companion`
- [ ] Version / build number set in App Store Connect + `app.json`
- [ ] Final app icon (not placeholder concentric grid if brand requires custom art)
- [ ] Splash screen matches brand
- [ ] EAS `extra.eas.projectId` is a real project ID (not `replace-with-eas-project-id`)

## Native modules

- [ ] Fresh install of development/production client (not stale binary)
- [ ] `ExpoLocation` loads — Weather location setup does not crash
- [ ] `expo-av` retained for SDK 54 session/TTS — documented in `docs/NATIVE_AUDIO_SDK54.md`
- [ ] Voice-note recording remains **hidden** unless device QA matrix passes

## Legal & trust

- [ ] Public **Privacy Policy URL** hosted (in-app screens exist; App Store needs a public URL — `voxa.app` currently for-sale / 404)
- [ ] Public **Terms of Service URL** hosted
- [ ] Support URL live
- [ ] Account deletion Edge Function `delete-account` deployed with service role
- [ ] Delete account flow tested end-to-end (cloud + local)
- [ ] Export data works
- [ ] No client-embedded OpenAI **secret** in production builds (prefer `EXPO_PUBLIC_AI_GATEWAY_URL`)
- [ ] AudD / ACRCloud secrets not in production client if music stays hidden

## Billing

- [ ] RevenueCat iOS public SDK key configured
- [ ] App Store products `voxa_pro_monthly` / `voxa_pro_annual`
- [ ] Entitlement `voxa_pro` + offering `default`
- [ ] Purchase, restore, expired, offline entitlement cache tested on device
- [ ] Paywall purchase disabled when store packages invalid
- [ ] If billing incomplete: remove paywall / do not submit paid release

## Voice / speaking

- [ ] Voice-note **recording** remains hidden unless device QA passes
- [ ] Voxa speaks replies (TTS) works: auto-speak on, mute toggle, stop, play on bubble
- [ ] Settings → “Voxa speaks replies” persists
- [ ] No microphone recording button in production chat
- [ ] Your Digest labeled as personal companion notes (not world news)
- [ ] External news hidden (no provider configured)
- [ ] Weather card only when real forecast available
- [ ] Calories opt-in only (Off by default)
- [ ] Games: Impostor, Night Circle (Mafia), party games playable locally
- [ ] No generic “Coming soon” alerts on Settings rows
- [ ] Diagnostics panel `__DEV__` only

## Permissions copy

- [ ] Microphone (if any recording re-enabled)
- [ ] Camera / Photos
- [ ] Location When In Use
- [ ] Notifications explanation in UI

## Accessibility

- [ ] VoiceOver on Home, Talk, Games role reveal (secrets hidden until hold)
- [ ] Dynamic Type / large text spot-check
- [ ] Reduced motion
- [ ] 44pt tap targets

## Builds

```bash
# Typecheck
npx tsc --noEmit

# Doctor
npx expo-doctor

# Local native rebuild (simulator)
npx expo run:ios

# Dev client Metro
npx expo start --dev-client

# Production-like (device)
eas build --profile preview --platform ios
eas build --profile production --platform ios

# TestFlight
eas submit --platform ios --latest
```

## App Store Connect still required

- [ ] Screenshots (6.7" / 6.1")
- [ ] Description, keywords, promotional text
- [ ] Age rating questionnaire
- [ ] Category
- [ ] Privacy nutrition labels (location, health/fitness if calories enabled by user, purchases)
- [ ] Encryption / export compliance answer
- [ ] Sign in with Apple if using other third-party social login (evaluate requirement)
- [ ] Subscription disclosure + restore purchases confirmed

## Device QA matrix

See phases in the production milestone prompt — CORE, WEATHER, CALORIES, GAMES, VOICE (hidden), SETTINGS, PAYMENTS, A11Y, RELIABILITY.

---

## Current engineering verdict (auto)

Fill after device testing:

**Verdict: NOT READY / READY FOR INTERNAL TESTING / READY FOR TESTFLIGHT / READY FOR APP STORE REVIEW**
