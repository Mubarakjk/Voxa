# Phase 4 — World-Class AI Companion

Phase 4 makes Voxa feel alive, personal, and trustworthy — without copying ChatGPT or Replika.

## Architecture

```
getHomeDashboard()
  → buildPhase4Dashboard()
      ├── livingCompanionService (daily variation)
      ├── contextCardsService (real data only)
      ├── relationshipGrowthService
      ├── lifeOSService (bucket, vision, future self, life book, challenges)
      └── delightMomentsService

sendChatMessage()
  → Phase 3 adaptive context
  → buildPhase4PromptExtension() (trust + conversation quality)
  → AI reply
  → conversationCanvasService.updateFromExchange()
  → smartChatActionsService.suggest()
  → executeSmartChatAction() on user tap
```

## Key services

| Feature | Service |
|---------|---------|
| Living Companion | `living-companion-service.ts` |
| Context Cards | `context-cards-service.ts` |
| Smart Actions | `smart-chat-actions-service.ts` + `executeSmartChatAction()` |
| Personality 3.0 | `personality-v3-service.ts` |
| Conversation Quality | `conversation-quality-service.ts` |
| Canvas | `conversation-canvas-service.ts` |
| Memory Confidence | `memory-confidence-service.ts` |
| Relationship Growth | `relationship-growth-service.ts` |
| Life OS | `life-os-service.ts` |
| Delight | `delight-moments-service.ts` |

## Storage (local-first)

- `@voxa/bucket_list`
- `@voxa/vision_board`
- `@voxa/future_self`
- `@voxa/life_book`
- `@voxa/life_challenges`
- `@voxa/conversation_canvases`
- `@voxa/delight_shown`
- `@voxa/favourite_replies`

Optional Supabase migration: `supabase/migrations/20260711_phase4_life_os.sql`

## QA

See [PHASE4_QA.md](./PHASE4_QA.md).
