// src/services/employeeService.js
import { supabase } from './supabase'

const SELECT_FIELDS = `
  *,
  companies(id, name, name_en),
  branches(id, name, name_en, code),
  departments(id, name, name_en),
  positions(id, name, name_en, level),
  roles(id, name, name_en, level),
  manager:manager_id(id, first_name, last_name, employee_code, avatar_url)
`

// ── Get all employees ─────────────────────────────────────────────
export const getEmployees = async (companyId, filters = {}) => {
  let query = supabase
    .from('employees')
    .select(SELECT_FIELDS)
    .eq('company_id', companyId)
    .order('employee_code')

  if (filters.status)        query = query.eq('status', filters.status)
  if (filters.branch_id)     query = query.eq('branch_id', filters.branch_id)
  if (filters.department_id) query = query.eq('department_id', filters.department_id)
  if (filters.role_id)       query = query.eq('role_id', filters.role_id)
  if (filters.employee_id)   query = query.eq('id', filters.employee_id)
  if (filters.manager_id)    query = query.eq('manager_id', filters.manager_id)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// ── Get single employee ───────────────────────────────────────────
export const getEmployee = async (id) => {
  const { data, error } = await supabase
    .from('employees')
    .select(`
      ${SELECT_FIELDS},
      employee_transfers(
        *,
        from_branch:from_branch_id(name),
        from_department:from_department_id(name),
        from_position:from_position_id(name),
        to_branch:to_branch_id(name),
        to_department:to_department_id(name),
        to_position:to_position_id(name),
        approved_by_emp:approved_by(first_name, last_name)
      )
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

// ── Create employee ───────────────────────────────────────────────
export const createEmployee = async (payload) => {
  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin
    ? await supabase.functions.invoke('create-user', { body: payload })
    : { data: null, error: null }

  // 2. Insert employee record
  const { data, error } = await supabase
    .from('employees')
    .insert(payload)
    .select(SELECT_FIELDS)
    .single()
  if (error) throw error
  return data
}

// ── Update employee ───────────────────────────────────────────────
export const updateEmployee = async (id, updates) => {
  const { data, error } = await supabase
    .from('employees')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(SELECT_FIELDS)
    .single()
  if (error) throw error
  return data
}

// ── Update status ─────────────────────────────────────────────────
export const updateEmployeeStatus = async (id, status) => {
  const updates = { status }
  if (status === 'terminated') updates.termination_date = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select(SELECT_FIELDS)
    .single()
  if (error) throw error
  return data
}

// ── Generate employee code ────────────────────────────────────────
export const generateEmployeeCode = async (companyId) => {
  const { count } = await supabase
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
  const next = (count || 0) + 1
  return `EMP-${String(next).padStart(4, '0')}`
}

// ── Upload avatar ─────────────────────────────────────────────────
export const uploadAvatar = async (employeeId, file) => {
  const ext = file.name.split('.').pop()
  const path = `avatars/${employeeId}.${ext}`
  const { error: upErr } = await supabase.storage
    .from('ap-files')
    .upload(path, file, { upsert: true })
  if (upErr) throw upErr
  const { data: { publicUrl } } = supabase.storage.from('ap-files').getPublicUrl(path)
  await supabase.from('employees').update({ avatar_url: publicUrl }).eq('id', employeeId)
  return publicUrl
}

// ── Get subordinates ──────────────────────────────────────────────
export const getSubordinates = async (managerId) => {
  const { data, error } = await supabase
    .from('employees')
    .select('id, first_name, last_name, employee_code, avatar_url, positions(name), status')
    .eq('manager_id', managerId)
  if (error) throw error
  return data || []
}
