# Voxa Free V1 — TestFlight Final Checklist

**Prepared:** 4 August 2026  
**Bundle ID:** `app.voxa.companion`  
**Version:** 1.0.0  
**EAS profiles:** `development` · `preview` · `production`

---

## Configuration audit summary

| Item | Status | Notes |
|------|--------|-------|
| App name `Voxa` | ✅ | `app.json` |
| iOS bundle ID `app.voxa.companion` | ✅ | `app.json` |
| Version `1.0.0` | ✅ | `app.json` + `package.json` |
| iOS build number | ✅ | Initial `"1"` in `app.json`; EAS `autoIncrement: true` + `appVersionSource: remote` on preview/production |
| App icon / splash | ✅ | `assets/icon.png`, `assets/splash-icon.png`, `assets/adaptive-icon.png` |
| `.env` gitignored | ✅ | Only `.env.example` and `.env.production.example` tracked |
| No `sk-` keys in repo | ✅ | Keys only via env at build time |
| `EXPO_PUBLIC_FREE_LAUNCH_MODE` | ✅ | In `.env.example`, `.env.production.example`, all EAS profiles |
| Voice/call/mic flags false | ✅ | All EAS profiles + `.env.example` |
| **EAS project ID** | ❌ **BLOCKER** | Still `replace-with-eas-project-id` in `app.json` — run `eas init` |
| **Apple Team ID** | ❌ **BLOCKER** | `REPLACE_WITH_APPLE_TEAM_ID` in `eas.json` submit section |
| **Privacy / Terms HTTPS** | ❌ **BLOCKER** | `https://voxa.app/privacy` and `/terms` return **404** (Aug 2026) |
| Account deletion UI | ✅ | Settings → Delete account (`you-screen.tsx`) |
| Cloud deletion function | ⚠️ | `supabase/functions/delete-account` exists — must be deployed to production Supabase |
| `app.config.js` | — | Not used; `app.json` only |

---

## Apple Developer requirements

Before your first build:

1. **Apple Developer Program** membership (paid, active)
2. **App ID** registered for `app.voxa.companion` with required capabilities:
   - Push Notifications (if using check-in notifications)
   - No CallKit / VoIP unless you re-enable calling later
3. **Certificates & profiles** — EAS can manage these when you run a cloud build
4. **App Store Connect** app record:
   - Name: Voxa
   - Bundle ID: `app.voxa.companion`
   - SKU: your choice (e.g. `voxa-companion-001`)
   - Primary category: Lifestyle or Health & Fitness
5. **Privacy Nutrition Labels** — prepare in App Store Connect after first upload
6. **Export compliance** — standard HTTPS encryption → typically “No” for custom encryption

---

## EAS secrets (set before preview build)

Do **not** commit these. Add via [Expo dashboard](https://expo.dev) → Project → Secrets, or `eas secret:create`:

| Secret | Required for TestFlight |
|--------|---------------------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes (if using cloud auth/sync) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes |
| `EXPO_PUBLIC_AI_GATEWAY_URL` | Recommended (avoid client OpenAI key) |
| `EXPO_PUBLIC_OPENAI_API_KEY` | **Leave empty** for TestFlight |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL` | Yes (live HTTPS) |
| `EXPO_PUBLIC_TERMS_OF_SERVICE_URL` | Yes (live HTTPS) |
| `EXPO_PUBLIC_SUPPORT_EMAIL` | Yes |

EAS profile `env` blocks already pin release gates; secrets override/supplement at build time.

---

## Exact terminal commands

Run from the project root (`/Users/mubarak/Voxa`):

```bash
# 1. Install EAS CLI (once)
npm install -g eas-cli

# 2. Log in to Expo
eas login

# 3. Link project & write real projectId into app.json (fixes placeholder)
eas init

# 4. Confirm / regenerate native config (optional if using EAS cloud builds only)
eas build:configure

# 5. Set iOS credentials interactively on first build (EAS will prompt)
#    Preview = App Store / TestFlight compatible (distribution: store)
eas build --platform ios --profile preview

# 6. After build succeeds — submit to App Store Connect / TestFlight
eas submit --platform ios --profile preview
```

**Before step 5:** Replace `REPLACE_WITH_APPLE_TEAM_ID` in `eas.json` with your 10-character Team ID, or pass `--apple-team-id` when prompted.

**Do not** embed a permanent `EXPO_PUBLIC_OPENAI_API_KEY` in EAS secrets for TestFlight.

---

## App Store Connect — after upload

1. Wait for build processing (5–30 minutes)
2. **TestFlight → Internal Testing** — add yourself as internal tester
3. Install on physical iPhone via TestFlight app
4. Complete **App Privacy** questionnaire
5. Add **Privacy Policy URL** (must be live HTTPS — fix 404 first)

---

## Fresh-install testing (physical iPhone)

Install from TestFlight (not Expo Go). Delete any prior dev builds first.

### Core Free V1

- [ ] **Onboarding** — complete flow; no paywall; no microphone permission prompt
- [ ] **Home** — hero, primary CTA, refresh, no duplicate Talk buttons
- [ ] **Talk** — send/receive; spoken reply play/stop; no mic button; no call UI
- [ ] **Companion** — voice, personality, My Companion, Saved Moments
- [ ] **Notes** — create, edit, autosave, restart app
- [ ] **Journey** — timeline, Life Book entry, Saved Moments
- [ ] **Faith & Values** — optional setup; private reflection; disable completely
- [ ] **Settings (You)** — every row works; Privacy/Terms open live pages
- [ ] **Logout / login** — session clears; no cross-account data
- [ ] **Account deletion** — Settings → Delete account (local or cloud path)
- [ ] **Offline / reopen** — background, force quit, reopen; drafts preserved
- [ ] **Confirm absent:** paywall, Upgrade, Pro badge, Call Voxa, Schedule Call, voice note, mic chat

### Regression flags

- [ ] No unexpected microphone permission dialog
- [ ] No red screen on tab navigation
- [ ] Dynamic Type / VoiceOver spot check on Home + Talk

---

## Automated checks (last run)

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Pass |
| `npm test` | 117/117 |
| `npx expo-doctor` | 18/18 |

Re-run before uploading:

```bash
npx tsc --noEmit && npm test && npx expo-doctor
```

---

## Remaining blockers (must fix before TestFlight upload)

### P0

1. **EAS project ID** — run `eas init` to replace placeholder in `app.json`
2. **Apple Team ID** — set in `eas.json` → `submit.preview.ios.appleTeamId`
3. **Legal pages** — publish HTTPS Privacy & Terms at configured URLs (currently 404)

### P1 (before external testers / App Review)

4. Deploy `delete-account` Supabase Edge Function to production
5. Configure EAS secrets (Supabase, gateway, legal URLs)
6. Complete full physical-device QA above on TestFlight build

### P2

7. App Store Connect metadata, screenshots, privacy labels
8. Review iOS permission strings (microphone plist present but features gated off)

---

## Files changed in this preparation pass

- `app.json` — added `ios.buildNumber: "1"`
- `eas.json` — added `EXPO_PUBLIC_FREE_LAUNCH_MODE=true` to all profiles
- `.env.production.example` — added `EXPO_PUBLIC_FREE_LAUNCH_MODE=true`
- `docs/TESTFLIGHT_FINAL_CHECKLIST.md` — this document

---

## Final verdict

### **NOT READY**

The app passes automated checks and EAS profile structure is correct, but **three manual blockers** remain before `eas build` / TestFlight upload:

1. Placeholder EAS project ID  
2. Placeholder Apple Team ID  
3. Legal URLs return 404  

After resolving these → **READY FOR EAS BUILD** → after a successful build and device QA → **READY FOR TESTFLIGHT UPLOAD**.

Do not claim full TestFlight QA until the uploaded build is installed and tested on a physical iPhone.
