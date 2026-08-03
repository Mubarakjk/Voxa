# RevenueCat Identity Strategy

How Voxa links Supabase auth, local profile data, and RevenueCat `appUserID`.

Last updated: August 2026 (release sprint).

---

## Goals

1. One Apple/Google subscription maps to the correct Voxa account after sign-in.
2. Sign-out clears billing cache for the previous user — no Pro bleed-through.
3. Anonymous/local users can browse Free; purchases require stable `appUserID`.
4. Wrong RevenueCat ID is never permanently attached without `logIn`/`logOut`.

---

## Identifiers

| ID | Source | Purpose |
|----|--------|---------|
| Voxa `profile.id` | Local UUID / Supabase user id | App data scope, usage counters |
| RevenueCat `appUserID` | Same as `profile.id` after auth | Store entitlement |
| RC anonymous ID | RevenueCat before `logIn` | Discarded on link |

**Implementation:** `RevenueCatPurchaseManager.configure(appUserId)` → `Purchases.configure({ appUserID })` once; subsequent account changes call `Purchases.logIn(userId)`.

---

## Lifecycle flows

### App cold start (signed out / local only)

- Billing configures only if RevenueCat key present **and** native purchases supported.
- Missing config → app boots Free; log in dev only.
- No `Purchases.configure` crash path — errors caught, non-blocking.

### Anonymous → sign-up / sign-in

1. User authenticates with Supabase.
2. `RevenueCatSubscriptionSynchroniser.linkAuthenticatedUser(userId)` runs.
3. `Purchases.logIn(userId)` merges anonymous purchases if any.
4. Entitlement synced to `SubscriptionEntitlementService` + optional Supabase mirror.

### Sign-out

1. `clearForSignOut(userId)` clears in-memory entitlement for that user.
2. `Purchases.logOut()` resets RC to new anonymous customer.
3. Local profile data remains scoped by user id in storage keys — **different users must not read each other's AsyncStorage namespaces** (verify user id prefix on repositories).

### Switch Voxa account on same device

1. Sign out previous → RC logOut + entitlement clear.
2. Sign in new → RC logIn(newId) + refresh CustomerInfo.
3. Previous user's chats/memories not shown (profile swap in `VoxaProvider`).

### Restore purchase

- `Purchases.restorePurchases()` → map `voxa_pro` entitlement → immediate listener update.
- Does not require separate Voxa login beyond App Store Apple ID (StoreKit policy).
- After restore, `usePlanStatus` subscribers refresh UI.

### Reinstall

- New local profile until sign-in; restore links store receipt to RC Apple ID.
- User should sign into same Voxa account OR restore purchases to recover Pro on new local profile.

### Foreground / token refresh

- App foreground → subscription refresh (billing service) re-fetches CustomerInfo.
- Supabase token refresh does not change `profile.id`; no RC re-config needed.

### Expired session

- Auth session expiry → user prompted to re-auth; entitlement remains tied to RC until store revocation.
- Local data stays on device until explicit sign-out/delete.

---

## Expiry & revocation

`entitlementFromCustomerInfo` sets `isPro: false` when entitlement inactive.  
Listener + foreground refresh demote UI immediately.  
No grace fake-Pro in production.

---

## Dev-only override

`SubscriptionEntitlementService.setDevOverride` — **`__DEV__` only**. Never active in release builds.

---

## Supabase mirror (optional)

When Supabase configured, entitlement mirrored to `subscriptions` table for analytics/support — **not** source of truth for client gates.

---

## Manual QA matrix

| Flow | Expected |
|------|----------|
| Purchase on account A | Pro on A only |
| Sign out → sign in B | B is Free unless B subscribed |
| Restore on B with A's Apple ID | Pro on B (store account wins) |
| RC key missing | Free, no crash |
| Airplane mode + expired Pro cache | Honest Free/offline message |

---

## Code references

- `src/services/billing/revenuecat-purchase-manager.ts` — configure, logIn, logOut, listener
- `src/services/billing/revenuecat-subscription-synchroniser.ts` — link/clear/sync
- `src/hooks/use-plan-status.ts` — UI subscription to entitlement changes
