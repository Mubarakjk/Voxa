# RevenueCat Implementation Audit

**Date:** 2026-07-24 (updated 2026-07-25 after P0/P1 fixes)  
**Scope:** Verify SDK init, `voxa_pro`, purchase/restore, offerings, status sync, expiry, fake unlocks, errors, sandbox, logging, product ID env config.  
**Method:** Code review + unit tests. Physical sandbox still required.

---

## Scorecard

| Check | Verdict |
|-------|---------|
| RevenueCat SDK correctly initialised | **PASS** |
| Entitlement name is `voxa_pro` | **PASS** |
| Purchases use RevenueCat APIs only | **PASS** |
| Restore Purchases works | **PASS** (You-screen copy soft) |
| Paywall uses live RevenueCat offerings | **PASS** |
| Subscription status updates immediately | **FAIL** |
| Free users lose Pro after expiry | **FAIL** (stale cache risk) |
| No fake unlocks remain | **PASS** |
| Purchase errors are user-friendly | **PARTIAL** |
| Sandbox purchases work correctly | **UNVERIFIED** (code ready; needs device) |
| DEBUG-only detailed logging | **PARTIAL** |
| ASC product IDs via environment variables | **FAIL** (hardcoded constants) |

---

## 1. SDK initialisation — PASS

**File:** `src/services/billing/revenuecat-purchase-manager.ts`

- Configures via `Purchases.configure({ apiKey, appUserID })` when:
  - `hasRevenueCatConfig()` is true
  - runtime supports native purchases (dev client / store build; not Expo Go unless Test Store)
- Platform keys from `src/config/revenuecat-env.ts`:
  - `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
  - `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
- Triggered on profile sync from `voxa-context` → `subscription.syncProfile()` → `configureForUser` / `logIn`
- Missing key: silent no-op + setup messaging on paywall (app still launches)
- `__DEV__`: `Purchases.setLogLevel(LOG_LEVEL.DEBUG)`
- Wired in `create-voxa-services.ts` as `RevenueCatPurchaseManager` (stub not used)

---

## 2. Entitlement `voxa_pro` — PASS

**Canonical:** `src/constants/voxa-pricing.ts` → `entitlementId: 'voxa_pro'`

- Lookups: `info.entitlements.active[getRevenueCatEntitlementId()]`
- Optional override: `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` (defaults to `voxa_pro`)
- Validation expects env id to match `VOXA_PRICING.entitlementId`
- Webhook / Supabase mirror also default to `voxa_pro`
- No live alternate entitlement names (`pro`, `premium`, etc.)

---

## 3. Purchases = RevenueCat only — PASS

Uses only:

- `Purchases.getOfferings()`
- `Purchases.purchasePackage(pkg)`
- `Purchases.getCustomerInfo()` (post-purchase retry)
- `Purchases.restorePurchases()`
- `Purchases.logIn` / `logOut`
- `Purchases.showManageSubscriptions()` (manage)

No StoreKit / IAP direct path.  
`activatePro()` on `RevenueCatBillingService` throws: use `purchase()` instead.  
Fallback offerings set packages **invalid** so purchase is disabled — cannot “buy” fake prices.

---

## 4. Restore Purchases — PASS (UX nuance)

**Implementation:** `Purchases.restorePurchases()` → map entitlement → refresh/sync.

| Surface | Behaviour |
|---------|-----------|
| Paywall | Correct: Pro active vs “No subscription found” |
| You → Restore | Always Alert “Restore complete” after refresh — **does not distinguish no-sub** |
| Billing QA (`__DEV__`) | Explicit restore + refresh tools |

---

## 5. Paywall live offerings — PASS

- `paywall-screen.tsx` loads `services.subscription.getOfferings()`
- Live: `source: 'store'` + store `priceString`
- Fallback: local £4.99 / £39.99 with invalid packages → **purchase disabled**
- Package match prefers `voxa_pro_monthly` / `voxa_pro_annual`, then RC package types
- Offering id: `EXPO_PUBLIC_REVENUECAT_OFFERING_ID` or `default`

---

## 6. Immediate subscription status updates — FAIL

**Works after:** cold start sync, successful purchase, restore, Billing QA refresh, `logIn`.

**Missing:**

- No `Purchases.addCustomerInfoUpdateListener` anywhere in `src/`
- No AppState foreground entitlement refresh for billing

Renewals, refunds, billing issues, and cross-device changes will **not** update client Pro mid-session until the next explicit refresh path.

---

## 7. Expiry removes Pro — FAIL (stale cache)

When RevenueCat returns inactive entitlement, mapping correctly sets `isPro: false`.

**Gap:** `planStatusFromEntitlement` trusts cached `isPro` and does **not** invalidate when `expiresAt < now`.  
Cache key: `@voxa/subscription_entitlement:{userId}` (AsyncStorage).

If the app stays open (or offline) past expiry, Pro features can remain until the next RC refresh.

Webhook `EXPIRATION` updates Supabase mirror used by **ai-gateway**; client FeatureGate / `EntitlementAccessService` read the **local RC cache**, not Supabase.

---

## 8. Fake unlocks — PASS

| Mechanism | Status |
|-----------|--------|
| Stub purchase manager | Not wired |
| `activatePro` | Throws |
| Legacy local Pro | Migrated away; does not grant Pro |
| Profile `subscription` alone | Cannot grant Pro |
| `setDevOverride` | `__DEV__` only; no production UI to enable |

No production fake unlock path found.

---

## 9. Purchase errors — PARTIAL

Paywall error card sanitizes common cases (network / cancel / generic retry).

Remaining:

- Some Alerts / pending paths can still show raw `Error.message`
- You restore always “success” copy

---

## 10. Sandbox — UNVERIFIED (code ready)

Docs + tooling exist:

- `docs/REVENUECAT_SETUP.md`
- `docs/PHASE13_SANDBOX_QA.md`
- Billing QA screen (`__DEV__`)
- `EXPO_PUBLIC_REVENUECAT_TEST_STORE` for Expo Go Test Store only

**This audit did not execute** a physical-device Apple sandbox purchase. Treat sandbox as a launch QA gate, not a code PASS.

---

## 11. DEBUG-only detailed logging — PARTIAL

| Layer | Gate |
|-------|------|
| RC SDK `LOG_LEVEL.DEBUG` | `__DEV__` only — **PASS** |
| App `BillingLog` / `billingLog` | Always `console.info` — **not** DEBUG-gated |

Production builds still emit `[Voxa Billing] …` (secrets filtered, but always-on).

---

## 12. Product IDs via environment variables — FAIL

**Configurable via env today:**

- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
- `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
- `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` (default `voxa_pro`)
- `EXPO_PUBLIC_REVENUECAT_OFFERING_ID` (default `default`)
- `EXPO_PUBLIC_REVENUECAT_TEST_STORE`

**Not env-configurable (hardcoded in `voxa-pricing.ts`):**

| ASC / RC product | Constant |
|------------------|----------|
| Monthly | `voxa_pro_monthly` |
| Annual | `voxa_pro_annual` |

To change Store product IDs you must change code (or add new env vars). Docs intentionally treat these as fixed SSOT.

---

## Remaining launch blockers (ranked)

### P0 — Must fix before trusting Pro gating in production

1. **Stale Pro after expiry** — enforce `expiresAt` on read and/or refresh from RC on foreground + CustomerInfo listener.
2. **Physical sandbox QA** — purchase, restore, expire, account switch, manage subscriptions on a real iPhone with ASC + RC configured.

### P1 — Should fix before TestFlight billing sign-off

3. **`CustomerInfoUpdateListener`** + foreground `refreshCustomerInfo`.
4. **Client vs webhook divergence** — server can revoke while client cache stays Pro for client-only gates.
5. **Product ID env config** — if ops need ASC ID flexibility without rebuild; otherwise document as intentional hardcoded SSOT and accept FAIL against “env-configurable” requirement.

### P2 — Polish

6. You-screen restore messaging (Pro found vs none).
7. Gate `BillingLog` to `__DEV__` or a debug flag.
8. Fully sanitize remaining purchase Alert strings.
9. Missing API key: clearer release-build paywall/setup surface (already partial).

### P3 — Hygiene

10. DEV override API with no enable UI (safe but incomplete vs QA docs).
11. Confirm webhook secret `REVENUECAT_WEBHOOK_AUTH` deployed for production AI limits.

---

## What is already solid

- Single RevenueCat purchase manager path
- Entitlement SSOT is not a lonely local `isPro` boolean
- Fallback pricing cannot complete a purchase
- Consistent IDs: `voxa_pro` / `voxa_pro_monthly` / `voxa_pro_annual`
- Paywall haptics + friendlier errors (partial)
- Billing QA + sandbox runbooks
- Legacy / stub unlock paths blocked

---

## Recommended fix order (if implementing next)

1. Add `Purchases.addCustomerInfoUpdateListener` → write entitlement cache → notify UI  
2. On AppState `active`, call `refreshCustomerInfo(userId)` (throttled)  
3. In `getCachedEntitlement` / `planStatusFromEntitlement`, if `expiresAt` is past → treat as free and refresh  
4. Optionally add `EXPO_PUBLIC_REVENUECAT_PRODUCT_MONTHLY` / `_ANNUAL`  
5. Gate `billingLog` behind `__DEV__`  
6. Fix You restore Alert copy  
7. Run `docs/PHASE13_SANDBOX_QA.md` on device  

---

## Final audit verdict

**Billing architecture is production-shaped, but not launch-safe for entitlement freshness.**

| Gate | Status |
|------|--------|
| Code wiring (init, buy, restore, offerings, no fake unlock) | Strong |
| Live entitlement freshness / expiry | **Blocked** |
| Env-configurable ASC product IDs | **Not met** |
| Sandbox proven on device | **Not proven by this audit** |

**Honest readiness:** **NOT READY** for App Store billing sign-off until P0 items are fixed and sandbox QA passes.  
Closest interim label after fixes + device QA: **READY FOR PHYSICAL DEVICE QA** → then TestFlight.
