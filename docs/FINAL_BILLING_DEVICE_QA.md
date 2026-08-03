# Final Billing Device QA (Physical iPhone Sandbox)

Do **not** claim billing works until this checklist is completed on a physical iPhone with a Sandbox Apple ID.

Prerequisites:

- Development or preview build with RevenueCat iOS public key injected
- App Store Connect Sandbox tester signed in (Settings → App Store → Sandbox Account)
- Products + `voxa_pro` entitlement configured (see `FINAL_REVENUECAT_SETUP.md`)

---

## Checklist

- [ ] Clean install
- [ ] Sign up / sign in
- [ ] Use Free experience (Home, chat, Journey, Notes, check-in) without an immediate paywall
- [ ] Open paywall from **You → Subscription → Upgrade to Voxa Pro**
- [ ] Verify Apple-localised **monthly** price (not hardcoded £)
- [ ] Verify Apple-localised **annual** price
- [ ] Cancel the Apple purchase sheet (no charge, no Pro)
- [ ] Purchase **monthly** in Sandbox
- [ ] Confirm `voxa_pro` entitlement activates immediately
- [ ] Confirm Pro screens unlock without app restart
- [ ] Force-close and reopen — Pro still active
- [ ] Background / foreground — entitlement still correct
- [ ] Restore purchases (active) → “Voxa Pro has been restored.”
- [ ] Sign out / sign in — entitlement re-syncs for the account
- [ ] Reinstall and restore — Pro returns when Apple ID has subscription
- [ ] Restore with an Apple ID that has **no** subscription → “No active Voxa Pro subscription was found for this Apple ID.” (no fake Pro)
- [ ] Airplane mode / network failure during purchase → friendly error, app still usable
- [ ] Rapid double-tap Subscribe → only one purchase sheet
- [ ] Expired / revoked entitlement where possible → demotes to Free
- [ ] Confirm disabled call / microphone UI remains absent
- [ ] Confirm **no** microphone permission prompt during Free/Pro chat + TTS playback
- [ ] Confirm Terms of Use + Privacy Policy links open
- [ ] Confirm Manage subscription opens Apple subscription management (not an in-app fake cancel)

---

## Result

| Field | Value |
|-------|--------|
| Device | |
| iOS version | |
| Build number | |
| Sandbox Apple ID (redacted) | |
| Tester | |
| Date | |
| Pass / Fail | **Not run yet** |

Billing is not production-ready until this sheet is marked Pass.
