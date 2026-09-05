# App Store Metadata Draft

Draft only. Do not invent live URLs, Apple IDs, or review credentials. Verify claims against the **V1 free-launch binary**.

---

## App name

**Voxa**

## Subtitle (30 characters max)

**Your AI life companion**  
(22 characters)

Alternate if needed: **AI companion for daily life** (28)

## Promotional text (170 characters, updatable without a full review)

Talk through your day, keep notes and memories, and build gentle routines with an AI companion that stays on your terms — private, optional, and free in version 1.

## Description

Voxa is a personal AI life companion for everyday conversation, reflection, and light organisation. It is not a replacement for professional medical, legal, or financial advice, and it is not an emergency service.

**Talk**  
Chat with Voxa by text. Hear replies spoken aloud when you want. Daily check-ins and Journey tools help you stay grounded.

**Notes and memory**  
Capture thoughts and let Voxa remember what you choose to keep. Review, edit, or delete memories anytime. You can turn memory off in Settings.

**Life tools**  
Goals, reminders, routines, notes, optional weather, optional nutrition logging, and optional faith or values tools — use only what you want.

**Your data**  
Create an account to sync chat and memories. Delete your account in Settings. Voxa does not show ads in this version.

Talk requires an internet connection. AI replies can be wrong or incomplete — check important facts yourself.

This version of Voxa is free. There are no in-app purchases in this release.

## Keywords (100 characters, comma-separated, no spaces after commas)

AI companion,journal,notes,goals,reminders,wellbeing,memory,planner,routine,chat

(Count before pasting; Apple rejects over-limit strings.)

## Categories

- **Primary:** Lifestyle  
- **Secondary:** Productivity (optional; Lifestyle alone is also defensible)

Health & Fitness is a weaker fit: nutrition is optional and not clinical.

## URLs

| Field | Value | Status |
|-------|-------|--------|
| Support URL | Pending GitHub Pages publish of `/site/support/` | **OWNER ACTION** — enable Pages, then paste the live HTTPS URL |
| Marketing URL | Optional — leave blank unless you control a real marketing site | Do **not** use `voxa.app` |
| Privacy Policy URL | Pending GitHub Pages publish of `/site/privacy/` | **OWNER ACTION** — required for App Store Connect |
| Custom EULA / Terms URL | Optional for free V1 | Apple’s **standard EULA** may be used; public Terms still hosted at `/site/terms/` for transparency + in-app |

Do not submit until Privacy and Support URLs load real pages over HTTPS.

Canonical static site source: `site/` (GitHub Pages). Legacy drafts in `docs/public/` point at `site/` and are not the publish root.

## Age rating (questionnaire guidance — do not fabricate)

Recommend completing Apple’s form from **actual V1 content**:

- Not made for kids / not a Kids Category app
- User-generated content: **Yes** (chat, notes, photos the user attaches)
- Unrestricted web browsing: **No** in the core app
- Medical/treatment claims: **No**
- Real-money gambling: **No** (local daily spin is cosmetic, no IAP)
- Frequent realistic violence / horror: **No**
- Mature themes: possible **infrequent** via user chat, not as app-directed content
- Suggested rating band: **12+** (AI companion + UGC chat). Confirm in App Store Connect; do not ship as 4+ without counsel review

## Copyright

OWNER ACTION — legal entity name as it should appear on the store listing.

## Review notes

See `docs/APP_REVIEW_NOTES.md`. Supply reviewer credentials only in App Store Connect.

## Do not claim in metadata

- Live phone or voice calling
- Scheduled calls
- Microphone chat / voice notes
- Subscriptions or Voxa Pro IAP (this V1 binary is free)
- Medical, therapeutic, or emergency response
- End-to-end encryption
- Consciousness, sentience, or that Voxa is human
