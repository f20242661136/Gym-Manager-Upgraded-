# Gym Manager Release Bulk v2

This pack was prepared from the uploaded `app.json`, `eas.json` and project source dump.

## Included
- Play Store icon (512×512)
- Feature graphic (1024×500)
- launcher/adaptive/monochrome/notification/splash/favicon assets
- corrected `app.json`
- corrected `app.config.js`
- corrected `eas.json` with explicit internal submit profile
- public Privacy / Support / Account Deletion static pages
- Play Console answer sheet
- Data Safety working draft
- screenshot plan
- release gates
- PowerShell apply/verification scripts

## Branding source
The binary logo was supplied inside a RAR archive. This environment could list the archive but could not directly unpack RAR5. The generated artwork therefore recreates the **actual in-app BrandMark source** from the uploaded project: indigo `#4338CA`, rotated rounded-square mark, white diamond core, `GYM MANAGER` wordmark.

If the archived `assets/logo.png` is visually different, upload that PNG directly and regenerate the store assets before final publication.

## Important native-project note
This repository contains an `android/` directory. Expo config-plugin changes are build-time/native changes and may not automatically alter an already-generated native project.

The apply script does NOT run destructive prebuild operations. After applying, inspect the resolved Expo config and native manifest. If a new binary is required to pick up launcher/permission changes, sync/rebuild the native project deliberately and inspect the Git diff before uploading a new AAB.
