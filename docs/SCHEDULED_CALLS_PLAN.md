# Scheduled Companion Calls — Implementation Plan (Phase 1 audit summary)

## Reuse

| System | Path | Use |
|---|---|---|
| Notifications | `notification-service.ts` | Cancel helpers; new category scheduling in ScheduledCallService |
| Check-in tap hook pattern | `use-proactive-check-in-notifications.ts` | Mirrored by `use-scheduled-call-notifications.ts` |
| Realtime call | `RealtimeCallScreen` + controller | Answer destination; mic only after screen start |
| Settings / Home patterns | You settings, DailyCheckInCard | Entry points + upcoming card |

## Build new

- Model + store + recurrence + service
- Schedule UI screens
- Notification category / actions
- Deep-link branch for `scheduled_companion_call`
- Feature flag + docs + tests

## Safety constraints

- No PushKit / CallKit
- No background mic
- Do not claim real telephony
- Honest device QA verdict
