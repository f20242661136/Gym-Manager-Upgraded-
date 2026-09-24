create extension if not exists pgcrypto;

create table if not exists public.gyms (
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

create table if not exists public.gym_users (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner', 'admin', 'manager', 'staff', 'trainer', 'receptionist')),
  status text not null default 'active' check (status in ('active', 'pending', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gym_id, user_id)
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  age integer,
  gender text,
  weight numeric,
  height numeric,
  chest numeric,
  waist numeric,
  bmi numeric,
  photo_url text,
  membership_status text not null default 'Unpaid' check (membership_status in ('Paid', 'Unpaid')),
  registration_date timestamptz not null default now(),
  membership_due_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  client_name text not null,
  amount numeric not null check (amount >= 0),
  payment_date timestamptz not null default now(),
  due_date timestamptz,
  status text not null default 'Pending' check (status in ('Paid', 'Pending')),
  duration integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  plan_id uuid,
  start_date timestamptz not null default now(),
  end_date timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'inactive', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  name text not null,
  duration_days integer not null check (duration_days > 0),
  price numeric not null check (price >= 0),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  description text not null,
  amount numeric not null check (amount >= 0),
  category text,
  expense_date timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gyms_slug on public.gyms(slug);
create index if not exists idx_gym_users_user_id on public.gym_users(user_id);
create index if not exists idx_gym_users_gym_id on public.gym_users(gym_id);
create index if not exists idx_clients_gym_id on public.clients(gym_id);
create index if not exists idx_clients_gym_status on public.clients(gym_id, membership_status);
create index if not exists idx_payments_gym_id on public.payments(gym_id);
create index if not exists idx_payments_client_id on public.payments(client_id);
create index if not exists idx_memberships_gym_id on public.memberships(gym_id);
create index if not exists idx_plans_gym_id on public.plans(gym_id);
create index if not exists idx_expenses_gym_id on public.expenses(gym_id);

alter table public.gyms enable row level security;
alter table public.gym_users enable row level security;
alter table public.clients enable row level security;
alter table public.payments enable row level security;
alter table public.memberships enable row level security;
alter table public.plans enable row level security;
alter table public.expenses enable row level security;

create policy "gym_users_can_view_their_gyms"
on public.gyms
for select
using (
  exists (
    select 1
    from public.gym_users gu
    where gu.gym_id = gyms.id
      and gu.user_id = auth.uid()
      and gu.status = 'active'
  )
);

create policy "gym_users_select_own_membership"
on public.gym_users
for select
using (
  user_id = auth.uid()
);

create policy "gym_users_insert_own_membership"
on public.gym_users
for insert
with check (
  user_id = auth.uid()
);

create policy "gym_users_update_own_membership"
on public.gym_users
for update
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);

create policy "gym_users_delete_own_membership"
on public.gym_users
for delete
using (
  user_id = auth.uid()
);

create policy "tenant_users_can_access_their_clients"
on public.clients
for all
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

create policy "tenant_users_can_access_their_payments"
on public.payments
for all
using (
  exists (
    select 1
    from public.gym_users gu
    where gu.user_id = auth.uid()
      and gu.gym_id = payments.gym_id
      and gu.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.gym_users gu
    where gu.user_id = auth.uid()
      and gu.gym_id = payments.gym_id
      and gu.status = 'active'
  )
);

create policy "tenant_users_can_access_their_memberships"
on public.memberships
for all
using (
  exists (
    select 1
    from public.gym_users gu
    where gu.user_id = auth.uid()
      and gu.gym_id = memberships.gym_id
      and gu.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.gym_users gu
    where gu.user_id = auth.uid()
      and gu.gym_id = memberships.gym_id
      and gu.status = 'active'
  )
);

create policy "tenant_users_can_access_their_plans"
on public.plans
for all
using (
  exists (
    select 1
    from public.gym_users gu
    where gu.user_id = auth.uid()
      and gu.gym_id = plans.gym_id
      and gu.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.gym_users gu
    where gu.user_id = auth.uid()
      and gu.gym_id = plans.gym_id
      and gu.status = 'active'
  )
);

create policy "tenant_users_can_access_their_expenses"
on public.expenses
for all
using (
  exists (
    select 1
    from public.gym_users gu
    where gu.user_id = auth.uid()
      and gu.gym_id = expenses.gym_id
      and gu.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.gym_users gu
    where gu.user_id = auth.uid()
      and gu.gym_id = expenses.gym_id
      and gu.status = 'active'
  )
);

create or replace function public.get_user_gym_ids()
returns table(gym_id uuid)
language sql
security definer
set search_path = public
as $$
  select gu.gym_id
  from public.gym_users gu
  where gu.user_id = auth.uid() and gu.status = 'active';
$$;

