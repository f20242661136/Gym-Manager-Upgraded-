-- PACK 6: Expenses + Owner Finance Dashboard

alter table public.expenses
  add column if not exists status text not null default 'active',
  add column if not exists payment_method text not null default 'cash',
  add column if not exists reference_number text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references auth.users(id) on delete set null,
  add column if not exists void_reason text;

alter table public.expenses drop constraint if exists expenses_status_check;
alter table public.expenses
  add constraint expenses_status_check check (status in ('active','voided'));

alter table public.expenses drop constraint if exists expenses_payment_method_check;
alter table public.expenses
  add constraint expenses_payment_method_check check (
    payment_method in ('cash','bank_transfer','raast','easypaisa','jazzcash','upi','card','other')
  );

create index if not exists idx_expenses_gym_date_status
  on public.expenses(gym_id, expense_date desc, status);

alter table public.expenses enable row level security;

drop policy if exists "expenses_select_own_gym" on public.expenses;
drop policy if exists "expenses_insert_own_gym" on public.expenses;
drop policy if exists "expenses_update_own_gym" on public.expenses;
drop policy if exists "expenses_delete_own_gym" on public.expenses;
drop policy if exists "expenses_select" on public.expenses;
drop policy if exists "expenses_insert" on public.expenses;
drop policy if exists "expenses_update" on public.expenses;
drop policy if exists "expenses_delete" on public.expenses;
drop policy if exists "expenses_select_gym" on public.expenses;

create policy "expenses_select_gym"
on public.expenses for select to authenticated
using (
  public.has_gym_role(gym_id,array['owner','admin','manager']::text[])
);

create or replace function public.save_expense(
  p_gym_id uuid,
  p_expense_id uuid,
  p_description text,
  p_amount numeric,
  p_category text,
  p_expense_date timestamptz,
  p_payment_method text default 'cash',
  p_reference_number text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v public.expenses;
  v_old jsonb;
begin
  if not public.has_gym_role(p_gym_id,array['owner','admin','manager']::text[]) then
    raise exception 'You do not have permission to manage expenses';
  end if;
  if trim(coalesce(p_description,''))='' then raise exception 'Description is required'; end if;
  if trim(coalesce(p_category,''))='' then raise exception 'Category is required'; end if;
  if p_amount<=0 then raise exception 'Amount must be greater than zero'; end if;
  if p_payment_method not in ('cash','bank_transfer','raast','easypaisa','jazzcash','upi','card','other') then
    raise exception 'Invalid payment method';
  end if;

  if p_expense_id is null then
    insert into public.expenses(
      gym_id,description,amount,category,expense_date,notes,status,
      payment_method,reference_number,created_by
    ) values(
      p_gym_id,trim(p_description),p_amount,trim(p_category),coalesce(p_expense_date,now()),
      nullif(trim(coalesce(p_notes,'')),''),
      'active',p_payment_method,nullif(trim(coalesce(p_reference_number,'')),''),auth.uid()
    ) returning * into v;

    insert into public.audit_logs(gym_id,actor_user_id,action,entity_type,entity_id,new_value)
    values(p_gym_id,auth.uid(),'expense.created','expense',v.id::text,
      jsonb_build_object('amount',v.amount,'category',v.category,'description',v.description));
  else
    select to_jsonb(e.*)
    into v_old
    from public.expenses e
    where e.id = p_expense_id
      and e.gym_id = p_gym_id;

    select e.*
    into v
    from public.expenses e
    where e.id = p_expense_id
      and e.gym_id = p_gym_id;

    if v.id is null then raise exception 'Expense not found'; end if;
    if v.status='voided' then raise exception 'Voided expenses cannot be edited'; end if;

    update public.expenses set
      description=trim(p_description),
      amount=p_amount,
      category=trim(p_category),
      expense_date=coalesce(p_expense_date,expense_date),
      notes=nullif(trim(coalesce(p_notes,'')),''),
      payment_method=p_payment_method,
      reference_number=nullif(trim(coalesce(p_reference_number,'')),''),
      updated_at=now()
    where id=p_expense_id returning * into v;

    insert into public.audit_logs(gym_id,actor_user_id,action,entity_type,entity_id,old_value,new_value)
    values(p_gym_id,auth.uid(),'expense.updated','expense',v.id::text,v_old,to_jsonb(v));
  end if;

  return to_jsonb(v);
end;
$$;

revoke all on function public.save_expense(uuid,uuid,text,numeric,text,timestamptz,text,text,text) from public;
grant execute on function public.save_expense(uuid,uuid,text,numeric,text,timestamptz,text,text,text) to authenticated;

create or replace function public.void_expense(p_expense_id uuid,p_reason text)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v public.expenses;
begin
  select * into v from public.expenses where id=p_expense_id;
  if v.id is null then raise exception 'Expense not found'; end if;
  if not public.has_gym_role(v.gym_id,array['owner','admin']::text[]) then
    raise exception 'Only owner/admin can void an expense';
  end if;
  if trim(coalesce(p_reason,''))='' then raise exception 'Void reason is required'; end if;
  if v.status='voided' then return to_jsonb(v); end if;

  update public.expenses set
    status='voided',voided_at=now(),voided_by=auth.uid(),void_reason=trim(p_reason),updated_at=now()
  where id=p_expense_id returning * into v;

  insert into public.audit_logs(gym_id,actor_user_id,action,entity_type,entity_id,new_value)
  values(v.gym_id,auth.uid(),'expense.voided','expense',v.id::text,
    jsonb_build_object('amount',v.amount,'reason',v.void_reason));

  return to_jsonb(v);
end;
$$;

revoke all on function public.void_expense(uuid,text) from public;
grant execute on function public.void_expense(uuid,text) to authenticated;

create or replace function public.list_expenses(
  p_gym_id uuid,
  p_include_voided boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare r jsonb;
begin
  if not public.has_gym_role(p_gym_id,array['owner','admin','manager']::text[]) then
    raise exception 'No expense access';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',e.id,'description',e.description,'amount',e.amount,'category',e.category,
      'expense_date',e.expense_date,'notes',e.notes,'status',e.status,
      'payment_method',e.payment_method,'reference_number',e.reference_number,
      'created_by_email',u.email,'voided_at',e.voided_at,'void_reason',e.void_reason
    ) order by e.expense_date desc,e.created_at desc
  ),'[]'::jsonb)
  into r
  from public.expenses e
  left join auth.users u on u.id=e.created_by
  where e.gym_id=p_gym_id
    and (p_include_voided or e.status='active');

  return r;
end;
$$;

revoke all on function public.list_expenses(uuid,boolean) from public;
grant execute on function public.list_expenses(uuid,boolean) to authenticated;

create or replace function public.get_finance_summary(
  p_gym_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  rev numeric:=0;
  exp numeric:=0;
  pcount integer:=0;
  ecount integer:=0;
  expired integer:=0;
  expiring integer:=0;
  methods jsonb:='[]'::jsonb;
  cats jsonb:='[]'::jsonb;
begin
  if not public.has_gym_role(p_gym_id,array['owner','admin']::text[]) then
    raise exception 'Only owner/admin can view finance';
  end if;

  if p_from is null or p_to is null or p_to<=p_from then
    raise exception 'Invalid date range';
  end if;

  select coalesce(sum(amount),0),count(*)::integer into rev,pcount
  from public.payments
  where gym_id=p_gym_id and status='Paid'
    and payment_date>=p_from and payment_date<p_to;

  select coalesce(sum(amount),0),count(*)::integer into exp,ecount
  from public.expenses
  where gym_id=p_gym_id and status='active'
    and expense_date>=p_from and expense_date<p_to;

  select count(*)::integer into expired
  from public.clients
  where gym_id=p_gym_id and membership_due_date is not null and membership_due_date<now();

  select count(*)::integer into expiring
  from public.clients
  where gym_id=p_gym_id and membership_due_date>=now()
    and membership_due_date<now()+interval '7 days';

  select coalesce(jsonb_agg(jsonb_build_object(
    'key',q.payment_method,'amount',q.amount,'count',q.cnt
  ) order by q.amount desc),'[]'::jsonb)
  into methods
  from (
    select coalesce(payment_method,'other') payment_method,
           sum(amount) amount,count(*)::integer cnt
    from public.payments
    where gym_id=p_gym_id and status='Paid'
      and payment_date>=p_from and payment_date<p_to
    group by 1
  ) q;

  select coalesce(jsonb_agg(jsonb_build_object(
    'key',q.category,'amount',q.amount,'count',q.cnt
  ) order by q.amount desc),'[]'::jsonb)
  into cats
  from (
    select coalesce(nullif(trim(category),''),'Other') category,
           sum(amount) amount,count(*)::integer cnt
    from public.expenses
    where gym_id=p_gym_id and status='active'
      and expense_date>=p_from and expense_date<p_to
    group by 1
  ) q;

  return jsonb_build_object(
    'revenue',rev,'expenses',exp,'net',rev-exp,
    'payment_count',pcount,'expense_count',ecount,
    'expired_members',expired,'expiring_7_days',expiring,
    'payment_methods',methods,'expense_categories',cats
  );
end;
$$;

revoke all on function public.get_finance_summary(uuid,timestamptz,timestamptz) from public;
grant execute on function public.get_finance_summary(uuid,timestamptz,timestamptz) to authenticated;

create or replace function public.get_finance_monthly_trend(p_gym_id uuid,p_months integer default 6)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  n integer:=greatest(1,least(coalesce(p_months,6),24));
  tz text;
  r jsonb;
begin
  if not public.has_gym_role(p_gym_id,array['owner','admin']::text[]) then
    raise exception 'Only owner/admin can view finance';
  end if;

  select coalesce(timezone,'Asia/Karachi') into tz from public.gyms where id=p_gym_id;

  with m as (
    select generate_series(
      date_trunc('month',now() at time zone tz)-make_interval(months=>n-1),
      date_trunc('month',now() at time zone tz),
      interval '1 month'
    ) month_start
  ),
  rv as (
    select date_trunc('month',payment_date at time zone tz) month_start,sum(amount) amount
    from public.payments
    where gym_id=p_gym_id and status='Paid'
    group by 1
  ),
  ex as (
    select date_trunc('month',expense_date at time zone tz) month_start,sum(amount) amount
    from public.expenses
    where gym_id=p_gym_id and status='active'
    group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'month',to_char(m.month_start,'YYYY-MM'),
    'label',to_char(m.month_start,'Mon'),
    'revenue',coalesce(rv.amount,0),
    'expenses',coalesce(ex.amount,0),
    'net',coalesce(rv.amount,0)-coalesce(ex.amount,0)
  ) order by m.month_start),'[]'::jsonb)
  into r
  from m
  left join rv on rv.month_start=m.month_start
  left join ex on ex.month_start=m.month_start;

  return r;
end;
$$;

revoke all on function public.get_finance_monthly_trend(uuid,integer) from public;
grant execute on function public.get_finance_monthly_trend(uuid,integer) to authenticated;

create or replace function public.list_renewals_due(p_gym_id uuid,p_limit integer default 30)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare r jsonb;
begin
  if not public.has_gym_role(p_gym_id,array['owner','admin','manager','receptionist','staff']::text[]) then
    raise exception 'No renewal access';
  end if;

  select coalesce(jsonb_agg(row_data order by due_date asc),'[]'::jsonb)
  into r
  from (
    select c.membership_due_date due_date,
      jsonb_build_object(
        'client_id',c.id,'name',c.name,'phone',c.phone,'due_date',c.membership_due_date,
        'days_delta',floor(extract(epoch from (c.membership_due_date-now()))/86400)::integer,
        'state',case when c.membership_due_date<now() then 'expired' else 'expiring' end
      ) row_data
    from public.clients c
    where c.gym_id=p_gym_id
      and c.membership_due_date is not null
      and c.membership_due_date<now()+interval '7 days'
    order by c.membership_due_date asc
    limit greatest(1,least(coalesce(p_limit,30),200))
  ) q;

  return r;
end;
$$;

revoke all on function public.list_renewals_due(uuid,integer) from public;
grant execute on function public.list_renewals_due(uuid,integer) to authenticated;