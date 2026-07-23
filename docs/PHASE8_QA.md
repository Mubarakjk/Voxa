# Phase 8 — Voxa Daily Companion QA

## Scope
Habit & retention: life calendar, inside jokes, shared timeline, companion mood, challenges, monthly replay, photo story, widget architecture, workspace sessions, future conversations, preference memory, milestones, focused companion intelligence.

## TypeScript
```bash
npx tsc --noEmit
```

## Manual QA

### Home (max 5 sections)
- [ ] Hero with data-driven orb mood from `phase8.companionMood`
- [ ] Calendar line appears when reminders/memories/goals have events ("football at 6", "tomorrow is your interview")
- [ ] `DailyCompanionCard` shows today focus + mood
- [ ] Active challenge card OR dynamic presence OR proactive follow-up (one slot)
- [ ] Coach insight + routine progress
- [ ] Milestone/delight banner dismisses with cooldown

### Journey
- [ ] `SharedTimelineSection` — "Our story" narrative entries
- [ ] `MonthlyReplayCard` → `MonthlyReplay` screen
- [ ] `PhotoStorySection` for photo memories
- [ ] Shared challenges entry → `SharedChallenges` screen

### Talk
- [ ] "Continue tomorrow" schedules future conversation; resumes next day
- [ ] Workspace sessions created for business/study/fitness/travel/coding topics
- [ ] Preferences extracted from natural user statements only
- [ ] Focused context block reduces irrelevant prompt injection
- [ ] Inside jokes surface only when appropriate (existing intelligence bundle)

### Challenges
- [ ] Start challenge → launches Talk with starter prompt
- [ ] Daily check-in increments streak and progress
- [ ] Celebration on completion

### Regression
- [ ] All Phase 1–7 features intact
- [ ] No new bottom tabs
- [ ] Dashboard cache still works

## Architecture

| Area | Path |
|------|------|
| Types | `src/types/phase8-retention.ts` |
| Dashboard | `src/services/phase8/phase8-dashboard-service.ts` |
| Calendar | `life-calendar-service.ts` |
| Mood | `companion-mood-service.ts` |
| Challenges | `shared-challenges-service.ts` |
| Timeline | `shared-memories-timeline-service.ts` |
| Replay | `monthly-replay-service.ts` |
| Photos | `photo-story-service.ts` |
| Widget | `widget-data-service.ts` (architecture only) |
| Workspace | `workspace-sessions-service.ts` |
| Future convos | `future-conversations-service.ts` |
| Preferences | `preference-memory-service.ts` |
| Milestones | `conversation-milestones-service.ts` |
| Prompt filter | `companion-context-filter.ts` |
| UI | `src/components/phase8/*` |
| Screens | `monthly-replay-screen.tsx`, `shared-challenges-screen.tsx` |

Integration: `HomeDashboardData.phase8` in `voxa-companion-service.ts`; post-chat hooks for workspace, future conversations, preferences.
