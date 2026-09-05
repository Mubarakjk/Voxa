# App Store screenshot plan (V1)

Do **not** generate fake screenshots. Capture on a physical iPhone (or App Store Connect screenshot sizes) with a real signed-in review account.

Recommended set (5): Home, Talk, Memory, Journey, Notes or My Voxa.

Use dark UI as shipped (`userInterfaceStyle: dark`). Prefer iPhone 15 Pro / 6.7" and 6.1" sizes.

---

## 1. Home

- **Screen:** Home tab after onboarding.
- **Ideal real state:** Signed-in user, onboarding complete, hero greeting visible, morning brief or today actions populated if available. No error banners.
- **Caption idea:** Your companion for the day.
- **Privacy precautions:** Use a generic display name (not a real user’s full name). No identifiable photos in widgets.
- **Must NOT appear:** Diagnostics, Health Check, Billing QA, paywall, “FakeAI”, “Supabase”, raw errors, experimental banners, microphone / live-call controls, unread developer toasts.

## 2. Talk

- **Screen:** Talk tab with a short real conversation.
- **Ideal real state:** 3–6 messages. One calm companion reply. Composer visible. No pending spinner. Optional Play Aloud control only if it looks native and is not recording.
- **Caption idea:** Talk it through with Voxa.
- **Privacy precautions:** Invent benign copy (“I have a busy morning”). Never use real medical, financial, or identifiable stories. No attached photos of people.
- **Must NOT appear:** Gateway/status dumps, “Unavailable”, streaming JSON, voice-note recorder, camera permission system alert overlay, suggested replies that mention disabled voice features.

## 3. Memory

- **Screen:** Memory list with a few user-created memories.
- **Ideal real state:** 2–4 short memories the reviewer account created. Empty state is acceptable only if captioned as “save what matters” — prefer populated.
- **Caption idea:** Remember what you choose to keep.
- **Privacy precautions:** No real addresses, employers, family names, or health details.
- **Must NOT appear:** Merge/debug labels, raw IDs, confidence dumps, “coming soon” video movie export if that screen is not the target.

## 4. Journey

- **Screen:** Journey tab hub (goals / timeline / life tools as actually shipped).
- **Ideal real state:** At least one goal or milestone visible. No infinite loading.
- **Caption idea:** Goals, routines, and the path ahead.
- **Privacy precautions:** Generic goals (“Walk more this week”).
- **Must NOT appear:** Paywall, Pro badges implying IAP in this free V1, broken drill-downs, Health Check.

## 5. Notes or My Voxa

Pick **one**:

### Option A — Notes

- **Screen:** Notes hub with one open note, or hub with 2–3 note titles.
- **Ideal real state:** Local notes with calm titles. Keyboard dismissed for the still.
- **Caption idea:** Capture thoughts in one place.
- **Must NOT appear:** Voice-note recorder, incomplete editor chrome, “undefined”.

### Option B — My Voxa / companion

- **Screen:** Companion / Voxa tab showing personality or voice picker **as shipped** (spoken replies / Play Aloud, not live calling).
- **Ideal real state:** Companion name and a stable settings-like view. No live-call CTA.
- **Caption idea:** A companion that stays on your terms.
- **Must NOT appear:** “Call Voxa”, Safe Call, WebRTC, microphone permission, RevenueCat, Diagnostics.

---

## Capture rules

- Status bar: clean (full battery, plausible time, no personal hotspot names).
- No notification banners.
- No TestFlight yellow dots if avoidable.
- Do not screenshot account deletion, login passwords, or legal walls as marketing images (those belong in review notes, not the gallery).
- After capture, inspect every pixel for email addresses, JWTs, or debug rows.

## Still required

Owner must capture the actual images. This document is a plan only.
