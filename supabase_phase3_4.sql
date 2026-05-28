-- ============================================================================
-- Analogue Pro - Phase 3/4 Database Objects
-- ============================================================================
-- Run this after the Phase 1/2 foundation schema.
-- This script is safe to run more than once: tables, columns, indexes, and
-- permissions are created with IF NOT EXISTS / ON CONFLICT.
--
-- RLS is intentionally left disabled during development. Enable policies later
-- when production access rules are finalized.
-- ============================================================================

create extension if not exists "pgcrypto";


-- ============================================================================
-- Attendance
-- ============================================================================

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  date date not null,
  check_in timestamptz,
  check_in_lat numeric(10, 7),
  check_in_lng numeric(10, 7),
  check_out timestamptz,
  check_out_lat numeric(10, 7),
  check_out_lng numeric(10, 7),
  status text not null default 'on_time'
    check (status in ('on_time', 'late', 'absent', 'leave', 'holiday')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, date)
);


-- ============================================================================
-- Leave Management
-- ============================================================================

create table if not exists leave_types (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  code text,
  name text not null,
  name_en text,
  color text default '#3b82f6',
  days_per_year numeric(6, 2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table leave_types
  add column if not exists code text,
  add column if not exists name_en text,
  add column if not exists color text default '#3b82f6',
  add column if not exists days_per_year numeric(6, 2) not null default 0,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now();

create table if not exists leave_balances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  leave_type_id uuid not null references leave_types(id) on delete cascade,
  year int not null,
  entitled_days numeric(6, 2) not null default 0,
  used_days numeric(6, 2) not null default 0,
  pending_days numeric(6, 2) not null default 0,
  unique (employee_id, leave_type_id, year)
);

alter table leave_balances
  add column if not exists entitled_days numeric(6, 2) not null default 0,
  add column if not exists used_days numeric(6, 2) not null default 0,
  add column if not exists pending_days numeric(6, 2) not null default 0;

create table if not exists leave_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  leave_type_id uuid references leave_types(id),
  start_date date not null,
  end_date date not null,
  days numeric(6, 2) not null default 0,
  reason text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by uuid references employees(id),
  approved_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ============================================================================
-- OT Management
-- ============================================================================

create table if not exists ot_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  hours numeric(6, 2) not null default 0,
  day_type text not null default 'normal'
    check (day_type in ('normal', 'holiday')),
  detail text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by uuid references employees(id),
  approved_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ============================================================================
-- Payroll
-- ============================================================================

create table if not exists payslips (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  period_month text not null,
  base_salary numeric(12, 2) not null default 0,
  ot_amount numeric(12, 2) not null default 0,
  allowance numeric(12, 2) not null default 0,
  bonus numeric(12, 2) not null default 0,
  deduction numeric(12, 2) not null default 0,
  tax numeric(12, 2) not null default 0,
  social_security numeric(12, 2) not null default 0,
  net_salary numeric(12, 2),
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, period_month)
);


-- ============================================================================
-- Notifications
-- ============================================================================

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  title text not null,
  message text,
  type text default 'info',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);


-- ============================================================================
-- Activity Logs
-- ============================================================================
-- The foundation schema may already have activity_logs with a smaller shape.
-- Create the table if missing, then add UI/service compatibility columns.

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid()
);

alter table activity_logs
  add column if not exists employee_id uuid references employees(id),
  add column if not exists company_id uuid references companies(id),
  add column if not exists module text,
  add column if not exists action text,
  add column if not exists description text,
  add column if not exists details jsonb,
  add column if not exists created_at timestamptz not null default now();


-- ============================================================================
-- Indexes
-- ============================================================================

create index if not exists idx_attendance_company_date
  on attendance(company_id, date);

create index if not exists idx_leave_requests_company_status
  on leave_requests(company_id, status);

create index if not exists idx_ot_requests_company_status
  on ot_requests(company_id, status);

create index if not exists idx_payslips_company_period
  on payslips(company_id, period_month);

create index if not exists idx_notifications_employee_read
  on notifications(employee_id, read_at);

create index if not exists idx_activity_logs_company_created
  on activity_logs(company_id, created_at desc);


-- ============================================================================
-- Permission Seed
-- ============================================================================

insert into permissions (code, module, action)
values
  ('attendance.view_self', 'attendance', 'view_self'),
  ('attendance.view_all', 'attendance', 'view_all'),
  ('attendance.manage', 'attendance', 'manage'),
  ('leave.apply', 'leave', 'apply'),
  ('leave.approve_team', 'leave', 'approve_team'),
  ('leave.approve_all', 'leave', 'approve_all'),
  ('ot.apply', 'ot', 'apply'),
  ('ot.approve_team', 'ot', 'approve_team'),
  ('ot.approve_all', 'ot', 'approve_all'),
  ('payroll.view_self', 'payroll', 'view_self'),
  ('payroll.view_all', 'payroll', 'view_all'),
  ('payroll.manage', 'payroll', 'manage'),
  ('report.view', 'report', 'view')
on conflict (code) do nothing;


-- ============================================================================
-- Leave Type Seed
-- ============================================================================

insert into leave_types (company_id, code, name, name_en, color, days_per_year, is_active)
select c.id, v.code, v.name, v.name_en, v.color, v.days_per_year, true
from companies c
cross join (
  values
    ('annual', 'ลาพักร้อน', 'Annual Leave', '#22c55e', 10.00),
    ('sick', 'ลาป่วย', 'Sick Leave', '#ef4444', 30.00),
    ('personal', 'ลากิจ', 'Personal Leave', '#3b82f6', 6.00),
    ('maternity', 'ลาคลอด', 'Maternity Leave', '#a855f7', 98.00)
) as v(code, name, name_en, color, days_per_year)
where not exists (
  select 1
  from leave_types lt
  where lt.company_id = c.id
    and (lt.code = v.code or lt.name_en = v.name_en or lt.name = v.name)
);


-- ============================================================================
-- Development RLS State
-- ============================================================================
-- Keep Phase 3/4 tables readable by the Vite app while policies are still being
-- finalized. Re-enable RLS and add production policies before deployment.

alter table attendance disable row level security;
alter table leave_types disable row level security;
alter table leave_balances disable row level security;
alter table leave_requests disable row level security;
alter table ot_requests disable row level security;
alter table payslips disable row level security;
alter table notifications disable row level security;
alter table activity_logs disable row level security;
