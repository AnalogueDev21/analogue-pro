-- ============================================================================
-- Analogue Pro - Approval Workflow + Notification Center + Activity Logs
-- ============================================================================
-- Safe to run more than once.
-- RLS is disabled for development; enable and replace with production policies
-- before deployment.
-- ============================================================================

create extension if not exists "pgcrypto";


-- ============================================================================
-- Approval Workflow
-- ============================================================================

create table if not exists approval_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  request_type text not null,
  request_id uuid not null,
  requester_employee_id uuid not null references employees(id),
  approver_employee_id uuid references employees(id),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  comment text,
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists approval_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  approval_request_id uuid references approval_requests(id) on delete cascade,
  actor_employee_id uuid references employees(id),
  action text not null,
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists idx_approval_requests_company_status
  on approval_requests(company_id, status);

create index if not exists idx_approval_requests_requester
  on approval_requests(requester_employee_id, created_at desc);

create index if not exists idx_approval_requests_approver
  on approval_requests(approver_employee_id, status, created_at desc);

create index if not exists idx_approval_logs_company_created
  on approval_logs(company_id, created_at desc);


-- ============================================================================
-- Notifications
-- ============================================================================

alter table notifications
  add column if not exists is_read boolean not null default false,
  add column if not exists link text,
  add column if not exists read_at timestamptz;

create index if not exists idx_notifications_employee_read
  on notifications(employee_id, is_read, created_at desc);

create index if not exists idx_notifications_company_created
  on notifications(company_id, created_at desc);


-- ============================================================================
-- Activity Logs
-- ============================================================================

alter table activity_logs
  add column if not exists company_id uuid references companies(id),
  add column if not exists employee_id uuid references employees(id),
  add column if not exists actor_employee_id uuid references employees(id),
  add column if not exists module text,
  add column if not exists action text,
  add column if not exists target_type text,
  add column if not exists target_id uuid,
  add column if not exists description text,
  add column if not exists metadata jsonb,
  add column if not exists details jsonb,
  add column if not exists ip_address inet,
  add column if not exists user_agent text,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_activity_logs_company_created
  on activity_logs(company_id, created_at desc);

create index if not exists idx_activity_logs_actor_created
  on activity_logs(actor_employee_id, created_at desc);

create index if not exists idx_activity_logs_action_created
  on activity_logs(action, created_at desc);


-- ============================================================================
-- Payroll Approval Compatibility
-- ============================================================================

alter table payslips
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  add column if not exists approved_by uuid references employees(id),
  add column if not exists approved_at timestamptz,
  add column if not exists reject_reason text;


-- ============================================================================
-- Permission Seed
-- ============================================================================

insert into permissions (code, module, action)
values
  ('approval.view', 'approval', 'view'),
  ('approval.manage', 'approval', 'manage'),
  ('notification.view', 'notification', 'view'),
  ('activity.view', 'activity', 'view'),
  ('activity.export', 'activity', 'export')
on conflict (code) do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.code in (
  'approval.view',
  'approval.manage',
  'notification.view',
  'activity.view',
  'activity.export'
)
where r.level >= 50
  and not exists (
    select 1
    from role_permissions rp
    where rp.role_id = r.id
      and rp.permission_id = p.id
  );

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.code in ('approval.view', 'notification.view')
where r.level >= 10
  and not exists (
    select 1
    from role_permissions rp
    where rp.role_id = r.id
      and rp.permission_id = p.id
  );


-- ============================================================================
-- Existing Leave/OT Backfill
-- ============================================================================

insert into approval_requests (
  company_id, request_type, request_id, requester_employee_id,
  approver_employee_id, status, created_at
)
select
  lr.company_id, 'leave_request', lr.id, lr.employee_id,
  e.manager_id, lr.status, lr.created_at
from leave_requests lr
left join employees e on e.id = lr.employee_id
where not exists (
  select 1
  from approval_requests ar
  where ar.request_type = 'leave_request'
    and ar.request_id = lr.id
);

insert into approval_requests (
  company_id, request_type, request_id, requester_employee_id,
  approver_employee_id, status, created_at
)
select
  ot.company_id, 'ot_request', ot.id, ot.employee_id,
  e.manager_id, ot.status, ot.created_at
from ot_requests ot
left join employees e on e.id = ot.employee_id
where not exists (
  select 1
  from approval_requests ar
  where ar.request_type = 'ot_request'
    and ar.request_id = ot.id
);


-- ============================================================================
-- RLS Placeholder
-- ============================================================================

alter table approval_requests disable row level security;
alter table approval_logs disable row level security;
alter table notifications disable row level security;
alter table activity_logs disable row level security;
