import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, EmptyState, MobileListCard, Table } from '@/components/ui/index.jsx'
import { usePayrollImport } from '../hooks/usePayrollImport'
import { downloadPayrollTemplate } from '../utils/payrollExcel'

const money = (value) => Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function PayrollImportPanel({ companyId, employeeId, onImported, toast }) {
  const { i18n } = useTranslation()
  const inputRef = useRef(null)
  const importer = usePayrollImport({ companyId, employeeId, onImported })
  const isEn = i18n.language === 'en'
  const p = isEn ? {
    importTitle: 'Payroll Excel Import',
    importSubtitle: 'Upload .xlsx, preview and validate rows, then confirm before saving.',
    importRequired: 'Required: employee_code, pay_period, base_salary, ot_hours, deduction',
    importSuccess: 'Payroll imported successfully',
    template: 'Template',
    uploadExcel: 'Upload Excel',
    validRows: 'Valid rows',
    invalidRows: 'Invalid rows',
    missingEmployees: 'Missing employees',
    preview: 'Preview',
    previewGuard: 'Nothing is saved until Confirm Import is clicked.',
    clear: 'Clear',
    confirmImport: 'Confirm Import',
    row: 'Row',
    employee: 'Employee',
    period: 'Period',
    baseSalary: 'Base Salary',
    otHours: 'OT Hours',
    deduction: 'Deduction',
    status: 'Status',
    errors: 'Errors',
    noRows: 'No rows',
    valid: 'Valid',
    invalid: 'Invalid',
  } : {
    importTitle: 'นำเข้า Payroll จาก Excel',
    importSubtitle: 'อัปโหลดไฟล์ .xlsx เพื่อตรวจสอบและแสดงตัวอย่างก่อนบันทึก',
    importRequired: 'ต้องมี: employee_code, pay_period, base_salary, ot_hours, deduction',
    importSuccess: 'นำเข้า Payroll สำเร็จ',
    template: 'Template',
    uploadExcel: 'Upload Excel',
    validRows: 'แถวที่ถูกต้อง',
    invalidRows: 'แถวที่ผิด',
    missingEmployees: 'ไม่พบพนักงาน',
    preview: 'ตัวอย่าง',
    previewGuard: 'ระบบจะไม่บันทึกข้อมูลจนกว่าจะกด Confirm Import',
    clear: 'ล้าง',
    confirmImport: 'Confirm Import',
    row: 'แถว',
    employee: 'พนักงาน',
    period: 'รอบเงินเดือน',
    baseSalary: 'เงินเดือนพื้นฐาน',
    otHours: 'ชั่วโมง OT',
    deduction: 'รายการหัก',
    status: 'สถานะ',
    errors: 'ข้อผิดพลาด',
    noRows: 'ยังไม่มีข้อมูล',
    valid: 'ถูกต้อง',
    invalid: 'ผิด',
  }

  const handleFile = (event) => {
    const file = event.target.files?.[0]
    importer.loadFile(file)
    event.target.value = ''
  }

  const confirm = async () => {
    try {
      await importer.confirm()
      toast?.(p.importSuccess)
    } catch (e) {
      toast?.(e.message, 'error')
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-800">{p.importTitle}</p>
            <p className="text-sm text-slate-500 mt-1">{p.importSubtitle}</p>
            <p className="text-xs text-slate-400 mt-2">{p.importRequired}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={downloadPayrollTemplate}>{p.template}</Button>
            <Button onClick={() => inputRef.current?.click()} loading={importer.loading}>{p.uploadExcel}</Button>
            <input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFile} />
          </div>
        </div>
      </Card>

      {importer.error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {importer.error}
        </div>
      )}

      {importer.rows.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="bg-emerald-50">
              <p className="text-xs text-slate-500">{p.validRows}</p>
              <p className="text-2xl font-bold text-emerald-700">{importer.stats.validRows}</p>
            </Card>
            <Card className="bg-red-50">
              <p className="text-xs text-slate-500">{p.invalidRows}</p>
              <p className="text-2xl font-bold text-red-700">{importer.stats.invalidRows}</p>
            </Card>
            <Card className="bg-amber-50">
              <p className="text-xs text-slate-500">{p.missingEmployees}</p>
              <p className="text-2xl font-bold text-amber-700">{importer.stats.missingEmployees}</p>
            </Card>
          </div>

          <Card padding={false}>
            <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800">{p.preview}: {importer.fileName}</p>
                <p className="text-xs text-slate-400">{p.previewGuard}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="secondary" onClick={importer.reset}>{p.clear}</Button>
                <Button onClick={confirm} loading={importer.saving} disabled={importer.stats.validRows === 0}>
                  {p.confirmImport}
                </Button>
              </div>
            </div>
            <Table
              headers={[
                { label: p.row },
                { label: p.employee },
                { label: p.period },
                { label: p.baseSalary },
                { label: p.otHours },
                { label: p.deduction },
                { label: p.status },
                { label: p.errors },
              ]}
              empty={importer.rows.length === 0 && <EmptyState title={p.noRows} />}
              mobileCards={importer.rows.map(row => (
                <MobileListCard
                  key={row.row_number}
                  title={`${p.row} ${row.row_number}: ${row.employee_code || '-'}`}
                  subtitle={row.employee ? `${row.employee.first_name} ${row.employee.last_name}` : p.missingEmployees}
                  meta={`${p.period}: ${row.pay_period || '-'}`}
                  badge={<Badge color={row.is_valid ? 'green' : 'red'}>{row.is_valid ? p.valid : p.invalid}</Badge>}
                >
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span>{p.baseSalary}: {Number.isFinite(row.base_salary) ? money(row.base_salary) : '-'}</span>
                    <span>{p.otHours}: {Number.isFinite(row.ot_hours) ? row.ot_hours : '-'}</span>
                    <span className="col-span-2 text-red-600">{p.deduction}: {Number.isFinite(row.deduction) ? money(row.deduction) : '-'}</span>
                  </div>
                  {row.errors.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {row.errors.map(error => <Badge key={error} color="red">{error}</Badge>)}
                    </div>
                  )}
                </MobileListCard>
              ))}
            >
              {importer.rows.map(row => (
                <tr key={row.row_number} className="border-b border-slate-50 align-top">
                  <td className="py-3 px-4 text-slate-500">{row.row_number}</td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-800">{row.employee_code || '-'}</p>
                    {row.employee && <p className="text-xs text-slate-400">{row.employee.first_name} {row.employee.last_name}</p>}
                  </td>
                  <td className="py-3 px-4 text-slate-700">{row.pay_period || '-'}</td>
                  <td className="py-3 px-4 text-slate-700">{Number.isFinite(row.base_salary) ? money(row.base_salary) : '-'}</td>
                  <td className="py-3 px-4 text-slate-700">{Number.isFinite(row.ot_hours) ? row.ot_hours : '-'}</td>
                  <td className="py-3 px-4 text-red-600">{Number.isFinite(row.deduction) ? money(row.deduction) : '-'}</td>
                  <td className="py-3 px-4">
                    <Badge color={row.is_valid ? 'green' : 'red'}>{row.is_valid ? p.valid : p.invalid}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    {row.errors.length === 0
                      ? <span className="text-xs text-slate-400">-</span>
                      : <div className="flex flex-wrap gap-1">{row.errors.map(error => <Badge key={error} color="red">{error}</Badge>)}</div>
                    }
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}
    </div>
  )
}
