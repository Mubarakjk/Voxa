# TestFlight Release Runbook

Step-by-step for iOS TestFlight. **Do not run paid EAS builds without explicit confirmation.**

---

## 1. Prerequisites

- [ ] Apple Developer account + App Store Connect app record
- [ ] EAS account (`eas login`)
- [ ] EAS project linked — replace `app.json` → `extra.eas.projectId`
- [ ] RevenueCat iOS public key + products configured ([APP_STORE_SUBSCRIPTION_SETUP.md](./APP_STORE_SUBSCRIPTION_SETUP.md))
- [ ] EAS secrets set from [`.env.production.example`](../.env.production.example)
- [ ] Legal URLs live ([LEGAL_RELEASE_CHECKLIST.md](./LEGAL_RELEASE_CHECKLIST.md))

---

## 2. One-time configure

```bash
eas login
eas build:configure
```

Link project id in `app.json` when prompted.

---

## 3. Set EAS secrets (example)

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "YOUR_URL"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_ANON_KEY"
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_IOS_API_KEY --value "appl_XXXX"
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_PRODUCT_MONTHLY --value "YOUR_MONTHLY_ID"
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_PRODUCT_ANNUAL --value "YOUR_ANNUAL_ID"
```

Do **not** set `EXPO_PUBLIC_OPENAI_API_KEY` for TestFlight unless intentionally dev-only.

---

## 4. Build for TestFlight (preview profile)

```bash
eas build --platform ios --profile preview
```

Preview profile (`eas.json`):

- Store distribution (TestFlight)
- Release voice flags `false`
- `autoIncrement` build number
- `EXPO_PUBLIC_APP_ENV=preview`

Monitor build at expo.dev → Builds.

---

## 5. Submit to TestFlight

After build succeeds:

```bash
eas submit --platform ios --profile preview
```

Or upload IPA manually via Transporter.

---

## 6. Post-upload

- [ ] Add sandbox testers in App Store Connect
- [ ] Complete [BILLING_SANDBOX_QA.md](./BILLING_SANDBOX_QA.md) on device
- [ ] Complete [FINAL_DEVICE_QA.md](./FINAL_DEVICE_QA.md)
- [ ] Record build number in [BILLING_AND_TESTFLIGHT_READINESS.md](./BILLING_AND_TESTFLIGHT_READINESS.md)

---

## 7. Production App Store (later)

```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

Same release flags; `EXPO_PUBLIC_APP_ENV=production`.

---

## Troubleshooting

| Issue | Action |
|-------|--------|
| Paywall shows fallback prices | RC offering / product IDs / ASC sync |
| Build fails signing | Check Apple credentials in EAS |
| Mic permission at launch | Should not happen — verify release flags |
| Wrong bundle id | Must be `app.voxa.companion` |

---

## Verdict gate

TestFlight submission only when:

- No P0 blockers in readiness report
- Physical device QA started
- Sandbox billing QA passed on real store products
