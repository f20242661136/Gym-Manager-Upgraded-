-- PACK 7: receipts + phone normalization + WhatsApp foundation
-- Push only after migration 006 is remote.

alter table public.clients add column if not exists phone_e164 text;

create or replace function public.normalize_phone_e164(p_phone text,p_country_code text)
returns text language plpgsql immutable as $$
declare d text:=regexp_replace(coalesce(p_phone,''),'[^0-9]','','g'); cc text:=upper(trim(coalesce(p_country_code,'')));
begin
  if d='' then return null; end if;
  if cc='PK' then
    if left(d,4)='0092' then d:=substr(d,3); end if;
    if left(d,2)='92' and length(d)=12 then return '+'||d; end if;
    if left(d,1)='0' and length(d)=11 then return '+92'||substr(d,2); end if;
    if left(d,1)='3' and length(d)=10 then return '+92'||d; end if;
    return null;
  end if;
  if cc='IN' then
    if left(d,4)='0091' then d:=substr(d,3); end if;
    if left(d,2)='91' and length(d)=12 then return '+'||d; end if;
    if left(d,1)='0' and length(d)=11 then return '+91'||substr(d,2); end if;
    if length(d)=10 then return '+91'||d; end if;
  end if;
  return null;
end;
$$;

create or replace function public.set_client_phone_e164()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare cc text;
begin
  select country_code into cc from public.gyms where id=new.gym_id;
  new.phone_e164:=public.normalize_phone_e164(new.phone,cc);
  return new;
end;
$$;

drop trigger if exists trg_clients_phone_e164 on public.clients;
create trigger trg_clients_phone_e164 before insert or update of phone,gym_id on public.clients for each row execute function public.set_client_phone_e164();

update public.clients c set phone_e164=public.normalize_phone_e164(c.phone,g.country_code) from public.gyms g where g.id=c.gym_id;
create index if not exists idx_clients_gym_phone_e164 on public.clients(gym_id,phone_e164);

alter table public.payments add column if not exists receipt_number text;

with ranked as (
  select id,gym_id,row_number() over(partition by gym_id order by created_at,id) seq
  from public.payments where receipt_number is null
)
update public.payments p set receipt_number='RCP-'||lpad(r.seq::text,6,'0') from ranked r where p.id=r.id;

create unique index if not exists ux_payments_gym_receipt_number on public.payments(gym_id,receipt_number) where receipt_number is not null;

create table if not exists public.gym_receipt_counters(
  gym_id uuid primary key references public.gyms(id) on delete cascade,
  next_number bigint not null default 1 check(next_number>=1),
  updated_at timestamptz not null default now()
);

insert into public.gym_receipt_counters(gym_id,next_number)
select gym_id,coalesce(max(nullif(regexp_replace(coalesce(receipt_number,''),'[^0-9]','','g'),'')::bigint),0)+1
from public.payments group by gym_id
on conflict(gym_id) do update set next_number=greatest(public.gym_receipt_counters.next_number,excluded.next_number),updated_at=now();

create or replace function public.assign_payment_receipt_number()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare n bigint;
begin
  if new.receipt_number is not null and trim(new.receipt_number)<>'' then return new; end if;
  insert into public.gym_receipt_counters(gym_id,next_number) values(new.gym_id,2)
  on conflict(gym_id) do update set next_number=public.gym_receipt_counters.next_number+1,updated_at=now()
  returning next_number-1 into n;
  new.receipt_number:='RCP-'||lpad(n::text,6,'0');
  return new;
end;
$$;

drop trigger if exists trg_payments_receipt_number on public.payments;
create trigger trg_payments_receipt_number before insert on public.payments for each row execute function public.assign_payment_receipt_number();

create or replace function public.list_payment_receipts(p_gym_id uuid,p_client_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r jsonb;
begin
  if not public.has_gym_role(p_gym_id,array['owner','admin','manager','receptionist','staff']::text[]) then raise exception 'No payment access'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'receipt_number',p.receipt_number,'client_id',p.client_id,'client_name',p.client_name,
    'amount',p.amount,'payment_date',p.payment_date,'due_date',p.due_date,'status',p.status,
    'payment_method',p.payment_method,'reference_number',p.reference_number,'plan_name',pl.name,
    'phone',c.phone,'phone_e164',c.phone_e164
  ) order by p.payment_date desc,p.created_at desc),'[]'::jsonb) into r
  from public.payments p
  left join public.clients c on c.id=p.client_id and c.gym_id=p.gym_id
  left join public.plans pl on pl.id=p.plan_id
  where p.gym_id=p_gym_id and (p_client_id is null or p.client_id=p_client_id);
  return r;
end;
$$;
revoke all on function public.list_payment_receipts(uuid,uuid) from public;
grant execute on function public.list_payment_receipts(uuid,uuid) to authenticated;

create or replace function public.get_payment_receipt(p_gym_id uuid,p_payment_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r jsonb;
begin
  if not public.has_gym_role(p_gym_id,array['owner','admin','manager','receptionist','staff']::text[]) then raise exception 'No receipt access'; end if;
  select jsonb_build_object(
    'payment',jsonb_build_object('id',p.id,'receipt_number',p.receipt_number,'amount',p.amount,'payment_date',p.payment_date,'due_date',p.due_date,'status',p.status,'payment_method',p.payment_method,'reference_number',p.reference_number,'discount_amount',p.discount_amount,'admission_fee',p.admission_fee,'notes',p.notes),
    'client',jsonb_build_object('id',c.id,'name',c.name,'phone',c.phone,'phone_e164',c.phone_e164),
    'gym',jsonb_build_object('id',g.id,'name',g.name,'phone',g.phone,'email',g.email,'address',g.address,'country_code',g.country_code,'currency_code',g.currency_code,'timezone',g.timezone),
    'plan',case when pl.id is null then null else jsonb_build_object('id',pl.id,'name',pl.name,'duration_days',pl.duration_days,'price',pl.price) end,
    'membership',case when m.id is null then null else jsonb_build_object('id',m.id,'start_date',m.start_date,'end_date',m.end_date,'status',m.status) end
  ) into r
  from public.payments p join public.clients c on c.id=p.client_id and c.gym_id=p.gym_id join public.gyms g on g.id=p.gym_id
  left join public.plans pl on pl.id=p.plan_id left join public.memberships m on m.id=p.membership_id
  where p.id=p_payment_id and p.gym_id=p_gym_id;
  if r is null then raise exception 'Receipt not found'; end if;
  return r;
end;
$$;
revoke all on function public.get_payment_receipt(uuid,uuid) from public;
grant execute on function public.get_payment_receipt(uuid,uuid) to authenticated;