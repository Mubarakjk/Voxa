# Realtime Voice — Security & Privacy

## Rules

1. **Never** ship the permanent OpenAI API key in the mobile app for Realtime auth.
2. App requests only a short-lived client secret (`ek_…`) from `create-realtime-session`.
3. Authentication (Supabase JWT) is required before minting a session.
4. Basic rate limiting via usage events + plan-aware daily/fair-use caps.
5. Do **not** log: permanent API key, client secrets, raw audio, full private transcripts, memory content.
6. Dev logs may include state transitions, ICE/peer states, and non-secret metadata only.

## Data flow

| Layer | Secret material |
|-------|-----------------|
| Mobile app | Ephemeral `ek_` only (memory, cleared on cleanup) |
| Edge Function | `OPENAI_API_KEY` (Supabase secret) |
| OpenAI | Session + safety identifier (hashed user id) |

## Privacy behaviour

- Live captions (if shown) are **not persisted** by default.
- Minimal call context (name, tone, top goal, few high-priority memories) is sent as session instructions when available; failures do not block the call.
- No call history product in this milestone.
- No tools/functions in the first pass.

## Cost considerations

Realtime minutes are billed by OpenAI. Rate limits on the Edge Function reduce abuse. Prefer Pro fair-use caps in production.

## Threat notes

- A leaked ephemeral key is short-lived (~60s to create a session) but still sensitive — clear on cleanup.
- Do not proxy user audio through your own servers in this architecture; media goes OpenAI ↔ device via WebRTC.
