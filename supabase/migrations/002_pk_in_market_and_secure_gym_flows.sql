create extension if not exists pgcrypto;

-- =========================================================
-- Pakistan / India market settings
-- =========================================================

alter table public.gyms
  add column if not exists country_code text not null default 'PK',
  add column if not exists currency_code text not null default 'PKR',
  add column if not exists timezone text not null default 'Asia/Karachi',
  add column if not exists locale text not null default 'en-PK',
  add column if not exists join_code text;

update public.gyms
set join_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
where join_code is null;

alter table public.gyms
  alter column join_code set not null;

create unique index if not exists idx_gyms_join_code
  on public.gyms(join_code);

alter table public.gyms
  drop constraint if exists gyms_country_code_check;

alter table public.gyms
  add constraint gyms_country_code_check
  check (country_code in ('PK', 'IN'));

alter table public.gyms
  drop constraint if exists gyms_currency_code_check;

alter table public.gyms
  add constraint gyms_currency_code_check
  check (currency_code in ('PKR', 'INR'));

alter table public.payments
  add column if not exists payment_method text not null default 'cash',
  add column if not exists reference_number text,
  add column if not exists provider_transaction_id text,
  add column if not exists notes text;

alter table public.payments
  drop constraint if exists payments_payment_method_check;

alter table public.payments
  add constraint payments_payment_method_check
  check (
    payment_method in (
      'cash',
      'bank_transfer',
      'raast',
      'easypaisa',
      'jazzcash',
      'upi',
      'card',
      'other'
    )
  );

create index if not exists idx_payments_gym_payment_method
  on public.payments(gym_id, payment_method);

-- =========================================================
-- Remove unsafe self-service gym membership mutation policies.
-- Membership creation is handled by controlled RPC functions below.
-- =========================================================

drop policy if exists "gym_users_insert_own_membership" on public.gym_users;
drop policy if exists "gym_users_update_own_membership" on public.gym_users;
drop policy if exists "gym_users_delete_own_membership" on public.gym_users;

-- =========================================================
-- Secure gym creation
-- Creates the gym and owner membership in one DB transaction.
-- =========================================================

create or replace function public.create_gym(
  p_name text,
  p_slug text,
  p_country_code text default 'PK',
  p_phone text default null,
  p_email text default null,
  p_address text default null,
  p_logo_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_country text := upper(trim(coalesce(p_country_code, 'PK')));
  v_currency text;
  v_timezone text;
  v_locale text;
  v_gym public.gyms;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'Gym name is required';
  end if;

  if nullif(trim(p_slug), '') is null then
    raise exception 'Gym slug is required';
  end if;

  if v_country not in ('PK', 'IN') then
    raise exception 'Unsupported country';
  end if;

  if v_country = 'IN' then
    v_currency := 'INR';
    v_timezone := 'Asia/Kolkata';
    v_locale := 'en-IN';
  else
    v_currency := 'PKR';
    v_timezone := 'Asia/Karachi';
    v_locale := 'en-PK';
  end if;

  insert into public.gyms (
    name,
    slug,
    logo_url,
    phone,
    email,
    address,
    country_code,
    currency_code,
    timezone,
    locale,
    join_code,
    status
  )
  values (
    trim(p_name),
    lower(trim(p_slug)),
    p_logo_url,
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_address, '')), ''),
    v_country,
    v_currency,
    v_timezone,
    v_locale,
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
    'active'
  )
  returning * into v_gym;

  insert into public.gym_users (
    gym_id,
    user_id,
    role,
    status
  )
  values (
    v_gym.id,
    v_user_id,
    'owner',
    'active'
  );

  return to_jsonb(v_gym);
end;
$$;

revoke all on function public.create_gym(text, text, text, text, text, text, text) from public;
grant execute on function public.create_gym(text, text, text, text, text, text, text) to authenticated;

-- =========================================================
-- Join using a shared random join code rather than a guessable slug.
-- MVP behavior: the code grants a "staff" membership.
-- Later we can replace this with expiring role-based invitations.
-- =========================================================

create or replace function public.join_gym_by_code(
  p_join_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_join_code, '')));
  v_gym public.gyms;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if v_code = '' then
    raise exception 'Join code is required';
  end if;

  select *
  into v_gym
  from public.gyms
  where join_code = v_code
    and status = 'active'
  limit 1;

  if v_gym.id is null then
    raise exception 'Invalid gym join code';
  end if;

  insert into public.gym_users (
    gym_id,
    user_id,
    role,
    status
  )
  values (
    v_gym.id,
    v_user_id,
    'staff',
    'active'
  )
  on conflict (gym_id, user_id)
  do update
  set
    status = 'active',
    updated_at = now();

  return to_jsonb(v_gym);
end;
$$;

revoke all on function public.join_gym_by_code(text) from public;
grant execute on function public.join_gym_by_code(text) to authenticated;