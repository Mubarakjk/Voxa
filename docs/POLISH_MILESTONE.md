# Voxa Polish Milestone Report

**Date:** 2026-07-24  
**Goal:** Make existing features feel like a premium iPhone app — not an AI demo.  
**Brand colour:** Deep ink (`#0B0F14`) + sea-glass teal (`#2DD4BF`) — deliberately not generic purple-AI.

---

## App Store readiness (honest)

| Gate | Status |
|------|--------|
| UI polish (home / notes / voice / journey / paywall) | Improved |
| Typecheck | Pass |
| Real subscriptions (RevenueCat + StoreKit) | Wired — needs physical device / sandbox QA |
| Mic voice notes | Intentionally hidden (do not ship as “coming soon”) |
| TestFlight / App Store | **Not ready** until device purchase QA + privacy/legal review |

**Verdict:** Ready for **physical-device polish QA**. Not TestFlight-complete until purchases, restore, and entitlement gating are verified on a real iPhone.

---

## Colours

- Theme tokens shifted to teal brand + ink backgrounds (`src/constants/theme.ts`)
- Splash / notification colours aligned in `app.json`
- Widespread `rgba(139,124,246…)` / `#8B7CF6` accents replaced with teal for chrome UI
- Avatar accents kept multi-colour (Amethyst / Sapphire / Emerald / Rose / Gold)
- Note type dots + folder colour palette for visual hierarchy

---

## Screens polished

| Screen | Improvements |
|--------|----------------|
| **Home** | Skeleton load, friendly error + retry, staggered card entrance, Notes shortcut haptics, weather/brief/notes motion |
| **Notes hub** | Empty state + CTA, skeletons, type colour dots, long-press Pin / Duplicate / Share / Delete, haptics, stagger |
| **Note editor** | Checklist tick haptics |
| **Voice picker** | Scale spring on selected card, “Now speaking as”, stagger, preview haptics |
| **Journey** | Skeleton load, richer empty state + Talk CTA, routine-complete haptics, relationship score count-up |
| **Paywall** | Teal hero, aspirational copy, period haptics, purchase success/fail haptics, friendlier purchase errors |
| **Settings / You** | Dead “Voice notes / Coming soon” row removed earlier; remaining rows route to real screens |
| **Global chrome** | ScreenShell glow defaults to teal; Glass / tab accents teal |

---

## Animations added / refined

- Home cards: `StaggerFade` entrance
- Voice cards: spring scale when selected
- AI orb: existing breathe pulse (`VoiceOrb` / `LiveCompanionOrb`)
- Relationship score + key stats: `CountUpNumber` (respects Reduce Motion)
- Skeleton shimmer blocks instead of bare spinners on Home / Journey / Notes
- Checklist selection haptic feedback

*Note: True swipe-to-action needs `react-native-gesture-handler` (not in deps). Long-press actions cover pin/duplicate/share/delete without a new native module.*

---

## Haptics (`expo-haptics` + `src/utils/haptics.ts`)

Respects Reduce Motion / web.

| Action | Feedback |
|--------|----------|
| Create / select note actions | Light / selection |
| Delete note | Warning |
| Voice select / preview | Selection / success |
| Routine completed | Success |
| Purchase success / fail | Success / warning |
| Period chip on paywall | Selection |
| Milestone / celebrate | Celebrate |
| Orb / Notes shortcut tap | Light |

**Device note:** Rebuild native app after adding `expo-haptics` (`npx expo run:ios --device`).

---

## Payment feature

Already implemented via RevenueCat (`react-native-purchases`):

- Monthly / annual packages (`voxa_pro_monthly` / `voxa_pro_annual`)
- Entitlement `voxa_pro` via `EntitlementAccessService`
- Paywall purchase + restore flows
- Honest fallback pricing notice when store metadata unavailable
- Dev-client required for native purchases

Polish this milestone: UX/copy/haptics/errors — **not** fake local unlocks.

Setup reference: `docs/REVENUECAT_SETUP.md`

---

## Loading / empty / errors

- Skeletons on Home, Journey, Notes
- Premium `EmptyState` with optional CTA
- Paywall purchase errors rewritten to be recoverable (cancel / network / retry+restore)
- Journey empty → “Start talking”
- Home load failure → Retry (no raw stack traces)

---

## Accessibility

- `maxFontSizeMultiplier={1.35}` on `VoxaText`
- Haptics / count-up skip when Reduce Motion is on
- Voice cards: accessibility labels + selected state
- Notes: long-press hint for actions
- Contrast: light text on ink + teal accents (verify Large Text on device)

---

## Performance

- Journey extras services memoized (prior infinite-loop fix preserved)
- Home dashboard load inside focus effect (stable deps)
- `removeClippedSubviews` on Home scroll
- Staggered Journey section mount retained
- Full lazy-route split not added this pass (bundle impact modest; can follow)

---

## Explicitly not done (scope control)

- Dozens of new features
- Re-enabling microphone voice notes
- Fake Pro unlocks
- Full swipe actions (needs gesture-handler)
- Guest → account notes migration
- Cloud notes sync

---

## Suggested next QA checklist

1. Rebuild iOS with haptics: `npx expo run:ios --device`
2. Walk Home → Notes → Voice → Journey → Paywall
3. Sandbox purchase + restore + Pro voice unlock
4. VoiceOver pass on Home + Notes + Paywall
5. Reduce Motion on/off for orb + count-up + stagger
