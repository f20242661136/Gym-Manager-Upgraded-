# Gym Manager — Data Safety working draft

This is based on the uploaded source snapshot. Re-check after any SDK/config change.

## Likely collected data

| Google Play data type | Current app data | Required / optional | Purpose |
|---|---|---|---|
| Personal info — Name | Member name | Required for member records | App functionality |
| Personal info — Email address | Login email; optional member email | Login required / member email optional | Authentication, app functionality |
| Personal info — Phone number | Member phone | Required by current member form | App functionality |
| Personal info — User IDs | Supabase auth ID, gym/member IDs | Required | Account management, security |
| Personal info — Other info | Age and gender when entered | Optional | Member management |
| Photos and videos — Photos | Member profile photo | Optional | Member profile |
| Health and fitness — Fitness info | Weight, height, chest, waist, calculated BMI | Optional | Member/gym record keeping |
| Financial info — Purchase history | Membership fee/payment transaction records | When fee is recorded | App functionality/business records |

The current app records a payment method/reference but does **not** collect card numbers or banking passwords.

## Current source behavior that reduces declarations

- Expo remote push token registration exists as an optional function but is not called by the uploaded source; current reminders are local/Supabase-driven. If remote push is enabled later, audit device/push identifiers again.
- Sentry only uploads diagnostics if `EXPO_PUBLIC_SENTRY_DSN` is configured. If enabled for production, add the applicable **App info and performance → Crash logs / Diagnostics** declarations.
- CSV export/share is user initiated and local; it is not itself an off-device collection by Gym Manager.
- QR camera scanning does not store camera imagery as a photo/video data set.

## Sharing
Working answer: **No third-party data sharing**, provided Supabase and any other infrastructure are used strictly as service providers processing data on behalf of Gym Manager and the applicable Google Play service-provider exception is satisfied.

Verify this before submission. User-initiated sharing (for example export/WhatsApp handoff) should also be reviewed against Google's user-initiated transfer exceptions.

## Security practices
- Data encrypted in transit: **Yes**, assuming all production endpoints remain HTTPS/TLS.
- Account deletion: answer **Yes only when the public deletion resource is live and the deletion process is operational**.

## SDKs/services to re-check
- Supabase Auth / Database / Storage
- Expo Notifications
- Expo Camera
- Expo Image Picker
- AsyncStorage / SecureStore
- Sentry (only if DSN enabled)
- any future analytics, ads, billing or biometric-device SDK

## Important child-data note
The app itself targets adult gym staff, but the current member form accepts ages as low as 10. A gym may therefore store information about minors. The privacy policy and operator procedures should address required parental/guardian consent and applicable child-data law even though the Play target audience is 18+.
