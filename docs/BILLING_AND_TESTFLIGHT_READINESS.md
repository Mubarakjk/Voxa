# Billing & TestFlight Readiness Report

**Sprint:** Billing, Device QA & TestFlight Release  
**Date:** 3 August 2026  
**Product feature freeze:** CONFIRMED — no product features added in this sprint.

---

## Verdict

### **READY FOR PHYSICAL DEVICE QA**

Not yet ready for billing sandbox sign-off, TestFlight build, or App Store submission until manual steps below are completed.

| Stage | Status |
|-------|--------|
| Physical device QA | **Ready to start** (checklist updated) |
| Billing sandbox QA | **Blocked** — App Store products + RC offering not verified on device |
| TestFlight build | **Blocked** — EAS project id placeholder, legal URLs, RC/ASC setup |
| TestFlight submission | **Blocked** — P0 items below |

---

## 1. Release feature flags

| Flag | Release default | Enforced |
|------|-----------------|----------|
| `EXPO_PUBLIC_REALTIME_VOICE_ENABLED` | `false` | ✅ `src/config/release-voice.ts` |
| `EXPO_PUBLIC_SCHEDULED_CALLS_ENABLED` | `false` | ✅ |
| `EXPO_PUBLIC_VOICE_NOTES_ENABLED` | `false` | ✅ chat input bar |
| `EXPO_PUBLIC_MICROPHONE_CHAT_ENABLED` | `false` | ✅ chat input bar |

**Sprint fixes:**

- Navigation registers `RealtimeCall`, `VoiceConversation`, `ScheduledCalls`, `ScheduleCompanionCall` **only when flags allow** (`root-navigator.tsx`).
- Scheduled notification hook disabled when flag false; stale notifications cleaned on startup (`App.tsx`).
- Home scheduled-call card already flag-gated.
- Notification deep link falls back to Talk when realtime disabled.

**Tests:** `tests/release-voice-gates.test.ts` (passing).

---

## 2. RevenueCat architecture

| Requirement | Status |
|-------------|--------|
| `Purchases.configure` once | ✅ `globalConfigured` guard |
| iOS/Android keys from env | ✅ `revenuecat-env.ts` |
| Entitlement `voxa_pro` | ✅ configurable, default `voxa_pro` |
| Offering + product IDs configurable | ✅ env + `revenuecat-product-ids.ts` |
| No StoreKit bypass | ✅ native RC only |
| No fake purchase path | ✅ stub manager dev-only |
| No local boolean Pro source | ✅ RC CustomerInfo + `__DEV__` override only |
| CustomerInfo listener | ✅ immediate entitlement update |
| Foreground refresh | ✅ billing service refresh |
| Expiry/revocation demotes | ✅ `entitlementFromCustomerInfo` |
| Account logIn/logOut | ✅ synchroniser |
| Missing config non-crashing | ✅ configure catches errors |

---

## 3. Product / entitlement configuration

**Codebase:** Ready for configuration.  
**App Store Connect / RevenueCat dashboard:** **Not verified** — manual setup required ([APP_STORE_SUBSCRIPTION_SETUP.md](./APP_STORE_SUBSCRIPTION_SETUP.md)).

---

## 4. Free / Pro access matrix

Documented: [FREE_PRO_ACCESS_MATRIX.md](./FREE_PRO_ACCESS_MATRIX.md).

Central enforcement: `EntitlementAccessService` → `FeatureGateService` → live `PlanStatus`.

---

## 5. Paywall status

| Item | Status |
|------|--------|
| Value proposition | ✅ |
| Monthly + annual | ✅ |
| Store-localised pricing | ✅ when offerings load |
| Savings badge | ✅ math from store/fallback prices |
| Package selection | ✅ |
| Purchase / restore / close | ✅ |
| Terms + Privacy links | ✅ in-app screens |
| Renewal copy | ✅ |
| Fallback purchase blocked | ✅ **fixed** — `source === 'fallback'` disables purchase |
| Calm retry when offerings unavailable | ✅ **fixed** — user-facing copy updated |
| Friendly errors | ✅ `friendly-billing-errors.ts` |

---

## 6. Purchase completion

| Item | Status |
|------|--------|
| Refresh CustomerInfo after purchase | ✅ |
| `usePlanStatus` updates | ✅ entitlement subscribe |
| Pro gates update without restart | ✅ |
| Paywall closes on success | ✅ |
| Analytics without PII content | ✅ event names only |
| Double-tap protection | ✅ `purchaseInFlight` + billing state machine + disabled button |

---

## 7. Restore status

| Item | Status |
|------|--------|
| Paywall restore copy | ✅ **fixed** — Apple ID wording |
| You screen restore copy | ✅ **fixed** |
| Central messages | ✅ `restore-messages.ts` |
| No fake access on empty restore | ✅ |
| Failure message | ✅ |

---

## 8. Identity handling

Documented: [REVENUECAT_IDENTITY_STRATEGY.md](./REVENUECAT_IDENTITY_STRATEGY.md).

Supabase sign-in → `logIn(userId)`; sign-out → `logOut` + cache clear.

---

## 9. Legal status

See [LEGAL_RELEASE_CHECKLIST.md](./LEGAL_RELEASE_CHECKLIST.md).

**P0:** Production Privacy Policy URL and verified support contact not confirmed live.

---

## 10. Security findings

| Finding | Severity | Action |
|---------|----------|--------|
| Local `.env` contains OpenAI key pattern (`sk-…`) | **P0 if ever committed** | `.env` is gitignored ✅ — rotate key if exposed; **never** set `EXPO_PUBLIC_OPENAI_API_KEY` in TestFlight/production |
| No `sk-` / `service_role` in tracked source | ✅ | Docs use placeholders only |
| Supabase service role | Server functions only | ✅ not in client |
| RevenueCat public keys | Client-appropriate | ✅ |
| Supabase anon key | Client-appropriate with RLS | ✅ assume RLS configured |
| Auth session storage | Secure store path | ✅ `supabase-auth-storage.ts` |

**No secret values printed in this report.**

---

## 11. Production environment

- Template: [`.env.production.example`](../.env.production.example)
- Guide: [PRODUCTION_ENVIRONMENT.md](./PRODUCTION_ENVIRONMENT.md)
- EAS profiles updated: [`eas.json`](../eas.json)

**P1:** `app.json` EAS `projectId` still `replace-with-eas-project-id`.

---

## 12. Physical device QA

Checklist: [FINAL_DEVICE_QA.md](./FINAL_DEVICE_QA.md) — updated for release scope.

**Status:** Not executed in this sprint (requires human + device).

---

## 13. Sandbox billing QA

Checklist: [BILLING_SANDBOX_QA.md](./BILLING_SANDBOX_QA.md).

**Status:** Not executed — **blocked** until real store products load on device.

---

## 14. TestFlight configuration

Runbook: [TESTFLIGHT_RELEASE_RUNBOOK.md](./TESTFLIGHT_RELEASE_RUNBOOK.md).

Preview profile: store distribution, release flags off, autoIncrement.

---

## 15. Files changed (this sprint)

| File | Change |
|------|--------|
| `src/navigation/root-navigator.tsx` | Gate call/scheduled routes behind release flags |
| `src/utils/voice-navigation.ts` | Use `release-voice` gate |
| `src/services/billing/restore-messages.ts` | **New** — canonical restore copy |
| `src/screens/paywall-screen.tsx` | Fallback block, restore copy, retry UI |
| `src/screens/you-screen.tsx` | Restore copy |
| `eas.json` | Preview/production profiles + env |
| `.env.production.example` | **New** |
| `tests/restore-messages.test.ts` | **New** |
| `package.json` | Include restore test |
| `docs/*` | Matrix, identity, legal, sandbox QA, metadata, runbook, readiness |

---

## 16. Tests passed

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ Pass |
| `npm test` | ✅ 65 tests pass (incl. restore-messages) |
| `npx expo-doctor` | ✅ 18/18 |
| `npm run lint` | Not configured / skipped |

---

## 17. P0 blockers

1. **Legal URLs** — Privacy Policy + Terms production URLs not verified for App Store Connect.
2. **OpenAI client key** — Local dev `.env` has secret-class key; must not ship in release builds; rotate if ever committed.
3. **Unverified billing** — Sandbox purchase/restore not tested on physical device with live ASC products.

---

## 18. P1 blockers

1. **EAS project ID** placeholder in `app.json`.
2. **RevenueCat + App Store Connect** product/offering setup not verified outside codebase.
3. **Physical device QA** not yet executed.
4. **Support email** placeholder copy in privacy screen.

---

## 19. P2 issues

1. Paywall fallback prices still visible (read-only) when store unavailable — purchase blocked.
2. `UIBackgroundModes: audio` retained for TTS/playback — acceptable.
3. Microphone usage strings in Info.plist for dormant native modules — acceptable if mic never requested in release flows.
4. App Store metadata draft URLs need publishing.

---

## 20. Manual actions required

1. Complete [APP_STORE_SUBSCRIPTION_SETUP.md](./APP_STORE_SUBSCRIPTION_SETUP.md).
2. Publish privacy + terms at production URLs; update App Store Connect + in-app copy.
3. Set real EAS project id + Apple Team id in `eas.json` submit config.
4. Configure EAS secrets from `.env.production.example`.
5. Run [FINAL_DEVICE_QA.md](./FINAL_DEVICE_QA.md) on physical iPhone.
6. Run [BILLING_SANDBOX_QA.md](./BILLING_SANDBOX_QA.md) after products load.
7. Execute TestFlight build per [TESTFLIGHT_RELEASE_RUNBOOK.md](./TESTFLIGHT_RELEASE_RUNBOOK.md).

---

## 21. Exact next commands

```bash
# After EAS project linked and secrets set:
eas login
eas build --platform ios --profile preview

# After build succeeds:
eas submit --platform ios --profile preview
```

Do **not** run paid builds until P0 legal + RC/ASC configuration is complete.

---

## Honest verdict (single label)

**READY FOR PHYSICAL DEVICE QA**

---

PRODUCT FEATURE FREEZE CONFIRMED.
