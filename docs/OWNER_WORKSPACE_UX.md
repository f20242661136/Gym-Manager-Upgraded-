# Owner Workspace UX

## Purpose

The owner workspace is intentionally separate from the daily front-desk experience.

Daily operational tabs remain:

- Dashboard
- Members
- Attendance
- Payments
- Settings

Owner/admin management is grouped behind:

- Settings â†’ Owner workspace

## Owner workspace hierarchy

### Active workspace

Always show:

- active gym name;
- market;
- currency;
- timezone;
- join code;
- active-workspace state.

### Money

- Finance overview
- Expenses

### Memberships

- Membership plans

### Team & security

- Staff & roles
- Activity log

### Workspaces

- current gym;
- other joined gyms;
- switch action;
- join another gym.

## UX rules

1. Management complexity must not leak into the front desk.
2. Financial summaries should use business language, not database terminology.
3. "Renewal follow-up" must not be labeled debt unless a real receivables/invoice ledger exists.
4. Permission enforcement stays server-side; the hub is discovery/navigation, not authorization.
5. Destructive actions remain inside their relevant management screen, not on the hub.
6. Switching gym must be explicit and visibly confirm the active workspace.
7. Owner screens should progressively adopt the shared design system without rewriting proven service/RPC logic.

## Next owner-screen polish order

1. Finance Dashboard
2. Expenses
3. Membership Plans
4. Staff & Roles
5. Audit Log

Each should retain its current service layer and server authorization while adopting:

- shared hero pattern;
- shared metric cards;
- standard empty/loading/error states;
- 48dp controls;
- consistent filters;
- restrained use of color;
- plain-language labels.