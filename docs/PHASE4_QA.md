# Phase 4 — World-Class AI Companion QA

## Prerequisites

```bash
cd ~/Voxa
npx tsc --noEmit
npx expo start -c
```

---

## Feature 1 — Living Companion

| Step | Action | Expected |
|------|--------|----------|
| 1.1 | Open Home on different days | Greeting/subline varies — not identical script |
| 1.2 | Open Chat header | Mood + energy badge; "thinking about..." when data exists |
| 1.3 | Return after 1+ day away | Warm return greeting on Home |

## Feature 2 — Context Cards

| Step | Action | Expected |
|------|--------|----------|
| 2.1 | Create goal + memory + routine streak | Chat shows "I'm thinking about..." chips |
| 2.2 | Tap a context card | Sends real prompt — conversation continues |
| 2.3 | New user with no data | No fake cards — row hidden or minimal |

## Feature 3 — Smart Chat Actions

| Step | Action | Expected |
|------|--------|----------|
| 3.1 | Send meaningful message | Action chips appear after reply |
| 3.2 | Tap "Remember this" | Confirmation; memory created |
| 3.3 | Tap "Save to journal" | Entry persisted after restart |
| 3.4 | Tap "Add to bucket list" | Item in Life OS storage |
| 3.5 | Tap "Favourite reply" | Saved without crash |

## Feature 4 — AI Personality 3.0

| Step | Action | Expected |
|------|--------|----------|
| 4.1 | Discuss startup/business | Business partner tone (no mode picker) |
| 4.2 | Brainstorm creative idea | Creative partner tone |
| 4.3 | Vent emotionally | Calm listener tone |

## Feature 5 — Conversation Quality

| Step | Action | Expected |
|------|--------|----------|
| 5.1 | Chat 5+ turns | No repeated greeting openers |
| 5.2 | Ask for help | Warm, specific reply — not generic AI preamble |
| 5.3 | Uncertain memory topic | Voxa uses "I think I remember..." language |

## Feature 6 — Conversation Canvas

| Step | Action | Expected |
|------|--------|----------|
| 6.1 | Say "I'm starting a business" | Workspace card appears |
| 6.2 | Continue planning | Sections populate (goals, tasks, next actions) |
| 6.3 | Expand/collapse workspace | Progress bar updates |

## Feature 7 — Memory Confidence

| Step | Action | Expected |
|------|--------|----------|
| 7.1 | Open Memories screen | High/Medium/Low confidence badges |
| 7.2 | Tap Correct | Update content + confidence rises |
| 7.3 | Tap Forget | Memory removed |

## Feature 8 — Relationship Growth

| Step | Action | Expected |
|------|--------|----------|
| 8.1 | Journey after 30+ days | "Our friendship" evolution line |
| 8.2 | 100 conversations milestone | Delight moment (once) |

## Feature 9 — Life Operating System

| Step | Action | Expected |
|------|--------|----------|
| 9.1 | Smart action → bucket list | Persists after restart |
| 9.2 | Smart action → vision board | Persists after restart |
| 9.3 | Smart action → challenge | Persists after restart |

## Feature 10 — Chat Experience

| Step | Action | Expected |
|------|--------|----------|
| 10.1 | Context chips + smart actions + canvas | All visible without clutter |
| 10.2 | Search conversation | Still works |
| 10.3 | Regenerate / retry failed send | Still works |
| 10.4 | Optimistic send | Instant user bubble |

## Feature 11 — Delight Moments

| Step | Action | Expected |
|------|--------|----------|
| 11.1 | Hit milestone (goal complete, 100 chats) | Personal message surfaced |
| 11.2 | Same milestone next day | Not repeated (cooldown) |

## Feature 12 — Trust

| Step | Action | Expected |
|------|--------|----------|
| 12.1 | Ask about unknown fact | Admits uncertainty |
| 12.2 | No invented memories in replies | Verified against stored data |

---

## Regression

- [ ] Voice notes play/upload
- [ ] Rituals + Routine Coach
- [ ] Phase 2/3 dashboard cards
- [ ] Companion Studio
- [ ] `useCachedDashboard` still caches 60s
- [ ] No duplicate records from smart actions

## Performance

- [ ] Home warm load < 500ms (cached)
- [ ] Chat load feels instant with optimistic UI
- [ ] Journey sections lazy/staggered
