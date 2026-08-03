# Realtime Voice — Setup

Minimal production-shaped **Call Voxa** using OpenAI Realtime over WebRTC.

## Requirements

- Expo SDK 54 **development build** or EAS native build (`expo-dev-client`)
- **Not supported in Expo Go** (`react-native-webrtc` is native)
- Supabase project with Edge Functions
- OpenAI API key with Realtime access (server-side only)

## Dependencies

| Package | Purpose |
|---------|---------|
| `react-native-webrtc` | RTCPeerConnection, getUserMedia |
| `@config-plugins/react-native-webrtc` | Expo config plugin |

Do not add competing call audio stacks for this feature. Talk “play aloud” still uses the existing TTS path.

## Environment variables

### App (`.env`)

```bash
EXPO_PUBLIC_REALTIME_VOICE_ENABLED=true
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
# Optional override:
# EXPO_PUBLIC_REALTIME_SESSION_URL=https://YOUR_PROJECT.supabase.co/functions/v1/create-realtime-session
```

### Supabase secrets (server only)

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set OPENAI_REALTIME_MODEL=gpt-realtime
# Optional default voice:
# supabase secrets set OPENAI_REALTIME_VOICE=marin
```

Never put `OPENAI_API_KEY` in `EXPO_PUBLIC_*`.

## Deploy backend

```bash
supabase functions deploy create-realtime-session
```

Health check:

```bash
curl "$EXPO_PUBLIC_SUPABASE_URL/functions/v1/create-realtime-session"
```

## Native rebuild (required after adding WebRTC)

```bash
# iOS
npx expo prebuild --platform ios --clean
npx expo run:ios --device
# or
eas build --profile development --platform ios
```

After env changes, restart Metro with a clean cache:

```bash
npx expo start --dev-client --clear
```

## App entry points

- Voxa tab → **Call Voxa** (when flag on)
- Chat intent “call voxa” / action side-effect
- Journey voice entry (when flag on)

When `EXPO_PUBLIC_REALTIME_VOICE_ENABLED` is not `true`, Call Voxa is hidden/disabled. Normal Talk chat + spoken replies remain.

## Architecture

```
App → create-realtime-session (auth + rate limit)
    → OpenAI /v1/realtime/client_secrets (ek_…)
    → App WebRTC offer → OpenAI /v1/realtime/calls
    → Live mic in / model audio out + data channel events
```

## Known limitations

- Physical iPhone required for sign-off
- Speaker/Bluetooth routing is best-effort without a dedicated InCallManager dependency
- Captions are ephemeral (not persisted)
- One controlled reconnect attempt, then Retry
- Cost scales with connected minutes (Realtime pricing)
- `react-native-webrtc` is flagged untested on New Architecture by expo-doctor; validate on device before release
