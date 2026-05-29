// src/features/sales/utils/salesExcel.js
import * as XLSX from 'xlsx'

// ── Import ────────────────────────────────────────────────────────

export const parseSalesExcel = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
      resolve(rows)
    } catch (err) { reject(err) }
  }
  reader.onerror = reject
  reader.readAsArrayBuffer(file)
})

export const validateSalesRows = (rows, employees) => {
  const empMap = Object.fromEntries(employees.map(e => [e.employee_code?.trim(), e]))
  const valid = []
  const invalid = []
  const seen = new Set()

  rows.forEach((row, idx) => {
    const errors = []
    const code = String(row['employee_code'] || row['รหัสพนักงาน'] || '').trim()
    const amount = parseFloat(String(row['sales_amount'] || row['ยอดขาย'] || '').replace(/,/g, ''))
    const month = String(row['sales_month'] || row['เดือน'] || '').trim()

    if (!code) errors.push('ไม่มีรหัสพนักงาน')
    if (!empMap[code]) errors.push(`ไม่พบรหัสพนักงาน: ${code}`)
    if (isNaN(amount) || amount < 0) errors.push('ยอดขายไม่ถูกต้อง')
    if (!month || !/^\d{4}-\d{2}$/.test(month)) errors.push('รูปแบบเดือนต้องเป็น YYYY-MM')
    if (seen.has(`${code}|${month}`)) errors.push('ซ้ำกับแถวอื่นในไฟล์')

    seen.add(`${code}|${month}`)

    const emp = empMap[code]
    const record = {
      rowIndex: idx + 2,
      employee_code: code,
      employee_id: emp?.id || null,
      employee_name: emp ? `${emp.first_name} ${emp.last_name}` : '—',
      branch_id: emp?.branch_id || null,
      sales_month: month,
      sales_amount: amount,
      item_count: parseInt(row['item_count'] || row['จำนวน'] || 0) || 0,
      note: String(row['note'] || row['หมายเหตุ'] || ''),
      errors,
      is_valid: errors.length === 0,
    }

    if (errors.length > 0) invalid.push(record)
    else valid.push(record)
  })

  return { valid, invalid }
}

// ── Export ────────────────────────────────────────────────────────

export const exportSalesReport = (records, targets, month, branchName = '') => {
  const data = records.map(r => ({
    'รหัสพนักงาน': r.employees?.employee_code || '',
    'ชื่อ-นามสกุล': `${r.employees?.first_name || ''} ${r.employees?.last_name || ''}`.trim(),
    'แผนก': r.employees?.departments?.name || '',
    'ตำแหน่ง': r.employees?.positions?.name || '',
    'ทีม': r.teams?.name || '',
    'สาขา': r.branches?.name || '',
    'เดือน': r.sales_month,
    'ยอดขาย (บาท)': r.sales_amount,
    'จำนวนรายการ': r.item_count || 0,
    'หมายเหตุ': r.note || '',
  }))

  // Summary sheet
  const targetMap = Object.fromEntries((targets || []).map(t => [t.employee_id, t.target_amount]))
  const summary = records.map(r => {
    const target = targetMap[r.employee_id] || 0
    const pct = target > 0 ? ((r.sales_amount / target) * 100).toFixed(1) : '—'
    return {
      'ชื่อ-นามสกุล': `${r.employees?.first_name || ''} ${r.employees?.last_name || ''}`.trim(),
      'ยอดขาย': r.sales_amount,
      'เป้าหมาย': target,
      '% บรรลุเป้า': pct,
    }
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Sales Data')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Achievement')
  XLSX.writeFile(wb, `SalesReport_${branchName}_${month}.xlsx`)
}

export const exportTopEmployees = (employees, month) => {
  const data = employees.map((r, i) => ({
    'อันดับ': i + 1,
    'รหัสพนักงาน': r.employees?.employee_code || '',
    'ชื่อ-นามสกุล': `${r.employees?.first_name || ''} ${r.employees?.last_name || ''}`.trim(),
    'สาขา': r.employees?.branches?.name || '',
    'แผนก': r.employees?.departments?.name || '',
    'ยอดขาย (บาท)': r.sales_amount,
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Top Employees')
  XLSX.writeFile(wb, `TopSales_${month}.xlsx`)
}

// ── Template ──────────────────────────────────────────────────────

export const downloadSalesTemplate = () => {
  const template = [
    { employee_code: 'EMP-0001', sales_month: '2025-01', sales_amount: 150000, item_count: 25, note: '' },
    { employee_code: 'EMP-0002', sales_month: '2025-01', sales_amount: 220000, item_count: 40, note: '' },
  ]
  const ws = XLSX.utils.json_to_sheet(template)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sales Import Template')
  XLSX.writeFile(wb, 'SalesImport_Template.xlsx')
}
