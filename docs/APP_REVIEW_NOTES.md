# App Review Notes (draft)

Paste a shortened version into App Store Connect → App Review Information. **Never put reviewer passwords in this repository.**

---

Voxa is a personal **AI life companion**. It is not a human, not sentient, and not a medical, legal, or financial professional.

## Account

An account is required because chat history, memories, and cloud sync are account-based.

Please use the reviewer credentials supplied in App Store Connect (email / password). After sign-in, complete onboarding if prompted, then open **Talk** and send a short message.

## Talk / AI

Talk requires an internet connection. Replies are generated through a **server-side AI gateway** (Supabase Edge Function). The iOS client does not embed an OpenAI secret for production chat.

If the network is unavailable, the app should show a recoverable error, not a crash.

Optional **Play Aloud** speaks replies on-device (or via configured TTS). It does **not** record the microphone.

## Account deletion

Settings (You tab) → Privacy & data → **Delete account**.  
Deletion is permanent. It is not a deactivate/hide flow. Confirm the alert to proceed.

## Memory controls

You tab → **What Voxa remembers**, or Memories from Settings / Voxa tab. Users can view, edit, and delete memories. Memory can be turned off in Settings.

## V1 is free

This version is a **free launch**. There are **no in-app purchases** and no subscription paywall in the submitted UI.

## Disabled in this version (intentionally)

These are not part of the submitted product experience:

- Live voice / WebRTC calling
- Scheduled companion calls
- Voice notes and in-chat microphone recording
- Music recognition
- Experimental / QA screens (Diagnostics, Health Check, Billing QA)

## Permissions you may see

- **Camera** — attach a photo from the camera in Talk
- **Photos** — if the user attaches an existing photo
- **Location When In Use** — optional weather / morning brief (a city can be chosen instead)
- **Notifications** — optional daily check-ins

Microphone recording is not part of this version. Spoken replies do not need the microphone.

## Legal

In-app Privacy Policy and Terms are in Settings. Public URLs must match the live hosted pages in App Store Connect.

## Age / safety

Voxa is not directed at children under 13. It is an AI companion. Crisis language in the model instructs users to contact local emergency services; Voxa is not an emergency service.
