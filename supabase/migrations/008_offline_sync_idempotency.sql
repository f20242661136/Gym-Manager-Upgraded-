-- PACK 8: Offline Reliability + Idempotent Client Sync
-- IMPORTANT: push only after migrations 006 and 007 are remote.

alter table public.clients
  add column if not exists sync_version bigint not null default 1;

create or replace function public.bump_client_profile_sync_version()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.sync_version :=
    coalesce(old.sync_version, 1) + 1;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_clients_profile_sync_version
on public.clients;

create trigger trg_clients_profile_sync_version
before update of
  name,
  phone,
  email,
  age,
  gender,
  weight,
  height,
  chest,
  waist,
  bmi,
  photo_url
on public.clients
for each row
execute function public.bump_client_profile_sync_version();

create table if not exists public.offline_mutation_log (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  idempotency_key text not null,
  operation text not null,
  entity_type text not null,
  entity_id uuid,
  result jsonb,
  created_at timestamptz not null default now(),
  unique(gym_id, idempotency_key)
);

create index if not exists idx_offline_mutation_log_gym_created
  on public.offline_mutation_log(gym_id, created_at desc);

alter table public.offline_mutation_log enable row level security;

-- No direct policies: this table is RPC-only.

create or replace function public.apply_client_mutation(
  p_gym_id uuid,
  p_operation text,
  p_client_id uuid,
  p_payload jsonb,
  p_expected_version bigint,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing_result jsonb;
  v_client public.clients;
begin
  if not public.has_gym_role(
    p_gym_id,
    array[
      'owner',
      'admin',
      'manager',
      'receptionist',
      'staff'
    ]::text[]
  ) then
    raise exception 'You do not have permission to sync client changes';
  end if;

  if trim(coalesce(p_idempotency_key, '')) = '' then
    raise exception 'Idempotency key is required';
  end if;

  select l.result
  into v_existing_result
  from public.offline_mutation_log l
  where l.gym_id = p_gym_id
    and l.idempotency_key = p_idempotency_key
  limit 1;

  if v_existing_result is not null then
    return v_existing_result;
  end if;

  if p_operation = 'client.create' then
    insert into public.clients (
      id,
      gym_id,
      name,
      phone,
      email,
      age,
      gender,
      weight,
      height,
      chest,
      waist,
      bmi,
      photo_url,
      membership_status,
      registration_date,
      membership_due_date
    )
    values (
      p_client_id,
      p_gym_id,
      nullif(trim(coalesce(p_payload->>'name', '')), ''),
      nullif(trim(coalesce(p_payload->>'phone', '')), ''),
      nullif(trim(coalesce(p_payload->>'email', '')), ''),
      nullif(p_payload->>'age', '')::integer,
      nullif(p_payload->>'gender', ''),
      nullif(p_payload->>'weight', '')::numeric,
      nullif(p_payload->>'height', '')::numeric,
      nullif(p_payload->>'chest', '')::numeric,
      nullif(p_payload->>'waist', '')::numeric,
      nullif(p_payload->>'bmi', '')::numeric,
      nullif(p_payload->>'photo_url', ''),
      coalesce(
        nullif(p_payload->>'membership_status', ''),
        'Unpaid'
      ),
      coalesce(
        nullif(p_payload->>'registration_date', '')::timestamptz,
        now()
      ),
      nullif(p_payload->>'membership_due_date', '')::timestamptz
    )
    on conflict (id) do nothing;

    select *
    into v_client
    from public.clients
    where id = p_client_id
      and gym_id = p_gym_id;

    if v_client.id is null then
      raise exception 'Client id already belongs to another gym';
    end if;

  elsif p_operation = 'client.update' then
    select *
    into v_client
    from public.clients
    where id = p_client_id
      and gym_id = p_gym_id;

    if v_client.id is null then
      raise exception 'SYNC_CONFLICT: client no longer exists';
    end if;

    if p_expected_version is not null
       and v_client.sync_version <> p_expected_version then
      raise exception
        'SYNC_CONFLICT: client changed on another device (expected version %, server version %)',
        p_expected_version,
        v_client.sync_version;
    end if;

    update public.clients
    set
      name = nullif(trim(coalesce(p_payload->>'name', name)), ''),
      phone = case
        when p_payload ? 'phone'
          then nullif(trim(coalesce(p_payload->>'phone', '')), '')
        else phone
      end,
      email = case
        when p_payload ? 'email'
          then nullif(trim(coalesce(p_payload->>'email', '')), '')
        else email
      end,
      age = case
        when p_payload ? 'age'
          then nullif(p_payload->>'age', '')::integer
        else age
      end,
      gender = case
        when p_payload ? 'gender'
          then nullif(p_payload->>'gender', '')
        else gender
      end,
      weight = case
        when p_payload ? 'weight'
          then nullif(p_payload->>'weight', '')::numeric
        else weight
      end,
      height = case
        when p_payload ? 'height'
          then nullif(p_payload->>'height', '')::numeric
        else height
      end,
      chest = case
        when p_payload ? 'chest'
          then nullif(p_payload->>'chest', '')::numeric
        else chest
      end,
      waist = case
        when p_payload ? 'waist'
          then nullif(p_payload->>'waist', '')::numeric
        else waist
      end,
      bmi = case
        when p_payload ? 'bmi'
          then nullif(p_payload->>'bmi', '')::numeric
        else bmi
      end,
      photo_url = case
        when p_payload ? 'photo_url'
          then nullif(p_payload->>'photo_url', '')
        else photo_url
      end
    where id = p_client_id
      and gym_id = p_gym_id
    returning * into v_client;

  elsif p_operation = 'client.delete' then
    select *
    into v_client
    from public.clients
    where id = p_client_id
      and gym_id = p_gym_id;

    if v_client.id is not null
       and p_expected_version is not null
       and v_client.sync_version <> p_expected_version then
      raise exception
        'SYNC_CONFLICT: client changed on another device (expected version %, server version %)',
        p_expected_version,
        v_client.sync_version;
    end if;

    delete from public.clients
    where id = p_client_id
      and gym_id = p_gym_id;

    v_existing_result :=
      jsonb_build_object(
        'deleted', true,
        'id', p_client_id
      );

  else
    raise exception 'Unsupported offline operation: %', p_operation;
  end if;

  if p_operation <> 'client.delete' then
    v_existing_result := to_jsonb(v_client);
  end if;

  insert into public.offline_mutation_log (
    gym_id,
    user_id,
    idempotency_key,
    operation,
    entity_type,
    entity_id,
    result
  )
  values (
    p_gym_id,
    auth.uid(),
    p_idempotency_key,
    p_operation,
    'client',
    p_client_id,
    v_existing_result
  )
  on conflict (gym_id, idempotency_key)
  do nothing;

  return v_existing_result;
end;
$$;

revoke all on function public.apply_client_mutation(
  uuid, text, uuid, jsonb, bigint, text
) from public;

grant execute on function public.apply_client_mutation(
  uuid, text, uuid, jsonb, bigint, text
) to authenticated;