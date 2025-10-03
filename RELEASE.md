# Release steps (EAS)

This document explains how to produce development and production builds with EAS and what to check before publishing.

Prerequisites
- Install EAS CLI: `npm install -g eas-cli`
- Ensure you have access to the Expo account (run `eas login`)
- Add `google-services.json` to the project root if you need Android FCM remote push
- Make sure environment variables are set: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (do NOT commit service_role keys)

Development (dev-client) build
1. Create a development build (internal distribution):

```powershell
# development build (APK) - internal
eas build -p android --profile development
```

2. Install the produced APK on a device and open the app using the development build to fully test `expo-notifications` and native modules.

Production build
1. Update version and build numbers in `app.json`:
   - `expo.version` (already `1.0.0`),
   - `android.versionCode` (integer),
   - `ios.buildNumber` (string)

2. Run production build:

```powershell
# production builds
eas build -p android --profile production
eas build -p ios --profile production
```

3. After successful builds, download the artifacts from expo.dev and upload to Google Play or App Store Connect.

Notes
- If remote FCM push is required on Android, ensure `google-services.json` exists at project root before building; `app.config.js` will include it conditionally into the build.
- Android notification channel changes do not override existing channels on user devices. If you need to force sound changes for existing users, create a new channel id (e.g. `default_v2`) and use it in notifications.
- Keep secrets out of source control. Use EAS secrets or environment variables in CI.

Commands (convenience)
- `npm run build:android`  — production Android build (uses `eas build`)
- `npm run build:android-dev` — development client Android build
- `npm run build:ios` — production iOS build

If you want, I can:
- Add CI steps (Github Actions) to run `eas build` automatically on tags.
- Create a Play Store internal-track upload script (fastlane integration).
