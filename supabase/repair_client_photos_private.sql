begin;

alter table public.clients
  add column if not exists photo_path text;

insert into storage.buckets (
  id,
  name,
  public
)
values (
  'client-photos-private',
  'client-photos-private',
  false
)
on conflict (id)
do update
set public = false;

drop policy if exists "private_client_photos_select"
  on storage.objects;

drop policy if exists "private_client_photos_insert"
  on storage.objects;

drop policy if exists "private_client_photos_update"
  on storage.objects;

drop policy if exists "private_client_photos_delete"
  on storage.objects;

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
      and gu.gym_id::text =
        (storage.foldername(name))[1]
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
      and gu.role in (
        'owner',
        'admin',
        'manager',
        'receptionist',
        'staff'
      )
      and gu.gym_id::text =
        (storage.foldername(name))[1]
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
      and gu.role in (
        'owner',
        'admin',
        'manager',
        'receptionist',
        'staff'
      )
      and gu.gym_id::text =
        (storage.foldername(name))[1]
  )
)
with check (
  bucket_id = 'client-photos-private'
  and exists (
    select 1
    from public.gym_users gu
    where gu.user_id = auth.uid()
      and gu.status = 'active'
      and gu.role in (
        'owner',
        'admin',
        'manager',
        'receptionist',
        'staff'
      )
      and gu.gym_id::text =
        (storage.foldername(name))[1]
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
      and gu.role in (
        'owner',
        'admin'
      )
      and gu.gym_id::text =
        (storage.foldername(name))[1]
  )
);

commit;
