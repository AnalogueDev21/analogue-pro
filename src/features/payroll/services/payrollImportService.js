import { supabase } from '@/services/supabase'
import { writeActivityLog } from '@/features/activityLogs/services/activityLogService'
import { createNotification, NOTIFICATION_TYPES } from '@/features/notifications/services/notificationService'

export const fetchPayrollEmployees = async (companyId) => {
  const { data, error } = await supabase
    .from('employees')
    .select('id, employee_code, first_name, last_name')
    .eq('company_id', companyId)
  if (error) throw error
  return data || []
}

export const validatePayrollRows = (rows, employees) => {
  const employeeByCode = new Map(employees.map(emp => [emp.employee_code, emp]))
  const requiredNumbers = ['base_salary', 'ot_hours', 'deduction']

  return rows.map((row, index) => {
    const errors = []
    const employee = employeeByCode.get(row.employee_code)

    if (!row.employee_code) errors.push('employee_code is required')
    else if (!employee) errors.push('employee_code not found')

    if (!row.pay_period) errors.push('pay_period is required')

    requiredNumbers.forEach(field => {
      if (!Number.isFinite(row[field])) errors.push(`${field} must be a number`)
    })

    ;['ot_rate', 'ot_amount', 'allowance', 'bonus', 'tax', 'social_security'].forEach(field => {
      if (!Number.isFinite(row[field])) errors.push(`${field} must be a number`)
    })

    return {
      ...row,
      row_number: index + 2,
      employee,
      errors,
      is_valid: errors.length === 0,
    }
  })
}

export const getPayrollImportStats = (rows) => ({
  validRows: rows.filter(row => row.is_valid).length,
  invalidRows: rows.filter(row => !row.is_valid).length,
  missingEmployees: rows.filter(row => row.errors.includes('employee_code not found')).length,
})

export const confirmPayrollImport = async ({ companyId, employeeId, fileName, rows }) => {
  const validRows = rows.filter(row => row.is_valid)
  if (validRows.length === 0) throw new Error('No valid rows to import')

  const stats = getPayrollImportStats(rows)
  const { data: importRecord, error: importError } = await supabase
    .from('payroll_imports')
    .insert({
      company_id: companyId,
      imported_by: employeeId,
      file_name: fileName,
      total_rows: rows.length,
      valid_rows: stats.validRows,
      invalid_rows: stats.invalidRows,
      missing_employees: stats.missingEmployees,
      status: stats.invalidRows > 0 ? 'partial' : 'completed',
    })
    .select('*')
    .single()
  if (importError) throw importError

  const importRowsPayload = rows.map(row => ({
    import_id: importRecord.id,
    employee_code: row.employee_code,
    employee_id: row.employee?.id || null,
    pay_period: row.pay_period,
    base_salary: Number.isFinite(row.base_salary) ? row.base_salary : null,
    ot_hours: Number.isFinite(row.ot_hours) ? row.ot_hours : null,
    ot_rate: Number.isFinite(row.ot_rate) ? row.ot_rate : null,
    ot_amount: Number.isFinite(row.ot_amount) ? row.ot_amount : null,
    allowance: Number.isFinite(row.allowance) ? row.allowance : null,
    bonus: Number.isFinite(row.bonus) ? row.bonus : null,
    deduction: Number.isFinite(row.deduction) ? row.deduction : null,
    tax: Number.isFinite(row.tax) ? row.tax : null,
    social_security: Number.isFinite(row.social_security) ? row.social_security : null,
    is_valid: row.is_valid,
    errors: row.errors,
    raw_data: row.raw,
  }))

  const { error: rowsError } = await supabase
    .from('payroll_import_rows')
    .insert(importRowsPayload)
  if (rowsError) throw rowsError

  const payslipsPayload = validRows.map(row => {
    const netSalary =
      Number(row.base_salary || 0) +
      Number(row.ot_amount || 0) +
      Number(row.allowance || 0) +
      Number(row.bonus || 0) -
      Number(row.deduction || 0) -
      Number(row.tax || 0) -
      Number(row.social_security || 0)

    return {
      company_id: companyId,
      employee_id: row.employee.id,
      period_month: row.pay_period,
      base_salary: row.base_salary,
      ot_amount: row.ot_amount,
      allowance: row.allowance,
      bonus: row.bonus,
      deduction: row.deduction,
      tax: row.tax,
      social_security: row.social_security,
      net_salary: netSalary,
      is_published: false,
    }
  })

  const { data: payslips, error: payslipError } = await supabase
    .from('payslips')
    .upsert(payslipsPayload, { onConflict: 'employee_id,period_month' })
    .select('*')
  if (payslipError) throw payslipError

  await writeActivityLog({
    company_id: companyId,
    actor_employee_id: employeeId,
    action: 'import_payroll',
    target_type: 'payroll_import',
    target_id: importRecord.id,
    description: `Imported payroll file ${fileName}`,
    metadata: stats,
  })

  await Promise.all((payslips || []).map(payslip => createNotification({
    company_id: companyId,
    employee_id: payslip.employee_id,
    title: 'Payroll generated',
    message: `Payslip for ${payslip.period_month} has been generated.`,
    type: NOTIFICATION_TYPES.payroll_generated,
    link: 'payroll',
  })))

  return { importRecord, payslips: payslips || [], stats }
}
