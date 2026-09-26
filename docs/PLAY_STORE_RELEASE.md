# Google Play release checklist

Updated for September 2026.

## Technical build

- Expo SDK 54 targets Android 16 / API 36.
- Production Android build must be an AAB, not an APK.
- Run `npm run check`.
- Run `npm run release:validate`.
- Confirm every local Supabase migration is also remote.
- Build with `npm run build:android`.
- Use Play App Signing.

## Required web URLs

Because this app supports account creation, configure:

- `EXPO_PUBLIC_PRIVACY_POLICY_URL`
- `EXPO_PUBLIC_ACCOUNT_DELETION_URL`

The account-deletion web page must work without requiring the user to reinstall the app. It should clearly identify this app/developer and provide a way to request account/data deletion.

## Play Console forms

Complete accurately:

- Data safety
- Account deletion URL
- Financial features declaration
- App access / reviewer instructions for login-gated functionality
- Content rating
- Ads declaration
- Target audience
- Privacy policy URL

Recording gym membership payments does not automatically mean the app is a wallet, money-transfer service, or financial institution. Answer the Financial features declaration based on the actual product behavior.

## Permissions

This project blocks broad Android media permissions:

- READ_MEDIA_IMAGES
- READ_MEDIA_VIDEO
- READ_EXTERNAL_STORAGE

It also blocks RECORD_AUDIO because QR scanning does not need microphone access.

Use the system image picker for occasional member-photo selection.

## New personal Play developer accounts

If the Play developer account is a personal account created after November 13, 2023, Google currently requires a closed test with at least 12 opted-in testers continuously for 14 days before applying for production access.

## Crash reporting

Runtime error upload is enabled only when:

- `EXPO_PUBLIC_SENTRY_DSN` is set.

For symbolicated EAS production builds also configure:

- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN` as a sensitive EAS environment variable.

Do not commit Sentry auth tokens.

## Pre-release smoke test

Test on a release/development build, not only Metro:

1. Sign up / sign in.
2. Create or join gym.
3. Add/edit/delete member.
4. Record membership payment.
5. Open receipt and share PDF.
6. WhatsApp message handoff.
7. Attendance manual check-in.
8. QR scan and checkout.
9. Expense entry.
10. Finance dashboard.
11. Staff invitation and role enforcement.
12. Offline member create/edit and reconnect sync.
13. Privacy policy opens.
14. Account deletion web resource opens.
15. Sign out and sign back in.
16. Verify notification permission/behavior.
17. Inspect Android permissions in the final AAB/APK.
18. Verify Sentry receives a controlled test error before launch.

## Database gate

Do not ship while migration history is divergent.

Expected final form:

`001 | 001`
`002 | 002`
`003 | 003`
`004 | 004`
`005 | 005`
`006 | 006`
`007 | 007`
`008 | 008`

No production build should be promoted while the app expects RPCs that are missing remotely.