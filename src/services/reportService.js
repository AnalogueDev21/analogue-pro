import { supabase } from './supabase'

const safeSelect = async (table, companyId, options = {}) => {
  let query = supabase.from(table).select(options.select || '*').eq('company_id', companyId)
  if (options.from) query = query.gte(options.dateColumn || 'date', options.from)
  if (options.to) query = query.lte(options.dateColumn || 'date', options.to)
  const { data, error } = await query
  if (error) return []
  return data || []
}

export const getReportSnapshot = async (companyId, periodMonth) => {
  const from = `${periodMonth}-01`
  const to = new Date(Number(periodMonth.slice(0, 4)), Number(periodMonth.slice(5, 7)), 0).toISOString().split('T')[0]

  const [employees, attendance, leaves, ot, payslips] = await Promise.all([
    safeSelect('employees', companyId),
    safeSelect('attendance', companyId, { from, to, dateColumn: 'date' }),
    safeSelect('leave_requests', companyId, { from, to, dateColumn: 'start_date' }),
    safeSelect('ot_requests', companyId, { from, to, dateColumn: 'date' }),
    safeSelect('payslips', companyId, { select: 'id, net_salary, period_month, is_published', from: periodMonth, to: periodMonth, dateColumn: 'period_month' }),
  ])

  return { employees, attendance, leaves, ot, payslips, from, to }
}

export const toCsv = (rows) => {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  return [headers.join(','), ...rows.map(row => headers.map(h => escape(row[h])).join(','))].join('\n')
}

export const downloadCsv = (filename, csv) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

