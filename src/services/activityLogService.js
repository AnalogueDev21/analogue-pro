import { supabase } from './supabase'

export const getActivityLogs = async (companyId, filters = {}) => {
  let query = supabase
    .from('activity_logs')
    .select(`
      *,
      employees(id, first_name, last_name, employee_code, avatar_url)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (filters.module) query = query.eq('module', filters.module)
  if (filters.action) query = query.eq('action', filters.action)
  if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export const writeActivityLog = async (payload) => {
  const { error } = await supabase.from('activity_logs').insert(payload)
  if (error) return null
  return true
}

