// src/features/payroll/services/payrollImportService.js
import { supabase } from '@/services/supabase'
import { logImport } from '@/features/activityLogs/services/activityLogService'
import { createNotification, NOTIFICATION_TYPES } from '@/features/notifications/services/notificationService'

export const fetchPayrollEmployees = async (companyId) => {
  const { data, error } = await supabase
    .from('employees')
    .select('id, employee_code, first_name, last_name, branch_id')
    .eq('company_id', companyId)
    .eq('status', 'active')
  if (error) throw error
  return data || []
}

export const validatePayrollRows = (rows, employees) => {
  const empMap = new Map((employees || []).map(e => [String(e.employee_code || '').trim(), e]))
  const seen = new Set()
  const numericFields = ['base_salary', 'ot_hours', 'ot_rate', 'ot_amount', 'allowance', 'bonus', 'deduction', 'tax', 'social_security']

  return rows.map((row, index) => {
    const errors = []
    const code = String(row.employee_code || '').trim()
    const period = String(row.pay_period || '').trim()
    const emp = empMap.get(code)

    // Required checks
    if (!code)            errors.push('ไม่มีรหัสพนักงาน (employee_code)')
    else if (!emp)        errors.push(`ไม่พบรหัสพนักงาน: ${code}`)

    if (!period)          errors.push('ไม่มีรอบเดือน (pay_period)')
    else if (!/^\d{4}-\d{2}$/.test(period)) errors.push('รูปแบบเดือนต้องเป็น YYYY-MM เช่น 2025-01')

    if (!Number.isFinite(row.base_salary) || row.base_salary < 0)
      errors.push('เงินเดือนพื้นฐาน (base_salary) ไม่ถูกต้อง')
    if (row.base_salary > 10_000_000)
      errors.push('เงินเดือนเกิน 10,000,000 บาท')

    // Optional numeric — just warn if NaN
    numericFields.filter(f => f !== 'base_salary').forEach(field => {
      if (!Number.isFinite(row[field])) errors.push(`${field} ไม่ใช่ตัวเลข`)
    })

    // Duplicate check
    const key = `${code}|${period}`
    if (seen.has(key)) errors.push(`ซ้ำกับแถวอื่น: ${code} เดือน ${period}`)
    seen.add(key)

    return {
      ...row,
      row_number: index + 2,
      employee: emp || null,
      employee_name: emp ? `${emp.first_name} ${emp.last_name}` : '—',
      errors,
      is_valid: errors.length === 0,
    }
  })
}

export const getPayrollImportStats = (rows) => ({
  validRows:         rows.filter(r => r.is_valid).length,
  invalidRows:       rows.filter(r => !r.is_valid).length,
  missingEmployees:  rows.filter(r => r.errors.some(e => e.includes('ไม่พบรหัส'))).length,
})

export const confirmPayrollImport = async ({ companyId, employeeId, fileName, rows }) => {
  const validRows = rows.filter(r => r.is_valid)
  if (validRows.length === 0) throw new Error('ไม่มีแถวที่ถูกต้องให้นำเข้า')

  const stats = getPayrollImportStats(rows)

  // 1. Create import record
  const { data: importRecord, error: importError } = await supabase
    .from('payroll_imports')
    .insert({
      company_id:        companyId,
      imported_by:       employeeId,
      file_name:         fileName,
      total_rows:        rows.length,
      valid_rows:        stats.validRows,
      invalid_rows:      stats.invalidRows,
      missing_employees: stats.missingEmployees,
      status:            stats.invalidRows > 0 ? 'partial' : 'completed',
    })
    .select('*')
    .single()
  if (importError) throw new Error(`สร้าง import record ไม่ได้: ${importError.message}`)

  // 2. Insert import rows log
  const importRowsPayload = rows.map(r => ({
    import_id:       importRecord.id,
    employee_code:   r.employee_code,
    employee_id:     r.employee?.id || null,
    pay_period:      r.pay_period,
    base_salary:     Number.isFinite(r.base_salary)      ? r.base_salary      : null,
    ot_hours:        Number.isFinite(r.ot_hours)          ? r.ot_hours          : null,
    ot_rate:         Number.isFinite(r.ot_rate)           ? r.ot_rate           : null,
    ot_amount:       Number.isFinite(r.ot_amount)         ? r.ot_amount         : null,
    allowance:       Number.isFinite(r.allowance)         ? r.allowance         : null,
    bonus:           Number.isFinite(r.bonus)             ? r.bonus             : null,
    deduction:       Number.isFinite(r.deduction)         ? r.deduction         : null,
    tax:             Number.isFinite(r.tax)               ? r.tax               : null,
    social_security: Number.isFinite(r.social_security)  ? r.social_security  : null,
    is_valid:        r.is_valid,
    errors:          r.errors,
    raw_data:        r.raw || {},
  }))

  const { error: rowsError } = await supabase.from('payroll_import_rows').insert(importRowsPayload)
  if (rowsError) console.warn('[PayrollImport] import_rows insert error:', rowsError.message)

  // 3. Upsert payslips
  const payslipsPayload = validRows.map(r => {
    const net =
      Number(r.base_salary   || 0) +
      Number(r.ot_amount     || 0) +
      Number(r.allowance     || 0) +
      Number(r.bonus         || 0) -
      Number(r.deduction     || 0) -
      Number(r.tax           || 0) -
      Number(r.social_security || 0)
    return {
      company_id:      companyId,
      employee_id:     r.employee.id,
      period_month:    r.pay_period,
      base_salary:     r.base_salary,
      ot_amount:       r.ot_amount    || 0,
      allowance:       r.allowance    || 0,
      bonus:           r.bonus        || 0,
      deduction:       r.deduction    || 0,
      tax:             r.tax          || 0,
      social_security: r.social_security || 0,
      net_salary:      Math.round(net * 100) / 100,
      is_published:    false,
    }
  })

  const { data: payslips, error: payslipError } = await supabase
    .from('payslips')
    .upsert(payslipsPayload, { onConflict: 'employee_id,period_month' })
    .select('*')
  if (payslipError) throw new Error(`บันทึกสลิปไม่ได้: ${payslipError.message}`)

  // 4. Activity log
  await logImport(companyId, employeeId, 'payroll', stats.validRows, fileName)

  // 5. Notifications (fire-and-forget)
  Promise.all((payslips || []).map(p =>
    createNotification({
      company_id:  companyId,
      employee_id: p.employee_id,
      title:       'สลิปเงินเดือนพร้อมแล้ว',
      message:     `สลิปเดือน ${p.period_month} ถูกสร้างแล้ว กรุณาตรวจสอบ`,
      type:        NOTIFICATION_TYPES.payroll_generated,
      link:        'payroll',
    })
  )).catch(() => {})

  return { importRecord, payslips: payslips || [], stats }
}
