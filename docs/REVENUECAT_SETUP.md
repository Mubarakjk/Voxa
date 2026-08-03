# RevenueCat Setup — Voxa Pro

Production billing uses **Apple App Store subscriptions** via **RevenueCat**.  
The app bundles only the **public iOS SDK key** — never secret keys.

Last updated: August 2026.

---

## Architecture (app)

| Layer | Role |
|-------|------|
| **`BillingService`** | Single entry point — configure, purchase, restore, plan status |
| **`RevenueCatPurchaseManager`** | SDK: `Purchases.configure` once, packages, listener |
| **`SubscriptionEntitlementService`** | Cached `voxa_pro` entitlement — **not** a local boolean |
| **`EntitlementAccessService`** | Feature gates + contextual paywall cooldown |
| **`SubscriptionService`** | Usage counters + plan status assembly |

Screens call `services.billingService` or `services.entitlementAccess` — never RevenueCat directly.

---

## Products (two only)

| Plan | Env variable | Default ID |
|------|--------------|------------|
| Monthly | `EXPO_PUBLIC_REVENUECAT_PRODUCT_MONTHLY` | `voxa_pro_monthly` |
| Annual | `EXPO_PUBLIC_REVENUECAT_PRODUCT_ANNUAL` | `voxa_pro_annual` |

Target pricing (Apple localises): **~£4.99/month**, **~£39.99/year**.

The paywall displays **Apple's localised `priceString`** from RevenueCat offerings — never hardcoded purchasable prices.

---

## Entitlement

| Item | Value |
|------|-------|
| Entitlement ID | `voxa_pro` (`EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID`) |
| Offering ID | `default` (`EXPO_PUBLIC_REVENUECAT_OFFERING_ID`) |

Everything Pro-gated checks live `CustomerInfo` → normalised cache. Expired entitlements demote immediately.

---

## Environment variables

```bash
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=   # when Android ships
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=voxa_pro
EXPO_PUBLIC_REVENUECAT_OFFERING_ID=default
EXPO_PUBLIC_REVENUECAT_PRODUCT_MONTHLY=voxa_pro_monthly
EXPO_PUBLIC_REVENUECAT_PRODUCT_ANNUAL=voxa_pro_annual
EXPO_PUBLIC_REVENUECAT_TEST_STORE=false
```

Set via EAS secrets for preview/production builds (see `.env.production.example`).

---

## App Store Connect

1. Apple Developer Program + **Paid Applications Agreement**
2. Agreements, Tax, and Banking complete
3. App **Voxa** — bundle ID `app.voxa.companion`
4. Create **subscription group** (e.g. Voxa Pro)
5. **Monthly** auto-renewable → product ID matches env
6. **Annual** auto-renewable → product ID matches env
7. Pricing + localisations for target territories
8. Optional **introductory free trial** (App Store Connect only — app reads store eligibility)
9. Subscription review screenshot + notes (no live calling in this release)
10. Create **Sandbox Tester** account

---

## RevenueCat dashboard

1. Create project + iOS app (`app.voxa.companion`)
2. Connect App Store Connect API credentials
3. Import monthly + annual products
4. Create entitlement **`voxa_pro`**
5. Attach both products to entitlement
6. Create offering **`default`** with Monthly + Annual packages
7. Set offering as **Current**
8. Copy **public iOS SDK key** → `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
9. Verify sandbox purchase sets `entitlements.active.voxa_pro`

---

## Identity flows

| Event | App behaviour |
|-------|---------------|
| Sign-in | `BillingService.configureForUser` → `Purchases.logIn(userId)` |
| Sign-out | `BillingService.signOut` → cache clear + `Purchases.logOut` |
| Foreground | `BillingService.refreshOnForeground` (5s debounce) |
| CustomerInfo listener | Immediate entitlement sync |
| Missing RC key | App boots Free — no crash |

See also: [REVENUECAT_IDENTITY_STRATEGY.md](./REVENUECAT_IDENTITY_STRATEGY.md)

---

## Sandbox testing (physical iPhone)

Checklist: [FINAL_BILLING_DEVICE_QA.md](./FINAL_BILLING_DEVICE_QA.md)

1. Install preview/TestFlight build with real RC key
2. Sign in Sandbox Apple ID (Settings → Developer)
3. Open You → Subscription → Upgrade
4. Confirm **localised** monthly + annual prices (not fallback)
5. Purchase monthly → Pro unlocks without restart
6. Restore with/without entitlement — correct Apple ID messages
7. Sign out / sign in — no Pro bleed between accounts

**Do not claim billing works until store products load on device.**

---

## Security

| Rule | Status |
|------|--------|
| Public SDK key only in client | ✅ |
| No RevenueCat secret API key | ✅ |
| No OpenAI `sk-` in release builds | ✅ omit `EXPO_PUBLIC_OPENAI_API_KEY` |
| No Supabase service-role in client | ✅ |
| `.env` gitignored | ✅ |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Paywall shows "—" prices | Offering not current / products not imported / wrong product IDs |
| Purchase succeeds, no Pro | Check entitlement attach in RC; tap Restore |
| `Billing unavailable` in dev | Expected without RC key or in Expo Go |
| Fallback pricing shown | Purchase blocked by design — fix store connection |

---

## Related docs

- [FINAL_REVENUECAT_SETUP.md](./FINAL_REVENUECAT_SETUP.md) — step-by-step checklist
- [VOXA_FINAL_BILLING_REPORT.md](./VOXA_FINAL_BILLING_REPORT.md) — readiness report
- [FREE_PRO_ACCESS_MATRIX.md](./FREE_PRO_ACCESS_MATRIX.md) — Free vs Pro limits
