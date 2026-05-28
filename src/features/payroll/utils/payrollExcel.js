export const PAYROLL_COLUMNS = [
  'employee_code',
  'pay_period',
  'base_salary',
  'ot_hours',
  'ot_rate',
  'ot_amount',
  'allowance',
  'bonus',
  'deduction',
  'tax',
  'social_security',
]

const toKey = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '_')

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0
  const n = Number(String(value).replace(/,/g, ''))
  return Number.isFinite(n) ? n : NaN
}

const loadXlsx = async () => import('xlsx')

export const normalizePayrollRow = (row) => {
  const normalized = {}
  Object.entries(row || {}).forEach(([key, value]) => {
    normalized[toKey(key)] = typeof value === 'string' ? value.trim() : value
  })

  const otHours = toNumber(normalized.ot_hours)
  const otRate = toNumber(normalized.ot_rate)
  const explicitOtAmount = normalized.ot_amount === undefined || normalized.ot_amount === ''
    ? null
    : toNumber(normalized.ot_amount)

  return {
    employee_code: String(normalized.employee_code || '').trim(),
    pay_period: String(normalized.pay_period || normalized.period_month || '').trim(),
    base_salary: toNumber(normalized.base_salary),
    ot_hours: otHours,
    ot_rate: Number.isFinite(otRate) ? otRate : 0,
    ot_amount: explicitOtAmount === null
      ? (Number.isFinite(otHours) && Number.isFinite(otRate) ? otHours * otRate : 0)
      : explicitOtAmount,
    allowance: toNumber(normalized.allowance),
    bonus: toNumber(normalized.bonus),
    deduction: toNumber(normalized.deduction),
    tax: toNumber(normalized.tax),
    social_security: toNumber(normalized.social_security),
    raw: normalized,
  }
}

export const parsePayrollWorkbook = async (file) => {
  const XLSX = await loadXlsx()
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })
  return rows.map(normalizePayrollRow)
}

export const downloadPayrollTemplate = () => {
  return loadXlsx().then((XLSX) => {
  const worksheet = XLSX.utils.json_to_sheet([
    {
      employee_code: 'EMP-0001',
      pay_period: '2026-05',
      base_salary: 30000,
      ot_hours: 8,
      ot_rate: 150,
      ot_amount: '',
      allowance: 1000,
      bonus: 0,
      deduction: 500,
      tax: 0,
      social_security: 750,
    },
  ], { header: PAYROLL_COLUMNS })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll Import')
  XLSX.writeFile(workbook, 'payroll-import-template.xlsx')
  })
}

export const exportPayrollRows = async (rows, fileName = 'payroll-export.xlsx') => {
  const XLSX = await loadXlsx()
  const data = rows.map(row => ({
    employee_code: row.employees?.employee_code || row.employee_code || '',
    employee_name: row.employees ? `${row.employees.first_name || ''} ${row.employees.last_name || ''}`.trim() : '',
    pay_period: row.period_month || row.pay_period || '',
    base_salary: Number(row.base_salary || 0),
    ot_amount: Number(row.ot_amount || 0),
    allowance: Number(row.allowance || 0),
    bonus: Number(row.bonus || 0),
    deduction: Number(row.deduction || 0),
    tax: Number(row.tax || 0),
    social_security: Number(row.social_security || 0),
    net_salary: Number(row.net_salary || 0),
    status: row.is_published ? 'published' : 'draft',
  }))
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll')
  XLSX.writeFile(workbook, fileName)
}

export const exportSinglePayslip = (row) => {
  const employeeCode = row.employees?.employee_code || 'employee'
  return exportPayrollRows([row], `payslip-${employeeCode}-${row.period_month || 'period'}.xlsx`)
}
