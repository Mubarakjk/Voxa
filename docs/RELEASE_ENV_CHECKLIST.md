# Voxa V1 release environment checklist

Variable names only. Never paste secret values into this file, chat, screenshots, or App Store Connect notes.

Last audited: 27 August 2026.

---

## How to read this table

| Classification | Meaning |
|----------------|---------|
| **LOCAL ONLY** | Allowed on a developer machine. Must not be set in EAS preview/production. |
| **EAS PREVIEW** | Required or expected on the `preview` EAS profile. |
| **EAS PRODUCTION** | Required or expected on the `production` EAS profile. |
| **SERVER ONLY** | Supabase Edge Function / dashboard secrets. Never `EXPO_PUBLIC_*`. |
| **DISABLED V1** | Must stay off / empty for the free V1 binary. |

`EXPO_PUBLIC_*` values are inlined into the client at build time.

---

## Client (EAS / Expo)

| Variable | Classification | V1 requirement |
|----------|----------------|----------------|
| `EXPO_PUBLIC_APP_ENV` | EAS PREVIEW / EAS PRODUCTION | `preview` or `production`. Missing on a store binary now fails closed to **production** (not development). |
| `EXPO_PUBLIC_SUPABASE_URL` | EAS PREVIEW / EAS PRODUCTION | Production Supabase project URL. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | EAS PREVIEW / EAS PRODUCTION | Anon/public key only. Never the service role. |
| `EXPO_PUBLIC_AI_GATEWAY_URL` | EAS PREVIEW / EAS PRODUCTION | Optional override. If empty, client derives `{SUPABASE_URL}/functions/v1/ai-gateway`. Gateway must be deployed. |
| `EXPO_PUBLIC_FREE_LAUNCH_MODE` | EAS PREVIEW / EAS PRODUCTION | `true` for V1. |
| `EXPO_PUBLIC_EXPERIMENTAL_FEATURES` | DISABLED V1 | `false`. |
| `EXPO_PUBLIC_REALTIME_VOICE_ENABLED` | DISABLED V1 | `false`. |
| `EXPO_PUBLIC_SCHEDULED_CALLS_ENABLED` | DISABLED V1 | `false`. |
| `EXPO_PUBLIC_VOICE_NOTES_ENABLED` | DISABLED V1 | `false`. |
| `EXPO_PUBLIC_MICROPHONE_CHAT_ENABLED` | DISABLED V1 | `false`. |
| `EXPO_PUBLIC_REVENUECAT_TEST_STORE` | DISABLED V1 | `false`. |
| `EXPO_PUBLIC_OPENAI_API_KEY` | LOCAL ONLY | **Must be unset** in EAS preview/production. Direct client OpenAI is blocked in release. Also used by TTS if present — do not ship it. |
| `EXPO_PUBLIC_AUDD_API_TOKEN` | LOCAL ONLY / DISABLED V1 | Omit. Music recognition is hidden. |
| `EXPO_PUBLIC_ACRCLOUD_HOST` | LOCAL ONLY / DISABLED V1 | Omit. |
| `EXPO_PUBLIC_ACRCLOUD_ACCESS_KEY` | LOCAL ONLY / DISABLED V1 | Omit. |
| `EXPO_PUBLIC_ACRCLOUD_ACCESS_SECRET` | LOCAL ONLY / DISABLED V1 | Omit. |
| `EXPO_PUBLIC_WEATHER_PROVIDER` | DISABLED V1 | Must not be `mock`. Empty → Open-Meteo. |
| `EXPO_PUBLIC_WEATHER_API_URL` | EAS PREVIEW / EAS PRODUCTION | Optional weather proxy. Empty is valid (Open-Meteo). |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL` | EAS PREVIEW / EAS PRODUCTION | Live GitHub Pages HTTPS URL after publish (e.g. `https://mubarakjk.github.io/Voxa/privacy/`). **Do not use voxa.app.** |
| `EXPO_PUBLIC_TERMS_OF_SERVICE_URL` | EAS PREVIEW / EAS PRODUCTION | Live GitHub Pages HTTPS URL after publish (e.g. `https://mubarakjk.github.io/Voxa/terms/`). **Do not use voxa.app.** |
| `EXPO_PUBLIC_SUPPORT_EMAIL` | EAS PREVIEW / EAS PRODUCTION | `mujimoh2008@gmail.com` (confirmed V1 support/privacy inbox). |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | DISABLED V1 | Omit while billing is dormant. Public SDK key only if billing is later enabled. |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` | DISABLED V1 | Omit for iOS V1. |
| `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` | DISABLED V1 | Unused while free launch is on. |
| `EXPO_PUBLIC_REVENUECAT_OFFERING_ID` | DISABLED V1 | Unused while free launch is on. |
| `EXPO_PUBLIC_REVENUECAT_PRODUCT_MONTHLY` | DISABLED V1 | Unused while free launch is on. |
| `EXPO_PUBLIC_REVENUECAT_PRODUCT_ANNUAL` | DISABLED V1 | Unused while free launch is on. |
| `EXPO_PUBLIC_OPENAI_CHAT_MODEL` | LOCAL ONLY | Optional model override. Gateway/server preferred. |
| `EXPO_PUBLIC_FOUNDING_MEMBER_ENABLED` | DISABLED V1 | Leave unset/`false`. |
| `EXPO_PUBLIC_REALTIME_SESSION_URL` | DISABLED V1 | Omit. Realtime voice is off. |

---

## Server only (Supabase Edge Functions / dashboard)

| Variable | Classification | V1 requirement |
|----------|----------------|----------------|
| `OPENAI_API_KEY` | SERVER ONLY | AI gateway (and any server TTS later). Never `EXPO_PUBLIC_`. |
| `SUPABASE_SERVICE_ROLE_KEY` | SERVER ONLY | Auto-injected on hosted functions. Required for `delete-account` and `ai-gateway`. |
| `SUPABASE_URL` | SERVER ONLY | Auto-injected on hosted functions. |
| `SUPABASE_ANON_KEY` | SERVER ONLY | Auto-injected on hosted functions. |
| RevenueCat webhook secret (if named in function env) | SERVER ONLY | Unused while billing is dormant. |

---

## Owner checks before any store binary

1. EAS preview **and** production secrets do **not** include `EXPO_PUBLIC_OPENAI_API_KEY`.
2. EAS secrets do **not** include AudD / ACRCloud tokens.
3. Production `ai-gateway` and `delete-account` functions are deployed.
4. `EXPO_PUBLIC_APP_ENV` is set on the EAS profile (`preview` / `production`).
5. Apple Team ID is not a placeholder in `eas.json` submit profiles.

Local `.env` is gitignored. A developer machine may still contain LOCAL ONLY keys — that does not mean they are in the App Store binary.
