# Scheduled Companion Calls — Completion

## Status

**READY FOR PHYSICAL DEVICE QA**

Not claimed as working on a locked iPhone with the app closed until that QA passes.

## Implemented

- Dedicated `ScheduledCompanionCall` model + local store
- Schedule / edit / pause / cancel / call now UI
- Home upcoming-call card (feature-flagged)
- expo-notifications category + Answer / Snooze / Decline
- Rolling DATE notification window (max 7)
- Reconcile on launch + foreground
- Missed-call detection prompt
- Answer → `RealtimeCall` with scheduled context (mic only on Call screen)
- Privacy preview default Generic
- Feature flag `EXPO_PUBLIC_SCHEDULED_CALLS_ENABLED`

## Intentionally not in V1

- PushKit / CallKit
- Custom bundled ringtone asset (uses default notification sound)
- Unlimited recurring OS triggers
- Cross-device timezone engine beyond stored IANA + local wall-clock reconcile
