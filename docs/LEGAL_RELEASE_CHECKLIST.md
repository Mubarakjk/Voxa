# Legal Release Checklist

Audit of legal, support, and account surfaces for App Store submission.

Last audited: August 2026.

---

## URLs & links

| Item | Requirement | Current status | Priority |
|------|-------------|----------------|----------|
| Privacy Policy — public URL | Production HTTPS URL in App Store Connect | In-app screen only; subtitle says “Host a public URL” | **P0** |
| Terms of Use — public URL | Production HTTPS URL | In-app `TermsOfServiceScreen` | **P0** if no external URL |
| Support URL | Required in App Store Connect | `support@voxa.app` placeholder in privacy copy | **P0** |
| Marketing URL | Optional | Not set | P2 |
| Paywall Terms link | Opens in-app Terms | ✅ `paywall-screen.tsx` | — |
| Paywall Privacy link | Opens in-app Privacy | ✅ | — |
| Subscription renewal copy | Auto-renewal explanation on paywall | ✅ Footer text | Verify copy |

---

## In-app legal screens

| Screen | Path | Issues |
|--------|------|--------|
| Privacy Policy | `src/screens/privacy-policy-screen.tsx` | Placeholder support email; no external link |
| Terms of Service | `src/screens/terms-of-service-screen.tsx` | Review for subscription/auto-renewal language |

---

## Account controls (Settings / You)

| Feature | Status | Notes |
|---------|--------|-------|
| Restore purchases | ✅ You + Paywall | Apple ID wording fixed in sprint |
| Export data | ✅ Settings | Pro-gated export where applicable |
| Delete account | ✅ Implemented with Supabase path | Verify on production Supabase |
| Manage subscription | ✅ Opens platform subscription settings | |

---

## Copy accuracy

| Claim | Must match reality |
|-------|-------------------|
| End-to-end encryption | **Do not claim** unless implemented |
| Local vs cloud storage | Settings shows Supabase vs local — accurate |
| AI provider processing | Privacy screen mentions AI providers — accurate |
| Location / weather | Optional, described | ✅ |
| Nutrition | Not medical advice — stated | ✅ |
| Live calling | **Must not advertise** in release metadata | Disabled by flags |
| Emergency / therapy | **Must not claim** | Safe call hidden in release |

---

## Pre-submission actions

1. Publish Privacy Policy at stable URL (e.g. `https://voxa.app/privacy`).
2. Publish Terms at stable URL (e.g. `https://voxa.app/terms`).
3. Confirm support email inbox monitored (`support@voxa.app` or production alias).
4. Update in-app privacy subtitle and remove “replace before submission” copy.
5. App Store Connect metadata URLs match published pages.

---

## Blockers

- **P0:** No production Privacy Policy URL for App Store Connect.
- **P0:** Support contact not verified live.
