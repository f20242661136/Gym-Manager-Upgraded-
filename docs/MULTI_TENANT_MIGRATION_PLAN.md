# Multi-Tenant Migration Plan

## 1) Actual architecture found in the codebase

This app is an Expo/React Native app using Supabase as the backend. The current implementation is a single-gym design:

- Supabase client is initialized in [src/services/supabase.ts](../src/services/supabase.ts)
- Authentication only tracks the Supabase auth user in [src/contexts/AuthContext.tsx](../src/contexts/AuthContext.tsx)
- API layer queries `clients` and `payments` directly in [src/services/api.ts](../src/services/api.ts)
- DB typing defines only `clients` and `payments` in [src/types/supabase.ts](../src/types/supabase.ts)
- The local/offline-first schema in [GymManagementApp/src/database/schemas.ts](../GymManagementApp/src/database/schemas.ts) shows the business domain is effectively `members`, `memberships`, `plans`, `payments`, `expenses`, and `sync_queue`

Important findings:

- No `gym_id` field exists anywhere in the current data model.
- No `gyms` table exists.
- No `gym_users` membership table exists.
- No `auth.uid()`-based RLS policies or `CREATE POLICY` statements were found.
- No storage policies for tenant-scoped buckets were found.
- No centralized `currentGym` / `activeGym` context exists.
- The app currently assumes a single gym because all Supabase queries read the whole table without any tenant filter.

## 2) Tenant-owned tables to convert

The likely tenant-owned tables are:

- `clients` (or `members` in the offline/mobile design)
- `payments`
- `memberships`
- `plans`
- `expenses`
- any attendance / staffing / settings tables added later

The current local schema also identifies the core entities that should become tenant-bound:

- `members`
- `memberships`
- `plans`
- `payments`
- `expenses`
- `sync_queue`

## 3) Recommended multi-tenant schema

```sql
create extension if not exists "uuid-ossp";

create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  phone text,
  email text,
  address text,
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gym_users (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner','admin','manager','staff','trainer','receptionist')),
  status text not null default 'active' check (status in ('active','pending','inactive')),
  created_at timestamptz not null default now(),
  unique (gym_id, user_id)
);
```

Then add `gym_id` to every tenant-owned table, for example:

```sql
alter table public.clients
  add column gym_id uuid not null references public.gyms(id) on delete cascade;

alter table public.payments
  add column gym_id uuid not null references public.gyms(id) on delete cascade;

alter table public.memberships
  add column gym_id uuid not null references public.gyms(id) on delete cascade;

alter table public.plans
  add column gym_id uuid not null references public.gyms(id) on delete cascade;

alter table public.expenses
  add column gym_id uuid not null references public.gyms(id) on delete cascade;
```

If a table has a business key that is only unique within a gym, prefer composite uniqueness, for example:

```sql
create unique index ux_clients_gym_member_number
  on public.clients(gym_id, member_number);
```

## 4) Migration strategy for the existing gym

The safest approach is to migrate in-place without losing existing data:

1. Create a row in `public.gyms` for the existing gym.
2. Assign a stable UUID to that gym.
3. Backfill all existing tenant-owned rows with `gym_id = existing_gym_id`.
4. Revalidate parent/child relationships.
5. Enable RLS.
6. Update app queries to use the active gym context.

Example migration flow:

```sql
insert into public.gyms (id, name, slug, status)
values ('<existing-gym-uuid>', 'Current Gym', 'current-gym', 'active');

update public.clients
set gym_id = '<existing-gym-uuid>'
where gym_id is null;

update public.payments
set gym_id = '<existing-gym-uuid>'
where gym_id is null;

update public.memberships
set gym_id = '<existing-gym-uuid>'
where gym_id is null;

update public.plans
set gym_id = '<existing-gym-uuid>'
where gym_id is null;

update public.expenses
set gym_id = '<existing-gym-uuid>'
where gym_id is null;
```

Then add `NOT NULL` and foreign keys once the data is verified.

## 5) RLS design

This must be enforced at the database, not only in the app.

The pattern is:

```sql
auth.uid() -> gym_users -> gym_id -> authorized tenant
```

Secure policy pattern:

```sql
alter table public.clients enable row level security;

create policy "clients_select_own_gym"
on public.clients
for select
using (
  exists (
    select 1
    from public.gym_users gu
    where gu.user_id = auth.uid()
      and gu.gym_id = clients.gym_id
      and gu.status = 'active'
  )
);

create policy "clients_insert_own_gym"
on public.clients
for insert
with check (
  exists (
    select 1
    from public.gym_users gu
    where gu.user_id = auth.uid()
      and gu.gym_id = clients.gym_id
      and gu.status = 'active'
  )
);

create policy "clients_update_own_gym"
on public.clients
for update
using (
  exists (
    select 1
    from public.gym_users gu
    where gu.user_id = auth.uid()
      and gu.gym_id = clients.gym_id
      and gu.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.gym_users gu
    where gu.user_id = auth.uid()
      and gu.gym_id = clients.gym_id
      and gu.status = 'active'
  )
);
```

Repeat this logic for `payments`, `memberships`, `plans`, `expenses`, and storage objects. The app must never trust a client-supplied `gym_id`; enforcement is done by PostgreSQL/RLS.

## 6) Current gym selection pattern

The app needs one centralized tenant context. Recommended pattern:

- `AuthContext` resolves the logged-in user
- `GymContext` resolves the user’s allowed gyms via `gym_users`
- `activeGym` / `currentGym` is selected once and stored in context/state
- all queries use the active gym as context; the tenant is not passed ad hoc across screens

Recommended API shape:

```ts
useCurrentGym()
useGymMemberships()
getUserGyms()
setActiveGym(gymId)
```

Do not scatter `eq('gym_id', ...)` checks across every screen as the security boundary. Use them for UX/performance only, not as the protection mechanism.

## 7) Frontend changes required

Update all queries in [src/services/api.ts](../src/services/api.ts) and any screen data loaders to use a selected gym scope. Examples:

- `supabase.from('clients').select('*')` must become scoped to the active gym for the user
- `supabase.from('payments').select('*')` must also be scoped to the active gym
- any `insert`, `update`, `delete` must be validated through RLS and ideally by active gym context

The current code does a global fetch with no tenant filter, so this is where the single-gym assumption is baked in.

## 8) Storage and bucket strategy

If client photos are gym-specific, store them under a tenant-specific path such as:

```text
gyms/{gym_id}/client-photos/{client_id}/photo.jpg
```

Then apply storage policies checking that the user belongs to that exact `gym_id` before allowing reads/writes. Do not rely on a hidden file name alone; names are not security.

## 9) Data integrity and indexing

Add indexes on common tenant-scoped lookups:

```sql
create index idx_clients_gym_id on public.clients(gym_id);
create index idx_payments_gym_id on public.payments(gym_id);
create index idx_memberships_gym_id on public.memberships(gym_id);
create index idx_plans_gym_id on public.plans(gym_id);
create index idx_expenses_gym_id on public.expenses(gym_id);

create index idx_payments_gym_id_created_at on public.payments(gym_id, created_at desc);
create index idx_clients_gym_id_membership_status on public.clients(gym_id, membership_status);
```

## 10) Security audit checklist

After the migration, explicitly test the actual database boundary for a user from Gym A:

- SELECT Gym B clients
- UPDATE Gym B client
- DELETE Gym B payment
- INSERT row with `gym_id` = Gym B
- access Gym B storage
- invoke RPC functions that read Gym B data
- manipulate URL/local state to force another gym

Every unauthorized operation must fail at the database layer, not only in the UI.

## 11) Recommended implementation sequence

1. Add `gyms` + `gym_users`
2. Add `gym_id` to tenant-owned tables and backfill current gym data
3. Add indexes and unique constraints
4. Enable RLS on each tenant-owned table
5. Create a centralized gym context in the React Native app
6. Update data-fetch and mutation APIs to use the active gym
7. Add storage RLS and tenant-scoped file paths
8. Run a real security audit against Supabase/PostgreSQL

## Summary

The current app is a single-tenant design: all read/write logic targets unaudited global tables and there is no tenant membership model. The migration should introduce `gyms`, `gym_users`, and `gym_id` on every tenant-owned table, then enforce an RLS-based security boundary around the user’s authorized gyms. The existing gym data can be preserved by assigning it to a single created gym row and backfilling the UUID across all records.
