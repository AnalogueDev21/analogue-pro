-- ============================================================================
-- Analogue Pro - Business OS Phase 2: Inventory
-- ============================================================================
-- Adds inventory master data, stock locations, suppliers, product balances,
-- stock movements, stock requests, and adjustment records.
-- Run after Phase 1 Teams and permission seed scripts.
-- ============================================================================

create extension if not exists "pgcrypto";


-- ============================================================================
-- Master Data
-- ============================================================================

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  code text,
  name text not null,
  name_en text,
  type text not null default 'inventory',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  code text,
  name text not null,
  contact_name text,
  phone text,
  email text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create table if not exists stock_locations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  code text,
  name text not null,
  name_en text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  supplier_id uuid references suppliers(id) on delete set null,
  sku text not null,
  product_code text,
  product_name text not null,
  product_name_en text,
  image_url text,
  unit text not null default 'pcs',
  stock_qty numeric(14, 2) not null default 0,
  min_stock numeric(14, 2) not null default 0,
  cost_price numeric(14, 2) not null default 0,
  selling_price numeric(14, 2) not null default 0,
  is_active boolean not null default true,
  created_by uuid references employees(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, sku)
);


-- ============================================================================
-- Stock Operations
-- ============================================================================

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  location_id uuid references stock_locations(id) on delete set null,
  movement_type text not null
    check (movement_type in ('receive', 'issue', 'adjust', 'transfer', 'request_issue', 'import')),
  quantity numeric(14, 2) not null,
  unit_cost numeric(14, 2) not null default 0,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid references employees(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists stock_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  requester_employee_id uuid not null references employees(id) on delete cascade,
  approver_employee_id uuid references employees(id) on delete set null,
  issued_by uuid references employees(id) on delete set null,
  quantity numeric(14, 2) not null,
  status text not null default 'submitted'
    check (status in ('submitted', 'pending_approval', 'approved', 'rejected', 'issued', 'completed', 'cancelled')),
  request_date timestamptz not null default now(),
  approve_date timestamptz,
  issue_date timestamptz,
  reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  location_id uuid references stock_locations(id) on delete set null,
  system_qty numeric(14, 2) not null default 0,
  actual_qty numeric(14, 2) not null default 0,
  difference_qty numeric(14, 2) generated always as (actual_qty - system_qty) stored,
  reason text,
  image_url text,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'approved', 'rejected')),
  counted_by uuid references employees(id) on delete set null,
  approved_by uuid references employees(id) on delete set null,
  counted_at timestamptz not null default now(),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ============================================================================
-- Indexes
-- ============================================================================

create index if not exists idx_products_company_category
  on products(company_id, category_id);

create index if not exists idx_products_company_supplier
  on products(company_id, supplier_id);

create index if not exists idx_products_low_stock
  on products(company_id, is_active, stock_qty, min_stock);

create index if not exists idx_stock_movements_company_product_date
  on stock_movements(company_id, product_id, created_at desc);

create index if not exists idx_stock_requests_company_status
  on stock_requests(company_id, status, request_date desc);

create index if not exists idx_stock_adjustments_company_status
  on stock_adjustments(company_id, status, counted_at desc);


-- ============================================================================
-- Views
-- ============================================================================

create or replace view inventory_product_summary as
select
  p.company_id,
  count(*) filter (where p.is_active = true) as product_count,
  count(*) filter (where p.is_active = true and p.stock_qty <= p.min_stock) as low_stock_count,
  coalesce(sum(p.stock_qty * p.cost_price) filter (where p.is_active = true), 0) as inventory_value
from products p
group by p.company_id;


-- ============================================================================
-- Permissions
-- ============================================================================

insert into permissions (code, module, action)
values
  ('stock.view', 'stock', 'view'),
  ('stock.request', 'stock', 'request'),
  ('stock.issue', 'stock', 'issue'),
  ('stock.receive', 'stock', 'receive'),
  ('stock.count', 'stock', 'count'),
  ('stock.adjust', 'stock', 'adjust'),
  ('stock.import', 'stock', 'import'),
  ('stock.export', 'stock', 'export'),
  ('stock.approve', 'stock', 'approve'),
  ('stock.manage', 'stock', 'manage')
on conflict (code) do nothing;

