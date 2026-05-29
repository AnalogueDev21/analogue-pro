// src/utils/permissionTest.js
// Run in browser console:
// const { runPermissionTest } = await import('/src/utils/permissionTest.js')
// runPermissionTest(window.__authStore?.getState())

export const ROLE_EXPECTATIONS = {
  100: { // Super Admin
    must: ['employee.view_all','employee.create','leave.approve_all','ot.approve_all',
           'payroll.manage','org.manage_company','dashboard.executive','sales.manage','approval.manage'],
    mustNot: [],
  },
  80: { // Company Admin
    must: ['employee.view_all','employee.create','leave.approve_all','payroll.manage','org.manage_branch'],
    mustNot: [],
  },
  60: { // HR Manager
    must: ['employee.view_all','employee.create','leave.approve_all','ot.approve_all','payroll.manage'],
    mustNot: ['org.manage_company','dashboard.executive'],
  },
  50: { // Finance/HR Staff
    must: ['payroll.view_all','payroll.manage','payroll.import'],
    mustNot: ['org.manage_company'],
  },
  40: { // Manager
    must: ['employee.view_team','leave.approve_team','ot.approve_team','team.manage'],
    mustNot: ['employee.view_all','payroll.manage','org.manage_company'],
  },
  20: { // Supervisor
    must: ['employee.view_team','leave.approve_team','ot.approve_team'],
    mustNot: ['employee.view_all','payroll.manage'],
  },
  10: { // Employee
    must: ['employee.view_self','leave.create','leave.view_self','ot.create','payroll.view_self','attendance.view_self'],
    mustNot: ['employee.view_all','leave.approve_all','payroll.manage','org.manage_company'],
  },
}

export const runPermissionTest = (authState) => {
  if (!authState) { console.error('No auth state provided'); return }
  const { permissions = [], roleLevel = 0 } = authState
  const cfg = ROLE_EXPECTATIONS[roleLevel]

  console.group(`🔐 Permission Test — Level ${roleLevel}`)
  console.log('Total permissions:', permissions.length)
  console.table(permissions.map(p => ({ permission: p })))

  if (!cfg) { console.warn('No expectation defined for level', roleLevel); console.groupEnd(); return }

  const missing    = cfg.must.filter(p => !permissions.includes(p))
  const unexpected = cfg.mustNot.filter(p => permissions.includes(p))

  if (missing.length)     console.error('❌ Missing:', missing)
  else                    console.log('✅ All required permissions present')

  if (unexpected.length)  console.error('⚠️ Should NOT have:', unexpected)
  else                    console.log('✅ No unexpected permissions')

  console.groupEnd()
  return { missing, unexpected, ok: missing.length === 0 && unexpected.length === 0 }
}
