# Features

This file summarizes the implemented features in the GymManagementApp, how to verify them, and important production notes.

## Core features

- Clients CRUD
  - Implemented in: `src/services/api.ts`, `src/screens/AddClientScreen.tsx`, `src/screens/ClientDetailScreen.tsx`, `src/screens/ClientsScreen.tsx`
  - What it does: create, read, update, delete clients via Supabase; converts snake_case -> camelCase; caches clients locally.
  - Verify: Add a client in-app, see it in the Clients list and in Supabase table; edit/delete reflect correctly.

- Payments (recording & retrieval)
  - Implemented in: `src/services/api.ts`, `src/screens/AddPaymentScreen.tsx`, `src/screens/PaymentsScreen.tsx`
  - What it does: record payments to Supabase, update local client membership state to "Paid"; cache payments locally.
  - Verify: Record a payment and ensure it appears in Payments and updates client membership status.

- Dashboard with stats & recent activity
  - Implemented in: `src/screens/DashboardScreen.tsx`, `src/services/api.ts`
  - Verify: Dashboard counts (total, paid, unpaid) update after adding clients/payments; recent lists show latest activity.

## Realtime & notifications

- Supabase-driven local notifications
  - Implemented in: `src/services/notifications.ts`, `src/services/supabase.ts`, `App.tsx`
  - What it does: subscribes to Supabase `payments` and `clients` events and schedules local notifications inside the app (no Firebase required for local notifications).
  - Verify: Trigger an INSERT/UPDATE in Supabase or perform the app actions (add payment/membership expiry) while the app runs. Notifications should be scheduled/shown (check device logs and Metro logs).
  - Production notes: Remote push (FCM) needs `google-services.json` and an EAS/dev-client build. Expo Go will not show full remote push behavior.

## Offline & storage

- Local storage caching
  - Implemented in: `src/services/storage.ts`
  - What it does: saves and retrieves clients and payments to AsyncStorage for offline use.
  - Verify: Disable network, open app — cached clients/payments should load.

- Offline action queue (skeleton)
  - Implemented in: `src/services/offlineQueue.ts`
  - What it does: provides add/get/clear/process interface for queued offline actions (process is currently placeholder).
  - Verify: Queue functions are present; extend `processQueue()` to implement real sync.

## App & UI

- Navigation (tabs + stacks)
  - Implemented in: `src/navigation/AppNavigator.tsx`, `src/navigation/RootNavigation.ts`
  - What it does: bottom-tab navigation with nested stacks for clients/payments; navigator is single source of truth for headers.
  - Verify: Navigate through all tabs and stacks.

- Screens & components
  - Implemented in: `src/screens/*`, `src/components/ClientCard.tsx`
  - Screens include: Dashboard, Clients, Client Detail, Add Client, Add Payment, Payments, Notifications, Settings, Login.
  - Verify: Manually open and use each screen.

- Image picker & upload helper
  - Implemented in: `src/utils/imagePicker.ts`, `src/services/api.ts`
  - Verify: Upload a client photo and confirm the uploaded URL is stored and displayed.

## Utilities & types

- Network status hook (`useNetworkStatus`) — `src/hook/useNetworkStatus.ts`
- TS types — `src/types/*`

## Dev/build notes

- TypeScript: project configured with `tsconfig.json`; run `npx tsc --noEmit` to type-check.
- EAS/build: `eas.json` and `app.config.js` exist. For remote FCM (Android) provide `google-services.json` and build a dev-client or production build with EAS.
- Production considerations:
  - Ensure correct environment variables: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
  - Do not commit service role keys or secrets.
  - Android notification channel changes may require creating a new channel id (e.g., `default_v2`) so previously installed apps receive new sound settings.

## Verification checklist

1. Set environment variables for Supabase (or use .env if your workflow supports it).
2. Run dev server: `npx expo start` (use a development build for full notifications behavior).
3. Test flows:
   - Add a client → verify appears in list and Supabase.
   - Record a payment → verify payment and membership update.
   - Trigger a Supabase event or use app flows to see local notifications.
   - Disable network → app loads cached data.
4. Build with EAS for release:
   - Configure `google-services.json` for Android if remote push required.
   - Run `eas build -p android --profile production` and/or `eas build -p ios --profile production`.

---

If you want, I can also:
- Add this content into `README.md` under a "Released features" section instead of `FEATURES.md`.
- Create a shorter `RELEASE.md` with exact EAS commands and environment variable instructions.

Tell me which of the above you'd like next and I will add it.