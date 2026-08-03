# App Store Subscription Setup

Manual checklist for Voxa Pro subscriptions. **None of these steps are verified complete by the codebase alone.**

---

## 1. Apple Developer & App Store Connect

- [ ] Apple Developer Program membership active
- [ ] App record created: **Voxa**
- [ ] Bundle ID matches codebase: `app.voxa.companion` (`app.json`)
- [ ] Paid Applications agreement signed
- [ ] Agreements, Tax, and Banking complete

---

## 2. Subscription products (App Store Connect)

- [ ] Create **Subscription Group** (e.g. "Voxa Pro")
- [ ] Create **monthly** auto-renewable subscription  
  - Product ID must match `EXPO_PUBLIC_REVENUECAT_PRODUCT_MONTHLY` (default placeholder: `voxa_pro_monthly`)
- [ ] Create **annual** auto-renewable subscription  
  - Product ID must match `EXPO_PUBLIC_REVENUECAT_PRODUCT_ANNUAL` (default placeholder: `voxa_pro_annual`)
- [ ] Add localisation (display name, description) for each territory
- [ ] Configure pricing (base country + equivalents)
- [ ] Add subscription review screenshot(s)
- [ ] Subscription review notes explaining Voxa Pro value (no live calling in this release)

---

## 3. RevenueCat dashboard

- [ ] Create project / iOS app with bundle `app.voxa.companion`
- [ ] Create entitlement: **`voxa_pro`** (matches `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID`)
- [ ] Import App Store products (monthly + annual)
- [ ] Create offering (default id: `default` or set `EXPO_PUBLIC_REVENUECAT_OFFERING_ID`)
- [ ] Attach **monthly** and **annual** packages to offering
- [ ] Set offering as **Current**
- [ ] Connect App Store Connect API key (Issuer ID, Key ID, .p8)
- [ ] Copy **iOS public SDK key** → EAS secret `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
- [ ] (Android) Repeat for Play Console when shipping Android

---

## 4. Environment alignment

| Variable | Example / note |
|----------|----------------|
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | `appl_…` public key |
| `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` | `voxa_pro` |
| `EXPO_PUBLIC_REVENUECAT_OFFERING_ID` | `default` |
| `EXPO_PUBLIC_REVENUECAT_PRODUCT_MONTHLY` | App Store product id |
| `EXPO_PUBLIC_REVENUECAT_PRODUCT_ANNUAL` | App Store product id |
| `EXPO_PUBLIC_REVENUECAT_TEST_STORE` | `false` for TestFlight |

Product IDs are centralised in `src/config/revenuecat-product-ids.ts` — do not duplicate in other files.

---

## 5. Sandbox testing prerequisites

- [ ] Sandbox tester account in App Store Connect
- [ ] Physical iPhone signed into Sandbox Apple ID (Settings → Developer)
- [ ] TestFlight or dev client build with real RC key + real product IDs
- [ ] Paywall shows **store-localised prices** (not “fallback”)

---

## 6. Submission artefacts

- [ ] App Privacy questionnaire completed
- [ ] Subscription terms visible in app (paywall footer + Terms screen)
- [ ] Privacy Policy URL live (not in-app placeholder only)
- [ ] Support URL live

---

## Verification

When complete, on device:

1. Paywall loads monthly + annual with real prices.
2. Sandbox purchase activates `voxa_pro` within seconds.
3. Restore returns correct Apple ID messaging.

Until then: **billing sandbox readiness is blocked.**
