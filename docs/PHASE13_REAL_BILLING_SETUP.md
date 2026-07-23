# Phase 13 — Real Billing Setup

Exact setup steps for RevenueCat, stores, Supabase, and EAS.

## 1. Environment variables (client)

Copy `.env.example` → `.env`:

```env
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_xxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_xxxx
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=voxa_pro
EXPO_PUBLIC_REVENUECAT_OFFERING_ID=default
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_AI_GATEWAY_URL=https://xxxx.supabase.co/functions/v1/ai-gateway
```

Never put RevenueCat **secret** keys or OpenAI **secret** keys in the mobile client.

## 2. RevenueCat dashboard

1. Create project **Voxa**
2. Add iOS app — bundle ID `app.voxa.companion`
3. Add Android app — package `app.voxa.companion`
4. Import store products:
   - `voxa_pro_monthly`
   - `voxa_pro_annual`
5. Create entitlement **`voxa_pro`** and attach both products
6. Create offering **`default`** with packages:
   - Monthly → `voxa_pro_monthly`
   - Annual → `voxa_pro_annual`
7. Copy **public** SDK keys to `.env`
8. Webhook:
   - URL: `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`
   - Authorization header: same value as `REVENUECAT_WEBHOOK_AUTH` secret

## 3. App Store Connect

1. Subscriptions → create group **Voxa Pro**
2. Add `voxa_pro_monthly` — £4.99/month (optional 7-day trial)
3. Add `voxa_pro_annual` — £39.99/year
4. Submit subscription metadata for review

## 4. Google Play Console

1. Monetise → Subscriptions
2. Create `voxa_pro_monthly` and `voxa_pro_annual` base plans
3. Activate in **Internal testing** track
4. Link Play account in RevenueCat

## 5. Supabase

### Migration

```bash
supabase db push
# or run supabase/migrations/20260716_phase13_billing.sql in SQL editor
```

### Secrets

```bash
supabase secrets set REVENUECAT_WEBHOOK_AUTH=your-shared-secret
supabase secrets set OPENAI_API_KEY=sk-...
```

### Edge Functions

```bash
supabase functions deploy revenuecat-webhook --no-verify-jwt
supabase functions deploy ai-gateway
```

## 6. EAS development build

Update `app.json` → `extra.eas.projectId` with your EAS project ID.

```bash
npx expo install expo-dev-client react-native-purchases
eas init
eas build --profile development --platform ios
eas build --profile development --platform android
```

Install the dev build on device — **Expo Go cannot complete real purchases**.

## 7. Webhook curl tests (local/staging)

Replace `WEBHOOK_URL` and `SECRET`.

```bash
# Should 401 without auth
curl -X POST "$WEBHOOK_URL" -H 'Content-Type: application/json' -d '{}'

# Should 401 with wrong secret
curl -X POST "$WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -H 'x-revenuecat-auth: wrong' \
  -d '{"event":{"id":"evt_test_1","type":"INITIAL_PURCHASE","app_user_id":"USER_UUID","product_id":"voxa_pro_monthly","entitlement_ids":["voxa_pro"],"purchased_at_ms":1700000000000,"expiration_at_ms":1702592000000,"store":"APP_STORE","environment":"SANDBOX"}}'

# Should 200 + persist
curl -X POST "$WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -H "x-revenuecat-auth: $SECRET" \
  -d '{"event":{"id":"evt_test_1","type":"INITIAL_PURCHASE","app_user_id":"USER_UUID","product_id":"voxa_pro_monthly","entitlement_ids":["voxa_pro"],"purchased_at_ms":1700000000000,"expiration_at_ms":1702592000000,"store":"APP_STORE","environment":"SANDBOX"}}'

# Replay same event — should 200 duplicate:true
curl -X POST "$WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -H "x-revenuecat-auth: $SECRET" \
  -d '{"event":{"id":"evt_test_1","type":"INITIAL_PURCHASE","app_user_id":"USER_UUID","product_id":"voxa_pro_monthly","entitlement_ids":["voxa_pro"]}}'
```

## 8. AI gateway health

```bash
curl "$AI_GATEWAY_URL/health"
```

Authenticated chat requires Supabase user JWT — test from app Billing QA → **Usage gateway health**.

## 9. Verify in app

1. Open **You → Debug → Billing QA**
2. Confirm required checks pass
3. Confirm monthly/annual product IDs match store
4. Open paywall — purchase disabled until packages valid
5. Complete sandbox purchase on dev build
6. Confirm entitlement active + Supabase mirror updated
