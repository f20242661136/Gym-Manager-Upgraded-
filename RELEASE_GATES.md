# Release gates and engineering risks

## Google Play / launch gates
- Host the public Privacy Policy URL.
- Host the external account-deletion URL.
- Configure a real support email.
- Make sure account deletion requests are actually processed, not merely acknowledged.
- Complete Data Safety using the final binary/SDK configuration.
- Create Google review credentials with seeded fictional data.
- Upload the Play icon, feature graphic and real screenshots.
- Run the Play-installed smoke test.

## Engineering work that was not fully closed before the decision to release
These are not necessarily Play-policy blockers, but they are production-risk items and should be treated seriously before broad rollout:
- membership lifecycle / early-renewal stacking final regression;
- payment void/reversal flow;
- role/RLS and tenant-hardening pass;
- password recovery/deep-link reset flow;
- full physical-device end-to-end regression;
- QR scanner behavior if connectivity drops after scanner launch;
- production crash reporting decision (Sentry currently optional).

Internal/closed testing is the right place to finish these. Avoid a broad Production rollout until the critical ones are verified.
