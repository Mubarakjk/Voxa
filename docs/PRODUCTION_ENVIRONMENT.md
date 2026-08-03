# Production Environment

How development, preview/TestFlight, and production builds differ.

---

## Environment separation

| Aspect | Development | Preview / TestFlight | Production |
|--------|-------------|----------------------|------------|
| `EXPO_PUBLIC_APP_ENV` | `development` | `preview` | `production` |
| Voice / call flags | false (default) | **false** | **false** |
| Experimental features | false | false | false |
| RevenueCat | Sandbox or missing | **App Store sandbox/products** | App Store production |
| `EXPO_PUBLIC_REVENUECAT_TEST_STORE` | false | false | false |
| OpenAI client key | Dev `.env` optional | **Empty** — use AI gateway | **Empty** |
| Weather provider | mock allowed in dev | Open-Meteo / real | Open-Meteo / real |
| Supabase | Dev/staging project | Staging or prod (intentional) | Production project |
| Verbose billing logs | `__DEV__` only | Crash diagnostics via EAS | Minimal |
| Dev entitlement override | `__DEV__` only | Never | Never |
| Legal URLs | In-app placeholders OK | **Production URLs required** | Production URLs |

Template: [`.env.production.example`](../.env.production.example)

---

## EAS profiles

See [`eas.json`](../eas.json):

- **development** — dev client, simulator, release flags off
- **preview** — TestFlight-shaped, store distribution, `autoIncrement`, release flags off
- **production** — App Store release, same flag defaults

Set secrets in EAS (not committed):

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "..."
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_IOS_API_KEY --value "..."
# … remaining EXPO_PUBLIC_* from .env.production.example
```

---

## Production must NOT use

- Mock weather (`EXPO_PUBLIC_WEATHER_PROVIDER=mock`)
- Test RevenueCat store flag true
- `EXPO_PUBLIC_OPENAI_API_KEY` with permanent `sk-` secret
- `EXPO_PUBLIC_EXPERIMENTAL_FEATURES=true`
- Any voice release flag `true`
- Localhost URLs
- Placeholder EAS project id (`replace-with-eas-project-id` in `app.json`)
- Placeholder legal/support URLs in App Store Connect

---

## Build-time inlining

Expo embeds `EXPO_PUBLIC_*` at build time. Changing secrets requires a **new build**, not an OTA update alone.

---

## Runtime behaviour when config missing

| Missing | Behaviour |
|---------|-----------|
| RevenueCat iOS key | Free tier, calm message, no crash |
| Supabase | Local-only mode |
| AI gateway + OpenAI key | Chat degrades with user-visible error |

---

## Checklist before TestFlight

- [ ] EAS project id set in `app.json` `extra.eas.projectId`
- [ ] All production secrets in EAS
- [ ] `.env.production.example` reviewed — no real credentials committed
- [ ] `EXPO_PUBLIC_APP_ENV=preview` on preview profile
