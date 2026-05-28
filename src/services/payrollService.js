import { supabase } from './supabase'

const SELECT_PAYSLIP = `
  *,
  employees(id, first_name, last_name, employee_code, avatar_url, departments(name), positions(name))
`

export const getMyPayslips = async (employeeId) => {
  const { data, error } = await supabase
    .from('payslips')
    .select(SELECT_PAYSLIP)
    .eq('employee_id', employeeId)
    .order('period_month', { ascending: false })
  if (error) throw error
  return data || []
}

export const getCompanyPayslips = async (companyId, periodMonth) => {
  let query = supabase
    .from('payslips')
    .select(SELECT_PAYSLIP)
    .eq('company_id', companyId)
    .order('period_month', { ascending: false })

  if (periodMonth) query = query.eq('period_month', periodMonth)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export const publishPayslip = async (id, isPublished) => {
  const { data, error } = await supabase
    .from('payslips')
    .update({ is_published: isPublished, published_at: isPublished ? new Date().toISOString() : null })
    .eq('id', id)
    .select(SELECT_PAYSLIP)
    .single()
  if (error) throw error
  return data
}

export const calcNetSalary = (row) => {
  const gross = Number(row.base_salary || 0) + Number(row.ot_amount || 0) + Number(row.allowance || 0) + Number(row.bonus || 0)
  const deductions = Number(row.deduction || 0) + Number(row.tax || 0) + Number(row.social_security || 0)
  return gross - deductions
}

