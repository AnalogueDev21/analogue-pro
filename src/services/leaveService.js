// src/services/leaveService.js
import { supabase } from './supabase'

const SELECT_LEAVE = `
  *,
  employees!leave_requests_employee_id_fkey(
    id, first_name, last_name, employee_code, avatar_url,
    departments(name), positions(name), branches(name)
  ),
  leave_types(id, name, name_en, color),
  approver:employees!leave_requests_approved_by_fkey(id, first_name, last_name)
`

// ── Get Leave Types ───────────────────────────────────────────────
export const getLeaveTypes = async (companyId) => {
  const { data, error } = await supabase
    .from('leave_types')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name')
  if (error) return []
  return data || []
}

// ── Get My Leaves ─────────────────────────────────────────────────
export const getMyLeaves = async (employeeId) => {
  const { data, error } = await supabase
    .from('leave_requests')
    .select(SELECT_LEAVE)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// ── Get All Leaves (Admin/Manager) ────────────────────────────────
export const getAllLeaves = async (companyId, filters = {}) => {
  let query = supabase
    .from('leave_requests')
    .select(SELECT_LEAVE)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// ── Submit Leave ──────────────────────────────────────────────────
export const submitLeave = async (payload) => {
  const cleanPayload = {
    ...payload,
    leave_type_id: payload.leave_type_id?.startsWith?.('fallback_') ? null : payload.leave_type_id,
  }
  const { data, error } = await supabase
    .from('leave_requests')
    .insert(cleanPayload)
    .select(SELECT_LEAVE)
    .single()
  if (error) throw error
  return data
}

// ── Approve ───────────────────────────────────────────────────────
export const approveLeave = async (id, approverId) => {
  const { data, error } = await supabase
    .from('leave_requests')
    .update({ status: 'approved', approved_by: approverId, approved_at: new Date().toISOString() })
    .eq('id', id)
    .select(SELECT_LEAVE)
    .single()
  if (error) throw error
  return data
}

// ── Reject ────────────────────────────────────────────────────────
export const rejectLeave = async (id, approverId, reason) => {
  const { data, error } = await supabase
    .from('leave_requests')
    .update({ status: 'rejected', approved_by: approverId, approved_at: new Date().toISOString(), reject_reason: reason })
    .eq('id', id)
    .select(SELECT_LEAVE)
    .single()
  if (error) throw error
  return data
}

// ── Cancel ────────────────────────────────────────────────────────
export const cancelLeave = async (id) => {
  const { data, error } = await supabase
    .from('leave_requests')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select(SELECT_LEAVE)
    .single()
  if (error) throw error
  return data
}

// ── Get Balance ───────────────────────────────────────────────────
export const getLeaveBalance = async (employeeId, year) => {
  const { data, error } = await supabase
    .from('leave_balances')
    .select('*, leave_types(id, name, name_en, color, days_per_year)')
    .eq('employee_id', employeeId)
    .eq('year', year)
  if (error) throw error
  return data || []
}

// ── Calculate days ────────────────────────────────────────────────
export const calcDays = (start, end) => {
  if (!start || !end) return 0
  const s = new Date(start)
  const e = new Date(end)
  let days = 0
  const cur = new Date(s)
  while (cur <= e) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) days++
    cur.setDate(cur.getDate() + 1)
  }
  return days
}
