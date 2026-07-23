# Phase 2 — Emotional Intelligence & Retention

No experimental features. No voice calls. No music recognition. Navigation unchanged.

---

## Files Changed

### New types
| File | Purpose |
|------|---------|
| `src/types/phase2-intelligence.ts` | Life/relationship/coach/emotional moment/timeline types |

### New services
| File | Purpose |
|------|---------|
| `src/services/intelligence/phase2-dashboard-service.ts` | Composes Phase 2 dashboard from real data |
| `src/services/intelligence/daily-coach-service.ts` | Adaptive daily coach from routines, goals, mood |
| `src/services/intelligence/emotional-moments-service.ts` | Anniversaries, callbacks, support, celebrations |
| `src/services/intelligence/life-timeline-service.ts` | Stable IDs, filters, milestone counts |
| `src/services/memory/memory-theme-service.ts` | Theme inference + semantic theme scoring |

### New UI
| File | Purpose |
|------|---------|
| `src/components/phase2/life-dashboard-card.tsx` | Life at a glance |
| `src/components/phase2/relationship-dashboard-card.tsx` | Bond metrics |
| `src/components/phase2/daily-coach-card.tsx` | Today's coach |
| `src/components/phase2/life-timeline-section.tsx` | Filterable timeline |

### Modified
| File | Change |
|------|--------|
| `src/services/voxa-companion-service.ts` | `HomeDashboardData.phase2` slice |
| `src/services/memory/memory-relevance.ts` | Theme-based semantic scoring |
| `src/services/intelligence/life-timeline-engine.ts` | Stable timeline IDs |
| `src/screens/journey-screen.tsx` | Phase 2 sections, lazy mount, filters |
| `src/screens/home-screen.tsx` | Daily coach + emotional moment cards |
| `src/screens/onboarding-screen.tsx` | Memory + coaching education steps |
| `src/types/index.ts` | Export phase2 types |

### Docs
| File | Purpose |
|------|---------|
| `docs/PHASE2_QA.md` | Device QA checklist |

---

## Architecture

```
getHomeDashboard(userId)
  ├── existing: memories, goals, routines, wow, homeIntelligence
  └── buildPhase2Dashboard()
        ├── buildDailyCoach()        ← routines, mood, goals, rituals
        ├── buildEmotionalMoments()  ← relationship moments + callbacks
        ├── normalizeTimelineEvents() + filters
        ├── summarizeMemoryThemes()  ← theme clusters
        ├── lifeDashboard snapshot   ← mood, sleep, habits, journal
        └── relationshipDashboard    ← conversations, streaks, milestones

Chat memory retrieval
  rankMemories() + inferMemoryTheme() + themeOverlapScore()
```

**Integration points (unchanged):**
- Memories, goals, routines, journals from existing repos
- Mood from `daily-check-in-service` mood history
- Ritual streaks from `ritual-service`
- Timeline from `CompanionIntelligenceBundle.lifeTimeline`
- Relationship from `wow-experience` + `relationship-moments-engine`

---

## Data Flow

1. **User opens Home / Journey** → `useCachedDashboard` (60s TTL)
2. **`getHomeDashboard`** loads profile, memories, goals, routines, bundle
3. **`buildPhase2Dashboard`** composes all Phase 2 slices from real data
4. **Home** shows: coach card, top emotional moment, ritual card
5. **Journey** shows: life dashboard, relationship dashboard, filtered timeline, themes
6. **Chat** uses enhanced `memory-relevance` with theme scoring on every prompt
7. **Onboarding** sets `memoryLevel` + `checkInStyle` with education copy

---

## Performance Impact

| Area | Approach |
|------|----------|
| Dashboard | Single `phase2` slice computed inside existing `getHomeDashboard` — no extra network |
| Cache | Reuses `useCachedDashboard` 60s TTL |
| Journey lazy load | Sections mount staggered (80–440ms) to avoid scroll jank |
| Timeline filters | Client-side `useMemo` on cached events |
| Memory themes | O(n) over memory list at dashboard build — negligible |

**Instrumentation:** `recordTiming('journey.load')`, `recordTiming('home.warm')`

---

## Feature Matrix

| # | Feature | Status |
|---|---------|--------|
| 1 | Life Timeline + filters | ✅ Filter chips by kind, stable IDs, milestones |
| 2 | Relationship Dashboard | ✅ Conversations, streaks, goals, memories, milestones |
| 3 | Daily AI Coach | ✅ Adapts to routine, mood, goals, rituals |
| 4 | Deep Memory Engine | ✅ Theme inference + semantic theme scoring in retrieval |
| 5 | Emotional Moments | ✅ Celebrations, support, callbacks, anniversaries |
| 6 | Life Dashboard | ✅ Mood, sleep, routines, goals, journal, habits |
| 7 | Smart onboarding | ✅ Memory level + coaching steps |
| 8 | Performance | ✅ Cache + lazy Journey sections |
| 9 | QA | ✅ `docs/PHASE2_QA.md` |

---

## QA Checklist

See [`docs/PHASE2_QA.md`](PHASE2_QA.md).

**Verify:**
```bash
npx tsc --noEmit
npx expo start -c
```
