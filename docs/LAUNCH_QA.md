# Voxa Launch QA Checklist

Run on a **physical device** with production `.env` keys where noted.

Legend: ✅ Working · ⚠ Needs implementation · ❌ Broken

---

## Authentication

| Flow | Status | Verify |
|------|--------|--------|
| Signup (Supabase) | ✅ | Create account → lands in onboarding |
| Login | ✅ | Existing user → main tabs |
| Logout | ✅ | You → Sign out → auth screen |
| Forgot password | ✅ | Email sent / error shown |
| Local mode (no Supabase) | ✅ | Welcome → skip auth |

## Onboarding

| Flow | Status | Verify |
|------|--------|--------|
| Complete onboarding | ✅ | All steps → Home |
| Skip optional fields | ✅ | Age/sleep skippable |
| Keyboard safe | ✅ | Inputs visible with keyboard |

## Chat

| Flow | Status | Verify |
|------|--------|--------|
| Send text | ✅ | Optimistic bubble → Voxa reply |
| Streaming reply | ✅ | Text streams when OpenAI configured |
| Mode switch | ✅ | Picker changes conversation |
| Remember this | ✅ | Long press → Journey shows moment |
| Suggested replies | ✅ | Tap sends message |
| Feature starter prompts | ✅ | Explore → smart feature → Talk pre-filled |
| Error on send fail | ✅ | Failed bubble + message |

## Voice

| Flow | Status | Verify |
|------|--------|--------|
| Start call | ✅ | Hears user, speaks back (OpenAI required) |
| End call | ✅ | Clean disconnect |
| Safe Call | ✅ | Wellbeing prompts, no emergency dispatch |
| Test mic / speaker | ✅ | Voxa tab buttons |
| Reset audio | ✅ | Recovers stuck session |
| Without OpenAI | ⚠ | Shows clear “configure OpenAI” message |

## Attachments

| Flow | Status | Verify |
|------|--------|--------|
| Photo library | ✅ | Preview → send |
| Take photo | ✅ | Camera opens after sheet closes |
| Video library | ✅ | Preview → send |
| Record video | ✅ | Camera video |
| Voice note | ✅ | Preview tray → send |
| Upload fail (no Supabase) | ✅ | Local URI + retry on bubble |

## Music

| Flow | Status | Verify |
|------|--------|--------|
| Identify song | ✅ | 14s capture (AudD token required) |
| Voice call block | ✅ | Error if call active |
| Retry on fail | ✅ | Try again button |
| Without AudD token | ⚠ | Clear setup message |

## Memories & Journey

| Flow | Status | Verify |
|------|--------|--------|
| Auto memory extract | ✅ | After chat (silent if fails) |
| Memory screen | ✅ | List / delete / clear with errors |
| Journey dashboard | ✅ | Stats, timeline, journal |
| Routine Coach | ✅ | Complete / skip / snooze |
| Daily journal | ✅ | Generates once per day |

## Companion Studio

| Flow | Status | Verify |
|------|--------|--------|
| Voice preview | ✅ | Hear sample |
| Personality sliders | ✅ | Save persists |
| Appearance | ✅ | Name + avatar |
| Extended (wake phrase) | ✅ | Save persists |
| 3D avatars | ⚠ | Coming soon label |

## Subscription

| Flow | Status | Verify |
|------|--------|--------|
| Paywall UI | ✅ | Plans display |
| Local trial | ✅ | Activates locally |
| App Store IAP | ⚠ | Stub — pre-launch blocker |
| Restore purchases | ⚠ | Local read only |

## Settings (You)

| Flow | Status | Verify |
|------|--------|--------|
| Notifications toggle | ✅ | Toggles + schedules check-ins |
| Memory depth / humour | ✅ | Cycle on tap |
| Export data | ✅ | Share sheet |
| Debug panel | ✅ | Env + provider info |

## Performance targets

| Metric | Target | Verify |
|--------|--------|--------|
| Home warm load | <500ms | Second visit uses cache |
| Chat send | Instant | Optimistic UI |
| Navigation | 60fps | Tab lazy load enabled |
| No infinite loaders | — | Retry on Home/You errors |

## Pre–App Store blockers

1. **Real IAP** — Replace `StubPurchaseManager` / `StubBillingService`
2. **App Store metadata** — Privacy policy, support URL
3. **Production env** — OpenAI, Supabase, AudD keys in EAS secrets
4. **Storage bucket** — `chat-attachments` migration applied

---

*Last updated: Release Candidate pass*
