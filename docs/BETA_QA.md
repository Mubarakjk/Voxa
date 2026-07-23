# Voxa Beta QA Checklist

Test on a **physical device**. Voice notes are **stable** — no need for experimental mode.

## Auth & onboarding
- [ ] Sign up with email → verify onboarding completes
- [ ] Log in → session persists after app restart
- [ ] Sign out → sign back in → profile and chat history intact
- [ ] Local-only mode (no Supabase) → Welcome → skip auth → app usable

## Chat (primary feature)
- [ ] Send text → optimistic bubble appears instantly
- [ ] Typing indicator shows immediately
- [ ] Voxa reply streams or arrives reliably
- [ ] Context-aware suggested replies (max 3)
- [ ] Long press → Copy, Remember, Bookmark
- [ ] Search conversation, new conversation, history
- [ ] Failed send shows error state

## Voice notes (stable)
- [ ] Mic permission granted → record starts on tap
- [ ] Mic permission denied → clear alert, no crash
- [ ] Timer + waveform visible while recording
- [ ] Cancel discards recording and releases mic
- [ ] Pause/resume works or fails gracefully
- [ ] Preview tray shows voice note before send
- [ ] Send → bubble with play/pause, duration, progress, speed
- [ ] Transcription appears when OpenAI configured
- [ ] Transcription unavailable still keeps message
- [ ] Voxa replies based on transcript
- [ ] Play another note stops previous playback
- [ ] Speed toggle 1x / 1.5x / 2x
- [ ] Long press → Remember, Save to Journey, Copy transcript, Delete, Retry upload
- [ ] Play aloud transcript works
- [ ] Offline send keeps local URI
- [ ] Failed upload shows retry; message persists
- [ ] Restart app → voice messages still play
- [ ] Sign out/in → voice messages persist

## Camera photo
- [ ] Take photo → send → analysis → Save to Journey

## Morning & evening rituals
- [ ] Home shows ritual progress ring when daily check-in is enabled
- [ ] Continue Morning / Continue Evening card appears when ritual pending
- [ ] No duplicate ritual cards on Home
- [ ] Morning flow: overview → questions → done
- [ ] Evening flow: overview → questions → goodnight orb fade
- [ ] Skip dismisses without saving mood/memory
- [ ] Remind me later snoozes; card returns same day
- [ ] Done saves mood, journal, and memory (when meaningful)
- [ ] Streaks update after completion (morning, evening, combined)
- [ ] Missed day greetings at 1 / 3 / 7 / 30+ days (supportive, no guilt)
- [ ] Birthday greeting when birthdays memory matches today
- [ ] Relationship milestone (e.g. 100 conversations) shows special moment
- [ ] Ritual content uses real goals, routine, memories, messages only
- [ ] Offline: ritual opens and saves locally

## Pinned memories
- [ ] Pin memory from Memories screen
- [ ] Unpin works
- [ ] Pinned memories appear first in list
- [ ] Pinned memories surface in Journey
- [ ] Pinned memories prioritized in chat context

## Weekly recap
- [ ] With enough data → recap shows wins, challenges, focus
- [ ] With insufficient data → empty state, no fake content
- [ ] Open from Journey

## Routine Coach
- [ ] Add / edit / delete / complete / skip / snooze

## Journey
- [ ] Empty sections hidden
- [ ] Pinned, voice, photo, remember-this sections when data exists

## Hidden (experimental=false)
- [ ] No live voice call, safe call, music, gallery, or video

## Debug panel (You → Show debug)
- [ ] Voice note duration, URI, size, transcription, upload, audio error
- [ ] Chat latency, photo analysis, routine sync

## Offline / resilience
- [ ] App opens without network
- [ ] Voice note + chat fail gracefully offline
- [ ] No crash on missing API keys
