# Scheduled Companion Calls — QA

## Automated

```bash
npx tsc --noEmit
npm test
npx expo-doctor
npm run lint --if-present
```

## Physical iPhone checklist

1. Enable `EXPO_PUBLIC_SCHEDULED_CALLS_ENABLED=true` and rebuild the dev client if needed.
2. Schedule a call ~2 minutes ahead.
3. Lock the phone.
4. Confirm the alert arrives with title “Incoming call from …”.
5. Confirm sound (default system / enabled ringtone toggle).
6. Tap **Answer**.
7. Confirm Voxa opens on **Call** (“Connecting your scheduled call…”).
8. Confirm Realtime connects; speak and receive a reply.
9. Interrupt Voxa; end the call.
10. Schedule again; test **Remind in 10 min**.
11. Test **Decline**.
12. Deny notifications; confirm schedule saves with alerts disabled.
13. Force-quit app; confirm cold-start Answer still routes after auth restore.
14. Test locked phone + Focus / DND (system may suppress; do not claim override).
15. Test repeating weekday schedule; confirm no duplicate floods.
16. Confirm microphone inactive before Answer / before Call screen starts.

## Do not claim “working on device” until locked + app-closed Answer is verified.
