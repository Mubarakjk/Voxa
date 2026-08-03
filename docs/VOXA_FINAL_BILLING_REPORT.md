# Voxa Final Billing Report

Date: August 2026  
Product feature freeze: **ACTIVE**

## Verdict

**READY FOR REVENUECAT CONFIGURATION**

App billing code, Free/Pro gates, paywall UX, restore copy, legal link wiring, release voice flags, and automated tests are in place. App Store Connect subscriptions, RevenueCat dashboard linkage, live legal page hosting, and physical iPhone Sandbox QA are still required before TestFlight billing confidence.

---

### 1. Free features

Onboarding, Home, text chat (daily allowance), basic memory, daily check-in, routines/goals (limited), Notes, Journey, Saved Moments (basic), Balanced personality, standard voices, TTS spoken replies, Challenge Me (limited), Life Book **preview**, basic relationship progress, settings/privacy/deletion/restore.

Canonical list: `src/constants/free-pro-access.ts` + limits in `src/constants/pricing.ts`.

### 2. Pro features

Higher fair-use chat, advanced memory / pinned, companion insights & Weekly Letter, full Life Book / Life OS, premium voices, richer personalisation, advanced Note AI, deeper reports.  
**Not advertised:** live calling, scheduled calls, voice notes, microphone chat (release-disabled).

### 3. Paywall timing

Shown on intentional Upgrade (You), Pro-only selections (e.g. premium voice, note AI), Life Book upgrade CTA, and explained Free limits.  
Contextual sources respect a **6-hour** cooldown (`PaywallImpressionService`). Force path remains for You / explicit upgrade. No launch/onboarding spam.

### 4. Paywall UI

Title: “Go deeper with Voxa Pro”. Honest benefits only. Monthly + annual with store `priceString`, savings only when valid, trial copy only when store-eligible, Subscribe / Not now / Restore / Terms / Privacy / auto-renewal disclosure. Deep Ink + Sea Glass language preserved.

### 5. RevenueCat implementation status

Configure-once, identify after auth, logout on sign-out, offerings fetch, purchase/restore, CustomerInfo listener, foreground refresh, expiry demotion, duplicate purchase guard via billing state machine, missing keys non-fatal. Entitlement id: `voxa_pro`. No production fake-Pro (`setDevOverride` is `__DEV__` only).

### 6. Purchase status

Code path complete; success only when plan status shows Pro after purchase. Friendly errors for cancel / network / store issues. **Sandbox purchase not yet verified on device.**

### 7. Restore status

Visible on paywall and You → Subscription. Required copy wired. No Pro grant without entitlement.

### 8. Subscription settings status

You → Subscription: Current plan, Upgrade to Voxa Pro / View plans, Free vs Pro compare, Restore, Manage via Apple/Play settings URL (no fake cancel).

### 9. Usage-limit status

User-scoped local counters with daily/monthly rollover; non-negative increments; friendly limit modal + Not now.  
**Still required for production abuse/cost control:** server-backed AI usage metering via Supabase/gateway (device-local alone is not sufficient for expensive AI).

### 10. Security findings

- No OpenAI permanent key or Supabase service-role found in tracked source.
- Only RevenueCat **public** SDK keys expected client-side.
- `.env` ignored; `.env.example` placeholders updated.
- Billing analytics strip receipt / Apple ID / content keys.
- Do not print secret values in logs or this report.

### 11. Legal status

In-app Privacy/Terms screens + paywall links to public HTTPS URLs (`LEGAL_URLS`).  
**P0 remaining:** confirm `https://voxa.app/privacy` and `https://voxa.app/terms` (or env overrides) are **live** public pages before submission.

### 12. Manual App Store setup remaining

Paid Apps agreement, tax/banking, subscription group, monthly + annual products, pricing, optional intro trial, review assets — see `docs/FINAL_REVENUECAT_SETUP.md`.

### 13. Manual RevenueCat setup remaining

iOS app credentials, import products, entitlement `voxa_pro`, default offering packages, inject public iOS SDK key into EAS — see `docs/FINAL_REVENUECAT_SETUP.md`.

### 14. Physical billing QA remaining

Full checklist in `docs/FINAL_BILLING_DEVICE_QA.md` — not run yet.

### 15. Files changed (this milestone)

- `src/constants/free-pro-access.ts` (new)
- `src/constants/legal-urls.ts` (new)
- `src/constants/pricing.ts`
- `src/screens/paywall-screen.tsx`
- `src/screens/chat-screen.tsx`
- `src/screens/life-book-screen.tsx`
- `src/screens/you-screen.tsx`
- `src/utils/settings.ts`
- `src/components/subscription/limit-reached-modal.tsx`
- `src/services/billing/feature-gate-service.ts`
- `src/services/billing/restore-messages.ts`
- `src/services/billing/usage-tracking-service.ts`
- `src/services/analytics/analytics-service.ts`
- `src/config` / `.env.example` / `app.json` / `eas.json` (flags already release-safe)
- `tests/final-billing-gate.test.ts`
- `docs/FINAL_REVENUECAT_SETUP.md`
- `docs/FINAL_BILLING_DEVICE_QA.md`
- `docs/VOXA_FINAL_BILLING_REPORT.md`

### 16. Tests passed

- `npx tsc --noEmit` — pass
- `npm test` — **93/93** pass (includes `tests/final-billing-gate.test.ts`)
- `npx expo-doctor` — **18/18** pass

### 17. P0 blockers

1. App Store Connect subscriptions + Paid Apps / tax / banking not independently verified.
2. RevenueCat products/entitlement/offering + public iOS key injection not independently verified.
3. Public Privacy/Terms URLs must be live (hosting not verified here).
4. Physical iPhone Sandbox QA not completed.

### 18. P1 blockers

1. EAS `appleTeamId` still placeholder in `eas.json`.
2. Server-backed AI usage metering for production cost control.
3. Microphone usage string softened; confirm App Store privacy questionnaire matches release (mic chat disabled).

### 19. P2 issues

1. Analytics `trackEvent` remains lightweight (dev console + in-memory billing ring); wire to production analytics vendor when ready.
2. Fallback GBP amounts remain for offline display only — UI prefers store strings.

### 20. Exact next manual steps

1. Complete ASC + RevenueCat steps in `docs/FINAL_REVENUECAT_SETUP.md`.
2. Publish live Privacy + Terms pages; set env URLs if different from `voxa.app`.
3. `eas secret:create` (or EAS env) for `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`.
4. Build preview: `eas build --platform ios --profile preview` (confirm before paid build).
5. Run `docs/FINAL_BILLING_DEVICE_QA.md` on a physical iPhone.
6. Only then: TestFlight submit when Sandbox QA passes.

---

**PRODUCT FEATURE FREEZE CONFIRMED.**
