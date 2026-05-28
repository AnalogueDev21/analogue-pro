import { supabase } from '@/services/supabase'

const SELECT_LOGS = `
  *,
  actor:employees!activity_logs_actor_employee_id_fkey(id, first_name, last_name, employee_code, avatar_url, branch_id),
  employees!activity_logs_employee_id_fkey(id, first_name, last_name, employee_code, avatar_url, branch_id)
`

export const getActivityLogs = async (companyId, filters = {}) => {
  let query = supabase
    .from('activity_logs')
    .select(SELECT_LOGS)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(filters.limit || 200)

  if (filters.action) query = query.eq('action', filters.action)
  if (filters.actor_employee_id) query = query.eq('actor_employee_id', filters.actor_employee_id)
  if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
  if (filters.target_type) query = query.eq('target_type', filters.target_type)
  if (filters.module) query = query.eq('module', filters.module)
  if (filters.from) query = query.gte('created_at', `${filters.from}T00:00:00`)
  if (filters.to) query = query.lte('created_at', `${filters.to}T23:59:59`)

  const { data, error } = await query
  if (error) throw error
  let rows = (data || []).map(row => ({ ...row, actor: row.actor || row.employees }))
  if (filters.branch_id) rows = rows.filter(row => row.actor?.branch_id === filters.branch_id || row.employees?.branch_id === filters.branch_id)
  return rows
}

export const writeActivityLog = async (payload) => {
  const actorId = payload.actor_employee_id || payload.employee_id || null
  const targetType = payload.target_type || payload.module || 'system'
  const metadata = payload.metadata || payload.details || {}
  const { error } = await supabase.from('activity_logs').insert({
    ...payload,
    actor_employee_id: actorId,
    employee_id: actorId,
    target_type: targetType,
    module: targetType,
    metadata,
    details: metadata,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : payload.user_agent,
  })
  if (error) return null
  return true
}
