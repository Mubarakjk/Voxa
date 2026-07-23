# Phase 3 — Adaptive Intelligence

Phase 3 makes Voxa feel more human and intelligent through adaptive modes, sports awareness, emotional tracking, memory ranking, weekly growth, and a personal knowledge graph.

## Architecture

```
sendChatMessage()
  → companionIntelligence.buildContext()
      → adaptiveIntelligenceService.planResponse()
          ├── modeInferenceEngine (emotion + intent + mode)
          ├── sportsIntelligenceEngine (prefs + online facts)
          ├── emotionalAwarenessEngine (long-term mood)
          └── knowledgeGraphEngine (connected profile)
      → contextEngine.toPromptExtension() + adaptive block
  → ai.generateReplyStream()
  → afterConversation()
      ├── conversation-style-engine (pacing, humour, emoji learning)
      ├── memory-aging-engine.fadeTrivial()
      └── adaptive state persisted in bundle.adaptive

getHomeDashboard()
  → buildPhase3Dashboard()
      ├── weeklyGrowthService
      ├── emotional insight
      └── knowledge highlights
```

## Key files

| Area | Path |
|------|------|
| Types | `src/types/phase3-intelligence.ts` |
| Orchestrator | `src/services/intelligence/adaptive-intelligence-service.ts` |
| Mode inference | `src/services/intelligence/mode-inference-engine.ts` |
| Sports | `src/services/intelligence/sports-intelligence-engine.ts` |
| Emotional awareness | `src/services/intelligence/emotional-awareness-engine.ts` |
| Knowledge graph | `src/services/intelligence/knowledge-graph-engine.ts` |
| Weekly growth | `src/services/intelligence/weekly-growth-service.ts` |
| Dashboard | `src/services/intelligence/phase3-dashboard-service.ts` |
| UI | `src/components/phase3/weekly-growth-card.tsx` |

## Adaptive modes

Human labels map to existing `CompanionModeId` for prompts:

| Label | Companion mode |
|-------|----------------|
| Friend | friend |
| Sports Friend | friend (+ sports block) |
| Coach / Motivator | coach |
| Mentor / Study Partner | teacher |
| Calm Listener | reflection |

Modes switch automatically per message — the chat UI no longer exposes a manual mode picker.

## Storage

`CompanionIntelligenceBundle.adaptive` persists:

- `lastModeLabel`, `lastSignals`
- `sportsPreferences` (teams, athletes, sports)
- `emotionalBaseline` (trend, check-in cooldown)

Hydrated via `hydrateIntelligenceBundle()` for backward compatibility.

## QA

See [PHASE3_QA.md](./PHASE3_QA.md).
