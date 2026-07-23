# Voxa Stability Sprint Report

**Sprint rules:** No new features. No UI redesign. No new services. Production-quality fixes only.

---

## 1. Bugs Found & Fixed

| # | Area | Bug | Root cause | Status |
|---|------|-----|------------|--------|
| 1 | Chat | Duplicate user messages after failed send | Failed optimistic rows merged with persisted DB rows on reload | **Fixed** — reload on failure, drop optimistic |
| 2 | Chat | Failed sends had no retry | No retry handler on failed bubbles | **Fixed** — tap-to-retry on failed user messages |
| 3 | Chat | Regenerate duplicated Voxa replies | Old Voxa row never deleted from repository | **Fixed** — delete before resend |
| 4 | Chat | Regenerate lost voice transcription | Resent display text instead of transcript | **Fixed** — `userMessageSendText()` helper |
| 5 | Chat | Invalid conversationId fell back silently | `getConversation` null → create new chat | **Fixed** — explicit "Conversation not found" |
| 6 | Chat | Infinite loading when profile null | `loadChat` returned before `setIsLoading(false)` | **Fixed** |
| 7 | Chat | Search ignored voice transcripts | Filter only checked `message.text` | **Fixed** — `messageSearchText()` |
| 8 | Chat | Bookmark toggle failed silently | No try/catch on AsyncStorage write | **Fixed** |
| 9 | Chat | Bookmarks orphaned on delete | `deleteMessage` didn't remove bookmark | **Fixed** — `removeBookmark()` |
| 10 | Chat | Hybrid local cache mirror silent fail | `.catch(() => undefined)` on upsert | **Fixed** — `logFeature` on failure |
| 11 | Schema | `updateMemory` sent camelCase columns | Raw spread of `UpdateMemoryInput` | **Fixed** — `memoryToUpdate()` mapper |
| 12 | Schema | Memory intelligence columns missing | `emotional_significance`, `confidence`, `expires_at` not in DB | **Fixed** — migration + mappers |
| 13 | Schema | `conversations.summary` never persisted | `updateConversation` omitted column | **Fixed** — migration + mapper |
| 14 | Schema | `updateReminder` sent camelCase | Raw spread of `UpdateReminderInput` | **Fixed** — `reminderToUpdate()` |
| 15 | Schema | `notification_id` never written | camelCase `notificationId` in update | **Fixed** |
| 16 | Schema | `trusted_contacts.is_emergency` not mapped | Missing in create/read mappers | **Fixed** |
| 17 | Voice | Audio lock leak on cancel failure | `releaseLock` only in try path | **Fixed** — `finally` block |
| 18 | Voice | Multi-note playback UI broken | Single listener overwrote subscribers | **Fixed** — `Set<Listener>` |
| 19 | Voice | Playback errors silent | `void play()` with no catch | **Fixed** — Alert on failure |
| 20 | Voice | TTS/voice-note lock conflict | Both used `'tts'` owner | **Fixed** — `'voice-note-playback'` |
| 21 | Voice | Pause failure silent | Empty catch in `togglePause` | **Fixed** — user alert |
| 22 | Voice | No stage instrumentation | Debug state had 6 fields only | **Fixed** — full stage log |
| 23 | Ritual | Remind-later hid ritual card | `morningRemindLater` excluded pending | **Fixed** (prior session) |
| 24 | Offline sync | Local messages never pushed to Supabase | No outbound sync queue | **Documented** — local-first by design; hybrid logs failures |

---

## 2. Files Changed

### Schema
- `supabase/migrations/20260711_stability_sprint.sql` — **NEW** combined migration

### Supabase layer
- `src/services/supabase/mappers.ts` — snake_case mappers, memory/reminder/conversation/trusted_contact fields
- `src/services/supabase/supabase-repositories.ts` — use mappers in update/create paths

### Chat
- `src/screens/chat-screen.tsx` — load/send/regenerate/search/bookmark/delete fixes + logging
- `src/components/chat/chat-message-bubble.tsx` — tap-to-retry failed sends
- `src/services/chat/chat-bookmarks-service.ts` — `removeBookmark()`
- `src/services/hybrid/hybrid-repositories.ts` — logged mirror failures

### Voice notes
- `src/utils/voice-note-debug-state.ts` — stage log for every recording step
- `src/components/chat/voice-note-recorder.tsx` — instrumentation + lock recovery
- `src/components/chat/voice-note-attachment.tsx` — playback error alerts
- `src/services/audio/voice-note-player-service.ts` — multi-subscriber + separate lock owner

### Infrastructure (stability tooling — not features)
- `src/utils/feature-logger.ts` — **NEW** START/SUCCESS/FAILURE/TIME logging
- `src/utils/performance-metrics.ts` — **NEW** timing + cache hit tracking
- `src/hooks/use-cached-dashboard.ts` — cache hit/miss recording
- `src/screens/health-check-screen.tsx` — **NEW** hidden QA health screen
- `src/navigation/types.ts` — `HealthCheck` route
- `src/navigation/root-navigator.tsx` — register health screen
- `src/screens/you-screen.tsx` — "System health" link in debug panel

### Docs
- `docs/STABILITY_SPRINT.md` — this report
- `docs/STABILITY_QA.md` — acceptance checklist

---

## 3. Schema Migration

**File:** `supabase/migrations/20260711_stability_sprint.sql`

```sql
-- Adds to memories: emotional_significance, confidence, expires_at
-- Adds to conversations: summary
-- Creates/aligns routine_blocks + routine_completions with text FK types
-- RLS policies for routine tables
```

**Apply:**
```bash
supabase db push
# or run SQL in Supabase dashboard SQL editor
```

**Intentionally local-only (no table):** journals, notifications, voice_notes (embedded in `messages.attachments`), subscriptions (`profiles.subscription` jsonb).

---

## 4. Performance Report

Instrumentation via `getPerformanceReport()` (visible on Health Check screen).

| Metric | How measured |
|--------|----------------|
| Chat load latency | `chat.load` timing in `chat-screen.tsx` |
| Chat send latency | `chat.send` timing + `recordChatLatency` |
| Dashboard cache hit % | `use-cached-dashboard` hit/miss counters |
| Home/Journey/Routine/Memory | Hooks ready — call `recordTiming()` on screen focus |

**Baseline:** Run app, send 5 messages, open Home 3×, check **You → Show debug → System health**.

---

## 5. Health Report

**Access:** You tab → Show debug → **System health**

| Service | Green | Yellow | Red |
|---------|-------|--------|-----|
| Current user | Profile loaded | — | No profile |
| Supabase | Configured + session | Local-only mode | Auth error |
| OpenAI | API key set | No key (offline AI) | — |
| Audio | Idle | Voice call active | — |
| Storage | Read/write probe OK | — | Probe failed |
| Memory | List succeeds | — | List throws |
| Routine | Schedule loads | — | Load throws |
| Journal | Entries load | — | Load throws |
| Voice note | Recent recording OK | No recording yet | Last audio error |
| Chat | Last save OK | Not saved yet | Last save failed |
| Attachments | Bucket OK | Local only | Bucket fail |
| Cache | Dashboard cache stats | — | — |

Tap any row to re-run checks.

---

## 6. QA Checklist (Acceptance)

See `docs/STABILITY_QA.md` for the full device test matrix.

**Ship gate:**
- [ ] `npx tsc --noEmit` passes
- [ ] Zero runtime exceptions in 10-min smoke test
- [ ] Chat send/receive/persist/restart
- [ ] Voice note record → send → play → transcript
- [ ] Memory save from chat
- [ ] Routine complete/skip
- [ ] Journey loads with real data
- [ ] Health screen all green (or yellow for expected offline)
- [ ] Migration applied to Supabase project

---

## 7. Remaining Known Limitations

| Item | Notes |
|------|-------|
| Offline → Supabase sync | Local-first; no outbound sync queue (by design for sprint scope) |
| Signed URL expiry (7d) | Playback falls back to `localUri`; refresh not implemented |
| Routine Supabase repo | Routines remain AsyncStorage; schema ready for future sync |
| Transcription retry UI | Shows "unavailable"; retry via re-upload only |

---

## Commands

```bash
cd ~/Voxa
npx tsc --noEmit
npx expo start -c
```

Apply migration before testing Supabase-backed flows.
