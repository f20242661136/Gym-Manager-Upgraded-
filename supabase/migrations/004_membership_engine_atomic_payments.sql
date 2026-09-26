-- PACK 4: Membership Engine + Atomic Payments
-- Requires 003_production_security_staff.sql

alter table public.plans
  add column if not exists admission_fee numeric not null default 0 check (admission_fee >= 0),
  add column if not exists is_active boolean not null default true,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

update public.memberships set status='expired' where status='inactive';
alter table public.memberships drop constraint if exists memberships_status_check;
alter table public.memberships add constraint memberships_status_check
  check (status in ('active','scheduled','frozen','expired','cancelled'));
alter table public.memberships
  add column if not exists price_snapshot numeric not null default 0 check(price_snapshot>=0),
  add column if not exists discount_amount numeric not null default 0 check(discount_amount>=0),
  add column if not exists admission_fee numeric not null default 0 check(admission_fee>=0),
  add column if not exists payment_id uuid references public.payments(id) on delete set null,
  add column if not exists frozen_at timestamptz,
  add column if not exists freeze_reason text,
  add column if not exists notes text,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.payments
  add column if not exists plan_id uuid references public.plans(id) on delete set null,
  add column if not exists membership_id uuid references public.memberships(id) on delete set null,
  add column if not exists discount_amount numeric not null default 0 check(discount_amount>=0),
  add column if not exists admission_fee numeric not null default 0 check(admission_fee>=0),
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create index if not exists idx_plans_gym_active on public.plans(gym_id,is_active,name);
create index if not exists idx_memberships_client_dates on public.memberships(gym_id,client_id,end_date desc);

do $$ begin
  if not exists(select 1 from pg_constraint where conname='memberships_plan_id_fkey' and conrelid='public.memberships'::regclass) then
    alter table public.memberships add constraint memberships_plan_id_fkey foreign key(plan_id) references public.plans(id) on delete set null;
  end if;
end $$;

create or replace function public.list_membership_plans(p_gym_id uuid,p_include_inactive boolean default false)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r jsonb;
begin
  if not public.has_gym_role(p_gym_id,array['owner','admin','manager','receptionist','trainer','staff']::text[]) then raise exception 'No gym access'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'duration_days',duration_days,'price',price,'admission_fee',admission_fee,'description',description,'is_active',is_active,'created_at',created_at,'updated_at',updated_at) order by is_active desc,duration_days,name),'[]'::jsonb)
  into r from public.plans where gym_id=p_gym_id and (p_include_inactive or is_active);
  return r;
end $$;
revoke all on function public.list_membership_plans(uuid,boolean) from public;
grant execute on function public.list_membership_plans(uuid,boolean) to authenticated;

create or replace function public.save_membership_plan(p_gym_id uuid,p_plan_id uuid,p_name text,p_duration_days integer,p_price numeric,p_admission_fee numeric default 0,p_description text default null,p_is_active boolean default true)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare x public.plans; n text:=trim(coalesce(p_name,''));
begin
  if not public.has_gym_role(p_gym_id,array['owner','admin','manager']::text[]) then raise exception 'Only owner, admin or manager can manage plans'; end if;
  if n='' then raise exception 'Plan name required'; end if;
  if p_duration_days<1 or p_duration_days>3650 then raise exception 'Invalid duration'; end if;
  if p_price<0 or coalesce(p_admission_fee,0)<0 then raise exception 'Price cannot be negative'; end if;
  if p_plan_id is null then
    insert into public.plans(gym_id,name,duration_days,price,admission_fee,description,is_active,created_by)
    values(p_gym_id,n,p_duration_days,p_price,coalesce(p_admission_fee,0),nullif(trim(coalesce(p_description,'')),''),p_is_active,auth.uid()) returning * into x;
    insert into public.audit_logs(gym_id,actor_user_id,action,entity_type,entity_id,new_value)
    values(p_gym_id,auth.uid(),'membership.plan_created','plan',x.id::text,to_jsonb(x));
  else
    update public.plans set name=n,duration_days=p_duration_days,price=p_price,admission_fee=coalesce(p_admission_fee,0),description=nullif(trim(coalesce(p_description,'')),''),is_active=p_is_active,updated_at=now()
    where id=p_plan_id and gym_id=p_gym_id returning * into x;
    if x.id is null then raise exception 'Plan not found'; end if;
    insert into public.audit_logs(gym_id,actor_user_id,action,entity_type,entity_id,new_value)
    values(p_gym_id,auth.uid(),'membership.plan_updated','plan',x.id::text,to_jsonb(x));
  end if;
  return jsonb_build_object('id',x.id,'name',x.name,'duration_days',x.duration_days,'price',x.price,'admission_fee',x.admission_fee,'description',x.description,'is_active',x.is_active,'created_at',x.created_at,'updated_at',x.updated_at);
end $$;
revoke all on function public.save_membership_plan(uuid,uuid,text,integer,numeric,numeric,text,boolean) from public;
grant execute on function public.save_membership_plan(uuid,uuid,text,integer,numeric,numeric,text,boolean) to authenticated;

create or replace function public.get_client_memberships(p_gym_id uuid,p_client_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r jsonb;
begin
  if not public.has_gym_role(p_gym_id,array['owner','admin','manager','receptionist','trainer','staff']::text[]) then raise exception 'No gym access'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'client_id',m.client_id,'plan_id',m.plan_id,'plan_name',p.name,'start_date',m.start_date,'end_date',m.end_date,'status',case when m.status='frozen' then 'frozen' when m.status='cancelled' then 'cancelled' when m.start_date>now() then 'scheduled' when m.end_date<now() then 'expired' else 'active' end,'price_snapshot',m.price_snapshot,'discount_amount',m.discount_amount,'admission_fee',m.admission_fee,'payment_id',m.payment_id,'frozen_at',m.frozen_at,'freeze_reason',m.freeze_reason,'notes',m.notes,'created_at',m.created_at) order by m.end_date desc,m.created_at desc),'[]'::jsonb)
  into r from public.memberships m left join public.plans p on p.id=m.plan_id where m.gym_id=p_gym_id and m.client_id=p_client_id;
  return r;
end $$;
revoke all on function public.get_client_memberships(uuid,uuid) from public;
grant execute on function public.get_client_memberships(uuid,uuid) to authenticated;

create or replace function public.record_membership_payment(
 p_gym_id uuid,p_client_id uuid,p_plan_id uuid,p_payment_method text,p_discount_amount numeric default 0,p_reference_number text default null,p_notes text default null,p_idempotency_key text default null,p_apply_admission_fee boolean default false)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.clients; p public.plans; pay public.payments; mem public.memberships; oldpay public.payments; latest timestamptz; s timestamptz; e timestamptz; disc numeric:=greatest(coalesce(p_discount_amount,0),0); adm numeric:=0; total numeric; st text;
begin
 if not public.has_gym_role(p_gym_id,array['owner','admin','manager','receptionist','staff']::text[]) then raise exception 'No permission to record payment'; end if;
 if p_payment_method not in('cash','bank_transfer','raast','easypaisa','jazzcash','upi','card','other') then raise exception 'Invalid payment method'; end if;
 select * into c from public.clients where id=p_client_id and gym_id=p_gym_id; if c.id is null then raise exception 'Client not found'; end if;
 select * into p from public.plans where id=p_plan_id and gym_id=p_gym_id and is_active; if p.id is null then raise exception 'Plan unavailable'; end if;
 if p_idempotency_key is not null and trim(p_idempotency_key)<>'' then select * into oldpay from public.payments where gym_id=p_gym_id and idempotency_key=trim(p_idempotency_key) limit 1; if oldpay.id is not null then select * into mem from public.memberships where payment_id=oldpay.id limit 1; return jsonb_build_object('payment',to_jsonb(oldpay),'membership',to_jsonb(mem),'duplicate',true); end if; end if;
 if p_apply_admission_fee then adm:=p.admission_fee; end if;
 if disc>p.price+adm then raise exception 'Discount exceeds amount due'; end if;
 total:=greatest(p.price+adm-disc,0);
 select max(end_date) into latest from public.memberships where gym_id=p_gym_id and client_id=p_client_id and status<>'cancelled';
 if latest is not null and latest>now() then s:=latest; else s:=now(); end if; e:=s+make_interval(days=>p.duration_days); st:=case when s>now() then 'scheduled' else 'active' end;
 insert into public.payments(gym_id,client_id,client_name,amount,payment_date,due_date,status,duration,payment_method,reference_number,notes,idempotency_key,plan_id,discount_amount,admission_fee,created_by)
 values(p_gym_id,p_client_id,c.name,total,now(),e,'Paid',p.duration_days,p_payment_method,nullif(trim(coalesce(p_reference_number,'')),''),nullif(trim(coalesce(p_notes,'')),''),nullif(trim(coalesce(p_idempotency_key,'')),''),p.id,disc,adm,auth.uid()) returning * into pay;
 insert into public.memberships(gym_id,client_id,plan_id,start_date,end_date,status,price_snapshot,discount_amount,admission_fee,payment_id,notes,created_by)
 values(p_gym_id,p_client_id,p.id,s,e,st,p.price,disc,adm,pay.id,nullif(trim(coalesce(p_notes,'')),''),auth.uid()) returning * into mem;
 update public.payments set membership_id=mem.id where id=pay.id;
 update public.clients set membership_status='Paid',membership_due_date=e,updated_at=now() where id=p_client_id and gym_id=p_gym_id;
 insert into public.audit_logs(gym_id,actor_user_id,action,entity_type,entity_id,new_value) values(p_gym_id,auth.uid(),'membership.payment_recorded','payment',pay.id::text,jsonb_build_object('client_id',p_client_id,'plan_id',p.id,'plan_name',p.name,'amount',total,'start_date',s,'end_date',e,'payment_method',p_payment_method));
 return jsonb_build_object('payment',to_jsonb(pay),'membership',to_jsonb(mem),'duplicate',false);
end $$;
revoke all on function public.record_membership_payment(uuid,uuid,uuid,text,numeric,text,text,text,boolean) from public;
grant execute on function public.record_membership_payment(uuid,uuid,uuid,text,numeric,text,text,text,boolean) to authenticated;

create or replace function public.freeze_membership(p_membership_id uuid,p_reason text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare m public.memberships; begin
 select * into m from public.memberships where id=p_membership_id; if m.id is null then raise exception 'Membership not found'; end if;
 if not public.has_gym_role(m.gym_id,array['owner','admin','manager']::text[]) then raise exception 'No permission'; end if;
 if m.status<>'active' or m.end_date<=now() then raise exception 'Only active membership can be frozen'; end if;
 update public.memberships set status='frozen',frozen_at=now(),freeze_reason=nullif(trim(coalesce(p_reason,'')),''),updated_at=now() where id=p_membership_id returning * into m;
 insert into public.audit_logs(gym_id,actor_user_id,action,entity_type,entity_id,new_value) values(m.gym_id,auth.uid(),'membership.frozen','membership',m.id::text,to_jsonb(m)); return to_jsonb(m); end $$;
revoke all on function public.freeze_membership(uuid,text) from public; grant execute on function public.freeze_membership(uuid,text) to authenticated;

create or replace function public.resume_membership(p_membership_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare m public.memberships; ext interval; begin
 select * into m from public.memberships where id=p_membership_id; if m.id is null then raise exception 'Membership not found'; end if;
 if not public.has_gym_role(m.gym_id,array['owner','admin','manager']::text[]) then raise exception 'No permission'; end if;
 if m.status<>'frozen' or m.frozen_at is null then raise exception 'Membership is not frozen'; end if; ext:=now()-m.frozen_at;
 update public.memberships set status='active',end_date=end_date+ext,frozen_at=null,updated_at=now() where id=p_membership_id returning * into m;
 update public.clients set membership_due_date=greatest(coalesce(membership_due_date,m.end_date),m.end_date),membership_status='Paid',updated_at=now() where id=m.client_id and gym_id=m.gym_id;
 insert into public.audit_logs(gym_id,actor_user_id,action,entity_type,entity_id,new_value) values(m.gym_id,auth.uid(),'membership.resumed','membership',m.id::text,to_jsonb(m)); return to_jsonb(m); end $$;
revoke all on function public.resume_membership(uuid) from public; grant execute on function public.resume_membership(uuid) to authenticated;