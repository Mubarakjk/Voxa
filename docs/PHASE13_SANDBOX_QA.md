# Phase 13 — Sandbox & Launch QA

Manual QA for RevenueCat Test Store, Apple sandbox, Google internal testing, webhooks, and account isolation.

## Prerequisites

- [ ] EAS development build installed (not Expo Go)
- [ ] RevenueCat public keys in `.env`
- [ ] Store products created and imported to RevenueCat
- [ ] Offering `default` with `voxa_pro_monthly` + `voxa_pro_annual`
- [ ] Supabase migration applied
- [ ] Webhook deployed with `REVENUECAT_WEBHOOK_AUTH`

## A. Environment validation

1. Launch app → check logs for `CONFIGURE SUCCESS` or validation failure list
2. Open **Billing QA**
3. Verify:
   - [ ] Runtime shows dev build (not Expo Go for purchases)
   - [ ] Platform key masked prefix shown
   - [ ] Entitlement ID = `voxa_pro`
   - [ ] Offering ID = `default`
   - [ ] iOS bundle / Android package = `app.voxa.companion`

**Expo Go expected:** purchases blocked, Pro never granted.

## B. Offerings & packages

1. Billing QA → **Reload offerings**
2. Verify:
   - [ ] Offering source = `store` (not fallback)
   - [ ] Monthly product = `voxa_pro_monthly`
   - [ ] Annual product = `voxa_pro_annual`
   - [ ] Prices from store metadata (not “fallback” suffix)
   - [ ] Trial eligible only if store intro offer exists

3. Paywall:
   - [ ] Purchase disabled if package missing
   - [ ] Setup message explains exact RevenueCat fix

## C. Purchase state machine

| Step | Expected |
|------|----------|
| Open paywall | `loading_offerings` → `ready` |
| Tap subscribe | Button disabled, `purchasing` |
| Cancel sheet | Returns to `ready`, **no error** |
| Success | Entitlement active before UI unlocks |
| Pending (Android) | Neutral pending message |
| Double tap | Second tap ignored |

Logs to watch: `PURCHASE START`, `PURCHASE CANCELLED`, `PURCHASE SUCCESS`, `ENTITLEMENT REFRESH SUCCESS`.

## D. Restore

1. Paywall → **Restore purchases**
2. No subscription → neutral “No subscription found”
3. After sandbox purchase → restore on reinstall restores Pro
4. Double restore tap → second ignored (`Restore already in progress`)

## E. Account switching

1. Sign in as **User A** with Pro → confirm Pro active
2. Sign out
3. Billing QA → **Run account isolation check** → pass
4. Sign in as **User B** without Pro → must **not** see Pro
5. Sign out, sign back in as **User A** → restore or refresh → Pro returns

**Stale cache test:** if local profile user ≠ auth user on startup, app clears billing cache before sync.

## F. Expiration / refund (webhook)

Use RevenueCat sandbox or curl replay:

| Event | Expected mirror status |
|-------|------------------------|
| `INITIAL_PURCHASE` | `active` or `trialing` |
| `RENEWAL` | `active` |
| `CANCELLATION` | `cancelled` |
| `EXPIRATION` | `expired` |
| `BILLING_ISSUE` | `billing_issue` |
| `REFUND` / `REVOKE` | `revoked` |

Billing QA → **Webhook mirror check** shows last event timestamp.

Replay same `event.id` → duplicate ignored (idempotent).

## G. Apple sandbox

1. Create Sandbox tester in App Store Connect
2. Dev build → purchase monthly
3. Confirm:
   - [ ] Store sheet shows correct price
   - [ ] Trial only if configured in ASC
   - [ ] Pro unlocks after entitlement refresh
   - [ ] Manage subscription opens App Store settings

## H. Google internal testing

1. Add license tester in Play Console
2. Install from internal track
3. Repeat purchase + restore + cancel tests

## I. RevenueCat Test Store

1. Configure Test Store in RevenueCat (early dev only)
2. Set `EXPO_PUBLIC_REVENUECAT_TEST_STORE=true` only when explicitly testing
3. Never use Test Store to grant Pro in production builds

## J. Server usage gateway

1. Deploy `ai-gateway` function
2. Set `EXPO_PUBLIC_AI_GATEWAY_URL`
3. Billing QA → **Usage gateway health** → reachable
4. Send chat over limit as free user → structured 429 from gateway (when wired)

## K. Regression

After billing tests, verify unchanged:

- [ ] Chat (free limits)
- [ ] Voice notes
- [ ] Home / Journey / Life OS navigation
- [ ] Sign out / sign in
- [ ] No paywall during crisis/safety flows

## Sign-off

Do **not** sign off on billing until all of:

- [ ] Dev build purchase succeeds in sandbox
- [ ] Restore works
- [ ] Account switch isolated
- [ ] Webhook auth + idempotency verified
- [ ] Expo Go cannot grant Pro
- [ ] `npx tsc --noEmit` passes
