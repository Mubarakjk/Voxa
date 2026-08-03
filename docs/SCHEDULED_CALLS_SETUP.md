# Scheduled Companion Calls — Setup

## What this is

Local notification alerts styled as “Incoming call from Voxa”.  
**Not** a telephone call. **No** PushKit / CallKit in V1.

## Requirements

- Expo SDK 54 / custom native (dev) build — not Expo Go for Realtime Answer
- `expo-notifications` (already configured in `app.json`)
- Optional Answer → live session: `EXPO_PUBLIC_REALTIME_VOICE_ENABLED=true`

## Environment

```bash
EXPO_PUBLIC_SCHEDULED_CALLS_ENABLED=true
EXPO_PUBLIC_REALTIME_VOICE_ENABLED=true   # needed for Answer → RealtimeCall
```

When `EXPO_PUBLIC_SCHEDULED_CALLS_ENABLED` is not `true`:

- Home card and You entry are hidden
- No dead buttons

## Architecture

1. **Model** — `ScheduledCompanionCall` in AsyncStorage (`@voxa/scheduled_companion_calls`)
2. **Service** — `ScheduledCallService` schedules a rolling window of DATE triggers (max 7)
3. **Category** — `VOXA_SCHEDULED_CALL` with Answer / Snooze / Decline
4. **Hook** — `useScheduledCallNotifications` reconciles on launch/foreground and routes Answer to `RealtimeCall`
5. **Realtime** — mic / WebRTC start only inside `RealtimeCallScreen` after foreground open

## Permission copy

“Allow Voxa to alert you when a scheduled companion call is ready.”

If denied: schedule is still saved; UI shows alerts disabled + Open Settings.

## Privacy defaults

- Notification preview: **Generic** (“Incoming call from Voxa”)
- Optional contextual reason (user toggle)
- Optional short context is **not** placed in the notification payload
