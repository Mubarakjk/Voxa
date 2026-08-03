# Voxa — Internal / Physical Device QA Checklist

Last updated: 2026-07-24  
Baseline checkpoint: `1535a2c`  
Target verdict for this pass: **READY FOR PHYSICAL DEVICE QA**

## Device prep commands

Inspected from this repo (`package.json` + Expo 54):

```bash
cd /Users/mubarak/Voxa
npm install
npm run typecheck
npx expo-doctor
npx expo run:ios --device
npx expo start --dev-client -c
```

Notes:
- There is **no** project `lint` script.
- `npm test` runs focused Node unit checks (Notes / Voice catalogue / tools).
- Microphone recording must remain hidden.

## Identity / data

- [ ] Guest notes never appear under a different authenticated account
- [ ] Account A notes never appear for account B
- [ ] **Guest → account note migration is NOT implemented** (notes stay on their `userId`)
- [ ] Logout / login restores the correct selected voice for that profile

## Clean install / onboarding

- [ ] Clean install reaches welcome
- [ ] Name, usefulness goals, personality, companion name
- [ ] Voice selection + preview play/stop
- [ ] Memory consent
- [ ] Personalised preview
- [ ] Optional Pro → real Paywall (dismissible)
- [ ] Continue Free reaches Home
- [ ] App killed mid-onboarding resumes draft
- [ ] Malformed draft does not crash
- [ ] Existing onboarded user bypasses onboarding

## Voice

- [ ] Four free voices preview
- [ ] Pro voices preview before paywall (select still gated)
- [ ] Only one preview plays at a time
- [ ] Stop works; leave screen stops; background stops
- [ ] No overlap with Talk reply speech
- [ ] Selected voice used for Talk auto-speak and bubble replay
- [ ] Selection persists after restart

## Notes

- [ ] Home / Journey / Settings entry
- [ ] Create / edit / autosave / reload after restart
- [ ] Background during typing flushes
- [ ] Pin / favourite / archive / unarchive / duplicate / delete
- [ ] Search, tags, checklist, templates
- [ ] Empty / loading / error states
- [ ] Quick tools: preview → replace / insert / new / share
- [ ] Discuss with Voxa attaches explicit note context
- [ ] Default private; remember creates memory; use-in-conversations reaches AI context; private does not
- [ ] Analytics never logs note body/title

## Subscriptions

- [ ] Paywall sources: onboarding, premium-voice, note-ai, Settings
- [ ] Real store prices when RevenueCat configured
- [ ] Missing offerings handled without fake unlock
- [ ] Cancel / fail / restore
- [ ] Privacy + Terms links
- [ ] Annual saving only when mathematically accurate
- [ ] Free Talk / Notes / 4 voices remain usable

## Legal / deletion

- [ ] Privacy Policy screen
- [ ] Terms of Service screen
- [ ] Account deletion path (Edge Function must be deployed for cloud wipe)

## Accessibility / polish

- [ ] Large text
- [ ] VoiceOver labels on preview play/stop
- [ ] Smaller iPhone layout
- [ ] No dead buttons on new routes

## Sign-off

Tester: _____________  
Device: _____________  
Build: _____________  
Date: _____________  
Result: PASS / FAIL
