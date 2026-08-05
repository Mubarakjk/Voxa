# Voxa Free V1 — Pre-TestFlight UI Audit

**Date:** 4 August 2026  
**Launch mode:** `EXPO_PUBLIC_FREE_LAUNCH_MODE=true`  
**Git checkpoint:** tag `pre-testflight-ui-polish` @ `d3718c6`  
**Scope:** UI polish & TestFlight readiness — no new product features

---

## 1. Audit findings

### Visual consistency (addressed / acceptable)
| Area | Finding | Status |
|------|---------|--------|
| Design tokens | Spacing scale missing `40`; composer height hardcoded at `48` | **Fixed** — `spacing.xxxl`, `layout.composerMinHeight: 52` |
| Typography | Hierarchy variants incomplete (`screenTitle`, `stat`, `buttonLabel`) | **Fixed** — extended in `theme.ts` |
| Loading states | Text-only pulse felt utilitarian | **Fixed** — breathing `VoiceOrb` + label |
| Disabled buttons | Opacity-only disabled send/button states | **Fixed** — surface + border treatment |
| Talk composer | Below 52pt spec; send overlap risk on home indicator | **Fixed** — safe-area padding + 52pt min height |
| Tab bar | Missing VoiceOver tab semantics | **Fixed** — `accessibilityRole="tab"` + 44pt targets |
| Error copy | Raw `Error.message` could surface in production | **Fixed** — `friendly-error` helper + `ErrorState` guard |
| Life Book | Upgrade card could appear if entitlement lag | **Fixed** — gated with `areAllFeaturesUnlocked()` |
| Empty states | Saved Moments / Notes copy generic | **Fixed** — premium human copy |

### Screens reviewed (production-visible)

| Screen | Notes |
|--------|-------|
| **Onboarding** | Welcome copy correct; no paywall/mic; progress steps clear |
| **Home** | Strong hero → quick actions → morning brief hierarchy; skeleton + recoverable error; no duplicate Talk in hero vs brief |
| **Talk** | Premium bubbles, 17px composer, safe-area composer, chips; mic/call gated off |
| **Companion (Voxa tab)** | Calm hero + single primary CTA + vertical action list — not a test console |
| **Journey** | Grouped timeline; Life Book / Saved Moments entry points |
| **You** | Free-launch settings (no subscription rows) via `buildFreeLaunchSettingsSections` |
| **Notes Hub** | Search, folders, pinned section, premium empty state |
| **Note Editor** | Cleaner header (title + autosave status); overflow for secondary actions |
| **Saved Moments** | Search, filters, confidence badges, merge suggestions |
| **My Companion** | Evidence-based insights; count-up restrained |
| **Life Book** | Reading width, empty chapters intentional, no filler |
| **Daily Check-in** | Accessible mood chips; non-clinical framing |
| **Challenge Me** | Routes into Talk with starter — no duplicate chat UX |
| **Voice Picker** | Preview stops; no mic permission |
| **Companion Studio** | "Coming soon" only on future accent packs — acceptable |
| **Settings** | Every free-launch row functional; Privacy/Terms HTTPS |

### Remaining observations (non-blocking)
- **P2:** `features-screen` / `companion-studio-appearance` show "Coming soon" for future packs — gated routes, not tab-visible.
- **P2:** Dormant call/billing screens retain upgrade copy — unreachable in Free V1 navigation.
- **P2:** Home can still show many optional cards when all services populate — acceptable; sections hide when empty.
- **P1 (device):** Dynamic Type at max size on iPhone SE — needs physical pass for clipping on hero headline.

---

## 2. Design-token changes

**File:** `src/constants/theme.ts`

- Added `spacing.xxxl: 40`
- Added `layout.composerMinHeight: 52`
- Extended typography: `screenTitle`, `sectionTitle`, `cardTitle`, `supporting`, `buttonLabel`, `stat`

Existing tokens retained: Deep Ink, Sea Glass Teal, glass surfaces, radius scale (chip 12 → modal 28), `minTapTarget: 44`.

---

## 3. Screens polished (this pass)

- Home (friendly errors)
- Talk composer (`chat-input-bar`)
- Saved Moments (`memory-screen`)
- Notes Hub (empty copy)
- Note Editor (header hierarchy)
- Life Book (upgrade gate)
- Global loading (`LoadingPulse`)
- Tab bar (accessibility + tap targets)

Prior session polish already on `main`: Home hero simplification, Companion tab vertical actions, Talk bubble polish, You free-launch settings, Reduce Motion on `FadeIn`.

---

## 4. Components consolidated

| Component | Change |
|-----------|--------|
| `LoadingPulse` | Orb + label + VoiceOver busy state |
| `PremiumButton` | 44pt min height, `buttonLabel` variant, non-opacity disabled |
| `ErrorState` | Sanitises technical errors in production |
| `ChatInputBar` | Tokenised composer height, safe-area, send disabled styling |
| `PremiumTabBar` | Tab semantics + 44pt targets |
| **New:** `friendly-error.ts` | Central friendly copy for load failures |

---

## 5. Home improvements

- Skeleton loading with orb pulse + three skeleton cards
- Recoverable offline/error empty state with Retry
- Friendly error messages (no raw stack in UI)
- Visual order: contextual hero → quick actions → morning brief → optional nutrition/notes/adventure
- Duplicate check-in card removed (prior pass)
- Adventure card gated on `socialGames` feature flag

---

## 6. Talk improvements

- Composer: 17px text, 52pt min height, glass card, multiline expansion
- Safe-area bottom padding for home indicator
- Send button: teal when active, muted surface when disabled (not opacity-only)
- Mic button hidden when `release-voice` gates off
- Spoken reply playback preserved; playback stops on blur (existing)
- Header actions 44pt (prior pass)

---

## 7. Companion improvements

- Hero orb + name + personality/voice subtitle
- Single primary "Talk to Voxa" CTA
- Vertical `CompanionActionRow` list: Change voice, Customise, My Companion, Saved moments
- Evidence-based insight card when enabled
- No call history, mic tests, or scheduled-call UI on tab

---

## 8. Notes improvements

- Hub title + search + folder row
- Pinned section only when populated
- Empty: "No notes yet. Capture an idea, plan or reminder."
- Editor: note title in header + autosave status (removed noisy timestamp line)
- Long titles truncate gracefully

---

## 9. Journey improvements

- Section grouping via `phase12-journey-hub` (prior pass)
- Timeline spacing and milestone cards
- Empty: journey grows with use
- Life Book / Saved Moments / My Companion entry points distinct from Home

---

## 10. Settings improvements

- Free V1 sections: Companion, Preferences, Privacy & Data, Support, About
- No Subscription / Upgrade / Restore / Usage limits / Pro badges
- Dev diagnostics `__DEV__` only on You screen
- Privacy & Terms HTTPS links live

---

## 11. Onboarding improvements

- Ends with: *"Welcome to Voxa. Everything is ready. Let's start building your journey together."*
- No paywall step; no microphone permission
- Voice preview stops on navigation (existing)
- One decision per screen; skippable optional steps

---

## 12. Loading / empty / error improvements

| Pattern | Implementation |
|---------|----------------|
| Loading | Breathing orb + skeleton cards on Home; skeleton rows on Notes |
| Empty | Human title + one sentence + CTA on Notes, Memories, Journey |
| Error | Friendly copy + Retry; drafts preserved on Talk/Notes |
| Offline | Distinct from server failure via connection messaging |

---

## 13. Motion improvements

- `useReduceMotion` respected in `FadeIn`, `LoadingPulse`, `VoiceOrb`
- Hero orb breathing allowed; no repeated focus animations
- Button press compression only; no excessive confetti on Home

---

## 14. Accessibility findings

| Item | Status |
|------|--------|
| Tab bar VoiceOver tabs | **Fixed** |
| Loading progressbar announcement | **Fixed** |
| Icon-only send/close buttons | Labels present |
| Mood chips | Roles on check-in screen |
| 44pt minimum targets | Tab bar, composer send, secondary hero actions |
| Dynamic Type | `maxFontSizeMultiplier={1.35}` on `VoxaText` — device QA recommended at max |
| Reduce Motion | Hook wired to entrance + orb |

---

## 15. Performance findings

- Home uses `useCachedDashboard` — no repeated full fetch loops observed
- `removeClippedSubviews` on Home / Companion scroll views
- Notes Hub uses `FlatList` for sections
- No new render loops introduced
- **P2:** Large Home dashboard still renders many optional blocks when data exists — acceptable for V1

---

## 16. Development leftovers removed / gated

| Term | Location | Action |
|------|----------|--------|
| Upgrade / Pro | Life Book | Gated when free launch |
| Upgrade / Pro | You, paywall, upgrade-card | Hidden via `isPaywallEnabled()` |
| Call Voxa / Schedule | Home, Talk | Feature flags off |
| Mic / Voice note | Talk composer | `release-voice` gates off |
| Test voice output | voice-call-screen | Unreachable route |
| Billing QA | you-screen | `__DEV__` only |

Production tab-visible surfaces: **clean**.

---

## 17. Files changed

```
src/constants/theme.ts
src/utils/friendly-error.ts                    (new)
src/components/premium/premium-ui.tsx
src/components/chat/chat-input-bar.tsx
src/components/ui/screen-state.tsx
src/navigation/premium-tab-bar.tsx
src/screens/home-screen.tsx
src/screens/memory-screen.tsx
src/screens/notes-hub-screen.tsx
src/screens/note-editor-screen.tsx
src/screens/life-book-screen.tsx
docs/FINAL_PRE_TESTFLIGHT_UI_AUDIT.md          (new)
```

---

## 18. Tests passed

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ Pass |
| `npm test` | ✅ 100/100 |
| `npm run lint --if-present` | ✅ (no lint script / pass) |
| `npx expo-doctor` | ✅ 18/18 |

---

## 19. P0 blockers

**None identified** for TestFlight build with Free V1 flags.

---

## 20. P1 blockers (physical device QA)

1. **Dynamic Type max** — verify Home hero headline and Talk bubbles on iPhone SE / mini
2. **Keyboard + composer** — Talk multiline expansion with keyboard open (safe-area)
3. **Spoken reply** — confirm single playback source; stops when leaving Talk
4. **Fresh install onboarding** — complete flow, no mic permission prompt
5. **Account switch** — no cross-account data visibility
6. **Offline → online** — Home retry, Notes autosave recovery

---

## 21. P2 issues

1. Dormant routes (voice-call, safe-call, paywall) still contain upgrade copy — unreachable
2. `features-screen` "Coming soon" section — dev/features route only
3. Home density when all optional services return data — monitor on small screens
4. Note editor header could move secondary actions to overflow menu (future polish)

---

## 22. Physical-device checks remaining

- [ ] Fresh install onboarding (mid-resume + complete)
- [ ] Home: empty, populated, pull-to-refresh, offline
- [ ] Talk: long response, lists, code, keyboard, spoken reply
- [ ] Notes: create, edit, pin, favourite, archive, restart
- [ ] Journey: timeline filters, Life Book read/export
- [ ] Settings: privacy, terms, export, logout, account deletion
- [ ] App lifecycle: background/foreground, force close
- [ ] VoiceOver pass on Home, Talk, tab bar, check-in mood chips
- [ ] Reduce Motion enabled — no orb pulse, instant fades

---

## Final verdict

### **READY FOR PHYSICAL DEVICE QA**

Automated validation passes. Production-visible UI meets Free V1 polish bar: calm ink/teal identity, consistent tokens, premium loading/empty/error states, and no paywall/mic/call surfaces. Physical-device QA (Section 22) should complete before TestFlight submission.

---

**UI FEATURE FREEZE CONFIRMED.**  
**NO ADDITIONAL PRODUCT FEATURES RECOMMENDED BEFORE TESTFLIGHT.**
