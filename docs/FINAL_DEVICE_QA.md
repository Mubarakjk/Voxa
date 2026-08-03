# Voxa — Final Physical Device QA

Use a **real iPhone** with a preview/TestFlight or production-like build.

Release defaults: all voice/call flags **false**. Automated checks do not replace this list.

Record: **Pass / Fail / Blocked**, build number, iOS version, evidence notes.

---

## APP LIFECYCLE

| # | Test | Result | Evidence |
|---|------|--------|----------|
| 1 | Clean install | | |
| 2 | First launch | | |
| 3 | Sign-up | | |
| 4 | Sign-in | | |
| 5 | Onboarding completes | | |
| 6 | App background | | |
| 7 | App foreground | | |
| 8 | Force close → reopen | | |
| 9 | Logout | | |
| 10 | Sign back in | | |
| 11 | Offline launch | | |
| 12 | Reconnect | | |

---

## CORE PRODUCT

| # | Test | Result | Evidence |
|---|------|--------|----------|
| 13 | Home loads | | |
| 14 | Talk — text send/receive | | |
| 15 | Spoken reply playback | | |
| 16 | Stop playback | | |
| 17 | Replay a response | | |
| 18 | Voice selection + preview | | |
| 19 | Daily Check-in | | |
| 20 | Challenge Me | | |
| 21 | Notes — create | | |
| 22 | Notes — edit | | |
| 23 | Notes — archive | | |
| 24 | Notes — delete | | |
| 25 | Saved Moments | | |
| 26 | Journey | | |
| 27 | Life Book | | |
| 28 | My Companion | | |
| 29 | Memory edit / delete | | |
| 30 | Routines | | |
| 31 | Reminders | | |
| 32 | Camera / photo flow (if enabled) | | |
| 33 | Settings / You | | |
| 34 | Appearance / theme | | |
| 35 | Notifications (if enabled) | | |
| 36 | Paywall opens | | |
| 37 | Back navigation — no trap | | |

---

## CONFIRM ABSENT (release build)

These must **not** appear or request permissions:

| # | Surface | Result | Evidence |
|---|---------|--------|----------|
| 38 | Call Voxa / Realtime call UI | | |
| 39 | Scheduled calls list / schedule flow | | |
| 40 | Voice notes in chat | | |
| 41 | Microphone recording in chat | | |
| 42 | Test microphone / reset audio diagnostics | | |
| 43 | Call history | | |
| 44 | Experimental voice controls on Home/Talk | | |
| 45 | Orange mic indicator without user action | | |

---

## BILLING (quick smoke — full matrix in BILLING_SANDBOX_QA.md)

| # | Test | Result | Evidence |
|---|------|--------|----------|
| 46 | Paywall shows store prices | | |
| 47 | Restore purchases copy correct | | |
| 48 | Free tier usable without paywall loop | | |

---

## Sign-off

| Verdict | Criteria |
|---------|----------|
| **Blocked** | Any P0 crash, data loss, or absent-feature regression |
| **Pass** | All core rows pass; absent rows confirmed |

**Device QA owner:** _______________ **Date:** _______________

---

## Deferred (not in this release)

Do **not** enable for this QA pass:

- `EXPO_PUBLIC_REALTIME_VOICE_ENABLED=true`
- `EXPO_PUBLIC_SCHEDULED_CALLS_ENABLED=true`
- `EXPO_PUBLIC_VOICE_NOTES_ENABLED=true`
- `EXPO_PUBLIC_MICROPHONE_CHAT_ENABLED=true`

See dormant QA sections in git history if re-enabling for a future milestone.
