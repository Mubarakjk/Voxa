# Notes, Voice, Onboarding & Subscriptions — Implementation Plan

Last updated: 2026-07-23

## Audit snapshot

| Area | Status | Key paths |
|------|--------|-----------|
| Onboarding | Dense 14-step screen; not a stack route | `onboarding-screen.tsx`, `App.tsx` |
| TTS / speaking | Working; Studio has previews | `companion-speech-service.ts`, `voice-preview-service.ts` |
| Voice product names | Missing curated VoiceOption catalog | Studio uses accents/styles, not Aurora/Nova cards |
| Notes product | **Missing** | Only journals / dream / mood / goal notes |
| RevenueCat | Wired for real purchases | `RevenueCatPurchaseManager` (stub unused) |
| Product IDs | `voxa_pro_monthly` / `voxa_pro_annual`, entitlement `voxa_pro` | Keep unless ASC already uses milestone IDs |
| Paywall | Real RC flow; onboarding Pro step does not open Paywall | `paywall-screen.tsx` |
| Mic recording | Hidden | Keep hidden |

## Decisions

1. **Notes** — First-class local-first Notes (AsyncStorage + hybrid sync later). Entry via Journey + Home shortcut (no new tab).
2. **Voice** — Curated `VoiceOption[]` mapping to OpenAI TTS ids + expo-speech fallback. Free: 4 voices. Pro: additional. Previews via existing preview service.
3. **Onboarding** — Redesign as multi-screen stack flow (~2–4 min), persist progress, optional Pro at end → real Paywall.
4. **Entitlements** — Keep `voxa_pro` + existing product IDs as SSOT (already wired). Document milestone alias names in `REVENUECAT_SETUP.md`. Single `EntitlementService` / `canAccessFeature` for gates.
5. **No mic recording** — Do not re-enable `voiceNote`.

## Implementation order

1. Checkpoint  
2. Shared models + services (notes, voice options, entitlement facade)  
3. Notes storage + UI + AI actions (gated)  
4. Voice catalog + picker + Settings/onboarding previews  
5. Onboarding redesign + data wiring  
6. Paywall/onboarding Pro connection + feature gates  
7. `docs/REVENUECAT_SETUP.md`  
8. Typecheck + completion report  

## Free vs Pro (honest)

**Free:** notes CRUD, checklists, folders/tags, search, pin, basic AI summarise/rewrite (limited), 4 voices, speak replies, core companion.

**Pro:** advanced note AI, semantic search label, flashcards/study plan, extra voices, deeper memory/briefings (existing Pro gates), higher allowances.
