# Phase 11 — The Living Companion — QA

## Architecture

Phase 11 is an **orchestration layer** that unifies existing companion systems (Phases 4–10) instead of adding disconnected tools.

```
getHomeDashboard()
  └─ buildPhase11Dashboard()     → emotionalMessage, recall, followUp, mood, rhythm, personality, relationship, ourStory, wowMoment

sendChatMessage()
  └─ buildPhase11Dashboard() + buildPhase11PromptForChat()
  └─ getFollowUpEngineService().detectFromMessage()
  └─ response-planner smart interruptions (tired → support first; wins → celebrate first)
  └─ conversation-style-memory (Phase 9) → styleHintsFromPrefs()

Home (max ~3 content cards + hero)
  Hero: living orb mood + emotional message
  LivingCompanionHomeCard: focus, relationship, recall, follow-up
  TodaysAdventureCard: play/adventure only

Journey
  OurStorySection: milestone timeline from real data
```

## QA checklist

### Companion memory recall
- [ ] Home hero shows a line derived from real memories/goals (not generic filler)
- [ ] Chat prompt includes recall block when memories exist
- [ ] Recall references interview, exam, startup, gym, football, family when stored

### Follow-up engine
- [ ] Mention "interview" in chat → follow-up scheduled (~2 days)
- [ ] Mention "gym" → follow-up scheduled (~7 days)
- [ ] Only one open follow-up per topic (no spam)
- [ ] Due follow-up appears on Home; tap resolves and opens Talk

### Inside jokes
- [ ] Repeated phrases/nicknames from bundle appear in personality block
- [ ] Inside joke line surfaces on Home when no recall/follow-up

### Our Story
- [ ] Journey shows "Our Story" with first conversation, milestones, shared timeline
- [ ] Milestones include 100 chats, first goal when applicable

### Relationship milestones
- [ ] Stage label on Home (New Friend → Life Companion)
- [ ] Progress bar and unlock hints visible
- [ ] Stage affects prompt depth via `stagePromptBlock`

### Personality growth
- [ ] Evolution line changes with relationship stage
- [ ] Traits list reflects stage

### Mood engine
- [ ] Orb mood changes by time of day, streak, days away, celebrating
- [ ] Never random — check morning (calm), late night (sleepy), streak 7+ (happy)

### Real daily life
- [ ] Morning: greeting, focus, routine hint, quote
- [ ] Evening: reflection, progress, sleep reminder

### Smart interruptions
- [ ] "I'm tired" → emotional support first, no task planning in prompt
- [ ] "I passed" → celebrate first in prompt

### Conversation style memory
- [ ] Short messages over time → shorter replies suggested in prompt
- [ ] Emoji/humour preferences reflected

### Conversation flow
- [ ] Replies feel less list-heavy (prompt rules active)
- [ ] Callbacks to memories when relevant

### Home redesign
- [ ] Hero + LivingCompanionHomeCard + TodaysAdventureCard only (no duplicate plan/coach cards)
- [ ] Living orb uses phase11 mood

### Chat polish
- [ ] Assistant messages render markdown (lists, code blocks, tables)
- [ ] Bubble fade/slide animation on appear

### Micro interactions & wow
- [ ] Level-up celebration still fires from Phase 10
- [ ] Wow moment on Home uses real pinned memory/goal; cooldown once/day
- [ ] Opening Talk from wow marks wow shown

### Performance
- [ ] Home loads from cached dashboard (60s TTL)
- [ ] No extra navigation routes added
- [ ] `npx tsc --noEmit` passes

### Regression (Phases 1–10)
- [ ] Talk, Journey, Routine, Play/challenges still reachable
- [ ] Navigation unchanged
- [ ] Phase 10 adventure card still works

## Commands

```bash
npx tsc --noEmit
```

## Remaining blockers / follow-ups

- **Weather on Home**: placeholder string until location/settings integration
- **Swipe actions on chat bubbles**: long-press sheet exists; native swipe not added
- **Pinned messages in chat**: memory pinning exists in Journey; dedicated chat pin UI not added
- **Full-screen quality pass**: audit all screens manually on device for dead buttons/empty cards
- **daysAway in chat prompt**: sendChatMessage uses `daysAway: 0` for speed; Home dashboard uses real value
