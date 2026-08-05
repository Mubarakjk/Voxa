# Faith & Values — Privacy Model

## Principles

Faith data is highly sensitive. Voxa treats it as private user content.

## Never

- Log reflection or dua text to analytics
- Include faith content in notification previews
- Infer religion from chat
- Auto-enable faith features

Analytics (mode only): `faith_values_mode_set` with `{ mode, enabled }`.

## Memory consent

Reflections default to `allowMemory: false`. Opt-in creates a tagged faith memory only when global Memory is on.

## AI prompt exposure

Only when enabled + faith-aware ON: mode, safety rules, truncated intention, one approved reflection snippet, prayer count (not times).

## User controls

Change mode, disable, hide Home card, export JSON (`faithAndValues`), delete all faith data, account deletion clears keys.

## Copy

> Your faith and values entries are private. Voxa only uses them in conversations when you choose to allow it.
