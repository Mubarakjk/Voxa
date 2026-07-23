# Phase 7 — Voxa Signature Experience QA

## Scope
Premium polish: living companion 2.0, motion system, chat upgrades, personality 4.0, dynamic presence, relationship evolution, delight 2.0, activities expansion, sports intelligence, Companion Studio traits.

## TypeScript
```bash
npx tsc --noEmit
```
Must pass with zero errors.

## Manual QA

### Home
- [ ] Living orb reflects mood from real data (streak, routine, time, goals)
- [ ] Dynamic presence card only shows memory-backed lines
- [ ] Relationship stage label appears when presence card shows
- [ ] Delight banner dismisses and respects cooldown
- [ ] Max ~5 primary sections visible; stagger animations on cards

### Talk (Chat)
- [ ] Header uses LiveCompanionOrb (thinking state while typing)
- [ ] Date separators between message days
- [ ] Context chips for goals, memories, routine
- [ ] Rich response blocks: table, timeline, action/reflection cards
- [ ] Drafts, bookmarks, search still work

### Companion Studio
- [ ] New trait sliders save and persist
- [ ] Humour, empathy, directness, coaching style affect tone (subjective)

### Activities
- [ ] 31 activities listed; new ones launch into Talk with starter prompt

### Sports
- [ ] Cricket, golf, rugby, UFC, F1 detected in conversation
- [ ] Facts labelled [FACT]; no invented live scores

### Regression
- [ ] Journey, Life OS, Rituals, Routine Coach, Voice Notes, Camera unchanged
- [ ] No new bottom tabs

## Architecture
- `src/types/phase7-signature.ts` — types
- `src/utils/premium-motion.ts` — shared motion tokens
- `src/services/phase7/` — living companion, presence, evolution, personality, dashboard, context chips
- `HomeDashboardData.phase7` wired in `voxa-companion-service.ts`
- Phase 7 prompt block appended to chat context
