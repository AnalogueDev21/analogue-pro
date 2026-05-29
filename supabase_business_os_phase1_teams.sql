-- ============================================================================
-- Analogue Pro - Business OS Phase 1: Teams
-- ============================================================================
-- Adds team-level organization below department and above employees.
-- This script does not modify existing Auth, RBAC architecture, routes, or
-- current application tables beyond adding new permissions.
-- ============================================================================

create extension if not exists "pgcrypto";


-- ============================================================================
-- Teams
-- ============================================================================

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  department_id uuid references departments(id) on delete set null,
  leader_employee_id uuid references employees(id) on delete set null,
  code text,
  name text not null,
  name_en text,
  description text,
  target_amount numeric(14, 2) not null default 0,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'archived')),
  created_by uuid references employees(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  member_role text not null default 'member'
    check (member_role in ('leader', 'member')),
  start_date date not null default current_date,
  end_date date,
  is_active boolean not null default true,
  created_by uuid references employees(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_team_members_active_employee
  on team_members(company_id, employee_id)
  where is_active = true;

create index if not exists idx_teams_company_branch_department
  on teams(company_id, branch_id, department_id);

create index if not exists idx_teams_leader
  on teams(leader_employee_id);

create index if not exists idx_team_members_team_active
  on team_members(team_id, is_active);

create index if not exists idx_team_members_employee_active
  on team_members(employee_id, is_active);


-- ============================================================================
-- Permission Seed
-- ============================================================================

insert into permissions (code, module, action)
values
  ('team.view', 'team', 'view'),
  ('team.manage', 'team', 'manage'),
  ('stock.view', 'stock', 'view'),
  ('stock.request', 'stock', 'request'),
  ('stock.issue', 'stock', 'issue'),
  ('stock.receive', 'stock', 'receive'),
  ('stock.count', 'stock', 'count'),
  ('stock.adjust', 'stock', 'adjust'),
  ('stock.import', 'stock', 'import'),
  ('stock.export', 'stock', 'export'),
  ('stock.approve', 'stock', 'approve'),
  ('stock.manage', 'stock', 'manage'),
  ('sales.view', 'sales', 'view'),
  ('sales.manage', 'sales', 'manage'),
  ('dashboard.executive', 'dashboard', 'executive')
on conflict (code) do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.code in ('team.view')
where r.level >= 10
  and not exists (
    select 1
    from role_permissions rp
    where rp.role_id = r.id
      and rp.permission_id = p.id
  );

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.code in ('team.manage', 'sales.view')
where r.level >= 40
  and not exists (
    select 1
    from role_permissions rp
    where rp.role_id = r.id
      and rp.permission_id = p.id
  );

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.code in (
  'stock.view',
  'stock.request',
  'stock.issue',
  'stock.receive',
  'stock.count',
  'stock.adjust',
  'stock.import',
  'stock.export',
  'stock.approve',
  'stock.manage',
  'sales.manage',
  'dashboard.executive'
)
where r.level >= 60
  and not exists (
    select 1
    from role_permissions rp
    where rp.role_id = r.id
      and rp.permission_id = p.id
  );


-- ============================================================================
-- Team Performance View
-- ============================================================================

create or replace view team_performance_summary as
select
  t.id as team_id,
  t.company_id,
  t.branch_id,
  t.department_id,
  t.leader_employee_id,
  t.name,
  t.name_en,
  t.target_amount,
  count(tm.employee_id) filter (where tm.is_active = true) as active_member_count
from teams t
left join team_members tm on tm.team_id = t.id
group by
  t.id,
  t.company_id,
  t.branch_id,
  t.department_id,
  t.leader_employee_id,
  t.name,
  t.name_en,
  t.target_amount;
