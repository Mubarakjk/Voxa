# Production environments

| Environment | `EXPO_PUBLIC_APP_ENV` | Notes |
|-------------|----------------------|-------|
| development | `development` | Dev client, optional direct OpenAI, experimental features optional |
| preview | `preview` | Internal TestFlight / preview profile — gateway preferred |
| production | `production` | App Store — gateway required, experimental features **false**, no mock weather |

## Mock / test guards

- Weather mock only when `EXPO_PUBLIC_WEATHER_PROVIDER=mock` — never set in production.
- RevenueCat Test Store only when `EXPO_PUBLIC_REVENUECAT_TEST_STORE=true` — Expo Go only.
- Experimental UI only when `EXPO_PUBLIC_EXPERIMENTAL_FEATURES=true`.
- Voice-note recording is `hidden` in `feature-status.ts` until device QA passes.
- Diagnostics on You screen are `__DEV__` only.

## Secrets

Do not embed production OpenAI secrets in the client. Use `EXPO_PUBLIC_AI_GATEWAY_URL` + server-held keys.
