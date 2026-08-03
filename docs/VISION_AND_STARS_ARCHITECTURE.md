# Voxa Vision + Starred Conversations — Architecture Plan

**Status:** Phase 1 complete — audit + plan only. No feature implementation yet.  
**Date:** 2026-07-24  
**Constraint:** Extend existing Talk multimodal path; do not rewrite companion/chat.

---

## 1. Audit findings (executive)

| Area | Reality today |
|------|----------------|
| Vision AI | **Partially shipped** — camera → `analyzeImage` → multimodal reply already works in Talk |
| Photo library | Flag `galleryPicker` is **hidden** (needs experimental env) |
| Image processing | Picker `quality: 0.85` only — **no** resize/orientation/metadata strip |
| Storage | Private Supabase bucket `chat-attachments` exists |
| AI gateway | Text-only edge function; **unused** by live chat (client OpenAI key path) |
| Model routing | `image_analysis` task exists; **unused** by `OpenAIService` |
| Quotas | Free: **2 image uploads/day, 30/month** (not the product’s proposed 5/30 days) |
| Message “star” | Local bookmarks (`@voxa/chat_bookmarks`) — no Saved hub, not synced |
| Conversation star | **Does not exist** |
| Mic voice notes | Remain **hidden** — must stay that way |
| Notes | Local-first; memory consent pattern is the privacy template |

**Implication:** Vision is an **upgrade of an existing pipeline**, not greenfield. Starred Conversations is mostly **greenfield** (promote bookmarks + add conversation stars + Saved screen).

---

## 2. What can be reused

| Capability | Location | Reuse strategy |
|------------|----------|----------------|
| Multimodal OpenAI | `src/services/ai/openai-service.ts` | Extend prompts + modes; keep `gpt-4o-mini` / env vision model |
| Attachment pipeline | `attachment-processor.ts`, `attachment-storage-service.ts` | Add processing profiles + VisionAsset layer |
| Composer camera | `chat-input-bar.tsx` | Add library + polished preview; keep mic hidden |
| Permissions | `attachment-permissions.ts` | Expand copy + denied/Settings paths |
| Message attachments | `types/message-attachment.ts` | Extend; introduce parallel Vision domain types |
| Chat-attachments bucket | `20260707_chat_attachments.sql` | Prefer path `vision/{userId}/…` **or** keep existing `{userId}/{conversationId}/…` with clearer retention |
| Feature gates + usage | `feature-gate-service.ts`, `usage-tracking-service.ts`, `pricing.ts` | Centralise Vision allowance; align free quota to product |
| Paywall cooldown | `paywall-impression-service.ts` (6h) | Reuse for Vision limit |
| Entitlements | `entitlement-access-service.ts` | Gate compare / deep document / higher res |
| Message bookmarks | `chat-bookmarks-service.ts` | Evolve → `StarredMessage` + userId scope + STORAGE_KEYS |
| Notes consent | `NoteMemoryConsent` | Mirror for Vision retention modes |
| Nav pattern | Notes via stack + Journey/You/Home | Saved Moments same pattern — **no new tab** |
| Analytics scrubber | `analytics-service.ts` | Add vision_/star_ events; never log content/URLs |

---

## 3. Gaps / native dependencies

### Required (recommended)

| Dependency | Why | Already present? |
|------------|-----|------------------|
| `expo-image-picker` | Camera + library | ✅ `~17.0.11` |
| `expo-file-system` | Read/encode/delete | ✅ |
| `expo-image-manipulator` | Resize, rotate, compress profiles | ❌ **add** |
| `expo-document-picker` | Optional “image file” where supported | ❌ add if Phase 3 file entry ships |

### Not required for this milestone

| Dependency | Why skip |
|------------|----------|
| `expo-camera` | Image-picker capture is enough; live CV preview out of scope |
| Dedicated OCR SDK | Use multimodal model for “Read this”; honest uncertainty |
| Affiliate / shopping APIs | Explicitly out of scope |

### Rebuild

After adding `expo-image-manipulator` (± document-picker):

```bash
npx expo install expo-image-manipulator
# optional:
npx expo install expo-document-picker
npx expo prebuild --clean   # if using CNG / if plugins change
npx expo run:ios --device
```

Update `app.json` plugins / usage strings only if new permission copy is required (camera/photos already present).

---

## 4. Backend requirements

### Must have for production Vision

1. **Private storage** — keep `chat-attachments` private; signed URLs; user-scoped paths.
2. **Deletion** — extend `delete-account` edge function to purge storage objects under the user’s prefix.
3. **Failed analysis must not burn quota** — record usage only after successful analysis (change from any current “on upload” semantics if needed).
4. **Multimodal-capable AI path** — either:
   - **A (near-term):** keep client OpenAI multimodal (current), tighten key strategy for TestFlight, **or**
   - **B (preferred before App Store):** extend `ai-gateway` to accept multimodal `content` parts + image size caps; route chat through gateway.

### Should have

- Server `image_analyses` metric already in billing migration — align client metric names.
- Wire `ModelRoutingService` for `image_analysis`.
- Cleanup job / client cleanup for abandoned uploads (`uploadStatus: failed` / orphaned local URIs).

### Not in this milestone

- Public CDN buckets
- Face indexing / biometrics
- Automatic long-term image memory

---

## 5. Security risks

| Risk | Mitigation |
|------|------------|
| Client OpenAI key in binary | Prefer gateway before App Store; never log keys |
| Signed URL leakage in analytics/logs | Scrub URLs; short expiry (already ~7d — consider shorter for Vision) |
| Cross-user storage access | RLS folder[1]=auth.uid(); never public bucket |
| Guest local `user_*` ids vs cloud uid | Scope all stars/vision usage by `profile.id`; migrate carefully on login |
| Bookmarks key outside `STORAGE_KEYS` | Move under STORAGE_KEYS; wipe on account delete |
| EXIF GPS in uploads | Strip location metadata in processing step |
| Medical / ID / luxury “auth” claims | Safety router + system prompt constraints |
| Double vision call (analyze + reply) | Cost/privacy — consolidate to one multimodal turn where possible |

---

## 6. Expected API cost (order-of-magnitude)

Assumptions: `gpt-4o-mini` vision, resized ~1024px long edge, ~1–2 images/user/day free.

| Scenario | Rough cost driver |
|----------|-------------------|
| Free 5 analyses / 30 days | Low — mainly token + image tokens |
| Double-call bug (analyze + reply) | **~2× cost** — fix in implementation |
| Pro fair-use 50/day without resize | High — mandate compression profiles |
| Document screenshots (dense text) | Higher output tokens — cap max tokens by mode |

**Telemetry:** count analyses + bytes uploaded + model id — **never** image content.

---

## 7. Free / Pro allowance recommendation

Align product ask with existing metering; change central config only (`pricing.ts` + registry + optional server `entitlement_limits`).

| Tier | Vision analyses | Notes |
|------|-----------------|-------|
| **Free** | **5 per rolling 30 days** (product) — migrate from calendar month 30 + daily 2 **or** keep daily soft-cap + monthly 5 for launch simplicity | Prefer **rolling 30 days** in a dedicated `VisionUsageService` |
| **Free includes** | Describe, what is this, read/extract (standard), follow-ups in-thread, save to Notes | |
| **Pro** | Higher fair-use (e.g. 50/day soft, 500/mo soft) | Multi-image compare, deeper docs, higher res profile, structured outputs |
| **Failed analysis** | **Does not consume** allowance | |
| **Duplicate unchanged image** | Warn; optional cache; don’t silent re-bill | |

Do **not** advertise unlimited.

Paywall source keys: `vision-limit`, `vision-compare`, `vision-document`. Reuse 6h contextual cooldown.

---

## 8. Domain model plan (Phase 2)

New types under `src/types/vision.ts` and `src/types/starred.ts` (names illustrative):

- `VisionAsset`, `VisionSource`, `VisionAnalysisRequest`, `VisionAnalysisResult`
- `VisionCategory`, `VisionSafetyFlag`, `VisionUsageRecord`, `VisionAttachment`
- `VisionConfidence`, `VisionFollowUp`, `VisionRetentionMode`
- `StarredMessage`, `StarredConversation`, `StarCollection`

**Rules:**

- Do **not** store raw images in AsyncStorage (URIs + metadata only).
- Images live in filesystem + optional private bucket.
- Default retention: conversation-scoped / delete-after-analysis options — never auto-memory.
- Starred conversation stores **references** (conversationId + preview), not a full duplicate — **unless** original is deleted → **extracted snapshot** (chosen behaviour below).

### Star deletion behaviour (decision)

**When original conversation is deleted:** convert starred conversation / messages into an **extracted saved snapshot** (title + preview text + optional Vision summary), and clear the live `conversationId` link (`sourceStatus: 'orphaned'`).  
Rationale: users expect Saved Moments to survive clearing chat history; document clearly in privacy docs.

---

## 9. Architecture (target)

```
Talk composer
  └─ VisionCaptureSheet (camera | library | file)
        └─ ImageProcessingService (profile: general | document | detail)
              └─ VisionAsset (local)
                    ├─ optional AttachmentStorage (private signed)
                    └─ VisionAnalysisService
                          ├─ SafetyRouter
                          ├─ Uncertainty formatter
                          ├─ UsageAllowance (free/Pro)
                          └─ IAIService multimodal (single preferred call)
                                └─ Message + VisionAttachment in thread
                                      ├─ follow-ups (text)
                                      ├─ Save to Notes
                                      └─ Star message / conversation
```

Saved Moments screen reads `StarredMessage` / `StarredConversation` / Vision insight refs / Notes-from-chat — **Journey → Saved** primary entry; **You → Saved** secondary.

---

## 10. Talk integration (no sixth tab)

| Entry | Action |
|-------|--------|
| Talk composer | Attachment → Camera / Library / (File) |
| Home | Quick action “Show Voxa” → Talk with Vision sheet open |
| Notes | Optional “Attach image” later — secondary |
| Message menu | Star, Copy, Share, Save to Notes |
| Talk header overflow | Star conversation |

Enable `galleryPicker: 'stable'` as part of this milestone (product requires library). Keep `voiceNote` **hidden**.

---

## 11. Safety & honesty layer

Implement `VisionSafetyRouter` before user-visible results:

- Separate: observations / interpretation / uncertainty / next steps
- No face recognition / no naming people from photos
- No ID / currency / medicine / signature / luxury authentication
- Medical: descriptive only + seek care language
- Food calories: ranges + “approximate”
- Content policy refusal → friendly copy, no raw provider errors

Prompt + post-processor both required (defence in depth).

---

## 12. Sync & identity

| Mode | Behaviour |
|------|-----------|
| Local-only profile | Stars + vision usage keyed by local `userId` |
| Authenticated | Prefer Supabase tables for stars (new) **or** hybrid mirror; storage under auth uid |
| Guest → account | Migrate local stars/usage once (same pattern notes still lack — implement carefully) |
| Logout / switch | Clear in-memory; load only matching userId |
| Offline star | Queue local write; sync when online |

Message bookmarks today are **global AsyncStorage** (not user-scoped) — **must fix** as part of starring work.

---

## 13. Implementation order (unchanged from brief)

1. ✅ Repository audit  
2. ✅ Architecture plan (this doc)  
3. Safe git checkpoint (user-requested commit)  
4. Domain models  
5. Native deps (`expo-image-manipulator`)  
6. Image processing  
7. Private storage + deletion  
8. AI integration (dedupe vision calls; safety prompts)  
9. Safety / uncertainty  
10. Talk attachment UI  
11. Vision result UI  
12. Notes integration  
13. Usage limits  
14–17. Stars + Saved + collections + search  
18. Sync / identity  
19. Analytics  
20. Tests  
21. Docs (`VISION_SETUP`, `VISION_PRIVACY`, QA checklists)  
22. Completion report  

After each major phase: `npx tsc --noEmit`, confirm Talk speech, mic hidden, Notes intact, no render loops.

---

## 14. Release risks

| Risk | Level | Notes |
|------|-------|-------|
| Client API key for vision | High for App Store | Gateway multimodal needed for strong readiness |
| Gallery still hidden | Medium | Flip flag + permission UX |
| Quota mismatch (2/day vs 5/30d) | Medium | Config change + UX copy |
| Account delete leaves storage | High | Must fix before TestFlight |
| Bookmarks not user-scoped | High | Privacy bug if multi-account |
| Cost double-call | Medium | Fix early |
| Overclaiming identification | High product risk | Safety prompts + copy |
| Physical device camera QA | Required | Simulator insufficient |

---

## 15. Testing plan (focused)

Unit/integration:

- MIME/size validation  
- Compression profile selection  
- Allowance (success vs failure)  
- Storage path ownership  
- Star idempotency + user isolation  
- Collection CRUD  
- Saved search  
- Safety routing fixtures  

Manual: as specified in product brief (Vision + Star QA).

---

## 16. Checkpoint recommendation

Before coding Phase 2+:

```bash
git status
# Create commit only when you ask — suggested message:
# "Checkpoint before Vision AI and Starred Conversations"
```

---

## 17. Provisional readiness (pre-implementation)

**NOT READY** for device QA of the *new* milestone features.  
Existing camera analysis path can already be smoke-tested on device as a **baseline**.

After implementation, expected first honest verdict target: **READY FOR PHYSICAL DEVICE QA** (not TestFlight until gateway/storage deletion/RC sandbox gates clear).

---

## 18. Open decisions (confirm before / during build)

1. **Quota model:** rolling 30-day 5 free vs keep daily+monthly — **plan defaults to rolling 30-day 5**.  
2. **Storage path:** new `vision/` prefix vs existing chat-attachments layout — **prefer existing bucket + clearer retention metadata** to avoid two buckets.  
3. **AI transport:** client multimodal first, gateway multimodal before TestFlight.  
4. **Orphaned stars:** extracted snapshot — **confirmed in this plan**.  
5. **Compare two images:** Pro-only at launch.

No UI or feature code has been written in this phase.
