# Final RevenueCat & App Store Setup

Manual steps required before billing sandbox QA. **Not verified complete from the codebase.**

Target products: ~£4.99/month, ~£39.99/year (Apple localises per territory).

---

## App Store Connect

### Account & app record

- [ ] Apple Developer Program active
- [ ] Paid Applications Agreement signed
- [ ] Agreements, Tax, and Banking complete
- [ ] App record **Voxa** created
- [ ] Bundle ID matches app: `app.voxa.companion`

### Subscription group

- [ ] Create one subscription group (e.g. **Voxa Pro**)
- [ ] Add localised group display name

### Monthly subscription

- [ ] Create auto-renewable subscription
- [ ] Product ID = `EXPO_PUBLIC_REVENUECAT_PRODUCT_MONTHLY` (e.g. `voxa_pro_monthly`)
- [ ] Duration: 1 month
- [ ] Pricing: ~£4.99 base (Apple generates equivalents)
- [ ] Localisations: display name + description
- [ ] Optional: introductory **free trial** (configure in ASC only — app reads eligibility from store)

### Annual subscription

- [ ] Create auto-renewable subscription
- [ ] Product ID = `EXPO_PUBLIC_REVENUECAT_PRODUCT_ANNUAL` (e.g. `voxa_pro_annual`)
- [ ] Duration: 1 year
- [ ] Pricing: ~£39.99 base
- [ ] Localisations + review screenshot

### Review

- [ ] Subscription review notes: explain Voxa Pro value; **no live calling in this release**
- [ ] Submit subscriptions with app version when required

---

## RevenueCat

### Project setup

- [ ] Create iOS app linked to bundle `app.voxa.companion`
- [ ] Connect App Store Connect API (Issuer ID, Key ID, .p8)

### Entitlement

- [ ] Create entitlement: **`voxa_pro`**
- [ ] Attach monthly product → `voxa_pro`
- [ ] Attach annual product → `voxa_pro`

### Offering

- [ ] Import monthly + annual from App Store
- [ ] Create offering (id = `EXPO_PUBLIC_REVENUECAT_OFFERING_ID`, default `default`)
- [ ] Add **Monthly** package → monthly product
- [ ] Add **Annual** package → annual product
- [ ] Set offering as **Current**

### Keys & verification

- [ ] Copy iOS **public** SDK key → `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
- [ ] Confirm `CustomerInfo.entitlements.active.voxa_pro` after sandbox purchase
- [ ] Verify package identifiers match env product IDs

---

## EAS / build env

Set in EAS secrets (see `.env.production.example`):

```
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=voxa_pro
EXPO_PUBLIC_REVENUECAT_OFFERING_ID=default
EXPO_PUBLIC_REVENUECAT_PRODUCT_MONTHLY=...
EXPO_PUBLIC_REVENUECAT_PRODUCT_ANNUAL=...
EXPO_PUBLIC_REVENUECAT_TEST_STORE=false
```

---

## Sandbox verification (physical iPhone)

When setup is complete:

1. Paywall shows **Apple-localised** prices (not em-dash / fallback).
2. Sandbox purchase activates Pro without app restart.
3. Restore shows correct Apple ID messaging.

Until then: **READY FOR REVENUECAT CONFIGURATION** (not sandbox QA).
