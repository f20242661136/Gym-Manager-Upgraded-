# UX-9 Final Cohesion

## Purpose

UX-9 closes the visual-system gap between the redesigned flows and the older management/utility screens.

## Theme behavior

Appearance choices:

- System
- Light
- Dark

The selected mode is persisted.

React Native's app-level appearance override is applied so native UI such as alerts follows the selected mode.

The shared `ui` design tokens now use native adaptive colors for:

- canvas;
- surfaces;
- primary text;
- secondary text;
- muted text.

Semantic brand/status colors use restrained cross-mode values.

## Legacy screen migration

Existing TSX screen/component style properties are migrated from common hard-coded light colors to semantic tokens where doing so is safe.

Examples:

- `#F8FAFC` page background â†’ `ui.color.canvas`
- white card background â†’ `ui.color.surface`
- `#0F172A` text â†’ `ui.color.text`
- slate secondary text â†’ `ui.color.textSecondary`
- light borders â†’ `ui.color.border`
- light pastel state fills â†’ semantic soft fills

This approach preserves business logic and service/RPC behavior.

## Product language

Preferred terms:

- Members
- Receive fee
- Membership expired
- Renewal coming up
- Owner workspace
- Check in
- Share receipt

Do not rename route identifiers or database enum values merely for display copy.

## Visual consistency

The product should now preserve:

- indigo brand identity;
- rounded white/adaptive surfaces;
- restrained semantic status colors;
- 48dp controls;
- shared status pills;
- consistent card borders;
- consistent canvas/surface hierarchy.

## Remaining QA

This phase does not replace device testing.

Verify both Light and Dark modes on:

1. Dashboard
2. Members
3. Add/Edit Member
4. Member Detail
5. Attendance
6. QR Scanner
7. Member Card
8. Payments
9. Receive Fee
10. Receipt
11. Finance
12. Expenses
13. Owner Workspace
14. Staff & Roles
15. Membership Plans
16. Activity Log
17. Settings
18. Notifications

Any screen-specific contrast problem found in this QA should be fixed surgically rather than changing the global palette again.