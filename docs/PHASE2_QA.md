# Phase 2 QA Checklist

Test on a **physical device**. `EXPO_PUBLIC_EXPERIMENTAL_FEATURES=false`.

## Pre-flight
- [ ] `npx tsc --noEmit` passes
- [ ] No voice call or music recognition entry points visible

---

## 1. Life Timeline
- [ ] Journey → Life timeline shows real events from goals, memories, milestones
- [ ] Filter chips (All, Goals, Achievements, etc.) work
- [ ] Milestone count shown in timeline header
- [ ] Empty state when no timeline data (new user)

## 2. Relationship Dashboard
- [ ] Journey → "Your bond" shows conversation count, memories, ritual streak, goals done
- [ ] Relationship score and days together match real data
- [ ] Milestone chips appear when milestones exist
- [ ] Natural recall line shows when available

## 3. Daily AI Coach
- [ ] Home → "Today's coach" card with adapted message
- [ ] Journey → full coach card with focus + adapted sources
- [ ] Coach changes after completing morning ritual
- [ ] Coach references routine progress when blocks exist
- [ ] Low mood from check-in → gentler coach message

## 4. Deep Memory Engine
- [ ] Chat recalls relevant memories (not random)
- [ ] Pinned memories still prioritized
- [ ] Journey → Memory themes section shows real category clusters
- [ ] Theme counts match memory categories

## 5. Emotional Moments
- [ ] Home shows top emotional moment when available
- [ ] Journey → Emotional moments section (birthdays, callbacks, support)
- [ ] Birthday memory → celebration moment
- [ ] Return after absence → supportive message (not guilt)

## 6. Life Dashboard
- [ ] Journey → "Life at a glance" shows mood, sleep, routine %, goals, habits
- [ ] Mood trend reflects check-in history
- [ ] Journal snippet appears when journal exists
- [ ] Sleep schedule from onboarding when set

## 7. Smart Onboarding
- [ ] New user sees "Voxa remembers your life" step
- [ ] Memory level selection (Light / Balanced / Deep) saves
- [ ] "Daily coaching & rituals" step explains check-ins
- [ ] Check-in style selection saves to preferences

## 8. Performance
- [ ] Home loads without blocking (cached dashboard)
- [ ] Journey sections appear progressively (no freeze)
- [ ] Second Home visit within 60s uses cache (faster)
- [ ] No regression: chat send, voice notes, rituals, routines

## 9. Regression
- [ ] Chat send/receive unchanged
- [ ] Voice notes record/play unchanged
- [ ] Morning/evening rituals unchanged
- [ ] Routine Coach tab unchanged
- [ ] Memories pin/save unchanged
- [ ] Weekly recap unchanged
- [ ] Navigation tabs unchanged (Home, Talk, Routine, Journey, You)

---

## Acceptance
- [ ] All Phase 2 sections use **real data only** — no placeholders
- [ ] TypeScript passes
- [ ] No runtime exceptions in 10-min session
