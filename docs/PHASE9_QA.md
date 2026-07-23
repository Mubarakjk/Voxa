# Phase 9 — Voxa Intelligence 2.0 QA

## TypeScript
```bash
npx tsc --noEmit
```

## Core intelligence
- [ ] Response planner injects intent/style before every reply
- [ ] Quality layer polishes robotic openers
- [ ] Thinking style auto-detects (business, coding, sports, etc.)
- [ ] Conversation style memory adapts to user preferences

## Chat UX (better than ChatGPT)
- [ ] Premium starters on empty chat (calendar, goals, mood-aware)
- [ ] Composer toolbar with quick prompts + focus entry
- [ ] Larger composer, smoother chips
- [ ] Phase 9 smart suggestions after replies (max 3, no spam)
- [ ] Focus mode bar during active session

## Daily companion
- [ ] Daily plan card on Home with tappable items
- [ ] Wake companion prefs stored (alarm personality)
- [ ] Focus mode screen: 25/45/60/90 min sessions

## Regression
- [ ] Phases 1–8 intact
- [ ] No new bottom tabs

## Architecture
- `src/types/phase9-intelligence.ts`
- `src/services/phase9/*`
- `HomeDashboardData.phase9`
- Prompt stack: phase4 + phase7 + phase8 + phase9 planner
