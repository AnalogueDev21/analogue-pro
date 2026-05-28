# Analogue Pro Production Readiness Checklist

Use this checklist before demo, staging, or production deployment. Keep each item evidence-based: either mark it checked, record the issue, or create a follow-up task.

## Stability

- [ ] Login, session restore, logout, and PIN verification work for every demo role.
- [ ] Main pages load without console errors: Dashboard, Employees, Leave, OT, Payroll, Approvals, Reports, Activity Logs, Settings.
- [ ] Loading, empty, and error states are visible and understandable.
- [ ] Refreshing the browser keeps the user on a safe screen and restores auth state.
- [ ] Realtime notifications do not duplicate items after navigation.

## Testing

- [ ] Smoke test Super Admin, Company Admin, HR Manager, Manager, Supervisor, and Employee.
- [ ] Verify role-limited pages are hidden from users without permission.
- [ ] Verify direct navigation to restricted pages still shows no-access UI.
- [ ] Test both TH and EN language modes on core pages.
- [ ] Test dark and light mode after refresh.

## Backup

- [ ] Supabase daily backups are enabled or a manual export process is documented.
- [ ] Take a backup before running any large SQL migration.
- [ ] Keep SQL migration files in repo and record the date applied.
- [ ] Export critical tables before destructive maintenance: employees, roles, permissions, payroll, leave, OT, approvals.

## Audit

- [ ] Login and logout actions write activity logs.
- [ ] Employee create/update/suspend actions write activity logs.
- [ ] Approval approve/reject actions write activity logs.
- [ ] Payroll import/export actions write activity logs.
- [ ] Activity Logs page can filter by actor, action, and date.

## Security

- [ ] `.env` is not committed.
- [ ] Supabase service role key is never used in frontend code.
- [ ] RLS is reviewed before production enablement.
- [ ] Managers can only see branch/team data unless they have company-wide permissions.
- [ ] Payroll import/export is limited to `payroll.import`, `payroll.export`, or `payroll.manage`.
- [ ] Activity logs are limited to `activity.view` or `activity.export`.

## Onboarding

- [ ] Demo account panel is visible on Login only when demo mode is intended.
- [ ] First login can complete PIN setup.
- [ ] Users without employee records show a safe error state.
- [ ] Suspended/inactive employees cannot continue normal workflow.
- [ ] Missing role or missing permissions shows no-access UI, not a blank page.

## Edge Cases

- [ ] Employee has no branch, department, position, role, or manager.
- [ ] Branch/department/position is inactive.
- [ ] Approval request has no approver.
- [ ] Notification link points to an unavailable page for the current role.
- [ ] Date filters handle empty, future, and invalid ranges.

## Mobile Polish

- [ ] iPhone safe area does not cover bottom navigation.
- [ ] Tables become cards on small screens.
- [ ] Modals and drawers fit within the viewport.
- [ ] Forms use touch-friendly buttons and inputs.
- [ ] PWA icons fit iOS home screen frame.

## Data Integrity

- [ ] `company_id` is present on multi-company tables.
- [ ] Imports reject missing employee codes before saving payslips.
- [ ] Numeric payroll fields validate before confirm import.
- [ ] Duplicate payslip strategy is intentional: update existing or block duplicate.
- [ ] Exports only include data visible to the current role.

## Import / Export Flow

- [ ] Excel upload never saves immediately.
- [ ] Preview table/card appears before confirm.
- [ ] Valid, invalid, and missing employee counts are shown.
- [ ] Invalid rows show row number and reason.
- [ ] Confirm Import is disabled when there are zero valid rows.
- [ ] Export files use clear filenames with period/date.

## Deployment Automation

- [ ] `npm run build` passes before deploy.
- [ ] Vercel environment variables match Supabase project.
- [ ] SQL migrations are applied before frontend deploy that depends on them.
- [ ] Rollback plan is documented for schema and frontend.
- [ ] Production deploy URL is smoke-tested after release.
