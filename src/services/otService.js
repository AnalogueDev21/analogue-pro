// src/services/otService.js
import { supabase } from './supabase'
import { createApprovalRequest } from '@/features/approvals/services/approvalService'
import { writeActivityLog } from '@/features/activityLogs/services/activityLogService'

const SELECT_OT = `
  *,
  employees!ot_requests_employee_id_fkey(
    id, first_name, last_name, employee_code, avatar_url, branch_id, department_id, position_id,
    departments(name), positions(name), branches(name)
  ),
  approver:employees!ot_requests_approved_by_fkey(id, first_name, last_name)
`

// ── Get My OT ─────────────────────────────────────────────────────
export const getMyOT = async (employeeId) => {
  const { data, error } = await supabase
    .from('ot_requests')
    .select(SELECT_OT)
    .eq('employee_id', employeeId)
    .order('date', { ascending: false })
  if (error) throw error
  return data || []
}

// ── Get All OT (Admin/Manager) ────────────────────────────────────
export const getAllOT = async (companyId, filters = {}) => {
  let query = supabase
    .from('ot_requests')
    .select(SELECT_OT)
    .eq('company_id', companyId)
    .order('date', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)

  const { data, error } = await query
  if (error) throw error
  let rows = data || []
  if (filters.branch_id) rows = rows.filter(row => row.employees?.branch_id === filters.branch_id)
  return rows
}

// ── Submit OT ─────────────────────────────────────────────────────
export const submitOT = async (payload) => {
  const { data, error } = await supabase
    .from('ot_requests')
    .insert(payload)
    .select(SELECT_OT)
    .single()
  if (error) throw error
  await createApprovalRequest({
    company_id: data.company_id,
    request_type: 'ot_request',
    request_id: data.id,
    requester_employee_id: data.employee_id,
  })
  return data
}

// ── Approve ───────────────────────────────────────────────────────
export const approveOT = async (id, approverId) => {
  const { data, error } = await supabase
    .from('ot_requests')
    .update({ status: 'approved', approved_by: approverId, approved_at: new Date().toISOString() })
    .eq('id', id)
    .select(SELECT_OT)
    .single()
  if (error) throw error
  await writeActivityLog({
    company_id: data.company_id,
    actor_employee_id: approverId,
    action: 'approve_request',
    target_type: 'ot_request',
    target_id: id,
    description: 'OT request approved',
  })
  return data
}

// ── Reject ────────────────────────────────────────────────────────
export const rejectOT = async (id, approverId, reason) => {
  const { data, error } = await supabase
    .from('ot_requests')
    .update({ status: 'rejected', approved_by: approverId, approved_at: new Date().toISOString(), reject_reason: reason })
    .eq('id', id)
    .select(SELECT_OT)
    .single()
  if (error) throw error
  await writeActivityLog({
    company_id: data.company_id,
    actor_employee_id: approverId,
    action: 'reject_request',
    target_type: 'ot_request',
    target_id: id,
    description: 'OT request rejected',
    metadata: { reason },
  })
  return data
}

// ── Cancel ────────────────────────────────────────────────────────
export const cancelOT = async (id) => {
  const { data, error } = await supabase
    .from('ot_requests')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select(SELECT_OT)
    .single()
  if (error) throw error
  return data
}

// ── Get Monthly Hours ─────────────────────────────────────────────
export const getMonthlyOTHours = async (employeeId, year, month) => {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const to = new Date(year, month, 0).toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('ot_requests')
    .select('hours, day_type')
    .eq('employee_id', employeeId)
    .eq('status', 'approved')
    .gte('date', from)
    .lte('date', to)
  if (error) throw error
  return {
    normal: (data || []).filter(o => o.day_type === 'normal').reduce((s, o) => s + o.hours, 0),
    holiday: (data || []).filter(o => o.day_type === 'holiday').reduce((s, o) => s + o.hours, 0),
    total: (data || []).reduce((s, o) => s + o.hours, 0),
  }
}

// ── Calc hours ────────────────────────────────────────────────────
export const calcHours = (start, end) => {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const diff = (eh * 60 + em) - (sh * 60 + sm)
  return Math.max(0, parseFloat((diff / 60).toFixed(2)))
}

// ── Auto detect day type ──────────────────────────────────────────
export const detectDayType = (dateStr) => {
  if (!dateStr) return 'normal'
  const day = new Date(dateStr).getDay()
  return (day === 0 || day === 6) ? 'holiday' : 'normal'
}
