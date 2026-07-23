# Native audio on Expo SDK 54

## Status for this release

| Package | Version | Role | Release decision |
|---------|---------|------|------------------|
| `expo-audio` | ~1.1.1 | Voice-note record/playback path | Preferred; keep |
| `expo-av` | ~16.0.8 | Session routing, TTS helpers, legacy paths | **Safe to keep** for SDK 54 |

## ExpoLocation

- `expo-location` ~19.0.8 matches Expo SDK 54 bundled native modules.
- Plugin is configured in `app.json`.
- CocoaPods pod `ExpoLocation` autolinks via `use_expo_modules!`.
- Runtime error `Cannot find native module ExpoLocation` almost always means an **old development client binary**, not a missing JS package.

### Fix / verify

```bash
# Uninstall stale simulator/device app, then:
npx expo run:ios
npx expo start --dev-client
```

Confirm weather location setup opens without a native-module crash.

## expo-av deprecation

Expo documents `expo-av` as deprecated on SDK 54 in favour of `expo-audio` / `expo-video`.
It remains published and version-aligned (`~16.0.8`) for SDK 54, but will be removed in SDK 55.

**This release:** do **not** perform a full audio migration. Leave `expo-av` for session/TTS helpers; voice-note UI is feature-gated `hidden` until device QA passes on `expo-audio`.

Plan migration off `expo-av` before upgrading to SDK 55.
