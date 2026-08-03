# Scheduled Companion Calls — Privacy

## Principles

- Opt-in scheduling only (explicit Confirm).
- Opt-in notifications.
- Global disable in Scheduled calls settings.
- No CallKit / PushKit / silent background mic.
- No emergency / medical promises.
- No manipulative streak or guilt language in companion context.
- Respect system Focus / Do Not Disturb (OS-controlled).

## Lock-screen content

Default preview mode: **Generic**

- Title: `Incoming call from {companionName}`
- Body: `Your scheduled companion call is ready.`

Contextual mode (user-enabled):

- Body may include the chosen reason title only.
- Never include private memories, secrets, or free-form sensitive notes in the payload.

## Data stored locally

- Schedule metadata under `@voxa/scheduled_companion_calls`
- Preferences under `@voxa/scheduled_calls_preferences`

Notification `data` contains only:

- `kind`
- `scheduledCallId`
- `route`
- `reasonType`
- `autoStartRealtime`
