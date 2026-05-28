-- ============================================================================
-- Analogue Pro - Security Hardening
-- ============================================================================
-- Enables RLS, moves PIN verification to database RPCs, hashes existing PINs,
-- and adds basic brute-force protection for PIN verification.
--
-- Run this after the foundation and Phase 3/4 SQL scripts.
-- ============================================================================

create extension if not exists "pgcrypto";


-- ============================================================================
-- PIN Hashing + Rate Limiting
-- ============================================================================

alter table employees
  add column if not exists pin_hash text,
  add column if not exists pin_set boolean not null default false;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'employees'
      and column_name = 'pin'
  ) then
    update employees
    set pin_hash = crypt(pin, gen_salt('bf')),
        pin_set = true
    where pin_hash is null
      and pin is not null
      and pin <> '';

    alter table employees drop column pin;
  end if;
end $$;

create table if not exists pin_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  employee_id uuid,
  success boolean not null default false,
  attempted_at timestamptz not null default now()
);

create index if not exists idx_pin_attempts_user_recent
  on pin_attempts(user_id, attempted_at desc);

alter table pin_attempts enable row level security;

create or replace function current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.id
  from employees e
  where e.user_id = auth.uid()
  limit 1
$$;

create or replace function current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.company_id
  from employees e
  where e.user_id = auth.uid()
  limit 1
$$;

create or replace function current_role_level()
returns int
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(r.level, 0)
  from employees e
  left join roles r on r.id = e.role_id
  where e.user_id = auth.uid()
  limit 1
$$;

create or replace function can_permission(permission_code text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from employees e
    join role_permissions rp on rp.role_id = e.role_id
    join permissions p on p.id = rp.permission_id
    where e.user_id = auth.uid()
      and p.code = permission_code
  )
$$;

create or replace function set_employee_pin(pin_input text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if pin_input !~ '^\d{4}$' then
    raise exception 'PIN must be 4 digits';
  end if;

  perform set_config('app.allow_pin_hash_update', 'on', true);

  update employees
  set pin_hash = crypt(pin_input, gen_salt('bf')),
      pin_set = true,
      updated_at = now()
  where user_id = auth.uid();

  if not found then
    raise exception 'Employee not found';
  end if;
end;
$$;

create or replace function verify_employee_pin(pin_input text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  employee_record employees%rowtype;
  failed_attempts int;
  is_valid boolean;
begin
  if auth.uid() is null then
    return false;
  end if;

  if pin_input !~ '^\d{4}$' then
    return false;
  end if;

  select count(*)
  into failed_attempts
  from pin_attempts
  where user_id = auth.uid()
    and success = false
    and attempted_at > now() - interval '15 minutes';

  if failed_attempts >= 5 then
    return false;
  end if;

  select *
  into employee_record
  from employees
  where user_id = auth.uid()
  limit 1;

  if employee_record.id is null or employee_record.pin_hash is null then
    insert into pin_attempts(user_id, employee_id, success)
    values (auth.uid(), employee_record.id, false);
    return false;
  end if;

  is_valid := employee_record.pin_hash = crypt(pin_input, employee_record.pin_hash);

  insert into pin_attempts(user_id, employee_id, success)
  values (auth.uid(), employee_record.id, is_valid);

  if is_valid then
    delete from pin_attempts
    where user_id = auth.uid()
      and success = false;

    update employees
    set last_login_at = now()
    where id = employee_record.id;
  end if;

  return is_valid;
end;
$$;

grant execute on function set_employee_pin(text) to authenticated;
grant execute on function verify_employee_pin(text) to authenticated;

create or replace function protect_employee_security_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if current_role_level() >= 50 or can_permission('employee.update') then
    return new;
  end if;

  if old.user_id = auth.uid() then
    if new.user_id is distinct from old.user_id
      or new.company_id is distinct from old.company_id
      or new.branch_id is distinct from old.branch_id
      or new.department_id is distinct from old.department_id
      or new.position_id is distinct from old.position_id
      or new.role_id is distinct from old.role_id
      or new.manager_id is distinct from old.manager_id
      or new.employee_code is distinct from old.employee_code
      or new.status is distinct from old.status
      or (
        new.pin_set is distinct from old.pin_set
        and coalesce(current_setting('app.allow_pin_hash_update', true), '') <> 'on'
      )
      or (
        new.pin_hash is distinct from old.pin_hash
        and coalesce(current_setting('app.allow_pin_hash_update', true), '') <> 'on'
      )
    then
      raise exception 'Cannot update protected employee fields';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_employee_security_fields on employees;
create trigger trg_protect_employee_security_fields
before update on employees
for each row
execute function protect_employee_security_fields();


-- ============================================================================
-- RLS Helpers
-- ============================================================================

create or replace function is_same_company(company_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select company_id_input = current_company_id()
$$;

create or replace function can_admin_company()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select current_role_level() >= 50
    or can_permission('org.manage_company')
    or can_permission('employee.view_all')
$$;


-- ============================================================================
-- Foundation RLS
-- ============================================================================

alter table companies enable row level security;
alter table branches enable row level security;
alter table departments enable row level security;
alter table positions enable row level security;
alter table roles enable row level security;
alter table permissions enable row level security;
alter table role_permissions enable row level security;
alter table employees enable row level security;

drop policy if exists companies_company_select on companies;
create policy companies_company_select on companies
  for select to authenticated
  using (id = current_company_id());

drop policy if exists companies_company_update on companies;
create policy companies_company_update on companies
  for update to authenticated
  using (id = current_company_id() and can_admin_company())
  with check (id = current_company_id() and can_admin_company());

drop policy if exists branches_company_all on branches;
create policy branches_company_all on branches
  for all to authenticated
  using (company_id = current_company_id())
  with check (company_id = current_company_id() and can_admin_company());

drop policy if exists departments_company_all on departments;
create policy departments_company_all on departments
  for all to authenticated
  using (company_id = current_company_id())
  with check (company_id = current_company_id() and can_admin_company());

drop policy if exists positions_company_all on positions;
create policy positions_company_all on positions
  for all to authenticated
  using (company_id = current_company_id())
  with check (company_id = current_company_id() and can_admin_company());

drop policy if exists roles_company_all on roles;
create policy roles_company_all on roles
  for all to authenticated
  using (company_id = current_company_id())
  with check (company_id = current_company_id() and can_admin_company());

drop policy if exists permissions_read_authenticated on permissions;
create policy permissions_read_authenticated on permissions
  for select to authenticated
  using (true);

drop policy if exists role_permissions_company_read on role_permissions;
create policy role_permissions_company_read on role_permissions
  for select to authenticated
  using (
    exists (
      select 1 from roles r
      where r.id = role_permissions.role_id
        and r.company_id = current_company_id()
    )
  );

drop policy if exists role_permissions_company_write on role_permissions;
create policy role_permissions_company_write on role_permissions
  for all to authenticated
  using (
    can_admin_company()
    and exists (
      select 1 from roles r
      where r.id = role_permissions.role_id
        and r.company_id = current_company_id()
    )
  )
  with check (
    can_admin_company()
    and exists (
      select 1 from roles r
      where r.id = role_permissions.role_id
        and r.company_id = current_company_id()
    )
  );

drop policy if exists employees_company_read on employees;
create policy employees_company_read on employees
  for select to authenticated
  using (
    user_id = auth.uid()
    or (company_id = current_company_id() and can_permission('employee.view_all'))
    or (company_id = current_company_id() and can_admin_company())
    or (
      company_id = current_company_id()
      and manager_id = current_employee_id()
      and can_permission('employee.view_team')
    )
  );

drop policy if exists employees_company_insert on employees;
create policy employees_company_insert on employees
  for insert to authenticated
  with check (company_id = current_company_id() and (can_permission('employee.create') or can_admin_company()));

drop policy if exists employees_company_update on employees;
create policy employees_company_update on employees
  for update to authenticated
  using (
    user_id = auth.uid()
    or (company_id = current_company_id() and (can_permission('employee.update') or can_admin_company()))
  )
  with check (
    user_id = auth.uid()
    or (company_id = current_company_id() and (can_permission('employee.update') or can_admin_company()))
  );


-- ============================================================================
-- Operations RLS
-- ============================================================================

alter table attendance enable row level security;
alter table leave_types enable row level security;
alter table leave_balances enable row level security;
alter table leave_requests enable row level security;
alter table ot_requests enable row level security;
alter table payslips enable row level security;
alter table payroll_imports enable row level security;
alter table payroll_import_rows enable row level security;
alter table approval_requests enable row level security;
alter table approval_logs enable row level security;
alter table notifications enable row level security;
alter table activity_logs enable row level security;

drop policy if exists attendance_company_all on attendance;
create policy attendance_company_all on attendance
  for all to authenticated
  using (
    company_id = current_company_id()
    and (employee_id = current_employee_id() or can_permission('attendance.view_all') or can_admin_company())
  )
  with check (
    company_id = current_company_id()
    and (employee_id = current_employee_id() or can_permission('attendance.manage') or can_admin_company())
  );

drop policy if exists leave_types_company_read on leave_types;
create policy leave_types_company_read on leave_types
  for select to authenticated
  using (company_id = current_company_id());

drop policy if exists leave_balances_company_read on leave_balances;
create policy leave_balances_company_read on leave_balances
  for select to authenticated
  using (
    exists (
      select 1 from employees e
      where e.id = leave_balances.employee_id
        and e.company_id = current_company_id()
        and (e.id = current_employee_id() or can_admin_company())
    )
  );

drop policy if exists leave_requests_company_all on leave_requests;
create policy leave_requests_company_all on leave_requests
  for all to authenticated
  using (
    company_id = current_company_id()
    and (
      employee_id = current_employee_id()
      or can_permission('leave.approve_all')
      or can_admin_company()
      or exists (
        select 1 from employees e
        where e.id = leave_requests.employee_id
          and e.manager_id = current_employee_id()
          and can_permission('leave.approve_team')
      )
    )
  )
  with check (company_id = current_company_id());

drop policy if exists ot_requests_company_all on ot_requests;
create policy ot_requests_company_all on ot_requests
  for all to authenticated
  using (
    company_id = current_company_id()
    and (
      employee_id = current_employee_id()
      or can_permission('ot.approve_all')
      or can_admin_company()
      or exists (
        select 1 from employees e
        where e.id = ot_requests.employee_id
          and e.manager_id = current_employee_id()
          and can_permission('ot.approve_team')
      )
    )
  )
  with check (company_id = current_company_id());

drop policy if exists payslips_company_all on payslips;
create policy payslips_company_all on payslips
  for all to authenticated
  using (
    company_id = current_company_id()
    and (employee_id = current_employee_id() or can_permission('payroll.view_all') or can_admin_company())
  )
  with check (company_id = current_company_id() and (can_permission('payroll.manage') or can_admin_company()));

drop policy if exists payroll_imports_company_all on payroll_imports;
create policy payroll_imports_company_all on payroll_imports
  for all to authenticated
  using (company_id = current_company_id() and (can_permission('payroll.import') or can_admin_company()))
  with check (company_id = current_company_id() and (can_permission('payroll.import') or can_admin_company()));

drop policy if exists payroll_import_rows_company_all on payroll_import_rows;
create policy payroll_import_rows_company_all on payroll_import_rows
  for all to authenticated
  using (
    exists (
      select 1 from payroll_imports pi
      where pi.id = payroll_import_rows.import_id
        and pi.company_id = current_company_id()
        and (can_permission('payroll.import') or can_admin_company())
    )
  )
  with check (
    exists (
      select 1 from payroll_imports pi
      where pi.id = payroll_import_rows.import_id
        and pi.company_id = current_company_id()
        and (can_permission('payroll.import') or can_admin_company())
    )
  );

drop policy if exists approval_requests_company_all on approval_requests;
create policy approval_requests_company_all on approval_requests
  for all to authenticated
  using (
    company_id = current_company_id()
    and (
      requester_employee_id = current_employee_id()
      or approver_employee_id = current_employee_id()
      or can_permission('approval.manage')
      or can_admin_company()
    )
  )
  with check (company_id = current_company_id());

drop policy if exists approval_logs_company_read on approval_logs;
create policy approval_logs_company_read on approval_logs
  for select to authenticated
  using (
    company_id = current_company_id()
    and (can_permission('approval.view') or can_permission('approval.manage') or can_admin_company())
  );

drop policy if exists approval_logs_company_insert on approval_logs;
create policy approval_logs_company_insert on approval_logs
  for insert to authenticated
  with check (company_id = current_company_id());

drop policy if exists notifications_user_all on notifications;
create policy notifications_user_all on notifications
  for all to authenticated
  using (employee_id = current_employee_id() and (company_id is null or company_id = current_company_id()))
  with check (employee_id = current_employee_id() and (company_id is null or company_id = current_company_id()));

drop policy if exists activity_logs_company_read on activity_logs;
create policy activity_logs_company_read on activity_logs
  for select to authenticated
  using (company_id = current_company_id() and (can_permission('activity.view') or can_admin_company()));

drop policy if exists activity_logs_company_insert on activity_logs;
create policy activity_logs_company_insert on activity_logs
  for insert to authenticated
  with check (company_id = current_company_id() and actor_employee_id = current_employee_id());


-- ============================================================================
-- Policy Tightening
-- ============================================================================
-- Replace broad FOR ALL policies on sensitive tables with separate read/write
-- rules so read access cannot accidentally become delete or approval access.

drop policy if exists branches_company_all on branches;
drop policy if exists branches_company_select on branches;
create policy branches_company_select on branches
  for select to authenticated
  using (company_id = current_company_id());

drop policy if exists branches_company_write on branches;
create policy branches_company_write on branches
  for all to authenticated
  using (company_id = current_company_id() and can_admin_company())
  with check (company_id = current_company_id() and can_admin_company());

drop policy if exists departments_company_all on departments;
drop policy if exists departments_company_select on departments;
create policy departments_company_select on departments
  for select to authenticated
  using (company_id = current_company_id());

drop policy if exists departments_company_write on departments;
create policy departments_company_write on departments
  for all to authenticated
  using (company_id = current_company_id() and can_admin_company())
  with check (company_id = current_company_id() and can_admin_company());

drop policy if exists positions_company_all on positions;
drop policy if exists positions_company_select on positions;
create policy positions_company_select on positions
  for select to authenticated
  using (company_id = current_company_id());

drop policy if exists positions_company_write on positions;
create policy positions_company_write on positions
  for all to authenticated
  using (company_id = current_company_id() and can_admin_company())
  with check (company_id = current_company_id() and can_admin_company());

drop policy if exists roles_company_all on roles;
drop policy if exists roles_company_select on roles;
create policy roles_company_select on roles
  for select to authenticated
  using (company_id = current_company_id());

drop policy if exists roles_company_write on roles;
create policy roles_company_write on roles
  for all to authenticated
  using (company_id = current_company_id() and can_admin_company())
  with check (company_id = current_company_id() and can_admin_company());

drop policy if exists leave_requests_company_all on leave_requests;
drop policy if exists leave_requests_company_select on leave_requests;
create policy leave_requests_company_select on leave_requests
  for select to authenticated
  using (
    company_id = current_company_id()
    and (
      employee_id = current_employee_id()
      or can_permission('leave.approve_all')
      or can_admin_company()
      or exists (
        select 1 from employees e
        where e.id = leave_requests.employee_id
          and e.manager_id = current_employee_id()
          and can_permission('leave.approve_team')
      )
    )
  );

drop policy if exists leave_requests_company_insert on leave_requests;
create policy leave_requests_company_insert on leave_requests
  for insert to authenticated
  with check (
    company_id = current_company_id()
    and employee_id = current_employee_id()
    and can_permission('leave.apply')
  );

drop policy if exists leave_requests_company_update on leave_requests;
create policy leave_requests_company_update on leave_requests
  for update to authenticated
  using (
    company_id = current_company_id()
    and (
      can_permission('leave.approve_all')
      or can_admin_company()
      or exists (
        select 1 from employees e
        where e.id = leave_requests.employee_id
          and e.manager_id = current_employee_id()
          and can_permission('leave.approve_team')
      )
      or (employee_id = current_employee_id() and status = 'pending')
    )
  )
  with check (company_id = current_company_id());

drop policy if exists ot_requests_company_all on ot_requests;
drop policy if exists ot_requests_company_select on ot_requests;
create policy ot_requests_company_select on ot_requests
  for select to authenticated
  using (
    company_id = current_company_id()
    and (
      employee_id = current_employee_id()
      or can_permission('ot.approve_all')
      or can_admin_company()
      or exists (
        select 1 from employees e
        where e.id = ot_requests.employee_id
          and e.manager_id = current_employee_id()
          and can_permission('ot.approve_team')
      )
    )
  );

drop policy if exists ot_requests_company_insert on ot_requests;
create policy ot_requests_company_insert on ot_requests
  for insert to authenticated
  with check (
    company_id = current_company_id()
    and employee_id = current_employee_id()
    and can_permission('ot.apply')
  );

drop policy if exists ot_requests_company_update on ot_requests;
create policy ot_requests_company_update on ot_requests
  for update to authenticated
  using (
    company_id = current_company_id()
    and (
      can_permission('ot.approve_all')
      or can_admin_company()
      or exists (
        select 1 from employees e
        where e.id = ot_requests.employee_id
          and e.manager_id = current_employee_id()
          and can_permission('ot.approve_team')
      )
      or (employee_id = current_employee_id() and status = 'pending')
    )
  )
  with check (company_id = current_company_id());

drop policy if exists payslips_company_all on payslips;
drop policy if exists payslips_company_select on payslips;
create policy payslips_company_select on payslips
  for select to authenticated
  using (
    company_id = current_company_id()
    and (employee_id = current_employee_id() or can_permission('payroll.view_all') or can_admin_company())
  );

drop policy if exists payslips_company_write on payslips;
create policy payslips_company_write on payslips
  for all to authenticated
  using (company_id = current_company_id() and (can_permission('payroll.manage') or can_admin_company()))
  with check (company_id = current_company_id() and (can_permission('payroll.manage') or can_admin_company()));

drop policy if exists approval_requests_company_all on approval_requests;
drop policy if exists approval_requests_company_select on approval_requests;
create policy approval_requests_company_select on approval_requests
  for select to authenticated
  using (
    company_id = current_company_id()
    and (
      requester_employee_id = current_employee_id()
      or approver_employee_id = current_employee_id()
      or can_permission('approval.manage')
      or can_admin_company()
    )
  );

drop policy if exists approval_requests_company_insert on approval_requests;
create policy approval_requests_company_insert on approval_requests
  for insert to authenticated
  with check (company_id = current_company_id() and requester_employee_id = current_employee_id());

drop policy if exists approval_requests_company_update on approval_requests;
create policy approval_requests_company_update on approval_requests
  for update to authenticated
  using (
    company_id = current_company_id()
    and (approver_employee_id = current_employee_id() or can_permission('approval.manage') or can_admin_company())
  )
  with check (company_id = current_company_id());
