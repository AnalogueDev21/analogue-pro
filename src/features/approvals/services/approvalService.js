import { supabase } from '@/services/supabase'
import { writeActivityLog } from '@/features/activityLogs/services/activityLogService'
import { createNotification, NOTIFICATION_TYPES } from '@/features/notifications/services/notificationService'
import { REQUEST_TABLES } from '../utils/approvalTypes'

const SELECT_APPROVAL = `
  *,
  requester:employees!approval_requests_requester_employee_id_fkey(id, first_name, last_name, employee_code, manager_id, branch_id, departments(name), positions(name), branches(name)),
  approver:employees!approval_requests_approver_employee_id_fkey(id, first_name, last_name, employee_code)
`

export const findDefaultApprover = async (requesterEmployeeId) => {
  const { data, error } = await supabase
    .from('employees')
    .select('manager_id')
    .eq('id', requesterEmployeeId)
    .single()
  if (error) return null
  return data?.manager_id || null
}

export const createApprovalRequest = async (payload) => {
  const approverId = payload.approver_employee_id || await findDefaultApprover(payload.requester_employee_id)
  const { data, error } = await supabase
    .from('approval_requests')
    .insert({
      company_id: payload.company_id,
      request_type: payload.request_type,
      request_id: payload.request_id,
      requester_employee_id: payload.requester_employee_id,
      approver_employee_id: approverId,
      status: 'pending',
      comment: payload.comment || null,
    })
    .select(SELECT_APPROVAL)
    .single()
  if (error) return null

  await writeApprovalLog({
    company_id: payload.company_id,
    approval_request_id: data.id,
    actor_employee_id: payload.requester_employee_id,
    action: 'submitted',
    comment: payload.comment || null,
  })

  await writeActivityLog({
    company_id: payload.company_id,
    actor_employee_id: payload.requester_employee_id,
    action: 'submit_request',
    target_type: payload.request_type,
    target_id: payload.request_id,
    description: `${payload.request_type} submitted for approval`,
    metadata: { approval_request_id: data.id },
  })

  if (approverId) {
    await createNotification({
      company_id: payload.company_id,
      employee_id: approverId,
      title: 'New approval request',
      message: `${payload.request_type.replace(/_/g, ' ')} is waiting for your approval.`,
      type: NOTIFICATION_TYPES.approval_pending,
      link: 'approvals',
    })
  }

  return data
}

export const writeApprovalLog = async (payload) => {
  const { error } = await supabase.from('approval_logs').insert(payload)
  if (error) return null
  return true
}

export const getApprovalRequests = async (companyId, filters = {}) => {
  let query = supabase
    .from('approval_requests')
    .select(SELECT_APPROVAL)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)
  if (filters.request_type) query = query.eq('request_type', filters.request_type)
  if (filters.approver_employee_id) query = query.eq('approver_employee_id', filters.approver_employee_id)

  const { data, error } = await query
  if (error) throw error
  let rows = data || []
  if (filters.branch_id) rows = rows.filter(row => row.requester?.branch_id === filters.branch_id)
  return rows
}

const updateSourceRequest = async (approval, action, actorEmployeeId, comment) => {
  const config = REQUEST_TABLES[approval.request_type]
  if (!config) return null
  const payload = action === 'approved'
    ? config.approve(actorEmployeeId, comment)
    : action === 'rejected'
      ? config.reject(actorEmployeeId, comment)
      : config.cancel(actorEmployeeId, comment)

  const { data, error } = await supabase
    .from(config.table)
    .update(payload)
    .eq('id', approval.request_id)
    .select()
    .single()
  if (error) return null
  return data
}

export const decideApprovalRequest = async ({ approval, actorEmployeeId, status, comment }) => {
  if (!['approved', 'rejected', 'cancelled'].includes(status)) {
    throw new Error('Invalid approval status')
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('approval_requests')
    .update({
      status,
      approver_employee_id: actorEmployeeId,
      comment: comment || null,
      approved_at: status === 'approved' ? now : null,
      rejected_at: status === 'rejected' ? now : null,
    })
    .eq('id', approval.id)
    .select(SELECT_APPROVAL)
    .single()
  if (error) throw error

  await updateSourceRequest(data, status, actorEmployeeId, comment)
  await writeApprovalLog({
    company_id: data.company_id,
    approval_request_id: data.id,
    actor_employee_id: actorEmployeeId,
    action: status,
    comment,
  })
  await writeActivityLog({
    company_id: data.company_id,
    actor_employee_id: actorEmployeeId,
    action: status === 'approved' ? 'approve_request' : status === 'rejected' ? 'reject_request' : 'cancel_request',
    target_type: data.request_type,
    target_id: data.request_id,
    description: `${data.request_type} ${status}`,
    metadata: { approval_request_id: data.id, comment },
  })

  await createNotification({
    company_id: data.company_id,
    employee_id: data.requester_employee_id,
    title: status === 'approved' ? 'Request approved' : status === 'rejected' ? 'Request rejected' : 'Request cancelled',
    message: `${data.request_type.replace(/_/g, ' ')} was ${status}.`,
    type: status === 'approved' ? NOTIFICATION_TYPES.approval_approved : NOTIFICATION_TYPES.approval_rejected,
    link: data.request_type === 'leave_request' ? 'leave' : data.request_type === 'ot_request' ? 'ot' : 'approvals',
  })

  return data
}
