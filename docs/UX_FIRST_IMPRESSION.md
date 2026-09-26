# UX-8 First Impression

## UX-8A

Implemented in this pack:

- branded loading/splash state inside auth entry;
- first-run onboarding;
- premium sign in;
- dedicated sign-up state;
- password visibility;
- password requirements;
- forgot-password flow;
- check-email success state;
- Supabase auth errors translated into user-facing copy;
- System/Light/Dark appearance preference foundation;
- reusable AuthShell + BrandMark.

## UX-8B next

The next pack completes:

- appearance picker in Settings;
- global app shell theme propagation;
- dark/light NavigationContainer theme;
- tab bar / headers / feedback banners;
- authenticated side panel;
- active gym and role identity;
- owner workspace shortcuts;
- switch/join gym shortcuts;
- sign out;
- light/dark/system quick control;
- premium Gym Setup and Join Gym first-run flow.

## Design direction

The first impression must communicate:

1. trustworthy business software;
2. very fast front-desk workflow;
3. South Asian gym relevance;
4. restrained premium visual language;
5. no developer/database terminology.

## Auth principles

- Keep entered email after failure.
- Never clear the form on validation errors.
- Disable double-submit while the request is running.
- Use password manager/autofill semantics.
- Show plain-language errors.
- Respect system light/dark appearance.
- Onboarding appears once per app installation unless storage is cleared.