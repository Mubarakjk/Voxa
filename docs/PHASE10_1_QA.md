# Phase 10.1 — Play System Polish QA

## Challenge actions (`DailyChallenge` screen)
- [ ] Accept → status `accepted`, persists restart
- [ ] Skip → confirm dialog, status `skipped`
- [ ] Replace → confirm, new title (different template)
- [ ] Complete → confirm, +XP once, celebration
- [ ] Undo completion → XP revoked via ledger
- [ ] View details on screen with Talk link when accepted
- [ ] Home Today's Adventure reflects status + primary CTA

## Weekly mission (`WeeklyMission` screen)
- [ ] Start mission → status `active`
- [ ] Complete task (+1), undo, skip per task
- [ ] Progress bar + days remaining + supportive copy (no guilt)
- [ ] Mission complete → +150 XP once + celebration
- [ ] Abandon / restart work

## Celebrations
- [ ] Challenge complete, mission complete, achievement, spin XP, level up, high score
- [ ] Tap to dismiss, no block on navigation
- [ ] Does not repeat after restart (event keys persisted)
- [ ] Reduced motion: skips non-critical confetti

## Daily spin
- [ ] Wheel animates, one spin/day
- [ ] Result persists, countdown to next spin
- [ ] XP granted once via reference id

## Arcade
- [ ] Each game → session screen → Start → Talk → I won / Finished
- [ ] Result + XP once per session, stats update, replay works

## Journey Play & growth
- [ ] XP history, achievements, challenge/mission history, best scores (hidden when empty)

## Debug (Health Check)
- [ ] Play rows show XP, level, challenge/mission status, spin, duplication guard

```bash
npx tsc --noEmit
```
