-- =============================================================================
-- Analogue Pro — Phase 5-8 Schema
-- Sales Performance + Branch Dashboard + Executive Analytics
-- Safe to run multiple times (IF NOT EXISTS / ON CONFLICT DO NOTHING)
-- =============================================================================


-- =============================================================================
-- PHASE 5 — SALES PERFORMANCE
-- =============================================================================

-- Sales records (imported from Excel or entered manually)
create table if not exists sales_records (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  branch_id     uuid references branches(id) on delete set null,
  team_id       uuid references teams(id) on delete set null,
  employee_id   uuid references employees(id) on delete set null,
  sales_month   text not null, -- format: 'YYYY-MM'
  sales_amount  numeric(15,2) not null default 0,
  item_count    int default 0,
  note          text,
  source        text default 'manual' check (source in ('manual','import','system')),
  imported_by   uuid references employees(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (employee_id, sales_month)
);

-- Branch targets per month
create table if not exists branch_targets (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  branch_id     uuid not null references branches(id) on delete cascade,
  target_month  text not null, -- 'YYYY-MM'
  target_amount numeric(15,2) not null default 0,
  created_by    uuid references employees(id),
  created_at    timestamptz not null default now(),
  unique (branch_id, target_month)
);

-- Team targets per month
create table if not exists team_targets (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  team_id       uuid not null references teams(id) on delete cascade,
  target_month  text not null,
  target_amount numeric(15,2) not null default 0,
  created_by    uuid references employees(id),
  created_at    timestamptz not null default now(),
  unique (team_id, target_month)
);

-- Employee targets per month
create table if not exists employee_targets (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  employee_id   uuid not null references employees(id) on delete cascade,
  target_month  text not null,
  target_amount numeric(15,2) not null default 0,
  created_by    uuid references employees(id),
  created_at    timestamptz not null default now(),
  unique (employee_id, target_month)
);

-- Sales import log
create table if not exists sales_imports (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  imported_by   uuid references employees(id),
  file_name     text,
  sales_month   text,
  total_rows    int default 0,
  valid_rows    int default 0,
  invalid_rows  int default 0,
  status        text default 'completed'
    check (status in ('draft','completed','failed')),
  created_at    timestamptz not null default now()
);


-- =============================================================================
-- PHASE 6 — PERMISSIONS SEED
-- =============================================================================

insert into permissions (code, module, action) values
  -- Teams
  ('team.view',              'team',      'view'),
  ('team.manage',            'team',      'manage'),
  -- Sales
  ('sales.view',             'sales',     'view'),
  ('sales.manage',           'sales',     'manage'),
  ('sales.import',           'sales',     'import'),
  ('sales.export',           'sales',     'export'),
  -- Dashboard
  ('dashboard.branch',       'dashboard', 'branch'),
  ('dashboard.executive',    'dashboard', 'executive'),
  -- Inventory (เพิ่มเติม)
  ('stock.view',             'stock',     'view'),
  ('stock.request',          'stock',     'request'),
  ('stock.issue',            'stock',     'issue'),
  ('stock.receive',          'stock',     'receive'),
  ('stock.count',            'stock',     'count'),
  ('stock.adjust',           'stock',     'adjust'),
  ('stock.import',           'stock',     'import'),
  ('stock.export',           'stock',     'export'),
  ('stock.approve',          'stock',     'approve'),
  ('stock.manage',           'stock',     'manage')
on conflict (code) do nothing;

-- Grant by role level
insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on true
where not exists (
  select 1 from role_permissions rp
  where rp.role_id = r.id and rp.permission_id = p.id
)
and (
  -- Employee: stock request only
  (r.level >= 10 and p.code in ('stock.view','stock.request','team.view','sales.view'))
  or
  -- Supervisor: can issue stock
  (r.level >= 20 and p.code in ('stock.issue','stock.receive'))
  or
  -- Manager+: team manage, branch dashboard
  (r.level >= 40 and p.code in (
    'team.manage','sales.manage','sales.export',
    'stock.count','stock.adjust','stock.approve',
    'dashboard.branch'
  ))
  or
  -- HR/Finance+: sales import, inventory manage
  (r.level >= 50 and p.code in (
    'sales.import','stock.import','stock.export','stock.manage'
  ))
  or
  -- Admin+: executive dashboard
  (r.level >= 80 and p.code in ('dashboard.executive'))
);


-- =============================================================================
-- INDEXES
-- =============================================================================

create index if not exists idx_sales_records_company_month  on sales_records(company_id, sales_month);
create index if not exists idx_sales_records_branch_month   on sales_records(branch_id, sales_month);
create index if not exists idx_sales_records_team_month     on sales_records(team_id, sales_month);
create index if not exists idx_sales_records_employee_month on sales_records(employee_id, sales_month);
create index if not exists idx_branch_targets_month         on branch_targets(branch_id, target_month);
create index if not exists idx_team_targets_month           on team_targets(team_id, target_month);
create index if not exists idx_employee_targets_month       on employee_targets(employee_id, target_month);
create index if not exists idx_sales_imports_company        on sales_imports(company_id, created_at desc);


-- =============================================================================
-- DISABLE RLS (development — enable before production)
-- =============================================================================

alter table sales_records    disable row level security;
alter table branch_targets   disable row level security;
alter table team_targets     disable row level security;
alter table employee_targets disable row level security;
alter table sales_imports    disable row level security;
