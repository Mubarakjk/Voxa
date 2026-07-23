# Phase 13 — Voxa Pro, Monetisation & Launch-Quality Premium

## Summary

Phase 13 replaces stub billing with RevenueCat-backed subscriptions, centralises pricing and feature gates, and prepares Supabase webhook/usage architecture for launch.

**Pricing (fallback display):**
- Monthly: £4.99
- Annual: £39.99
- Trial display fallback: 7 days (actual trial eligibility comes from App Store / Google Play)

**Entitlement:** `voxa_pro`  
**Products:** `voxa_pro_monthly`, `voxa_pro_annual`  
**Offering:** `default`

---

## Stage A — Billing foundation

| File | Purpose |
|------|---------|
| `src/constants/voxa-pricing.ts` | Central `VOXA_PRICING` config |
| `src/constants/pricing.ts` | Plan limits, Free vs Pro copy |
| `src/config/revenuecat-env.ts` | Public SDK key helpers |
| `src/services/billing/runtime-environment.ts` | Expo Go vs dev build detection |
| `src/services/billing/revenuecat-purchase-manager.ts` | RevenueCat SDK wrapper |
| `src/services/billing/revenuecat-billing-service.ts` | Purchase/restore/sync orchestration |
| `src/services/billing/revenuecat-subscription-synchroniser.ts` | Entitlement → profile mirror |
| `src/services/billing/subscription-entitlement-service.ts` | Source of truth cache |
| `src/services/billing/legacy-subscription-migration.ts` | Stub → RevenueCat migration |
| `src/services/billing/subscription-service.ts` | Plan status from entitlement |
| `src/services/create-voxa-services.ts` | Wires RevenueCat (not stub) |
| `src/screens/billing-qa-screen.tsx` | Developer Billing QA |
| `eas.json`, `app.json` | Dev build identifiers |
| `.env.example` | RevenueCat env vars |

---

## Stage B — Store products & paywall

| File | Purpose |
|------|---------|
| `src/screens/paywall-screen.tsx` | Honest paywall with store metadata + fallbacks |
| `src/screens/you-screen.tsx` | Plan, renewal, manage, restore |
| `src/utils/settings.ts` | Subscription settings rows |

Paywall includes: hero, monthly/yearly selector, savings %, trial terms from store, top benefits, Free vs Pro table, restore, terms/privacy links, recurring billing disclosure, Expo Go blocker message.

---

## Stage C — Gating & usage

| File | Purpose |
|------|---------|
| `src/services/billing/feature-registry.ts` | Central gate definitions |
| `src/services/billing/feature-gate-service.ts` | `canAccessFeature()` + Pro gates |
| `src/services/billing/model-routing-service.ts` | Central model selection |
| `src/services/billing/paywall-impression-service.ts` | 6h paywall cooldown |
| `src/services/billing/subscription-analytics-service.ts` | Privacy-conscious events |
| `src/services/billing/usage-protection-service.ts` | Client usage queue + abuse limits |

---

## Stage D — Server & launch hardening

| File | Purpose |
|------|---------|
| `supabase/migrations/20260716_phase13_billing.sql` | `subscriptions`, usage tables, RLS |
| `supabase/functions/revenuecat-webhook/index.ts` | Secure webhook receiver |

---

## RevenueCat architecture

```
App startup
  └─ RevenueCatPurchaseManager.configure(userId)
       └─ Purchases.configure(public SDK key)

Purchase / restore
  └─ RevenueCatPurchaseManager
       └─ SubscriptionEntitlementService (source of truth)
            └─ RevenueCatSubscriptionSynchroniser
                 ├─ profiles.subscription (mirror only)
                 └─ public.subscriptions (Supabase mirror)

Plan checks
  └─ SubscriptionService.buildPlanStatus()
       └─ SubscriptionEntitlementService (NOT profiles.subscription alone)
```

Effective Pro = active RevenueCat entitlement OR valid platform trial OR `__DEV__` override (QA only).

---

## Development build setup

```bash
npx expo install expo-dev-client react-native-purchases
eas build --profile development --platform ios
eas build --profile development --platform android
```

**Expo Go behaviour:**
- Shows: “Purchases require the Voxa development build”
- Does **not** mark user Pro
- Does **not** return fake purchase success

**Bundle IDs:**
- iOS: `app.voxa.companion`
- Android: `app.voxa.companion`

---

## Environment variables

```env
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=voxa_pro
EXPO_PUBLIC_REVENUECAT_OFFERING_ID=default
EXPO_PUBLIC_REVENUECAT_TEST_STORE=false
```

Never put RevenueCat **secret** keys in the client.

---

## App Store Connect setup

1. Create subscription group **Voxa Pro**
2. Add auto-renewable subscriptions:
   - `voxa_pro_monthly` — £4.99/month, 7-day free trial (if desired)
   - `voxa_pro_annual` — £39.99/year
3. Add localisation, review screenshot, subscription description
4. Configure subscription privacy link and terms
5. Submit for review with app binary

---

## Google Play Console setup

1. Monetise → Subscriptions → Create subscription
2. Base plans:
   - `voxa_pro_monthly` — £4.99/month
   - `voxa_pro_annual` — £39.99/year
3. Optional: free trial offer on monthly plan
4. Activate products in internal testing track
5. Link Play Console to RevenueCat

---

## RevenueCat dashboard setup

1. Create project **Voxa**
2. Add iOS + Android apps with bundle/package IDs
3. Import products from App Store Connect and Google Play
4. Create entitlement **`voxa_pro`**
5. Attach both products to entitlement
6. Create offering **`default`** with packages:
   - `$rc_monthly` → `voxa_pro_monthly`
   - `$rc_annual` → `voxa_pro_annual`
7. Copy **public** SDK keys to `.env`
8. Configure webhook:
   - URL: `https://<project>.supabase.co/functions/v1/revenuecat-webhook`
   - Auth header: `x-revenuecat-auth: <REVENUECAT_WEBHOOK_AUTH>`

Deploy webhook:
```bash
supabase secrets set REVENUECAT_WEBHOOK_AUTH=your-shared-secret
supabase functions deploy revenuecat-webhook --no-verify-jwt
```

---

## Sandbox testing checklist

- [ ] Dev build installs on device
- [ ] RevenueCat offerings load (monthly + annual)
- [ ] Monthly purchase success
- [ ] Annual purchase success
- [ ] Cancel purchase sheet (not shown as error)
- [ ] Restore on same account
- [ ] Restore on different account (no Pro)
- [ ] Expired entitlement returns to Free
- [ ] Sign out → sign in (no bleed)
- [ ] Account switch clears entitlement
- [ ] Offline cached entitlement read
- [ ] Webhook idempotency (duplicate event ignored)
- [ ] Free limits still enforced when not Pro

---

## Billing QA screen

**You → Debug → Billing QA** (development only)

Shows: RevenueCat config, app user ID, entitlement, offerings, trial eligibility, last purchase/restore, Supabase mirror status.

Actions: refresh customer info, reload offerings, open paywall, restore, clear dev override.

No “make me Pro” in production builds.

---

## Remaining blockers

1. **Native dev build required** — purchases cannot be fully tested in Expo Go
2. **EAS project ID** — replace placeholder in `app.json`
3. **Store products** — must be created in App Store Connect / Play Console and imported to RevenueCat
4. **Webhook deployment** — run Supabase migration + deploy edge function
5. **Server-enforced usage** — tables prepared; edge enforcement functions not yet wired to chat pipeline
6. **Business dashboard** — internal metrics architecture documented only (not in consumer app)
7. **Remote config pricing tests** — architecture prepared via env vars; no remote config provider wired yet

---

## Verification

```bash
npx tsc --noEmit   # must pass with zero errors
```

Phases 1–12 preserved. No new bottom tabs. Unfinished features remain hidden via `feature-status` and `feature-registry.implemented`.
