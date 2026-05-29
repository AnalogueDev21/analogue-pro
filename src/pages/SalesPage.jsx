// src/pages/SalesPage.jsx
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import { supabase } from '@/services/supabase'
import {
  getSalesRecords, upsertSalesRecord, deleteSalesRecord,
  getTeamSalesSummary, getTopEmployees, getMonthlyTrend,
  getEmployeeTargets, upsertTarget,
} from '@/features/sales/services/salesService'
import {
  parseSalesExcel, validateSalesRows, exportSalesReport,
  exportTopEmployees, downloadSalesTemplate,
} from '@/features/sales/utils/salesExcel'
import { getEmployees } from '@/services/employeeService'
import {
  Card, PageHeader, Button, Field, Input, Select, Modal,
  ConfirmDialog, EmptyState, useToast, Skeleton, Badge, Table
} from '@/components/ui/index.jsx'
import { choose, localeOf } from '@/utils/lang'
import { usePersistedState } from '@/hooks/usePersistedState'

const fmtBaht = (n) => Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 0 })
const pct = (a, t) => t > 0 ? Math.min(100, Math.round((a / t) * 100)) : null

export default function SalesPage() {
  const { t, i18n } = useTranslation()
  const { employee, company, can } = useAuthStore()
  const { show: toast, el: ToastEl } = useToast()

  const canManage = can('sales.manage')
  const canImport = can('sales.import')
  const canExport = can('sales.export')

  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [tab, setTab]       = usePersistedState('ap_sales_tab', 'overview')
  const [month, setMonth]   = usePersistedState('ap_sales_month', defaultMonth)
  const [records, setRecords]   = useState([])
  const [teams, setTeams]       = useState([])
  const [topEmps, setTopEmps]   = useState([])
  const [trend, setTrend]       = useState([])
  const [targets, setTargets]   = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading]   = useState(true)

  // Import state
  const [importFile, setImportFile]   = useState(null)
  const [importRows, setImportRows]   = useState({ valid: [], invalid: [] })
  const [showImport, setShowImport]   = useState(false)
  const [importing, setImporting]     = useState(false)
  const fileRef = useRef()

  // Form state
  const [showForm, setShowForm]     = useState(false)
  const [editItem, setEditItem]     = useState(null)
  const [form, setForm]             = useState({ employee_id: '', sales_amount: '', item_count: '', note: '' })
  const [saving, setSaving]         = useState(false)
  const [deleteId, setDeleteId]     = useState(null)

  useEffect(() => { loadAll() }, [month])

  const loadAll = async () => {
    setLoading(true)
    try {
      const branchFilter = can('dashboard.executive') ? {} : { branch_id: employee.branch_id }
      const [recs, ts, top, tr, tgts, emps] = await Promise.all([
        getSalesRecords(company.id, month, branchFilter),
        getTeamSalesSummary(company.id, month, branchFilter.branch_id),
        getTopEmployees(company.id, month, 10, branchFilter.branch_id),
        getMonthlyTrend(company.id, 6, branchFilter.branch_id),
        getEmployeeTargets(company.id, month),
        getEmployees(company.id),
      ])
      setRecords(recs); setTeams(ts); setTopEmps(top)
      setTrend(tr); setTargets(tgts); setEmployees(emps)
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  const totalSales = records.reduce((s, r) => s + parseFloat(r.sales_amount || 0), 0)
  const targetMap = Object.fromEntries(targets.map(t => [t.employee_id, t.target_amount]))

  // ── Import ────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile(file)
    try {
      const rows = await parseSalesExcel(file)
      const result = validateSalesRows(rows, employees)
      setImportRows(result)
      setShowImport(true)
    } catch (err) { toast(err.message, 'error') }
    e.target.value = ''
  }

  const confirmImport = async () => {
    if (!importRows.valid.length) return
    setImporting(true)
    try {
      let success = 0
      for (const row of importRows.valid) {
        await upsertSalesRecord({
          company_id: company.id,
          branch_id: row.branch_id,
          employee_id: row.employee_id,
          sales_month: row.sales_month,
          sales_amount: row.sales_amount,
          item_count: row.item_count,
          note: row.note,
          source: 'import',
        }, employee.id)
        success++
      }
      toast(choose(i18n, `นำเข้าสำเร็จ ${success} รายการ ✓`, `Imported ${success} records ✓`))
      setShowImport(false)
      loadAll()
    } catch (e) { toast(e.message, 'error') }
    finally { setImporting(false) }
  }

  // ── Manual Save ───────────────────────────────────────────────
  const save = async () => {
    if (!form.employee_id) { toast(choose(i18n, 'เลือกพนักงาน', 'Select employee'), 'warning'); return }
    if (!form.sales_amount) { toast(choose(i18n, 'กรอกยอดขาย', 'Enter sales amount'), 'warning'); return }
    setSaving(true)
    try {
      const emp = employees.find(e => e.id === form.employee_id)
      await upsertSalesRecord({
        company_id: company.id,
        branch_id: emp?.branch_id || null,
        team_id: null,
        employee_id: form.employee_id,
        sales_month: month,
        sales_amount: parseFloat(form.sales_amount),
        item_count: parseInt(form.item_count) || 0,
        note: form.note,
        source: 'manual',
      }, employee.id)
      toast(choose(i18n, 'บันทึกสำเร็จ ✓', 'Saved ✓'))
      setShowForm(false)
      loadAll()
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      await deleteSalesRecord(deleteId, company.id, employee.id)
      setRecords(p => p.filter(r => r.id !== deleteId))
      toast(choose(i18n, 'ลบแล้ว', 'Deleted'), 'error')
      setDeleteId(null)
    } catch (e) { toast(e.message, 'error') }
  }

  const locale = localeOf(i18n)

  return (
    <>
      {ToastEl}
      <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />

      <PageHeader
        title={choose(i18n, 'ยอดขาย', 'Sales Performance')}
        subtitle={new Date(month + '-01').toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
        action={
          <div className="flex gap-2 flex-wrap justify-start sm:justify-end">
            {canExport && (
              <Button variant="secondary" size="sm" icon="📥"
                onClick={() => exportSalesReport(records, targets, month)}>
                Export
              </Button>
            )}
            {canImport && (
              <Button variant="secondary" size="sm" icon="📤"
                onClick={() => fileRef.current?.click()}>
                Import
              </Button>
            )}
            {canManage && (
              <Button icon="+" size="sm"
                onClick={() => { setForm({ employee_id: '', sales_amount: '', item_count: '', note: '' }); setShowForm(true) }}>
                {choose(i18n, 'เพิ่มยอดขาย', 'Add Record')}
              </Button>
            )}
          </div>
        }
      />

      {/* Month picker */}
      <div className="mb-4">
        <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-48" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-slate-100 rounded-2xl p-1 mb-5 w-fit overflow-x-auto">
        {[
          { key: 'overview', label: choose(i18n, 'ภาพรวม', 'Overview') },
          { key: 'ranking',  label: choose(i18n, 'อันดับ', 'Rankings')  },
          { key: 'records',  label: choose(i18n, 'รายการ', 'Records')   },
          { key: 'trend',    label: choose(i18n, 'แนวโน้ม', 'Trend')    },
        ].map(tab2 => (
          <button key={tab2.key} onClick={() => setTab(tab2.key)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === tab2.key ? 'bg-primary-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
            {tab2.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {tab === 'overview' && (
            <div className="space-y-5">
              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: choose(i18n, 'ยอดขายรวม', 'Total Sales'), value: `฿${fmtBaht(totalSales)}`, color: 'text-primary-700', bg: 'bg-primary-50' },
                  { label: choose(i18n, 'พนักงานที่รายงาน', 'Reported'), value: records.length, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                  { label: choose(i18n, 'ทีมทั้งหมด', 'Teams'), value: teams.length, color: 'text-violet-700', bg: 'bg-violet-50' },
                  { label: choose(i18n, 'เฉลี่ย/คน', 'Avg/Person'), value: records.length ? `฿${fmtBaht(totalSales / records.length)}` : '—', color: 'text-amber-700', bg: 'bg-amber-50' },
                ].map(({ label, value, color, bg }) => (
                  <Card key={label} className={`text-center ${bg}`}>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-slate-500 mt-1">{label}</p>
                  </Card>
                ))}
              </div>

              {/* Team Summary */}
              {teams.length > 0 && (
                <Card>
                  <p className="font-semibold text-slate-700 mb-4">{choose(i18n, 'สรุปยอดขายตามทีม', 'Sales by Team')}</p>
                  <div className="space-y-3">
                    {teams.map((team, i) => {
                      const teamTarget = 0 // team target lookup if needed
                      const teamPct = pct(team.total, teamTarget)
                      return (
                        <div key={team.team_id} className="flex items-center gap-3">
                          <span className="text-lg w-8 text-center">{['🥇','🥈','🥉'][i] || `${i+1}.`}</span>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <p className="text-sm font-semibold text-slate-700">{team.team?.name || '—'}</p>
                              <p className="text-sm font-bold text-primary-700">฿{fmtBaht(team.total)}</p>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-primary-500 rounded-full transition-all"
                                style={{ width: `${Math.min(100, (team.total / Math.max(...teams.map(t => t.total))) * 100)}%` }} />
                            </div>
                          </div>
                          <span className="text-xs text-slate-400 w-16 text-right">{team.count} คน</span>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Rankings Tab */}
          {tab === 'ranking' && (
            <Card padding={false}>
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <p className="font-semibold text-slate-700">{choose(i18n, 'อันดับพนักงาน', 'Employee Rankings')}</p>
                {canExport && (
                  <button onClick={() => exportTopEmployees(topEmps, month)}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                    📥 Export
                  </button>
                )}
              </div>
              {topEmps.length === 0
                ? <EmptyState icon="🏆" title={choose(i18n, 'ยังไม่มีข้อมูลยอดขาย', 'No sales data yet')} />
                : (
                  <div className="divide-y divide-slate-50">
                    {topEmps.map((r, i) => {
                      const target = targetMap[r.employee_id] || 0
                      const achievement = pct(r.sales_amount, target)
                      return (
                        <div key={r.employee_id} className="px-5 py-3.5 flex items-center gap-4">
                          <span className="text-2xl w-10 text-center flex-shrink-0">
                            {['🥇','🥈','🥉'][i] || <span className="text-sm text-slate-400 font-bold">{i+1}</span>}
                          </span>
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-bold flex-shrink-0">
                              {r.employees?.first_name?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{r.employees?.first_name} {r.employees?.last_name}</p>
                              <p className="text-xs text-slate-400">{r.employees?.departments?.name} · {r.employees?.positions?.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-800">฿{fmtBaht(r.sales_amount)}</p>
                            {achievement !== null && (
                              <p className={`text-xs font-medium ${achievement >= 100 ? 'text-emerald-600' : achievement >= 80 ? 'text-amber-500' : 'text-red-500'}`}>
                                {achievement}% {choose(i18n, 'บรรลุเป้า', 'achieved')}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              }
            </Card>
          )}

          {/* Records Tab */}
          {tab === 'records' && (
            <Card padding={false}>
              <Table
                headers={[
                  { label: choose(i18n, 'พนักงาน', 'Employee') },
                  { label: choose(i18n, 'สาขา', 'Branch') },
                  { label: choose(i18n, 'ยอดขาย', 'Sales') },
                  { label: choose(i18n, 'เป้าหมาย', 'Target') },
                  { label: '%' },
                  { label: '', align: 'right' },
                ]}
                empty={records.length === 0 ? <EmptyState icon="📊" title={choose(i18n, 'ยังไม่มีข้อมูล', 'No records')} /> : null}
              >
                {records.map(r => {
                  const target = targetMap[r.employee_id] || 0
                  const achievement = pct(r.sales_amount, target)
                  return (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800 text-sm">{r.employees?.first_name} {r.employees?.last_name}</p>
                        <p className="text-xs text-slate-400">{r.employees?.employee_code}</p>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">{r.branches?.name || '—'}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">฿{fmtBaht(r.sales_amount)}</td>
                      <td className="py-3 px-4 text-sm text-slate-500">{target ? `฿${fmtBaht(target)}` : '—'}</td>
                      <td className="py-3 px-4">
                        {achievement !== null ? (
                          <Badge color={achievement >= 100 ? 'green' : achievement >= 80 ? 'amber' : 'red'}>
                            {achievement}%
                          </Badge>
                        ) : <span className="text-slate-300 text-sm">—</span>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {canManage && (
                          <button onClick={() => setDeleteId(r.id)}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors">
                            {t('common.delete')}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </Table>
            </Card>
          )}

          {/* Trend Tab */}
          {tab === 'trend' && (
            <Card>
              <p className="font-semibold text-slate-700 mb-5">{choose(i18n, 'แนวโน้มยอดขาย 6 เดือน', 'Sales Trend (6 months)')}</p>
              {trend.length === 0
                ? <EmptyState icon="📈" title={choose(i18n, 'ยังไม่มีข้อมูล', 'No data')} />
                : (
                  <div className="space-y-3">
                    {(() => {
                      const max = Math.max(...trend.map(t => t.total), 1)
                      return trend.map(t => (
                        <div key={t.month} className="flex items-center gap-3">
                          <p className="text-xs text-slate-500 w-16 flex-shrink-0">
                            {new Date(t.month + '-01').toLocaleDateString(locale, { month: 'short', year: '2-digit' })}
                          </p>
                          <div className="flex-1 h-8 bg-slate-100 rounded-xl overflow-hidden relative">
                            <div className="h-full bg-primary-500 rounded-xl transition-all duration-500 flex items-center px-3"
                              style={{ width: `${(t.total / max) * 100}%` }}>
                              {t.total > 0 && (
                                <span className="text-xs text-white font-semibold whitespace-nowrap">฿{fmtBaht(t.total)}</span>
                              )}
                            </div>
                            {t.total === 0 && (
                              <span className="absolute inset-0 flex items-center px-3 text-xs text-slate-400">
                                {choose(i18n, 'ไม่มีข้อมูล', 'No data')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                )
              }
            </Card>
          )}
        </>
      )}

      {/* Import Preview Modal */}
      {showImport && (
        <Modal title={choose(i18n, 'ตรวจสอบก่อนนำเข้า', 'Preview Import')} onClose={() => setShowImport(false)} size="xl">
          <div className="space-y-3 mb-4">
            <div className="flex gap-3">
              <div className="flex-1 bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">{importRows.valid.length}</p>
                <p className="text-xs text-emerald-600">{choose(i18n, 'แถวที่ถูกต้อง', 'Valid rows')}</p>
              </div>
              <div className="flex-1 bg-red-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{importRows.invalid.length}</p>
                <p className="text-xs text-red-500">{choose(i18n, 'แถวที่มีปัญหา', 'Invalid rows')}</p>
              </div>
            </div>

            {importRows.invalid.length > 0 && (
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-red-600 mb-2">{choose(i18n, 'แถวที่มีปัญหา:', 'Problem rows:')}</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {importRows.invalid.map((r, i) => (
                    <p key={i} className="text-xs text-red-500">แถว {r.rowIndex}: {r.employee_code} — {r.errors.join(', ')}</p>
                  ))}
                </div>
              </div>
            )}

            {importRows.valid.length > 0 && (
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left p-2">รหัส</th>
                      <th className="text-left p-2">ชื่อ</th>
                      <th className="text-left p-2">เดือน</th>
                      <th className="text-right p-2">ยอดขาย</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.valid.map((r, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="p-2">{r.employee_code}</td>
                        <td className="p-2">{r.employee_name}</td>
                        <td className="p-2">{r.sales_month}</td>
                        <td className="p-2 text-right font-semibold">฿{fmtBaht(r.sales_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowImport(false)}>{t('common.cancel')}</Button>
            <Button className="flex-1" loading={importing} onClick={confirmImport}
              disabled={importRows.valid.length === 0}>
              {choose(i18n, `นำเข้า ${importRows.valid.length} รายการ`, `Import ${importRows.valid.length} records`)}
            </Button>
          </div>
        </Modal>
      )}

      {/* Add Record Modal */}
      {showForm && (
        <Modal title={choose(i18n, 'เพิ่มยอดขาย', 'Add Sales Record')} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <Field label={choose(i18n, 'พนักงาน', 'Employee')} required>
              <Select value={form.employee_id} onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))}>
                <option value="">— {choose(i18n, 'เลือกพนักงาน', 'Select employee')} —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_code})</option>)}
              </Select>
            </Field>
            <Field label={choose(i18n, 'ยอดขาย (บาท)', 'Sales Amount (THB)')} required>
              <Input type="number" value={form.sales_amount} onChange={e => setForm(p => ({ ...p, sales_amount: e.target.value }))} placeholder="0.00" />
            </Field>
            <Field label={choose(i18n, 'จำนวนรายการ', 'Item Count')}>
              <Input type="number" value={form.item_count} onChange={e => setForm(p => ({ ...p, item_count: e.target.value }))} placeholder="0" />
            </Field>
            <Field label={t('common.note') || 'หมายเหตุ'}>
              <Input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
            </Field>
          </div>
          <div className="flex gap-3 mt-5">
            <Button variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button className="flex-1" loading={saving} onClick={save}>{t('common.save')}</Button>
          </div>
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog
          title={choose(i18n, 'ลบรายการยอดขาย', 'Delete Sales Record')}
          message={choose(i18n, 'ต้องการลบรายการนี้?', 'Delete this record?')}
          onConfirm={handleDelete} onCancel={() => setDeleteId(null)} danger
        />
      )}
    </>
  )
}
