# Stability Sprint — QA Checklist

Test on a **physical device**. `EXPO_PUBLIC_EXPERIMENTAL_FEATURES=false`.

## Pre-flight
- [ ] `npx tsc --noEmit` passes
- [ ] `supabase/migrations/20260711_stability_sprint.sql` applied
- [ ] You → Show debug → System health → all green or expected yellow

---

## Priority 1 — Chat

### Send / receive
- [ ] Send text → optimistic bubble → Voxa reply arrives
- [ ] Typing indicator shows during wait
- [ ] Streaming text appears (when enabled)
- [ ] Failed send reloads thread (no duplicate user bubble)
- [ ] Tap failed bubble → retry sends successfully

### Persistence & restart
- [ ] Kill app → reopen → messages still present
- [ ] Sign out → sign in → history intact (Supabase mode)

### Offline
- [ ] Airplane mode → send fails with visible error (not infinite spinner)
- [ ] Reconnect → send works again

### Search
- [ ] Search finds text in voice note transcripts

### Bookmarks
- [ ] Bookmark message → icon shows
- [ ] Delete message → bookmark removed

### Delete & regenerate
- [ ] Delete user message → removed from UI and storage
- [ ] Regenerate Voxa reply → old reply gone, new reply only
- [ ] Regenerate after voice note → uses transcript context

### Mode & navigation
- [ ] Invalid `conversationId` → error state (not wrong chat)
- [ ] Switch companion mode → correct thread loads

---

## Priority 2 — Voice Notes

### Recording pipeline (check debug panel stages)
- [ ] Permission granted → recording starts
- [ ] Timer + waveform visible
- [ ] Cancel → mic released (can record again immediately)
- [ ] Pause unsupported → alert shown (not silent)
- [ ] Send → bubble with play/pause

### Playback
- [ ] Play/pause works
- [ ] Speed 1x / 1.5x / 2x
- [ ] Multiple voice notes in thread → correct active UI per note
- [ ] Missing file → "Playback failed" alert

### Upload & transcript
- [ ] Upload succeeds (or retry shown)
- [ ] Transcription appears when OpenAI configured
- [ ] Transcription unavailable still keeps message

### Recovery
- [ ] Cancel during error → no "Audio busy" lock
- [ ] Play during voice call → blocked with message

---

## Priority 3 — Supabase Schema

- [ ] Memory create with emotional significance persists (no PostgREST error)
- [ ] Memory pin/unpin updates tags correctly
- [ ] Conversation summary saves (check Supabase dashboard)
- [ ] Reminder notification_id saves on schedule
- [ ] No schema mismatch warnings in Supabase logs

---

## Priority 4 — Core flows

- [ ] Memory save from chat ("Remember this")
- [ ] Routine complete / skip / snooze
- [ ] Journey loads (no infinite spinner)
- [ ] Morning/evening ritual saves mood + journal
- [ ] Home loads under 3s warm start

---

## Priority 5 — Health screen

- [ ] You → Show debug → System health opens
- [ ] All services show status dot
- [ ] Tap service → re-runs check
- [ ] Recent failures section shows logged errors
- [ ] Performance section shows chat latency + cache %

---

## Acceptance gate

Nothing ships until ALL pass:

- [ ] Zero runtime exceptions (10-min session)
- [ ] Zero dead buttons
- [ ] Zero infinite loading states
- [ ] Zero schema mismatch errors (Supabase logs)
- [ ] Voice notes always record (permission granted)
- [ ] Chat always sends (online)
- [ ] Messages always persist (restart test)
- [ ] Memory always saves
- [ ] Routine always updates
- [ ] Journey always loads
- [ ] TypeScript passes
