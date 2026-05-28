import { supabase } from '@/services/supabase'

const TABLE = 'notifications'

export const NOTIFICATION_TYPES = {
  approval_pending: 'approval_pending',
  approval_approved: 'approval_approved',
  approval_rejected: 'approval_rejected',
  payroll_generated: 'payroll_generated',
  employee_updated: 'employee_updated',
}

export const getNotifications = async (employeeId, limit = 30) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return data || []
}

const mapPendingRequest = (kind, row) => {
  const requester = row.employees
  const name = requester ? `${requester.first_name || ''} ${requester.last_name || ''}`.trim() : 'Employee'
  return {
    id: `${kind}:${row.id}`,
    employee_id: null,
    title: kind === 'leave' ? 'Leave request pending' : 'OT request pending',
    message: `${name} is waiting for approval.`,
    type: NOTIFICATION_TYPES.approval_pending,
    is_read: false,
    read_at: null,
    link: kind === 'leave' ? 'leave' : 'ot',
    created_at: row.created_at,
    virtual: true,
  }
}

export const getPendingApprovalNotifications = async ({ employee, can }) => {
  if (!employee?.company_id) return []
  const tasks = []
  const canLeave = can?.('leave.approve_team') || can?.('leave.approve_all')
  const canOT = can?.('ot.approve_team') || can?.('ot.approve_all')
  const canLeaveAll = can?.('leave.approve_all')
  const canOTAll = can?.('ot.approve_all')

  if (canLeave) {
    const { data } = await supabase
      .from('leave_requests')
      .select(`
        id, employee_id, status, created_at,
        employees!leave_requests_employee_id_fkey(id, first_name, last_name, branch_id)
      `)
      .eq('company_id', employee.company_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(30)
    const rows = (data || []).filter(row => canLeaveAll || row.employees?.branch_id === employee.branch_id)
    tasks.push(...rows.map(row => mapPendingRequest('leave', row)))
  }

  if (canOT) {
    const { data } = await supabase
      .from('ot_requests')
      .select(`
        id, employee_id, status, created_at,
        employees!ot_requests_employee_id_fkey(id, first_name, last_name, branch_id)
      `)
      .eq('company_id', employee.company_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(30)
    const rows = (data || []).filter(row => canOTAll || row.employees?.branch_id === employee.branch_id)
    tasks.push(...rows.map(row => mapPendingRequest('ot', row)))
  }

  return tasks
}

export const getUnreadCount = async (employeeId) => {
  const { count, error } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('employee_id', employeeId)
    .or('is_read.eq.false,read_at.is.null')
  if (error) return 0
  return count || 0
}

export const createNotification = async (payload) => {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      ...payload,
      is_read: false,
      read_at: null,
    })
    .select()
    .single()
  if (error) return null
  return data
}

export const markNotificationRead = async (id) => {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const markAllNotificationsRead = async (employeeId) => {
  const { error } = await supabase
    .from(TABLE)
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('employee_id', employeeId)
    .or('is_read.eq.false,read_at.is.null')
  if (error) throw error
}
