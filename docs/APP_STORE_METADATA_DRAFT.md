# App Store Metadata Draft

Draft only — verify all claims against the **release build** (calling features disabled).

---

## App name

**Voxa**

## Subtitle (30 chars max)

**Your AI life companion**

## Promotional text (170 chars, updatable without review)

Talk through your day, capture notes, build rituals, and grow with a companion that remembers what matters — on your terms.

---

## Description (draft)

Voxa is a personal AI companion for everyday life — not a replacement for professional care, therapy, or emergency services.

**Talk & reflect**  
Chat with Voxa by text. Hear replies spoken aloud when you want a more natural back-and-forth. Daily check-ins, Challenge Me, and Journey help you stay grounded.

**Notes & memory**  
Capture thoughts, summarise ideas, and let Voxa remember what you choose to keep. Edit or delete memories anytime.

**Life OS**  
Goals, reminders, routines, Life Book, and My Companion bring structure without feeling like a spreadsheet.

**Free & Pro**  
Voxa Free includes generous daily chat, notes, and core Journey features. Voxa Pro unlocks deeper memory, premium voices, advanced note tools, exports, and extended fair-use limits.

Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period. Manage in Apple ID settings.

---

## Keywords (100 chars, comma-separated, no spaces after commas)

AI companion,journal,notes,goals,reminders,wellbeing,memory,planner,routine,chat

---

## URLs (required)

| Field | Draft |
|-------|-------|
| Support URL | `https://voxa.app/support` *(must be live before submission)* |
| Marketing URL | `https://voxa.app` *(optional)* |
| Privacy Policy URL | `https://voxa.app/privacy` *(P0 — must be live)* |

---

## Review notes (for Apple)

- Sign in: email/password via Supabase auth (or describe test account).
- Voxa Pro: sandbox subscription `voxa_pro_monthly` / annual — restore available under You → Restore purchases.
- **Live voice calling is not included in this version.**
- Microphone permission strings remain for future features; release build does not request mic for chat.
- No medical, diagnostic, or emergency features.

---

## Subscription explanation (App Store)

Voxa Pro is an auto-renewable subscription (monthly or annual) that unlocks premium features listed in the app paywall. Payment charged to Apple ID. Renewal unless cancelled 24h before period end.

---

## Age rating considerations

- Infrequent/mild mature themes possible in user-generated chat
- No unrestricted web access in core flow
- Account creation required for cloud sync
- Recommend completing Apple's questionnaire honestly; not directed at children under 13

---

## Do NOT claim

- Live phone/voice calling (disabled)
- Scheduled calls (disabled)
- Voice notes / mic recording in chat (disabled)
- Medical, therapeutic, or emergency response
- End-to-end encryption (unless implemented)
