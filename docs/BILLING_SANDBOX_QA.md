# Billing Sandbox QA

Physical iPhone + Apple Sandbox + TestFlight or preview build with **real RevenueCat offerings**.

**Do not mark sandbox ready until store products load on device (no fallback pricing).**

Record: Pass / Fail / Blocked, build number, iOS version, sandbox Apple ID, evidence notes.

---

## Prerequisites

- [ ] App Store Connect products created and linked in RevenueCat
- [ ] `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` set in build
- [ ] Product IDs match App Store Connect
- [ ] Sandbox tester signed in on device
- [ ] Release voice flags all `false`

---

## Paywall load

| # | Test | Result | Evidence |
|---|------|--------|----------|
| 1 | Open paywall from You → Upgrade | | |
| 2 | Monthly + annual packages visible | | |
| 3 | Prices are store-localised (not “fallback”) | | |
| 4 | Annual savings badge only if math correct | | |
| 5 | Selected package state visible | | |
| 6 | Close button works | | |
| 7 | Terms + Privacy links open | | |
| 8 | Renewal explanation visible | | |

---

## Purchase flow

| # | Test | Result | Evidence |
|---|------|--------|----------|
| 9 | Purchase monthly — sandbox sheet appears | | |
| 10 | Entitlement activates without app restart | | |
| 11 | Pro UI updates (e.g. premium voice, limits) | | |
| 12 | Purchase button disabled while processing | | |
| 13 | Rapid double-tap does not double-charge | | |
| 14 | Cancel purchase sheet — friendly message | | |
| 15 | Airplane mode during purchase — friendly error | | |
| 16 | Already subscribed — appropriate handling | | |

---

## Persistence & identity

| # | Test | Result | Evidence |
|---|------|--------|----------|
| 17 | Force close → reopen — Pro preserved | | |
| 18 | Sign out → sign in — entitlement correct | | |
| 19 | Switch Voxa account — no Pro bleed | | |
| 20 | Foreground app — refresh maintains state | | |
| 21 | Offline launch — cached entitlement honest | | |

---

## Restore

| # | Test | Result | Evidence |
|---|------|--------|----------|
| 22 | Restore with active sub — “Voxa Pro has been restored.” | | |
| 23 | Restore without sub — “No active Voxa Pro purchase was found for this Apple ID.” | | |
| 24 | Restore network failure — retry message | | |
| 25 | Restore from You screen matches paywall copy | | |

---

## Revocation & edge cases

| # | Test | Result | Evidence |
|---|------|--------|----------|
| 26 | Expired sandbox subscription demotes to Free | | |
| 27 | Parental / purchase restrictions — friendly error | | |
| 28 | Offerings unavailable — purchase blocked, app usable | | |
| 29 | Pending purchase (if applicable) — pending copy | | |
| 30 | Reinstall + restore on same Apple ID | | |

---

## Sign-off

| Role | Name | Date | Verdict |
|------|------|------|---------|
| QA | | | |
| Engineering | | | |

**Sandbox ready:** only when rows 3, 9, 10, 22, 23 pass on physical device.
