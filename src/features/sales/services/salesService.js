// src/features/sales/services/salesService.js
import { supabase } from '@/services/supabase'
import { writeActivityLog } from '@/features/activityLogs/services/activityLogService'

// ── Sales Records ─────────────────────────────────────────────────

export const getSalesRecords = async (companyId, month, filters = {}) => {
  let q = supabase
    .from('sales_records')
    .select(`
      *,
      branches(id, name, name_en, code),
      teams(id, name),
      employees!sales_records_employee_id_fkey(id, first_name, last_name, employee_code, avatar_url,
        departments(name), positions(name))
    `)
    .eq('company_id', companyId)
    .eq('sales_month', month)
    .order('sales_amount', { ascending: false })

  if (filters.branch_id) q = q.eq('branch_id', filters.branch_id)
  if (filters.team_id)   q = q.eq('team_id', filters.team_id)

  const { data, error } = await q
  if (error) throw error
  return data || []
}

export const upsertSalesRecord = async (payload, actorId) => {
  const { data, error } = await supabase
    .from('sales_records')
    .upsert({ ...payload, updated_at: new Date().toISOString() }, { onConflict: 'employee_id,sales_month' })
    .select()
    .single()
  if (error) throw error
  await writeActivityLog({
    company_id: payload.company_id,
    actor_employee_id: actorId,
    module: 'sales',
    action: 'upsert_record',
    target_type: 'sales_records',
    target_id: data.id,
    description: `Sales record ${payload.sales_month}`,
  })
  return data
}

export const deleteSalesRecord = async (id, companyId, actorId) => {
  const { error } = await supabase.from('sales_records').delete().eq('id', id)
  if (error) throw error
  await writeActivityLog({
    company_id: companyId,
    actor_employee_id: actorId,
    module: 'sales',
    action: 'delete_record',
    target_type: 'sales_records',
    target_id: id,
  })
}

// ── Targets ───────────────────────────────────────────────────────

export const getBranchTargets = async (companyId, month) => {
  const { data, error } = await supabase
    .from('branch_targets')
    .select('*, branches(id, name, name_en, code)')
    .eq('company_id', companyId)
    .eq('target_month', month)
  if (error) throw error
  return data || []
}

export const getTeamTargets = async (companyId, month) => {
  const { data, error } = await supabase
    .from('team_targets')
    .select('*, teams(id, name)')
    .eq('company_id', companyId)
    .eq('target_month', month)
  if (error) throw error
  return data || []
}

export const getEmployeeTargets = async (companyId, month) => {
  const { data, error } = await supabase
    .from('employee_targets')
    .select('*, employees!employee_targets_employee_id_fkey(id, first_name, last_name, employee_code)')
    .eq('company_id', companyId)
    .eq('target_month', month)
  if (error) throw error
  return data || []
}

export const upsertTarget = async (table, payload) => {
  const conflictCol = { branch_targets: 'branch_id,target_month', team_targets: 'team_id,target_month', employee_targets: 'employee_id,target_month' }[table]
  const { data, error } = await supabase
    .from(table)
    .upsert(payload, { onConflict: conflictCol })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Analytics ─────────────────────────────────────────────────────

export const getBranchSalesSummary = async (companyId, month) => {
  const { data, error } = await supabase
    .from('sales_records')
    .select('branch_id, branches(name, name_en, code), sales_amount')
    .eq('company_id', companyId)
    .eq('sales_month', month)
  if (error) throw error

  // Group by branch
  const grouped = (data || []).reduce((acc, r) => {
    const key = r.branch_id
    if (!acc[key]) acc[key] = { branch_id: key, branch: r.branches, total: 0, count: 0 }
    acc[key].total += parseFloat(r.sales_amount || 0)
    acc[key].count += 1
    return acc
  }, {})
  return Object.values(grouped).sort((a, b) => b.total - a.total)
}

export const getTeamSalesSummary = async (companyId, month, branchId = null) => {
  let q = supabase
    .from('sales_records')
    .select('team_id, teams(name), sales_amount')
    .eq('company_id', companyId)
    .eq('sales_month', month)
    .not('team_id', 'is', null)
  if (branchId) q = q.eq('branch_id', branchId)
  const { data, error } = await q
  if (error) throw error

  const grouped = (data || []).reduce((acc, r) => {
    const key = r.team_id
    if (!acc[key]) acc[key] = { team_id: key, team: r.teams, total: 0, count: 0 }
    acc[key].total += parseFloat(r.sales_amount || 0)
    acc[key].count += 1
    return acc
  }, {})
  return Object.values(grouped).sort((a, b) => b.total - a.total)
}

export const getTopEmployees = async (companyId, month, limit = 10, branchId = null) => {
  let q = supabase
    .from('sales_records')
    .select(`
      employee_id, sales_amount,
      employees!sales_records_employee_id_fkey(id, first_name, last_name, employee_code, avatar_url,
        departments(name), positions(name), branches(name))
    `)
    .eq('company_id', companyId)
    .eq('sales_month', month)
    .order('sales_amount', { ascending: false })
    .limit(limit)
  if (branchId) q = q.eq('branch_id', branchId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export const getMonthlyTrend = async (companyId, months = 6, branchId = null) => {
  const results = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    let q = supabase
      .from('sales_records')
      .select('sales_amount')
      .eq('company_id', companyId)
      .eq('sales_month', month)
    if (branchId) q = q.eq('branch_id', branchId)
    const { data } = await q
    const total = (data || []).reduce((s, r) => s + parseFloat(r.sales_amount || 0), 0)
    results.push({ month, total })
  }
  return results
}
