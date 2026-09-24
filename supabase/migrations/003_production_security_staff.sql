-- PACK 3: Production Security + Staff Management
-- Requires 001 and 002 to already be applied.

-- ============================================================
-- AUDIT LOG
-- ============================================================

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_gym_created
  on public.audit_logs(gym_id, created_at desc);

alter table public.audit_logs enable row level security;

-- No direct client inserts/updates/deletes into audit_logs.
drop policy if exists "audit_logs_select" on public.audit_logs;
drop policy if exists "audit_logs_insert" on public.audit_logs;
drop policy if exists "audit_logs_update" on public.audit_logs;
drop policy if exists "audit_logs_delete" on public.audit_logs;

-- ============================================================
-- STAFF INVITATIONS
-- Only a hash of the invitation code is stored.
-- ============================================================

create table if not exists public.gym_invitations (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  email text,
  role text not null check (
    role in ('admin','manager','receptionist','trainer','staff')
  ),
  token_hash text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_gym_invitations_gym
  on public.gym_invitations(gym_id, created_at desc);

create index if not exists idx_gym_invitations_expiry
  on public.gym_invitations(expires_at);

alter table public.gym_invitations enable row level security;

drop policy if exists "gym_invitations_select" on public.gym_invitations;
drop policy if exists "gym_invitations_insert" on public.gym_invitations;
drop policy if exists "gym_invitations_update" on public.gym_invitations;
drop policy if exists "gym_invitations_delete" on public.gym_invitations;

-- ============================================================
-- PAYMENT SAFETY
-- Financial records are voided, not deleted.
-- ============================================================

alter table public.payments
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references auth.users(id) on delete set null,
  add column if not exists void_reason text,
  add column if not exists idempotency_key text;

alter table public.payments
  drop constraint if exists payments_status_check;

alter table public.payments
  add constraint payments_status_check
  check (status in ('Paid', 'Pending', 'Voided'));

create unique index if not exists idx_payments_gym_idempotency
  on public.payments(gym_id, idempotency_key)
  where idempotency_key is not null;

-- ============================================================
-- PRIVATE PHOTO STORAGE FOUNDATION
-- Existing public bucket is intentionally NOT changed in this migration.
-- This avoids breaking current photo URLs. A future migration can move
-- existing objects and switch the application to signed URLs.
-- ============================================================

alter table public.clients
  add column if not exists photo_path text;

insert into storage.buckets (id, name, public)
values ('client-photos-private', 'client-photos-private', false)
on conflict (id)
do update set public = false;

drop policy if exists "private_client_photos_select" on storage.objects;
drop policy if exists "private_client_photos_insert" on storage.objects;
drop policy if exists "private_client_photos_update" on storage.objects;
drop policy if exists "private_client_photos_delete" on storage.objects;

create policy "private_client_photos_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'client-photos-private'
  and exists (
    select 1
    from public.gym_users gu
    where gu.user_id = auth.uid()
      and gu.status = 'active'
      and gu.gym_id::text = (storage.foldername(name))[1]
  )
);

create policy "private_client_photos_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'client-photos-private'
  and exists (
    select 1
    from public.gym_users gu
    where gu.user_id = auth.uid()
      and gu.status = 'active'
      and gu.role in ('owner','admin','manager','receptionist','staff')
      and gu.gym_id::text = (storage.foldername(name))[1]
  )
);

create policy "private_client_photos_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'client-photos-private'
  and exists (
    select 1
    from public.gym_users gu
    where gu.user_id = auth.uid()
      and gu.status = 'active'
      and gu.role in ('owner','admin','manager','receptionist','staff')
      and gu.gym_id::text = (storage.foldername(name))[1]
  )
)
with check (
  bucket_id = 'client-photos-private'
  and exists (
    select 1
    from public.gym_users gu
    where gu.user_id = auth.uid()
      and gu.status = 'active'
      and gu.role in ('owner','admin','manager','receptionist','staff')
      and gu.gym_id::text = (storage.foldername(name))[1]
  )
);

create policy "private_client_photos_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'client-photos-private'
  and exists (
    select 1
    from public.gym_users gu
    where gu.user_id = auth.uid()
      and gu.status = 'active'
      and gu.role in ('owner','admin')
      and gu.gym_id::text = (storage.foldername(name))[1]
  )
);

-- ============================================================
-- CENTRAL PERMISSION HELPERS
-- SECURITY DEFINER avoids RLS recursion.
-- ============================================================

create or replace function public.has_gym_role(
  p_gym_id uuid,
  p_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.gym_users gu
    where gu.gym_id = p_gym_id
      and gu.user_id = auth.uid()
      and gu.status = 'active'
      and gu.role = any(p_roles)
  );
$$;

revoke all on function public.has_gym_role(uuid, text[]) from public;
grant execute on function public.has_gym_role(uuid, text[]) to authenticated;

create or replace function public.get_my_gym_role(
  p_gym_id uuid
)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select gu.role
  from public.gym_users gu
  where gu.gym_id = p_gym_id
    and gu.user_id = auth.uid()
    and gu.status = 'active'
  limit 1;
$$;

revoke all on function public.get_my_gym_role(uuid) from public;
grant execute on function public.get_my_gym_role(uuid) to authenticated;

-- ============================================================
-- STAFF LIST
-- ============================================================

create or replace function public.list_gym_staff(
  p_gym_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_result jsonb;
begin
  if not public.has_gym_role(
    p_gym_id,
    array['owner','admin','manager','receptionist','trainer','staff']::text[]
  ) then
    raise exception 'You do not have access to this gym';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', gu.id,
        'user_id', gu.user_id,
        'email', au.email,
        'role', gu.role,
        'status', gu.status,
        'created_at', gu.created_at,
        'updated_at', gu.updated_at
      )
      order by
        case gu.role
          when 'owner' then 1
          when 'admin' then 2
          when 'manager' then 3
          when 'receptionist' then 4
          when 'trainer' then 5
          else 6
        end,
        gu.created_at asc
    ),
    '[]'::jsonb
  )
  into v_result
  from public.gym_users gu
  left join auth.users au on au.id = gu.user_id
  where gu.gym_id = p_gym_id;

  return v_result;
end;
$$;

revoke all on function public.list_gym_staff(uuid) from public;
grant execute on function public.list_gym_staff(uuid) to authenticated;

-- ============================================================
-- CREATE STAFF INVITATION
-- Owner/admin can invite. Only owner can invite an admin.
-- Code is returned once; only md5(code) is stored.
-- UUID-derived code gives high entropy even though the visible token is short.
-- ============================================================

create or replace function public.create_staff_invitation(
  p_gym_id uuid,
  p_role text,
  p_email text default null,
  p_expires_hours integer default 48
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text;
  v_invite public.gym_invitations;
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.has_gym_role(p_gym_id, array['owner','admin']::text[]) then
    raise exception 'Only an owner or admin can invite staff';
  end if;

  if p_role not in ('admin','manager','receptionist','trainer','staff') then
    raise exception 'Invalid staff role';
  end if;

  if p_role = 'admin'
     and not public.has_gym_role(p_gym_id, array['owner']::text[]) then
    raise exception 'Only the owner can invite an admin';
  end if;

  if p_expires_hours < 1 or p_expires_hours > 168 then
    raise exception 'Invitation expiry must be between 1 and 168 hours';
  end if;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));

  insert into public.gym_invitations (
    gym_id,
    email,
    role,
    token_hash,
    created_by,
    expires_at
  )
  values (
    p_gym_id,
    v_email,
    p_role,
    md5(v_code),
    v_user_id,
    now() + make_interval(hours => p_expires_hours)
  )
  returning * into v_invite;

  insert into public.audit_logs (
    gym_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    new_value
  )
  values (
    p_gym_id,
    v_user_id,
    'staff.invitation_created',
    'gym_invitation',
    v_invite.id::text,
    jsonb_build_object(
      'role', p_role,
      'email', v_email,
      'expires_at', v_invite.expires_at
    )
  );

  return jsonb_build_object(
    'id', v_invite.id,
    'code', v_code,
    'role', v_invite.role,
    'email', v_invite.email,
    'expires_at', v_invite.expires_at
  );
end;
$$;

revoke all on function public.create_staff_invitation(uuid, text, text, integer) from public;
grant execute on function public.create_staff_invitation(uuid, text, text, integer) to authenticated;

-- ============================================================
-- LIST INVITATIONS
-- ============================================================

create or replace function public.list_staff_invitations(
  p_gym_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if not public.has_gym_role(p_gym_id, array['owner','admin']::text[]) then
    raise exception 'Only an owner or admin can view invitations';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', gi.id,
        'email', gi.email,
        'role', gi.role,
        'expires_at', gi.expires_at,
        'accepted_at', gi.accepted_at,
        'revoked_at', gi.revoked_at,
        'created_at', gi.created_at,
        'status',
          case
            when gi.revoked_at is not null then 'revoked'
            when gi.accepted_at is not null then 'accepted'
            when gi.expires_at <= now() then 'expired'
            else 'pending'
          end
      )
      order by gi.created_at desc
    ),
    '[]'::jsonb
  )
  into v_result
  from public.gym_invitations gi
  where gi.gym_id = p_gym_id;

  return v_result;
end;
$$;

revoke all on function public.list_staff_invitations(uuid) from public;
grant execute on function public.list_staff_invitations(uuid) to authenticated;

-- ============================================================
-- ACCEPT INVITATION
-- ============================================================

create or replace function public.accept_staff_invitation(
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_code text := upper(trim(coalesce(p_code, '')));
  v_invite public.gym_invitations;
  v_gym public.gyms;
  v_existing_role text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if v_code = '' then
    raise exception 'Invitation code is required';
  end if;

  select lower(email)
  into v_email
  from auth.users
  where id = v_user_id;

  select *
  into v_invite
  from public.gym_invitations
  where token_hash = md5(v_code)
    and accepted_at is null
    and revoked_at is null
    and expires_at > now()
  limit 1;

  if v_invite.id is null then
    raise exception 'Invitation is invalid or expired';
  end if;

  if v_invite.email is not null
     and lower(v_invite.email) <> lower(coalesce(v_email, '')) then
    raise exception 'This invitation was created for a different email address';
  end if;

  select role
  into v_existing_role
  from public.gym_users
  where gym_id = v_invite.gym_id
    and user_id = v_user_id
  limit 1;

  if v_existing_role = 'owner' then
    raise exception 'The gym owner cannot accept a staff invitation';
  end if;

  insert into public.gym_users (
    gym_id,
    user_id,
    role,
    status
  )
  values (
    v_invite.gym_id,
    v_user_id,
    v_invite.role,
    'active'
  )
  on conflict (gym_id, user_id)
  do update
  set
    role = excluded.role,
    status = 'active',
    updated_at = now();

  update public.gym_invitations
  set
    accepted_at = now(),
    accepted_by = v_user_id
  where id = v_invite.id;

  insert into public.audit_logs (
    gym_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    new_value
  )
  values (
    v_invite.gym_id,
    v_user_id,
    'staff.invitation_accepted',
    'gym_user',
    v_user_id::text,
    jsonb_build_object('role', v_invite.role)
  );

  select *
  into v_gym
  from public.gyms
  where id = v_invite.gym_id;

  return to_jsonb(v_gym);
end;
$$;

revoke all on function public.accept_staff_invitation(text) from public;
grant execute on function public.accept_staff_invitation(text) to authenticated;

-- ============================================================
-- REVOKE INVITATION
-- ============================================================

create or replace function public.revoke_staff_invitation(
  p_invitation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invite public.gym_invitations;
begin
  select *
  into v_invite
  from public.gym_invitations
  where id = p_invitation_id;

  if v_invite.id is null then
    raise exception 'Invitation not found';
  end if;

  if not public.has_gym_role(v_invite.gym_id, array['owner','admin']::text[]) then
    raise exception 'Only an owner or admin can revoke invitations';
  end if;

  update public.gym_invitations
  set revoked_at = now()
  where id = p_invitation_id
    and accepted_at is null
    and revoked_at is null;

  insert into public.audit_logs (
    gym_id,
    actor_user_id,
    action,
    entity_type,
    entity_id
  )
  values (
    v_invite.gym_id,
    auth.uid(),
    'staff.invitation_revoked',
    'gym_invitation',
    v_invite.id::text
  );
end;
$$;

revoke all on function public.revoke_staff_invitation(uuid) from public;
grant execute on function public.revoke_staff_invitation(uuid) to authenticated;

-- ============================================================
-- CHANGE STAFF ROLE
-- Owner can manage all non-owner roles.
-- Admin can manage manager/receptionist/trainer/staff only.
-- ============================================================

create or replace function public.update_staff_role(
  p_gym_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.gym_users;
  v_actor uuid := auth.uid();
  v_old_role text;
begin
  select *
  into v_row
  from public.gym_users
  where id = p_gym_user_id;

  if v_row.id is null then
    raise exception 'Staff membership not found';
  end if;

  v_old_role := v_row.role;

  if v_row.role = 'owner' then
    raise exception 'Owner role cannot be changed here';
  end if;

  if p_role not in ('admin','manager','receptionist','trainer','staff') then
    raise exception 'Invalid staff role';
  end if;

  if public.has_gym_role(v_row.gym_id, array['owner']::text[]) then
    null;
  elsif public.has_gym_role(v_row.gym_id, array['admin']::text[]) then
    if v_row.role = 'admin' or p_role = 'admin' then
      raise exception 'Only the owner can manage admin roles';
    end if;
  else
    raise exception 'You do not have permission to change staff roles';
  end if;

  update public.gym_users
  set
    role = p_role,
    updated_at = now()
  where id = p_gym_user_id;

  insert into public.audit_logs (
    gym_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    old_value,
    new_value
  )
  values (
    v_row.gym_id,
    v_actor,
    'staff.role_changed',
    'gym_user',
    p_gym_user_id::text,
    jsonb_build_object('role', v_old_role),
    jsonb_build_object('role', p_role)
  );
end;
$$;

revoke all on function public.update_staff_role(uuid, text) from public;
grant execute on function public.update_staff_role(uuid, text) to authenticated;

-- ============================================================
-- DEACTIVATE STAFF
-- ============================================================

create or replace function public.deactivate_staff_member(
  p_gym_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.gym_users;
begin
  select *
  into v_row
  from public.gym_users
  where id = p_gym_user_id;

  if v_row.id is null then
    raise exception 'Staff membership not found';
  end if;

  if v_row.role = 'owner' then
    raise exception 'The gym owner cannot be deactivated';
  end if;

  if v_row.user_id = auth.uid() then
    raise exception 'You cannot deactivate your own membership';
  end if;

  if public.has_gym_role(v_row.gym_id, array['owner']::text[]) then
    null;
  elsif public.has_gym_role(v_row.gym_id, array['admin']::text[]) then
    if v_row.role = 'admin' then
      raise exception 'Only the owner can deactivate an admin';
    end if;
  else
    raise exception 'You do not have permission to deactivate staff';
  end if;

  update public.gym_users
  set
    status = 'inactive',
    updated_at = now()
  where id = p_gym_user_id;

  insert into public.audit_logs (
    gym_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    old_value,
    new_value
  )
  values (
    v_row.gym_id,
    auth.uid(),
    'staff.deactivated',
    'gym_user',
    p_gym_user_id::text,
    jsonb_build_object('status', v_row.status),
    jsonb_build_object('status', 'inactive')
  );
end;
$$;

revoke all on function public.deactivate_staff_member(uuid) from public;
grant execute on function public.deactivate_staff_member(uuid) to authenticated;

-- ============================================================
-- AUDIT LOG VIEW
-- ============================================================

create or replace function public.list_audit_logs(
  p_gym_id uuid,
  p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_result jsonb;
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 250));
begin
  if not public.has_gym_role(p_gym_id, array['owner','admin','manager']::text[]) then
    raise exception 'You do not have permission to view the activity log';
  end if;

  select coalesce(
    jsonb_agg(row_data order by created_at desc),
    '[]'::jsonb
  )
  into v_result
  from (
    select
      al.created_at,
      jsonb_build_object(
        'id', al.id,
        'actor_user_id', al.actor_user_id,
        'actor_email', au.email,
        'action', al.action,
        'entity_type', al.entity_type,
        'entity_id', al.entity_id,
        'old_value', al.old_value,
        'new_value', al.new_value,
        'metadata', al.metadata,
        'created_at', al.created_at
      ) as row_data
    from public.audit_logs al
    left join auth.users au on au.id = al.actor_user_id
    where al.gym_id = p_gym_id
    order by al.created_at desc
    limit v_limit
  ) q;

  return v_result;
end;
$$;

revoke all on function public.list_audit_logs(uuid, integer) from public;
grant execute on function public.list_audit_logs(uuid, integer) to authenticated;

-- ============================================================
-- PAYMENT VOIDING
-- ============================================================

create or replace function public.void_payment(
  p_payment_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment public.payments;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  select *
  into v_payment
  from public.payments
  where id = p_payment_id;

  if v_payment.id is null then
    raise exception 'Payment not found';
  end if;

  if not public.has_gym_role(v_payment.gym_id, array['owner','admin']::text[]) then
    raise exception 'Only an owner or admin can void a payment';
  end if;

  if v_payment.status = 'Voided' then
    return to_jsonb(v_payment);
  end if;

  if v_reason = '' then
    raise exception 'A void reason is required';
  end if;

  update public.payments
  set
    status = 'Voided',
    voided_at = now(),
    voided_by = auth.uid(),
    void_reason = v_reason
  where id = p_payment_id
  returning * into v_payment;

  insert into public.audit_logs (
    gym_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    new_value
  )
  values (
    v_payment.gym_id,
    auth.uid(),
    'payment.voided',
    'payment',
    v_payment.id::text,
    jsonb_build_object(
      'amount', v_payment.amount,
      'client_id', v_payment.client_id,
      'reason', v_reason
    )
  );

  return to_jsonb(v_payment);
end;
$$;

revoke all on function public.void_payment(uuid, text) from public;
grant execute on function public.void_payment(uuid, text) to authenticated;

-- ============================================================
-- REMOVE OLD SHARED JOIN FLOW EXECUTION
-- Existing join_code column is kept for backwards compatibility,
-- but new users should use expiring staff invitations.
-- ============================================================

revoke execute on function public.join_gym_by_code(text) from authenticated;