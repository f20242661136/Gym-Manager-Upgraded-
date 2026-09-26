# Android Device & Accessibility QA

## Required test matrix

### Compact Android

Test approximately 360dp wide.

Review:

- Dashboard
- Members
- Member profile
- Attendance
- Receive fee
- Payments
- Settings
- Owner workspace

No horizontal clipping is allowed.

### Compact + large text

Increase Android font size to roughly 1.25â€“1.30 scale.

Verify:

- KPI values remain readable;
- member names and status pills wrap safely;
- payment amounts do not overlap names;
- quick actions remain tappable;
- primary buttons remain reachable.

### Regular Android

Test approximately 411dp wide as the main visual reference.

### TalkBack spot check

Verify meaningful announcements for:

- Add member
- Open member
- Receive fee
- Check in
- Check out
- Scan QR
- Share receipt
- WhatsApp
- Switch gym
- destructive actions

Status must be available as text, not color alone.

### Touch targets

Primary interactive targets should be at least 48dp.

Pay special attention to:

- back/close buttons;
- clear-search buttons;
- QR shortcuts;
- filter controls;
- receipt actions.

### Forms and keyboard

Test Add Member and Receive Fee with the Android keyboard open.

Verify:

- focused fields stay visible;
- scrolling still works;
- entered data survives validation/server errors;
- confirm buttons remain reachable.

### Long-content fixtures

Use:

- Muhammad Abdul Rehman Siddiqui
- International Strength & Conditioning Centre Lahore
- RCP-2026-000000123456
- EASYPAISA-TRX-20260925-123456789
- Rs. 999,999
- â‚¹999,999

Nothing important may overlap or become untappable.

### Offline behavior

Members:
- queued changes visibly show pending sync.

Attendance:
- check-in and checkout remain blocked offline.

Payments:
- receiving money remains blocked offline.

Never show false success for an online-only operation.

### Reduced motion

Enable reduced-motion/remove-animation settings where available.

Feedback must remain understandable without animation.

### Android hardware Back

Test Back from:

- Add Member
- Member profile
- QR Scanner
- Receive Fee
- Receipt
- Finance
- Expenses
- Owner workspace

Back must not submit or duplicate an action.

## UX-7 completion gate

Pass:

1. compact/default text;
2. compact/large text;
3. regular Android;
4. TalkBack spot check;
5. offline/slow network.