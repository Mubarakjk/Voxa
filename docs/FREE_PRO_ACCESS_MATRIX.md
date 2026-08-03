# Free & Pro Access Matrix

**Canonical enforcement:** `EntitlementAccessService` → `SubscriptionService` → RevenueCat `CustomerInfo` (`voxa_pro`).  
**Limits:** `FREE_PLAN_LIMITS` / `PRO_PLAN_LIMITS` in `src/constants/pricing.ts`.  
**Gate registry:** `src/services/billing/feature-registry.ts`.

Last audited: August 2026 (release sprint).

---

## Principles

| Rule | Status |
|------|--------|
| Live entitlement is source of truth for Pro | ✅ RevenueCat + normalised cache |
| No local boolean unlocks Pro in production | ✅ `devOverride` is `__DEV__` only |
| Free tier remains useful | ✅ Chat, notes, journey, rituals, basic memory |
| Paywall not on every interaction | ✅ Contextual via `PaywallImpressionService` |
| Usage counters user-scoped | ✅ Per `userId` in subscription usage repo |
| Offline does not grant Pro | ✅ Cached entitlement expires; no offline override |

---

## Feature matrix

| Feature | Free | Pro | Gate / service | Notes |
|---------|------|-----|----------------|-------|
| **AI text chat** | 20/day, 200/month | Fair use (~500/day) | `FeatureGateService.canUseAiChat` | Core value on Free |
| **Spoken AI replies (TTS)** | ✅ | ✅ | Not Pro-gated | Playback only; no mic in release |
| **Image / camera analysis** | 2/day, 30/month | 50/day, fair use monthly | `canUploadImage` | |
| **Notes — create/edit/archive** | ✅ Unlimited local notes | ✅ | Not count-gated | |
| **Notes — AI actions (basic)** | Summarise, expand, tone | + Pro actions | `notes-ai-service.listNoteAIActions` | Pro actions blocked in UI |
| **Notes — semantic search** | ❌ | ✅ | `EntitlementAccessService` `notes_semantic_search` | |
| **Companion voices — default** | ✅ | ✅ | Free voices in picker | |
| **Companion voices — premium** | Preview / locked | ✅ | `canUsePremiumVoices` + voice picker | |
| **Memory — active cap** | 50 memories | Unlimited | `canUseUnlimitedMemory` | |
| **Memory — advanced / pinned** | Preview | ✅ | Pro feature gates | |
| **Life Book** | Preview | Full | `life_book` gate (preview) | |
| **Saved Moments** | ✅ Basic | ✅ Full export | Journey surfaces | |
| **Goals / reminders / routines** | 5 / 10 / 8 max | Unlimited | `canCreateGoal` etc. | |
| **Weekly Letter / advanced insights** | Preview | ✅ | Pro-only gates | |
| **Data export** | ❌ | ✅ | `exports` / entitlement | Settings → Export |
| **Premium personalisation** | Basic Studio | Full cosmetics | Various Pro gates | |
| **Live voice calls** | Hidden (release) | Hidden (release) | `release-voice.ts` flags | Not sold in this build |
| **Voice notes / mic chat** | Hidden (release) | Hidden (release) | Release flags | Dormant code |

---

## Daily / monthly reset

- Daily buckets reset at local midnight (usage service).
- Monthly buckets reset on calendar month boundary.
- Limits read from `PlanLimits` based on **current** `PlanStatus.isPro` — not cached Pro from stale offline data beyond entitlement TTL.

---

## Paywall triggers

- User taps Upgrade / hits a limit / selects premium voice.
- **Not** shown on: Home load, first chat message, note open (unless Pro action).

---

## Release build note

With release voice flags `false`, voice-minute and voice-note limits are **not reachable in UI** but remain in registry for a future release. Do not re-enable without re-auditing this matrix.

---

## Verification checklist

- [ ] Free user sends 20 AI messages → limit message, not crash
- [ ] Pro sandbox purchase → gates lift without restart
- [ ] Expired entitlement → demoted to Free limits
- [ ] Premium voice tap on Free → paywall or lock, not silent unlock
- [ ] Note AI Pro action on Free → upgrade copy, draft preserved
