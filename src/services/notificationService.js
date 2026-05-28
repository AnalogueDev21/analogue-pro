import { supabase } from './supabase'

const TABLE = 'notifications'

export const getNotifications = async (employeeId) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) return []
  return data || []
}

export const getUnreadCount = async (employeeId) => {
  const { count, error } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('employee_id', employeeId)
    .is('read_at', null)
  if (error) return 0
  return count || 0
}

export const markNotificationRead = async (id) => {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const markAllNotificationsRead = async (employeeId) => {
  const { error } = await supabase
    .from(TABLE)
    .update({ read_at: new Date().toISOString() })
    .eq('employee_id', employeeId)
    .is('read_at', null)
  if (error) throw error
}
