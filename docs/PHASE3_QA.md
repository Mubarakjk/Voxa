# Phase 3 — Adaptive Intelligence QA

Manual verification checklist for Personality Engine 2.0, dynamic companion modes, sports intelligence, conversation learning, emotional awareness, memory ranking, weekly growth, and knowledge graph.

## Prerequisites

- `npx tsc --noEmit` passes
- App running with a profile that has some memories, goals, and check-in history
- Optional: network enabled for sports fact lookup

---

## 1. Personality Engine 2.0

| Step | Action | Expected |
|------|--------|----------|
| 1.1 | Send: "I'm so stressed about work" | Reply is empathetic, calm tone; chat header shows **Calm Listener** |
| 1.2 | Send: "Can you explain photosynthesis for my exam?" | **Study Partner** tone; structured explanation |
| 1.3 | Send: "I finally hit my goal!" | Warm, celebratory **Friend** response |
| 1.4 | Send: "Push me — I keep procrastinating" | **Motivator** / coach energy |

## 2. Dynamic Companion Modes (no manual picker)

| Step | Action | Expected |
|------|--------|----------|
| 2.1 | Open Chat header | No mode picker button (options icon removed) |
| 2.2 | Header subtitle | Shows adaptive label e.g. "Sports Friend · adapts to you" |
| 2.3 | Switch topics (study → venting → sports) | Header label updates after each reply without user action |

## 3. Sports Intelligence

| Step | Action | Expected |
|------|--------|----------|
| 3.1 | Say "I'm an Arsenal fan" — continue sports chat | Voxa remembers team preference in later messages |
| 3.2 | Ask about a match or team (online) | Facts labelled [FACT]; opinions labelled [OPINION] |
| 3.3 | Journey → Connected profile | Sports highlight appears when preferences exist |

## 4. Conversation Learning

| Step | Action | Expected |
|------|--------|----------|
| 4.1 | Send several short replies ("ok", "yeah", "thanks") | Over time, Voxa replies become more concise |
| 4.2 | Use emoji and humour in messages | Replies gradually match emoji/humour level |
| 4.3 | Ask open reflective questions | Voxa uses more reflective questioning style |

## 5. Emotional Awareness

| Step | Action | Expected |
|------|--------|----------|
| 5.1 | Complete 3+ check-ins with low/stressed mood | Home shows emotional insight card |
| 5.2 | Continue chatting after insight shown | Supportive check-in offered at most once per ~5 days |
| 5.3 | Decline / say "I'm fine" | No repeated intrusive check-ins in same session |

## 6. Memory Ranking

| Step | Action | Expected |
|------|--------|----------|
| 6.1 | Pin a meaningful memory | Recalled prominently in relevant chats |
| 6.2 | Old low-importance work memories unused 30+ days | Gradually demoted in retrieval (less frequent recall) |
| 6.3 | Emotional / people memories | Prioritised over transient work notes |

## 7. Weekly Growth Report

| Step | Action | Expected |
|------|--------|----------|
| 7.1 | Use app for a week (chats, routines, check-ins) | Home + Journey show **Weekly growth** card |
| 7.2 | Card content | Achievements, consistency, suggested focus, mood insight |
| 7.3 | New user with &lt;2 data points | Card hidden (no placeholder) |

## 8. Knowledge Graph

| Step | Action | Expected |
|------|--------|----------|
| 8.1 | Add goals + memories across themes | Journey **Connected profile** shows linked interests |
| 8.2 | Chat about a stored interest | Retrieval feels more personalised |
| 8.3 | `futurePersonalityArchitecture.memoryVisualization` | Returns non-empty nodes when data exists |

---

## Regression checks

- [ ] Chat send/retry/regenerate still works
- [ ] Voice notes play without audio lock leak
- [ ] Dashboard loads with 60s cache (`useCachedDashboard`)
- [ ] Phase 2 cards still render on Home and Journey
- [ ] No experimental features re-enabled

## Commands

```bash
cd ~/Voxa
npx tsc --noEmit
npx expo start -c
```
