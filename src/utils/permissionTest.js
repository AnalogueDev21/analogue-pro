// src/utils/permissionTest.js
// Usage: import { runPermissionTest } from '@/utils/permissionTest'
// Call in browser console: runPermissionTest(useAuthStore.getState())

export const EXPECTED_PERMISSIONS = {
  'super_admin': {
    level: 100,
    must_have: [
      'employee.view_all', 'employee.create', 'employee.edit', 'employee.terminate',
      'leave.approve_all', 'ot.approve_all', 'payroll.manage', 'payroll.import', 'payroll.export',
      'org.manage_company', 'org.manage_branch', 'org.manage_dept', 'org.manage_role',
      'approval.manage', 'activity.export', 'dashboard.executive', 'sales.manage',
      'stock.manage', 'team.manage',
    ],
    must_not: [],
  },
  'hr_manager': {
    level: 60,
    must_have: [
      'employee.view_all', 'employee.create', 'employee.edit',
      'leave.approve_all', 'ot.approve_all',
      'payroll.view_all', 'payroll.manage', 'payroll.import',
      'attendance.view_all',
    ],
    must_not: ['org.manage_company', 'dashboard.executive'],
  },
  'manager': {
    level: 40,
    must_have: [
      'employee.view_team', 'leave.approve_team', 'ot.approve_team',
      'report.view', 'team.manage',
    ],
    must_not: ['employee.view_all', 'payroll.manage', 'org.manage_company'],
  },
  'employee': {
    level: 10,
    must_have: [
      'employee.view_self', 'employee.edit_self',
      'leave.create', 'leave.view_self',
      'ot.create', 'ot.view_self',
      'payroll.view_self', 'attendance.view_self',
    ],
    must_not: ['employee.view_all', 'leave.approve_all', 'payroll.manage'],
  },
}

export const runPermissionTest = (authState) => {
  const { permissions, roleLevel } = authState
  console.group('🔐 Permission Test')
  console.log('Role Level:', roleLevel)
  console.log('Total permissions:', permissions.length)
  console.log('Permissions:', permissions)

  // Find matching expected role
  const roleName = Object.entries(EXPECTED_PERMISSIONS).find(
    ([, cfg]) => cfg.level === roleLevel
  )?.[0] || 'unknown'

  if (roleName !== 'unknown') {
    const cfg = EXPECTED_PERMISSIONS[roleName]
    const missing = cfg.must_have.filter(p => !permissions.includes(p))
    const unexpected = cfg.must_not.filter(p => permissions.includes(p))

    if (missing.length)     console.warn('❌ Missing permissions:', missing)
    else                    console.log('✅ All required permissions present')
    if (unexpected.length)  console.warn('⚠️ Unexpected permissions:', unexpected)
    else                    console.log('✅ No unexpected permissions')
  }
  console.groupEnd()
}
