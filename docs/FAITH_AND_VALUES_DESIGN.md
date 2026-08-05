# Faith & Values — Product Design

## Purpose

Optional, privacy-first space for gratitude, intentions, reflection, and (when chosen) Islam-specific private practice. **Disabled by default.**

## Modes

| Mode | User label | Behaviour |
|------|------------|-----------|
| `off` | Not now | No UI injection, no AI context, no Home card |
| `general` | General values & gratitude | Intentions, gratitude reflection, private journal |
| `islam` | Islam | Above + saved duas (user-written), manual prayer routine, faith-aware Talk safety |
| `personal` | Other / Personal spirituality | General-style prompts with neutral spiritual framing |

Religion is **never inferred**. Users choose once in onboarding or Settings and may change or disable anytime.

## Entry points

- **Onboarding** — optional step after coaching (skippable)
- **Settings → Faith & Values**
- **Journey → Faith & Values** or **Set up Faith & Values**
- **Home** — lightweight card when enabled and not hidden

No additional tab.

## Screens

| Screen | Purpose |
|--------|---------|
| `FaithValuesSetup` | Mode selection, toggles, export, delete all |
| `FaithValuesHub` | Mode-specific actions |
| `FaithValuesIntention` | Today's intention |
| `FaithReflection` | Private reflection + optional memory consent |
| `SavedDuas` / `DuaEditor` | User-created duas only (Islam mode) |
| `PrayerRoutine` | Manual Fajr–Isha tracking (Islam mode) |

## Explicitly excluded (V1)

- Prayer times / adhan
- Built-in Quran/hadith text
- Automatic religious notifications
- Location-based salah calculation

## AI integration

When **Faith-aware conversations** is on: mode + safety rules, today's intention, one approved reflection snippet, prayer count summary only.

## Architecture

- `src/types/faith-values.ts`
- `src/services/faith/faith-values-service.ts`
- `src/services/faith/faith-values-context-service.ts`
- Lazy-loaded stack screens

Feature flag: `faithValues: stable`
