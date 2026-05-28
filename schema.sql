-- =============================================================================
-- Analogue Pro — Full Database Schema
-- =============================================================================
-- Safe to run multiple times (IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- Run order: this file only. Foundation tables (companies, branches, etc.)
-- must already exist from Phase 1/2.
-- RLS is disabled during development — enable before production.
-- =============================================================================

create extension if not exists "pgcrypto";


-- =============================================================================
-- ATTENDANCE
-- =============================================================================

create table if not exists attendance (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  date        date not null,
  check_in    timestamptz,
  check_in_lat  numeric(10,7),
  check_in_lng  numeric(10,7),
  check_out   timestamptz,
  check_out_lat numeric(10,7),
  check_out_lng numeric(10,7),
  status      text not null default 'on_time'
    check (status in ('on_time','late','absent','leave','holiday')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (employee_id, date)
);


-- =============================================================================
-- LEAVE
-- =============================================================================

create table if not exists leave_types (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  code         text,
  name         text not null,
  name_en      text,
  color        text default '#3b82f6',
  days_per_year numeric(6,2) not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists leave_balances (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references employees(id) on delete cascade,
  leave_type_id uuid not null references leave_types(id) on delete cascade,
  year          int not null,
  entitled_days numeric(6,2) not null default 0,
  used_days     numeric(6,2) not null default 0,
  pending_days  numeric(6,2) not null default 0,
  unique (employee_id, leave_type_id, year)
);

create table if not exists leave_requests (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  employee_id   uuid not null references employees(id) on delete cascade,
  leave_type_id uuid references leave_types(id),
  start_date    date not null,
  end_date      date not null,
  days          numeric(6,2) not null default 0,
  reason        text,
  status        text not null default 'pending'
    check (status in ('pending','approved','rejected','cancelled')),
  approved_by   uuid references employees(id),
  approved_at   timestamptz,
  reject_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);


-- =============================================================================
-- OT
-- =============================================================================

create table if not exists ot_requests (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  date        date not null,
  start_time  time not null,
  end_time    time not null,
  hours       numeric(6,2) not null default 0,
  day_type    text not null default 'normal'
    check (day_type in ('normal','holiday')),
  detail      text,
  status      text not null default 'pending'
    check (status in ('pending','approved','rejected','cancelled')),
  approved_by   uuid references employees(id),
  approved_at   timestamptz,
  reject_reason text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);


-- =============================================================================
-- PAYROLL
-- =============================================================================

create table if not exists payslips (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  employee_id     uuid not null references employees(id) on delete cascade,
  period_month    text not null,
  base_salary     numeric(12,2) not null default 0,
  ot_amount       numeric(12,2) not null default 0,
  allowance       numeric(12,2) not null default 0,
  bonus           numeric(12,2) not null default 0,
  deduction       numeric(12,2) not null default 0,
  tax             numeric(12,2) not null default 0,
  social_security numeric(12,2) not null default 0,
  net_salary      numeric(12,2),
  status          text not null default 'pending'
    check (status in ('pending','approved','rejected','cancelled')),
  is_published    boolean not null default false,
  published_at    timestamptz,
  approved_by     uuid references employees(id),
  approved_at     timestamptz,
  reject_reason   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (employee_id, period_month)
);

create table if not exists payroll_imports (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references companies(id) on delete cascade,
  imported_by        uuid references employees(id),
  file_name          text,
  total_rows         int not null default 0,
  valid_rows         int not null default 0,
  invalid_rows       int not null default 0,
  missing_employees  int not null default 0,
  status             text not null default 'draft'
    check (status in ('draft','completed','partial','failed')),
  created_at         timestamptz not null default now()
);

create table if not exists payroll_import_rows (
  id              uuid primary key default gen_random_uuid(),
  import_id       uuid not null references payroll_imports(id) on delete cascade,
  employee_code   text,
  employee_id     uuid references employees(id),
  pay_period      text,
  base_salary     numeric(12,2),
  ot_hours        numeric(8,2),
  ot_rate         numeric(12,2),
  ot_amount       numeric(12,2),
  allowance       numeric(12,2),
  bonus           numeric(12,2),
  deduction       numeric(12,2),
  tax             numeric(12,2),
  social_security numeric(12,2),
  is_valid        boolean not null default false,
  errors          text[]  not null default '{}',
  raw_data        jsonb,
  created_at      timestamptz not null default now()
);


-- =============================================================================
-- APPROVALS
-- =============================================================================

create table if not exists approval_requests (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references companies(id) on delete cascade,
  request_type         text not null,
  request_id           uuid not null,
  requester_employee_id uuid not null references employees(id),
  approver_employee_id  uuid references employees(id),
  status               text not null default 'pending'
    check (status in ('pending','approved','rejected','cancelled')),
  comment              text,
  approved_at          timestamptz,
  rejected_at          timestamptz,
  created_at           timestamptz not null default now()
);

create table if not exists approval_logs (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references companies(id) on delete cascade,
  approval_request_id uuid references approval_requests(id) on delete cascade,
  actor_employee_id   uuid references employees(id),
  action              text not null,
  comment             text,
  created_at          timestamptz not null default now()
);


-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references companies(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  title       text not null,
  message     text,
  type        text default 'info',
  is_read     boolean not null default false,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);


-- =============================================================================
-- ACTIVITY LOGS
-- =============================================================================

create table if not exists activity_logs (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid references companies(id),
  employee_id       uuid references employees(id),
  actor_employee_id uuid references employees(id),
  module            text,
  action            text,
  target_type       text,
  target_id         uuid,
  description       text,
  metadata          jsonb,
  ip_address        inet,
  created_at        timestamptz not null default now()
);


-- =============================================================================
-- PIN SECURITY
-- =============================================================================

create table if not exists pin_attempts (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  attempted_at timestamptz not null default now(),
  succeeded   boolean not null default false
);

alter table employees
  add column if not exists pin_hash text,
  add column if not exists pin_set  boolean not null default false;

-- Hash existing plain-text PINs (one-time migration)
update employees
set pin_hash = crypt(pin, gen_salt('bf'))
where pin is not null
  and pin_hash is null;


-- =============================================================================
-- INDEXES
-- =============================================================================

create index if not exists idx_attendance_company_date       on attendance(company_id, date);
create index if not exists idx_leave_requests_company_status on leave_requests(company_id, status);
create index if not exists idx_ot_requests_company_status    on ot_requests(company_id, status);
create index if not exists idx_payslips_company_period       on payslips(company_id, period_month);
create index if not exists idx_payroll_imports_company       on payroll_imports(company_id, created_at desc);
create index if not exists idx_payroll_import_rows_import    on payroll_import_rows(import_id);
create index if not exists idx_approval_requests_company     on approval_requests(company_id, status);
create index if not exists idx_approval_requests_requester   on approval_requests(requester_employee_id, created_at desc);
create index if not exists idx_approval_requests_approver    on approval_requests(approver_employee_id, status, created_at desc);
create index if not exists idx_notifications_employee        on notifications(employee_id, read_at);
create index if not exists idx_notifications_company         on notifications(company_id, created_at desc);
create index if not exists idx_activity_logs_company         on activity_logs(company_id, created_at desc);
create index if not exists idx_activity_logs_actor           on activity_logs(actor_employee_id, created_at desc);
create index if not exists idx_pin_attempts_employee         on pin_attempts(employee_id, attempted_at desc);


-- =============================================================================
-- PERMISSIONS SEED
-- =============================================================================

insert into permissions (code, module, action) values
  ('attendance.view_self',  'attendance', 'view_self'),
  ('attendance.view_all',   'attendance', 'view_all'),
  ('attendance.manage',     'attendance', 'manage'),
  ('leave.apply',           'leave',      'apply'),
  ('leave.approve_team',    'leave',      'approve_team'),
  ('leave.approve_all',     'leave',      'approve_all'),
  ('ot.apply',              'ot',         'apply'),
  ('ot.approve_team',       'ot',         'approve_team'),
  ('ot.approve_all',        'ot',         'approve_all'),
  ('payroll.view_self',     'payroll',    'view_self'),
  ('payroll.view_all',      'payroll',    'view_all'),
  ('payroll.manage',        'payroll',    'manage'),
  ('payroll.import',        'payroll',    'import'),
  ('payroll.export',        'payroll',    'export'),
  ('approval.view',         'approval',   'view'),
  ('approval.manage',       'approval',   'manage'),
  ('notification.view',     'notification','view'),
  ('activity.view',         'activity',   'view'),
  ('activity.export',       'activity',   'export'),
  ('report.view',           'report',     'view')
on conflict (code) do nothing;

-- Grant permissions by role level
insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on true
where not exists (
  select 1 from role_permissions rp
  where rp.role_id = r.id and rp.permission_id = p.id
)
and (
  -- Everyone: basic self-access + notifications + approvals
  (r.level >= 10 and p.code in (
    'attendance.view_self','leave.apply','ot.apply',
    'payroll.view_self','notification.view','approval.view'
  ))
  or
  -- Manager+: team approvals and reports
  (r.level >= 40 and p.code in (
    'attendance.view_all','leave.approve_team','ot.approve_team',
    'report.view','activity.view'
  ))
  or
  -- HR/Finance+: full payroll and approvals
  (r.level >= 50 and p.code in (
    'payroll.view_all','payroll.manage','payroll.import','payroll.export',
    'leave.approve_all','ot.approve_all','approval.manage',
    'activity.view','activity.export'
  ))
);


-- =============================================================================
-- LEAVE TYPES SEED
-- =============================================================================

insert into leave_types (company_id, code, name, name_en, color, days_per_year, is_active)
select c.id, v.code, v.name, v.name_en, v.color, v.days, true
from companies c
cross join (values
  ('annual',   'ลาพักร้อน', 'Annual Leave',    '#22c55e', 10),
  ('sick',     'ลาป่วย',    'Sick Leave',       '#ef4444', 30),
  ('personal', 'ลากิจ',     'Personal Leave',   '#3b82f6',  6),
  ('maternity','ลาคลอด',   'Maternity Leave',  '#a855f7', 98)
) as v(code, name, name_en, color, days)
where not exists (
  select 1 from leave_types lt
  where lt.company_id = c.id and lt.code = v.code
);


-- =============================================================================
-- BACKFILL APPROVAL REQUESTS
-- Sync existing leave/OT records into approval_requests
-- =============================================================================

insert into approval_requests
  (company_id, request_type, request_id, requester_employee_id, approver_employee_id, status, created_at)
select lr.company_id, 'leave_request', lr.id, lr.employee_id, e.manager_id, lr.status, lr.created_at
from leave_requests lr
left join employees e on e.id = lr.employee_id
where not exists (
  select 1 from approval_requests ar
  where ar.request_type = 'leave_request' and ar.request_id = lr.id
);

insert into approval_requests
  (company_id, request_type, request_id, requester_employee_id, approver_employee_id, status, created_at)
select ot.company_id, 'ot_request', ot.id, ot.employee_id, e.manager_id, ot.status, ot.created_at
from ot_requests ot
left join employees e on e.id = ot.employee_id
where not exists (
  select 1 from approval_requests ar
  where ar.request_type = 'ot_request' and ar.request_id = ot.id
);


-- =============================================================================
-- DISABLE RLS (development only — enable before production)
-- =============================================================================

alter table attendance         disable row level security;
alter table leave_types        disable row level security;
alter table leave_balances     disable row level security;
alter table leave_requests     disable row level security;
alter table ot_requests        disable row level security;
alter table payslips           disable row level security;
alter table payroll_imports    disable row level security;
alter table payroll_import_rows disable row level security;
alter table approval_requests  disable row level security;
alter table approval_logs      disable row level security;
alter table notifications      disable row level security;
alter table activity_logs      disable row level security;
alter table pin_attempts       disable row level security;
