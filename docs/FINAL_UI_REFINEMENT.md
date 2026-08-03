# Voxa — Final UI Refinement Report

**Date:** 3 August 2026  
**Scope:** Visual polish, consistency, accessibility, and performance — no new product features, no navigation changes, no billing changes.

---

## 1. Screens audited

| Screen | Status |
|--------|--------|
| Onboarding | Reviewed (prior free-launch pass; welcome completion step) |
| Home | **Refined** — hero hierarchy, spacing, duplicate cards removed |
| Talk | **Refined** — bubble spacing, 44pt header actions |
| Companion / Voxa tab | **Refined** — profile layout, list actions |
| Journey | **Refined** — section spacing |
| You / Settings | **Refined** — free-launch sections, tap targets |
| Notes hub | **Refined** — folder chips, tokens |
| Note editor | Reviewed (prior pass; pro badges hidden in free launch) |
| Saved Moments / Memory | Reviewed via Companion tab copy |
| My Companion | Unchanged (reachable from Companion tab + Journey) |
| Life Book | Reviewed (free launch unlock; no upgrade UI when pro) |
| Daily Check-in | Reviewed via Home hero shortcuts |
| Challenge Me | Reviewed via Quick actions |
| Routine | Reviewed via Home hero + Morning brief |
| Voice Picker | Reviewed (prior pass) |
| Companion Studio | Reviewed (Pro badge hidden in free launch) |

---

## 2. Design-token changes

**File:** `src/constants/theme.ts`

- Added explicit `radius.chip` (12) and `radius.hero` (24) aliases
- Existing scale enforced: 4 · 8 · 12 · 16 · 20 · 24 · 32
- Card radii remain 20 (`radius.lg`); hero cards 24–28 (`radius.hero` / `radius.xl`)

**Applied across:**

- `screen-shell.tsx` — `layout.screenPadding`, `spacing.md12` for safe areas
- `buttons.tsx` — `layout.minTapTarget` (44pt) on primary buttons
- `voxa-text.tsx` — `SectionHeader` uses `spacing.md12`
- `glass-card.tsx` — unchanged (already token-driven)

---

## 3. Home improvements

- **Hero** (`home-hero-section.tsx`): More vertical breathing room; headline max-width; secondary actions limited to Check-in + Routine only (Search/Life removed — covered by Quick actions + Command bar)
- **Duplicate check-in card removed** — pending check-in surfaced in hero secondary row
- **Adventure card** hidden unless `socialGames` feature flag is on (reduces clutter for V1)
- **Section gap** increased to `spacing.xl` (24) for calmer rhythm
- **Notes shortcut** uses `radius.lg` token

---

## 4. Talk improvements

- Message bubbles (prior pass): 20px radius, 6px tail corners, improved line height
- **Header actions** enlarged to 44×44pt (`layout.minTapTarget`)
- Composer already 44pt send/icon targets; voice-note mic hidden when release flags off

---

## 5. Companion-tab improvements

**File:** `voxa-centre-screen.tsx`, new `companion-action-row.tsx`

- Hero orb slightly smaller (168) without “Tap to talk” caption
- Primary **Talk to Voxa** button remains clear CTA
- Replaced 2×2 icon grid with **vertical list rows** (voice, customise, My Companion, Saved moments)
- Insight card unchanged — single contextual block
- Removed heavy shadow on hero container

---

## 6. Notes improvements

- Folder filter chips: `radius.chip`, 44pt min height
- Search input already 48pt — retained
- Row layout and pinned/recent sections unchanged (already solid)

---

## 7. Journey improvements

- Scroll content gap increased to `spacing.xl` for timeline breathing room
- Existing lazy sections + skeleton loaders retained

---

## 8. Settings improvements

**File:** `src/utils/settings.ts` — free launch sections reorganised:

1. **Companion** — Studio, voice, notes, speaks, memory
2. **Preferences** — appearance, check-ins, notifications, quiet hours, weather, digest, nutrition
3. **Privacy & data** — privacy, terms, export, delete
4. **Support** — contact support
5. **About** — version, about Voxa

**File:** `src/screens/you-screen.tsx`

- Free launch renders sections dynamically (no subscription, no “More” duplicates)
- Diagnostics toggle **dev-only** (`__DEV__`)
- Setting rows: 44pt min height, VoiceOver labels
- Profile subtitle simplified (no internal data-source jargon in free launch)

---

## 9. Typography changes

- `SectionHeader` spacing aligned to token scale
- Home hero headline line-height 34; subline max-width 300
- `VoxaText` retains `maxFontSizeMultiplier={1.35}` for Dynamic Type safety

---

## 10. Motion changes

**New:** `src/hooks/use-reduce-motion.ts`

- `FadeIn` / `StaggerFade` skip entrance animation when Reduce Motion is enabled
- `SpringPressable` skips scale animation when Reduce Motion is enabled
- `LoadingState` uses breathing `LoadingPulse` (prior pass)

---

## 11. Loading / empty / error improvements

- Home: skeleton blocks + friendly empty/error with Retry (unchanged, verified)
- Global `LoadingState` → `LoadingPulse` (no raw spinners)
- Notes/Journey retain skeleton + empty states

---

## 12. Accessibility improvements

- Primary buttons: 44pt min height
- Talk header actions: 44×44pt
- Settings rows: `accessibilityRole="button"` + combined label/value hints
- Companion action rows: accessible labels with detail text
- Quick action chips: 44pt min height
- Reduce Motion respected in entrance animations

---

## 13. Performance improvements

- Home: removed duplicate `DailyCheckInCard` render path
- Journey/Home: `removeClippedSubviews` on ScrollViews (existing)
- Cached dashboard hook unchanged (no extra fetches added)
- Animations use `useNativeDriver: true` where applicable

---

## 14. Files changed

| File | Change |
|------|--------|
| `src/constants/theme.ts` | Chip/hero radius aliases |
| `src/hooks/use-reduce-motion.ts` | **New** — Reduce Motion hook |
| `src/components/ui/buttons.tsx` | 44pt primary buttons |
| `src/components/ui/voxa-text.tsx` | Section header spacing |
| `src/components/ui/screen-shell.tsx` | Token-based safe-area padding |
| `src/components/premium/premium-ui.tsx` | Reduce Motion in FadeIn/SpringPressable |
| `src/components/phase6/home-hero-section.tsx` | Calmer hero, fewer secondary actions |
| `src/components/home/today-quick-actions.tsx` | Chip tokens + 44pt targets |
| `src/components/companion/companion-action-row.tsx` | **New** — list-style companion actions |
| `src/screens/home-screen.tsx` | Clutter reduction, spacing |
| `src/screens/voxa-centre-screen.tsx` | Companion profile layout |
| `src/screens/chat-screen.tsx` | Header tap targets |
| `src/screens/journey-screen.tsx` | Section spacing |
| `src/screens/notes-hub-screen.tsx` | Folder chip tokens |
| `src/screens/you-screen.tsx` | Free-launch settings layout |
| `src/utils/settings.ts` | Settings section reorganisation |

---

## 15. Tests passed

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ Pass |
| `npm test` | ✅ 100/100 |
| `npm run lint --if-present` | ✅ (no lint script / clean) |
| `npx expo-doctor` | ✅ 18/18 |

---

## 16. Remaining issues

### P0 (before App Store)

- Physical device QA on TestFlight build (touch, keyboard, VoiceOver, background/foreground)
- Live Privacy + Terms URLs
- EAS `projectId` in `app.json` if still placeholder

### P1

- Full VoiceOver pass on Talk message list and Note editor checklist
- Dynamic Type stress test on Home hero (large accessibility sizes)

### P2

- Optional: consolidate remaining one-off hex values in phase-specific screens
- Optional: migrate remaining `ActivityIndicator` instances in niche screens to skeleton/pulse

---

## 17. Physical-device QA still required

Automated checks cannot verify:

- Keyboard overlap in Talk and Note editor
- Scroll behaviour with long conversations
- Haptic feedback feel
- Real-device performance with large memory lists
- Logout/login and force-quit recovery

---

## Final verdict

**READY FOR PHYSICAL DEVICE QA**

The app presents a consistent Deep Ink / Sea Glass visual system, calmer Home and Companion surfaces, standardised 44pt targets, and Reduce Motion support. No paywalls, no mic/call UI in release flags, billing dormant.

---

**UI FEATURE FREEZE CONFIRMED.**
