# Gym Management App â€” UX Master Plan

## Product experience goal

Make the app feel like a focused front-desk operating system, not a collection of admin forms.

Primary UX promise:

> A gym owner or receptionist should understand the state of the gym in seconds and complete the most common task in one or two decisions.

The UI should feel premium, calm, fast and trustworthy on inexpensive Android phones as well as modern devices.

## Benchmark principles

We are taking inspiration from modern gym-management products such as Gymdesk, Mindbody and Glofox, plus strong mobile-first local-market products, but not copying their visual identity.

The recurring patterns worth adopting are:

- a glanceable operating dashboard;
- obvious primary actions;
- strong information hierarchy;
- membership/payment problems surfaced proactively;
- fast arrival/check-in workflows;
- member profiles that show status before details;
- fewer clicks for daily work;
- consistent cards, pills, spacing and destructive actions.

## Design language

### Visual

- Canvas: soft neutral `#F7F8FC`
- Brand: indigo `#4338CA`
- Brand hero: `#312E81`
- Surfaces: white with subtle borders
- Success: green
- Warning: amber
- Destructive: red
- Avoid rainbow KPI dashboards.
- Avoid excessive gradients.
- Avoid heavy shadows.
- Avoid decorative UI that competes with operational data.

### Shape

- Cards: 18px radius
- Major hero areas: 22px radius
- Buttons: 14â€“15px radius
- Pills: fully rounded
- Consistent 8/12/16/20/24 spacing rhythm

### Interaction

- Minimum 48dp interactive targets.
- Primary actions should be reachable with one thumb.
- Destructive actions always require an explicit confirmation.
- Avoid nested modal-on-modal flows.
- Prefer full screens for multi-step financial/member workflows.
- Preserve user-entered data when validation fails.
- Never show fake success for unconfirmed financial writes.

## Information architecture

Bottom navigation stays focused on five operational destinations:

1. Dashboard
2. Members
3. Attendance
4. Payments
5. Settings

Secondary areas belong behind those destinations:

- Finance
- Expenses
- Membership plans
- Staff & roles
- Audit log
- WhatsApp tools
- Privacy/account

## UX phases

### UX-1 â€” Foundation + dashboard

Status: started.

Deliverables:

- shared design tokens;
- shared cards, pills, metrics, actions, empty states;
- dashboard built around daily gym state;
- redesigned member card;
- consistent minimum touch targets;
- better offline/error visibility.

### UX-2 â€” Member journey

Redesign:

- Members list
- Search/filter
- Add member
- Member detail
- Edit member
- Membership history
- Member card / QR

Member profile hierarchy:

1. identity
2. active/expired/frozen state
3. due date
4. primary actions
5. contact
6. payment/membership history
7. body measurements / secondary details

### UX-3 â€” Front desk flow

Redesign:

- Attendance
- QR scanner
- Manual check-in
- Checkout
- Search member
- Success/error feedback

Goal:

> Member arrival to confirmed check-in in under 3 seconds once the member is found/scanned.

### UX-4 â€” Payments and receipts

Redesign:

- payment list
- receive fee
- plan selector
- admission fee/discount
- payment method
- confirmation
- receipt
- WhatsApp handoff

Goal:

> A receptionist can renew a normal member without thinking about database concepts.

### UX-5 â€” Owner workspace

Redesign:

- Finance
- Expenses
- Gym management
- Staff & roles
- Plans
- Audit log

Differentiate owner/admin complexity from front-desk simplicity.

### UX-6 â€” States and micro-interactions

Every primary screen receives:

- loading state;
- empty state;
- offline state;
- sync state;
- failure state;
- permission-denied state;
- successful action state.

Improve:

- keyboard behavior;
- Android back handling;
- form validation placement;
- disabled states;
- confirmation copy;
- pull-to-refresh;
- input persistence after failure.

### UX-7 â€” Accessibility and device QA

Audit:

- 48dp touch targets;
- readable contrast;
- font scaling;
- screen reader labels;
- dynamic text truncation;
- 360px-wide Android screens;
- large Android phones;
- light mode;
- keyboard overlap;
- poor/slow network;
- offline mode.

### UX-8 â€” Cohesion pass

After all functional screens use the design system:

- remove obsolete styles;
- remove visual inconsistencies;
- normalize wording;
- normalize icon usage;
- normalize status language;
- normalize date/currency formatting;
- reduce duplicated UI components.

## Copy system

Prefer:

- Members, not Clients, in user-facing UI.
- Receive fee, not Add payment, for front-desk language.
- Membership expired, not Error.
- Needs renewal, not Unpaid where no invoice exists.
- Check in, not Create attendance.
- Share receipt, not Export document.

Use technical database language only in internal logs/developer surfaces.

## Production decision

Play Store production is intentionally delayed.

Release work resumes only after:

1. UX-1 through UX-6 are stable;
2. migration parity is complete;
3. notification timing/deprecation issue is fixed;
4. full-device regression passes;
5. production privacy/deletion URLs are live;
6. release build has completed a closed/internal testing cycle.

UX quality is now the primary milestone.