-- PACK 5: Attendance + QR Check-In
-- Requires PACK 3 permissions and PACK 4 membership engine.

-- ============================================================
-- CLIENT QR IDENTIFIER
-- The QR contains no member name/phone/email.
-- ============================================================

alter table public.clients
  add column if not exists qr_token uuid;

update public.clients
set qr_token = gen_random_uuid()
where qr_token is null;

alter table public.clients
  alter column qr_token set default gen_random_uuid();

alter table public.clients
  alter column qr_token set not null;

create unique index if not exists ux_clients_qr_token
  on public.clients(qr_token);

-- ============================================================
-- ATTENDANCE
-- One open visit per member. A member can check in again after checkout.
-- ============================================================

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  membership_id uuid references public.memberships(id) on delete set null,
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  source text not null default 'manual'
    check (source in ('manual','qr')),
  created_by uuid references auth.users(id) on delete set null,
  checked_out_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    check_out_at is null
    or check_out_at >= check_in_at
  )
);

create index if not exists idx_attendance_gym_checkin
  on public.attendance(gym_id, check_in_at desc);

create index if not exists idx_attendance_client_checkin
  on public.attendance(gym_id, client_id, check_in_at desc);

create unique index if not exists ux_attendance_one_open_visit
  on public.attendance(gym_id, client_id)
  where check_out_at is null;

alter table public.attendance enable row level security;

drop policy if exists "attendance_select_gym" on public.attendance;
drop policy if exists "attendance_insert_gym" on public.attendance;
drop policy if exists "attendance_update_gym" on public.attendance;
drop policy if exists "attendance_delete_gym" on public.attendance;

create policy "attendance_select_gym"
on public.attendance
for select
to authenticated
using (
  public.has_gym_role(
    gym_id,
    array[
      'owner',
      'admin',
      'manager',
      'receptionist',
      'trainer',
      'staff'
    ]::text[]
  )
);

-- Writes intentionally go through SECURITY DEFINER RPCs.
-- No direct insert/update/delete policies are created.

-- ============================================================
-- HELPER: resolve an eligible membership.
-- A scheduled row becomes usable automatically once start_date arrives.
-- Frozen/cancelled memberships are blocked.
-- ============================================================

create or replace function public.get_checkin_membership(
  p_gym_id uuid,
  p_client_id uuid
)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.id
  from public.memberships m
  where m.gym_id = p_gym_id
    and m.client_id = p_client_id
    and m.status not in ('frozen','cancelled')
    and m.start_date <= now()
    and m.end_date >= now()
  order by m.end_date desc
  limit 1;
$$;

revoke all on function public.get_checkin_membership(uuid, uuid) from public;
grant execute on function public.get_checkin_membership(uuid, uuid) to authenticated;

-- ============================================================
-- SEARCH MEMBERS FOR FRONT DESK
-- ============================================================

create or replace function public.search_attendance_clients(
  p_gym_id uuid,
  p_query text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_query text := trim(coalesce(p_query, ''));
  v_result jsonb;
begin
  if not public.has_gym_role(
    p_gym_id,
    array[
      'owner',
      'admin',
      'manager',
      'receptionist',
      'trainer',
      'staff'
    ]::text[]
  ) then
    raise exception 'You do not have access to attendance';
  end if;

  select coalesce(
    jsonb_agg(row_data order by member_name asc),
    '[]'::jsonb
  )
  into v_result
  from (
    select
      c.name as member_name,
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'phone', c.phone,
        'photo_url', c.photo_url,
        'qr_token', c.qr_token,
        'membership_due_date', c.membership_due_date,
        'membership_status',
          case
            when exists (
              select 1
              from public.memberships m
              where m.gym_id = p_gym_id
                and m.client_id = c.id
                and m.status = 'frozen'
                and m.start_date <= now()
                and m.end_date >= now()
            ) then 'frozen'
            when public.get_checkin_membership(p_gym_id, c.id) is not null
              then 'active'
            when c.membership_due_date is not null
              and c.membership_due_date < now()
              then 'expired'
            else 'inactive'
          end,
        'can_check_in',
          public.get_checkin_membership(p_gym_id, c.id) is not null,
        'is_checked_in',
          exists (
            select 1
            from public.attendance a
            where a.gym_id = p_gym_id
              and a.client_id = c.id
              and a.check_out_at is null
          )
      ) as row_data
    from public.clients c
    where c.gym_id = p_gym_id
      and (
        v_query = ''
        or c.name ilike '%' || v_query || '%'
        or coalesce(c.phone, '') ilike '%' || v_query || '%'
        or c.id::text ilike v_query || '%'
      )
    order by c.name asc
    limit 40
  ) q;

  return v_result;
end;
$$;

revoke all on function public.search_attendance_clients(uuid, text) from public;
grant execute on function public.search_attendance_clients(uuid, text) to authenticated;

-- ============================================================
-- CHECK IN
-- ============================================================

create or replace function public.check_in_client(
  p_gym_id uuid,
  p_client_id uuid,
  p_source text default 'manual'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client public.clients;
  v_membership_id uuid;
  v_existing public.attendance;
  v_row public.attendance;
begin
  if not public.has_gym_role(
    p_gym_id,
    array[
      'owner',
      'admin',
      'manager',
      'receptionist',
      'trainer',
      'staff'
    ]::text[]
  ) then
    raise exception 'You do not have permission to check members in';
  end if;

  if p_source not in ('manual','qr') then
    raise exception 'Invalid check-in source';
  end if;

  select *
  into v_client
  from public.clients
  where id = p_client_id
    and gym_id = p_gym_id;

  if v_client.id is null then
    raise exception 'Member not found in this gym';
  end if;

  v_membership_id :=
    public.get_checkin_membership(p_gym_id, p_client_id);

  if v_membership_id is null then
    if exists (
      select 1
      from public.memberships m
      where m.gym_id = p_gym_id
        and m.client_id = p_client_id
        and m.status = 'frozen'
        and m.start_date <= now()
        and m.end_date >= now()
    ) then
      raise exception 'Membership is frozen';
    end if;

    raise exception 'No active membership. Renew this member before check-in.';
  end if;

  select *
  into v_existing
  from public.attendance
  where gym_id = p_gym_id
    and client_id = p_client_id
    and check_out_at is null
  order by check_in_at desc
  limit 1;

  if v_existing.id is not null then
    return jsonb_build_object(
      'attendance', to_jsonb(v_existing),
      'client', jsonb_build_object(
        'id', v_client.id,
        'name', v_client.name,
        'phone', v_client.phone,
        'photo_url', v_client.photo_url
      ),
      'duplicate', true,
      'message', 'Member is already checked in'
    );
  end if;

  insert into public.attendance (
    gym_id,
    client_id,
    membership_id,
    source,
    created_by
  )
  values (
    p_gym_id,
    p_client_id,
    v_membership_id,
    p_source,
    auth.uid()
  )
  returning * into v_row;

  return jsonb_build_object(
    'attendance', to_jsonb(v_row),
    'client', jsonb_build_object(
      'id', v_client.id,
      'name', v_client.name,
      'phone', v_client.phone,
      'photo_url', v_client.photo_url
    ),
    'duplicate', false,
    'message', 'Check-in successful'
  );
end;
$$;

revoke all on function public.check_in_client(uuid, uuid, text) from public;
grant execute on function public.check_in_client(uuid, uuid, text) to authenticated;

-- ============================================================
-- QR CHECK IN
-- QR token contains no PII and is scoped to the selected gym.
-- ============================================================

create or replace function public.check_in_by_qr(
  p_gym_id uuid,
  p_qr_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client_id uuid;
begin
  select c.id
  into v_client_id
  from public.clients c
  where c.gym_id = p_gym_id
    and c.qr_token = p_qr_token
  limit 1;

  if v_client_id is null then
    raise exception 'This member QR code does not belong to the active gym';
  end if;

  return public.check_in_client(
    p_gym_id,
    v_client_id,
    'qr'
  );
end;
$$;

revoke all on function public.check_in_by_qr(uuid, uuid) from public;
grant execute on function public.check_in_by_qr(uuid, uuid) to authenticated;

-- ============================================================
-- CHECK OUT
-- ============================================================

create or replace function public.check_out_attendance(
  p_attendance_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.attendance;
begin
  select *
  into v_row
  from public.attendance
  where id = p_attendance_id;

  if v_row.id is null then
    raise exception 'Attendance visit not found';
  end if;

  if not public.has_gym_role(
    v_row.gym_id,
    array[
      'owner',
      'admin',
      'manager',
      'receptionist',
      'trainer',
      'staff'
    ]::text[]
  ) then
    raise exception 'You do not have permission to check members out';
  end if;

  if v_row.check_out_at is not null then
    return to_jsonb(v_row);
  end if;

  update public.attendance
  set
    check_out_at = now(),
    checked_out_by = auth.uid(),
    updated_at = now()
  where id = p_attendance_id
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.check_out_attendance(uuid) from public;
grant execute on function public.check_out_attendance(uuid) to authenticated;

-- ============================================================
-- TODAY LIST
-- Uses each gym's configured local timezone.
-- ============================================================

create or replace function public.list_today_attendance(
  p_gym_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_timezone text;
  v_result jsonb;
begin
  if not public.has_gym_role(
    p_gym_id,
    array[
      'owner',
      'admin',
      'manager',
      'receptionist',
      'trainer',
      'staff'
    ]::text[]
  ) then
    raise exception 'You do not have access to attendance';
  end if;

  select coalesce(g.timezone, 'Asia/Karachi')
  into v_timezone
  from public.gyms g
  where g.id = p_gym_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'client_id', c.id,
        'client_name', c.name,
        'phone', c.phone,
        'photo_url', c.photo_url,
        'check_in_at', a.check_in_at,
        'check_out_at', a.check_out_at,
        'source', a.source,
        'membership_id', a.membership_id
      )
      order by a.check_in_at desc
    ),
    '[]'::jsonb
  )
  into v_result
  from public.attendance a
  join public.clients c
    on c.id = a.client_id
  where a.gym_id = p_gym_id
    and (a.check_in_at at time zone v_timezone)::date
      = (now() at time zone v_timezone)::date;

  return v_result;
end;
$$;

revoke all on function public.list_today_attendance(uuid) from public;
grant execute on function public.list_today_attendance(uuid) to authenticated;

-- ============================================================
-- SUMMARY / PEAK HOUR
-- ============================================================

create or replace function public.get_attendance_summary(
  p_gym_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_timezone text;
  v_today_count integer := 0;
  v_inside_count integer := 0;
  v_unique_count integer := 0;
  v_peak_hour integer;
begin
  if not public.has_gym_role(
    p_gym_id,
    array[
      'owner',
      'admin',
      'manager',
      'receptionist',
      'trainer',
      'staff'
    ]::text[]
  ) then
    raise exception 'You do not have access to attendance';
  end if;

  select coalesce(g.timezone, 'Asia/Karachi')
  into v_timezone
  from public.gyms g
  where g.id = p_gym_id;

  select
    count(*)::integer,
    count(distinct a.client_id)::integer
  into
    v_today_count,
    v_unique_count
  from public.attendance a
  where a.gym_id = p_gym_id
    and (a.check_in_at at time zone v_timezone)::date
      = (now() at time zone v_timezone)::date;

  select count(*)::integer
  into v_inside_count
  from public.attendance a
  where a.gym_id = p_gym_id
    and a.check_out_at is null;

  select peak.hour_value
  into v_peak_hour
  from (
    select
      extract(hour from a.check_in_at at time zone v_timezone)::integer as hour_value,
      count(*) as visit_count
    from public.attendance a
    where a.gym_id = p_gym_id
      and (a.check_in_at at time zone v_timezone)::date
        = (now() at time zone v_timezone)::date
    group by 1
    order by visit_count desc, hour_value asc
    limit 1
  ) peak;

  return jsonb_build_object(
    'today_count', v_today_count,
    'inside_count', v_inside_count,
    'unique_members', v_unique_count,
    'peak_hour', v_peak_hour,
    'timezone', v_timezone
  );
end;
$$;

revoke all on function public.get_attendance_summary(uuid) from public;
grant execute on function public.get_attendance_summary(uuid) to authenticated;

-- ============================================================
-- MEMBER ATTENDANCE HISTORY
-- ============================================================

create or replace function public.get_client_attendance_history(
  p_gym_id uuid,
  p_client_id uuid,
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 250));
  v_result jsonb;
begin
  if not public.has_gym_role(
    p_gym_id,
    array[
      'owner',
      'admin',
      'manager',
      'receptionist',
      'trainer',
      'staff'
    ]::text[]
  ) then
    raise exception 'You do not have access to attendance';
  end if;

  if not exists (
    select 1
    from public.clients c
    where c.id = p_client_id
      and c.gym_id = p_gym_id
  ) then
    raise exception 'Member not found in this gym';
  end if;

  select coalesce(
    jsonb_agg(row_data order by check_in_at desc),
    '[]'::jsonb
  )
  into v_result
  from (
    select
      a.check_in_at,
      jsonb_build_object(
        'id', a.id,
        'check_in_at', a.check_in_at,
        'check_out_at', a.check_out_at,
        'source', a.source
      ) as row_data
    from public.attendance a
    where a.gym_id = p_gym_id
      and a.client_id = p_client_id
    order by a.check_in_at desc
    limit v_limit
  ) q;

  return v_result;
end;
$$;

revoke all on function public.get_client_attendance_history(uuid, uuid, integer) from public;
grant execute on function public.get_client_attendance_history(uuid, uuid, integer) to authenticated;