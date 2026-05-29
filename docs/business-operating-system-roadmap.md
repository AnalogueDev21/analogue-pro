# Analogue Pro Business Operating System Roadmap

Analogue Pro is expanding from an HR management system into a business operating system. Existing Auth, PIN Login, RBAC, Supabase client architecture, and current routes should remain stable while new modules are added through feature-based slices.

## Current System

- Auth
- PIN Login
- RBAC
- Companies
- Branches
- Departments
- Positions
- Roles and Permissions
- Employees
- Attendance
- Leave
- OT
- Payroll
- Approvals
- Notifications
- Activity Logs
- Dashboard
- PWA

## Phase 1: Teams

Goal: introduce team-level organization between departments and employees.

Hierarchy:

```text
Company
  Branch
    Department
      Team
        Employees
```

Database:

- `teams`
- `team_members`

Capabilities:

- Create team
- Edit team
- Assign team leader
- Assign team members
- Transfer team members
- Team performance foundation

Permissions:

- `team.view`
- `team.manage`

## Phase 2: Inventory Management

Goal: create inventory master data and stock visibility.

Tables:

- `categories`
- `products`
- `stock_locations`
- `suppliers`
- `stock_movements`
- `stock_requests`
- `stock_adjustments`

Core product fields:

- `sku`
- `product_code`
- `product_name`
- `category_id`
- `image_url`
- `unit`
- `stock_qty`
- `min_stock`
- `cost_price`
- `selling_price`
- `supplier_id`

Capabilities:

- Product gallery
- Product images
- Stock balance
- Low stock alert
- Stock history
- Supplier management

## Phase 3: Stock Request Workflow

Goal: allow employees to request stock and track supervisor and inventory manager actions.

Workflow:

```text
Employee -> Supervisor -> Inventory Manager -> Completed
```

Track:

- `request_date`
- `approve_date`
- `issue_date`
- `issued_by`
- `status`

## Phase 4: Stock Count

Goal: support monthly and cycle counts with evidence and adjustment approval.

Roles:

- Employee: view stock and request items
- Stock Counter: count stock, upload evidence, submit result
- Inventory Manager: review count and approve adjustment

Log:

- `system_qty`
- `actual_qty`
- `difference_qty`
- `reason`
- `image_url`

## Phase 5: Excel Import And Export

Use the existing `xlsx` dependency.

Import workflow:

```text
Upload Excel -> Preview -> Validate -> Confirm Import -> Save
```

Import:

- Products
- Stock balance
- Suppliers
- Monthly sales data

Validation:

- Duplicate SKU
- Invalid quantity
- Missing product
- Missing employee

Export:

- Inventory report
- Stock movement report
- Low stock report
- Sales report

## Phase 6: Sales Performance

Monthly sales data comes from Excel import.

Tables:

- `sales_records`
- `team_targets`
- `employee_targets`

Dashboard calculations:

- Branch: `sum(sales_amount)`
- Team: `sum(sales_amount) group by team`
- Employee: `sum(sales_amount) group by employee`

## Phase 7: Branch Performance Dashboard

Widgets:

- Branch revenue
- Target achievement
- Top teams
- Top employees
- Inventory value
- Low stock alerts
- Pending approvals

Charts:

- Monthly revenue
- Team comparison
- Target achievement

## Phase 8: Executive Dashboard

Company overview:

- Total employees
- Total teams
- Monthly revenue
- Inventory value
- Pending approvals
- Attendance summary

Branch comparison:

- Revenue
- Employees
- Inventory
- Performance

## Permission Groups

Inventory:

- `stock.view`
- `stock.request`
- `stock.issue`
- `stock.receive`
- `stock.count`
- `stock.adjust`
- `stock.import`
- `stock.export`
- `stock.approve`
- `stock.manage`

Teams:

- `team.view`
- `team.manage`

Sales:

- `sales.view`
- `sales.manage`

Executive:

- `dashboard.executive`

## Architecture Requirements

- Feature-based structure
- Reusable components
- Mobile-first responsive design
- PWA compatible
- Multi-company support
- Branch-level permissions
- Audit logging on all critical actions
