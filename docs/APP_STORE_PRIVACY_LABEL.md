# App Store Privacy Label Draft

Draft answers for App Store Connect → App Privacy. Complete only after confirming the **production** binary and hosted Privacy Policy.

Voxa **does collect data**. Do not select “Data Not Collected”.

Tracking: **No**. No third-party advertising SDK. No App Tracking Transparency prompt. `NSPrivacyTracking` is `false`.

---

## Data types to declare

Declare a type if the production app can collect it, even when the feature is optional.

| Apple type | Collected? | Linked to identity? | Used for tracking? | Used for ads? | Notes |
|------------|------------|---------------------|--------------------|---------------|-------|
| **Contact Info → Email Address** | Yes | Yes | No | No | Account sign-up / sign-in |
| **Contact Info → Name** | Yes | Yes | No | No | Display name |
| **User Content → Other User Content** | Yes | Yes | No | No | Chat, memories, notes, goals, reminders, mood/reflections, routines, optional faith/values, optional nutrition logs |
| **User Content → Photos or Videos** | Yes | Yes | No | No | Optional chat photo attachments (camera). Gallery picker UI is hidden in V1; camera capture is available |
| **Location → Coarse Location** | Yes (optional) | Yes | No | No | Weather / morning brief; user can pick a city instead or skip |
| **Location → Precise Location** | No | — | — | — | Foreground “when in use” only; used for weather, not continuous tracking. If Apple’s form treats GPS coordinates as Precise, answer honestly for the permission used (`When In Use`, balanced accuracy) |
| **Identifiers → User ID** | Yes | Yes | No | No | Supabase auth user id / account id |
| **Identifiers → Device ID** | Not independently collected by Voxa | — | No | No | Apple / Expo may assign installation identifiers for push and updates. Do not claim “not collected” for push if APNs device tokens are used when notifications are enabled |
| **Usage Data → Product Interaction** | Yes | Yes | No | No | Local event names (e.g. message sent). Not sent to an advertising network. AI usage counts may sync with the account when cloud is enabled |
| **Diagnostics** | No third-party crash reporter found | — | No | No | Do not declare Crash Data unless a crash SDK is added |
| **Purchases** | No in V1 | — | No | No | Billing / RevenueCat is dormant; no IAP products offered |
| **Audio Data** | No in V1 | — | No | No | Play Aloud / TTS is output only. Microphone recording is disabled and not declared |
| **Health & Fitness** | Optional nutrition logs are user-entered food/calorie notes, not HealthKit | Prefer **Other User Content** unless counsel classifies calorie logs as Health | No | No | Nutrition is opt-in and local in the current version |
| **Sensitive Info** | Possible inside user chat / optional faith content | Yes if stored | No | No | User-provided; not used for tracking or ads |

---

## Product purposes (typical Apple purposes)

Use only purposes that match actual behaviour:

- **App Functionality** — account, chat, sync, weather, notifications the user enables
- **Product Personalization** — companion memory and preferences the user chooses

Do **not** select:

- Third-Party Advertising
- Developer’s Advertising or Marketing (unless you later send campaigns from collected emails — not implemented here)
- Other Purposes that imply tracking

---

## Third-party processors (not “tracking”)

These process data to run the app. They are **not** advertising networks.

| Processor | Reachable in V1? | Role |
|-----------|------------------|------|
| Supabase | Yes, when cloud config is present | Auth, database, file storage, Edge Functions (AI gateway, account deletion) |
| OpenAI | Yes, **via server-side AI gateway only** in preview/production | Generate companion replies from prompts/context |
| Open-Meteo | Yes, if weather is enabled | Forecast from coordinates or chosen city |
| Expo / EAS | Yes | App distribution / `expo-updates` infrastructure |
| Apple | Yes | App Store, APNs if notifications enabled, device TTS |
| RevenueCat | Code present, **dormant** in free launch — do not declare as an active purchase processor unless billing is turned on |

---

## Mismatch watch

| Surface | Status |
|---------|--------|
| In-app Privacy Policy | Describes account, chat, AI gateway, memories, optional location, no ads, account deletion |
| This privacy label | Must not say Data Not Collected |
| Hosted privacy URL | **BLOCKED** until `https://voxa.app/privacy` (or the production URL) is actually live |
| Microphone / voice calls | In-app policy says live voice and mic chat are disabled in this release — matches V1 flags |

Have qualified counsel review this draft before submission. It is not legal advice.
