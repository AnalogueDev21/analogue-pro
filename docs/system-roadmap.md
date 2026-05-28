# Analogue Pro System Roadmap

Analogue Pro is moving from an HR dashboard into an enterprise organization operating system. This roadmap keeps the next build phase focused on scalable system modules instead of disconnected pages.

## Current Foundation

- Auth system
- PIN verification
- RBAC
- Companies
- Branches
- Departments
- Positions
- Roles and permissions
- Employee management
- Dashboard
- Responsive UI
- TH / EN i18n
- Activity logs
- Notifications
- Approval system
- Git, GitHub, and Vercel workflow
- Supabase integration

## Build Principles

- Do not add random features.
- Do not commit `.env`.
- Do not commit `node_modules`.
- Do not couple permission logic to UI components.
- Use `can('permission.code')` for permission checks.
- Keep workflows modular.
- Use `company_id` on company-scoped data.
- Build scalable structure before adding visual polish.

## Target Feature Structure

```text
src/features/
  employees/
    components/
    hooks/
    services/
    utils/
  approvals/
    components/
    hooks/
    services/
    utils/
  payroll/
    components/
    hooks/
    services/
    utils/
  notifications/
    components/
    hooks/
    services/
    utils/
  activityLogs/
    components/
    hooks/
    services/
    utils/
```

Feature modules own their data loading, workflows, validation helpers, and reusable UI pieces. Page files should compose feature modules instead of becoming business logic containers.

## Phase 1: Organization Tree

Goal: make the company hierarchy visible, interactive, and demo-ready.

Core capabilities:

- CEO to manager to supervisor to employee hierarchy
- Interactive organization structure
- Team visibility
- Manager relationships
- Company-scoped organization data

Suggested architecture:

- `src/features/organization/components/OrganizationTree.jsx`
- `src/features/organization/hooks/useOrganizationTree.js`
- `src/features/organization/services/organizationService.js`
- `src/features/organization/utils/tree.js`

Data contract:

- Employees must include `company_id`.
- Employees should resolve `manager_id` relationships.
- Tree building should live in feature utilities, not in page JSX.
- Permission checks should use codes such as `employee.view_team`, `employee.view_all`, or future `org.view_tree`.

Acceptance checklist:

- Managers see their own team when permitted.
- HR or admin users can see the full company tree when permitted.
- Employees without managers are handled gracefully.
- Empty states explain missing hierarchy data.
- The tree remains usable on mobile.

## Phase 2: Approval Timeline

Goal: turn approvals into a clear workflow history usable across leave, OT, payroll, and transfers.

Core capabilities:

- Submitted, pending, approved, rejected, and completed states
- Comments
- Timestamps
- Approval history
- Status tracking

Suggested architecture:

- `src/features/approvals/components/ApprovalTimeline.jsx`
- `src/features/approvals/components/ApprovalHistoryDrawer.jsx`
- `src/features/approvals/services/approvalService.js`
- `src/features/approvals/utils/approvalTypes.js`

Data contract:

- Approval records must include `company_id`.
- Approval history should be append-only where possible.
- Timeline UI should read normalized history events instead of hardcoding leave-only or OT-only logic.

Acceptance checklist:

- Leave, OT, payroll, and transfer approvals can share the same timeline component.
- Decision comments are visible in history.
- Each event shows actor, status, and timestamp.
- Rejected and completed states are visually distinct.
- Permission checks stay in hooks or service decisions, not scattered through display components.

## Phase 3: Payroll Excel Import And Export

Goal: make payroll operations practical for real HR and finance workflows.

Import capabilities:

- Upload `.xlsx`
- Preview rows
- Validate employee records
- Confirm import

Export capabilities:

- Payroll Excel
- Payslip PDF
- Salary reports

Suggested architecture:

- Continue using `src/features/payroll/`.
- Keep Excel parsing in `utils/`.
- Keep Supabase writes in `services/`.
- Keep upload, preview, validation, and confirm state in hooks.

Acceptance checklist:

- Invalid rows are shown before import.
- Employee validation uses company-scoped lookup.
- Import confirmation is explicit.
- Exports do not expose data outside the current company scope.
- Generated files have clear names and dates.

## Phase 4: Notification Center

Goal: make system events visible and actionable.

Events:

- Leave approved
- OT rejected
- Payroll generated
- Employee updated

Core capabilities:

- Unread badge
- Mark as read
- Redirect links
- Company and user scoped notification loading

Suggested architecture:

- Continue using `src/features/notifications/`.
- Keep redirect target construction in utilities or service mapping.
- Keep notification state in a hook.

Acceptance checklist:

- Unread count updates after marking notifications read.
- Notification links route users to the relevant page or record.
- Empty states are clear.
- Users only see notifications they are allowed to see.

## Phase 5: Activity Log Detail

Goal: make audit history useful for admin review and troubleshooting.

Core capabilities:

- Who did what
- Before and after changes
- Timestamps
- Action history
- Filter
- Export
- Detail drawer

Suggested architecture:

- Continue using `src/features/activityLogs/`.
- Keep CSV export in `utils/`.
- Keep filters in hook state.
- Add a detail drawer component for before and after payloads.

Acceptance checklist:

- Filters include actor, action, module, and date range where data supports it.
- Detail drawer shows before and after values clearly.
- Export respects active filters.
- Logs remain company-scoped.

## Phase 6: Demo Account Panel

Goal: make role testing easy during demos and development.

Display:

- Super Admin
- HR Manager
- Manager
- Employee

Core capabilities:

- Role permissions
- Demo credentials
- Test accounts

Suggested architecture:

- `src/features/demoAccounts/components/DemoAccountPanel.jsx`
- `src/features/demoAccounts/services/demoAccountService.js`
- `docs/demo-accounts.md` remains the source for human-readable setup notes until demo accounts become database-driven.

Acceptance checklist:

- Panel is only visible to allowed users or development/demo mode.
- Credentials are never mixed with production data.
- Permissions are displayed from RBAC data, not hardcoded UI assumptions.

## Long-Term Direction

Analogue Pro should become an enterprise organization operating system with modules for:

- HR
- Payroll
- Attendance
- Assets
- Warehouse
- Maintenance
- Procurement
- Analytics
- Workflow engine

The next engineering growth areas are clean architecture, feature isolation, data integrity, approval engines, and enterprise patterns.

## Working Motto

Not building pages anymore. Building systems now.
