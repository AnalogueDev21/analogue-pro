// src/features/activityLogs/services/activityLogService.js
import { supabase } from '@/services/supabase'

const SELECT_LOGS = `
  *,
  actor:employees!activity_logs_actor_employee_id_fkey(id, first_name, last_name, employee_code, avatar_url, branch_id),
  target_employee:employees!activity_logs_employee_id_fkey(id, first_name, last_name, employee_code, avatar_url, branch_id)
`

// ── Read ──────────────────────────────────────────────────────────

export const getActivityLogs = async (companyId, filters = {}) => {
  let query = supabase
    .from('activity_logs')
    .select(SELECT_LOGS)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(filters.limit || 200)

  if (filters.action)             query = query.eq('action', filters.action)
  if (filters.actor_employee_id)  query = query.eq('actor_employee_id', filters.actor_employee_id)
  if (filters.employee_id)        query = query.eq('employee_id', filters.employee_id)
  if (filters.target_type)        query = query.eq('target_type', filters.target_type)
  if (filters.target_id)          query = query.eq('target_id', filters.target_id)
  if (filters.module)             query = query.eq('module', filters.module)
  if (filters.from)               query = query.gte('created_at', `${filters.from}T00:00:00`)
  if (filters.to)                 query = query.lte('created_at', `${filters.to}T23:59:59`)

  const { data, error } = await query
  if (error) throw error

  let rows = (data || []).map(row => ({
    ...row,
    actor: row.actor || row.target_employee,
  }))

  // Branch-level filter (app-side for privacy)
  if (filters.branch_id) {
    rows = rows.filter(r =>
      r.actor?.branch_id === filters.branch_id ||
      r.target_employee?.branch_id === filters.branch_id
    )
  }

  return rows
}

// ── Write (safe — never throws, just logs to console on fail) ─────

export const writeActivityLog = async (payload) => {
  try {
    if (!payload?.company_id) return null
    const actorId = payload.actor_employee_id || payload.employee_id || null
    const mod = payload.module || payload.target_type || 'system'
    const metadata = payload.metadata || payload.details || {}

    const { error } = await supabase.from('activity_logs').insert({
      company_id:          payload.company_id,
      actor_employee_id:   actorId,
      employee_id:         payload.employee_id || actorId,
      module:              mod,
      action:              payload.action || 'unknown',
      target_type:         payload.target_type || mod,
      target_id:           payload.target_id || null,
      description:         payload.description || null,
      metadata,
      ip_address:          null,
    })
    if (error) console.warn('[ActivityLog] write failed:', error.message)
    return !error
  } catch (e) {
    console.warn('[ActivityLog] exception:', e.message)
    return null
  }
}

// ── Pre-built log helpers ─────────────────────────────────────────

export const logLogin = (companyId, employeeId) =>
  writeActivityLog({ company_id: companyId, actor_employee_id: employeeId, module: 'auth', action: 'login', description: 'User logged in' })

export const logLogout = (companyId, employeeId) =>
  writeActivityLog({ company_id: companyId, actor_employee_id: employeeId, module: 'auth', action: 'logout', description: 'User logged out' })

export const logCreate = (companyId, actorId, module, targetId, description) =>
  writeActivityLog({ company_id: companyId, actor_employee_id: actorId, module, action: 'create', target_type: module, target_id: targetId, description })

export const logUpdate = (companyId, actorId, module, targetId, description) =>
  writeActivityLog({ company_id: companyId, actor_employee_id: actorId, module, action: 'update', target_type: module, target_id: targetId, description })

export const logDelete = (companyId, actorId, module, targetId, description) =>
  writeActivityLog({ company_id: companyId, actor_employee_id: actorId, module, action: 'delete', target_type: module, target_id: targetId, description })

export const logApprove = (companyId, actorId, module, targetId, description) =>
  writeActivityLog({ company_id: companyId, actor_employee_id: actorId, module, action: 'approve', target_type: module, target_id: targetId, description })

export const logReject = (companyId, actorId, module, targetId, description) =>
  writeActivityLog({ company_id: companyId, actor_employee_id: actorId, module, action: 'reject', target_type: module, target_id: targetId, description })

export const logImport = (companyId, actorId, module, count, fileName) =>
  writeActivityLog({ company_id: companyId, actor_employee_id: actorId, module, action: 'import', description: `Imported ${count} records from ${fileName}`, metadata: { count, file_name: fileName } })

export const logExport = (companyId, actorId, module, count, fileName) =>
  writeActivityLog({ company_id: companyId, actor_employee_id: actorId, module, action: 'export', description: `Exported ${count} records to ${fileName}`, metadata: { count, file_name: fileName } })
