# Voxa V1 release recovery plan

Operational guidance for a live free V1 binary. Do **not** use an incident to rewrite companion intelligence, memory, billing, or navigation.

Last audited: 27 August 2026.

Project: EAS `edbeeb3f-1e8a-4bf5-9794-814157fdad98`  
Channels in `eas.json`: `preview`, `production`  
Updates URL: `https://u.expo.dev/edbeeb3f-1e8a-4bf5-9794-814157fdad98`  
Runtime: `appVersion` policy (JS updates must match the binary’s app version).

---

## Critical services

| Service | If it fails | What the user typically sees |
|---------|-------------|------------------------------|
| Supabase Auth | Sign-in / restore fails | Auth errors (friendly copy). Existing local session may still open if already restored. |
| Supabase Database | Profile / chat / memory sync fails | Cached local data where hybrid repos allow it; Talk/Home recoverable errors. |
| `ai-gateway` Edge Function | Talk cannot generate replies | Friendly Talk error. No FakeAI in preview/production. |
| OpenAI (server-side only) | Gateway returns provider error | “Couldn’t reach the AI service” style copy. Retry. |
| Supabase Storage | Photo attach upload fails | Local URI kept; friendly upload error. Chat should not crash. |
| Open-Meteo / weather proxy | Forecast fails | Weather empty / previous cache if present. App still launches. |
| EAS Update | Bad JS shipped | Users on that runtime may load the bad update; see rollback below. |
| RevenueCat | N/A in V1 | Dormant. Do not “fix” by enabling billing. |

---

## AI gateway down

**What users see:** Talk send fails with a calm retry message. Fail-safe path does **not** invent companion replies.

**Do:**

1. Confirm the function in the Supabase dashboard (do not assume from local).
2. Check OpenAI status and the **server** `OPENAI_API_KEY` (not `EXPO_PUBLIC_OPENAI_API_KEY`).
3. If the function is missing, deploy **only** after a normal change-control review. This audit does not deploy.

**Do not:** ship a client OpenAI key via EAS Update, enable FakeAI, or turn on experimental voice.

---

## Supabase outage

**What users see:** Auth/cloud features fail; startup should still reach a usable error or cached state rather than an infinite spinner (code-verified). Offline launch does not require the network to avoid crashing.

**Do:** Wait / retry; communicate via support email if prolonged. Do not wipe user devices.

**Do not:** run destructive SQL, rotate keys mid-incident without a rollback plan, or tell users to reinstall as the first step (reinstall can drop local-only notes/mood/nutrition).

---

## Bad EAS Update (JS regression)

`expo-updates` is configured. JS updates cannot change native modules or permissions.

**Stop publishing**

Do not run another `eas update` until the rollback/fix is chosen.

Documented rollback (Expo EAS Update):

```bash
eas update:rollback
```

This is interactive. It can roll back to a previously published update or to the **embedded** update in the binary.

Alternative documented republish (when you already know a good group):

```bash
eas update:republish --group <UPDATE_GROUP_ID>
# or
eas update:republish --branch production
```

**Do not** invent other flags. Confirm IDs in the EAS dashboard.

**Fix forward** if the bad update wrote incompatible local state (unsafe to roll back). Publish a new update that restores compatibility.

Native crashes, permission mistakes, or missing native modules require a **new binary** (new App Store / TestFlight build), not an OTA update.

---

## Account deletion incidents

If deletion reports success but data remains, treat as a **production E2E failure**. Do not tell App Review deletion works until production is verified.

Do not run ad-hoc service-role deletes from a laptop during an incident unless that is an existing, reviewed runbook.

---

## What NOT to change during an incident

- P0–P3 companion intelligence / memory ranking
- Database schema
- Auth architecture
- Billing / RevenueCat activation
- Voice / WebRTC / microphone flags
- Privacy strings and tracking flags
- Speculative refactors and dependency upgrades

---

## After the incident

1. Keep a timeline (UTC): detection, user impact, action, verification.
2. If a secret may have been in a client binary, rotate it (especially any `EXPO_PUBLIC_OPENAI_API_KEY` that was ever shipped).
3. Re-run: `npm test`, `npx tsc --noEmit`, then a preview build before another production update.
