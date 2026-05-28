import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import { getCompanyPayslips, getMyPayslips, publishPayslip, calcNetSalary } from '@/services/payrollService'
import { Badge, Button, Card, EmptyState, PageHeader, Select, Skeleton, Table, useToast } from '@/components/ui/index.jsx'
import { PayrollImportPanel, exportPayrollRows, exportSinglePayslip } from '@/features/payroll'
import { writeActivityLog } from '@/features/activityLogs/services/activityLogService'
import { usePersistedState } from '@/hooks/usePersistedState'

export default function PayrollPage({ initialTab = 'my' }) {
  const { t, i18n } = useTranslation()
  const { employee, can } = useAuthStore()
  const { show: toast, el: ToastEl } = useToast()
  const [tab, setTab] = usePersistedState('ap_payroll_tab', initialTab)
  const [period, setPeriod] = usePersistedState('ap_payroll_period', new Date().toISOString().slice(0, 7))
  const [myPayslips, setMyPayslips] = useState([])
  const [allPayslips, setAllPayslips] = useState([])
  const [loading, setLoading] = useState(true)

  const canManage = can('payroll.manage') || can('payroll.view_all')
  const canImport = can('payroll.import') || can('payroll.manage')
  const canExport = can('payroll.export') || can('payroll.manage')
  const canViewCompanyWide = can('org.manage_company') || can('payroll.manage')
  const payrollUi = i18n.language === 'en'
    ? { importTab: 'Import', exportPayroll: 'Export Payroll', generatePayslip: 'Generate Payslip' }
    : { importTab: 'นำเข้า', exportPayroll: 'ส่งออก Payroll', generatePayslip: 'สร้าง Payslip' }

  useEffect(() => {
    if (initialTab === 'import') setTab('import')
  }, [initialTab])

  useEffect(() => { load() }, [period])

  const load = async () => {
    setLoading(true)
    try {
      const [mine, all] = await Promise.all([
        getMyPayslips(employee.id),
        canManage ? getCompanyPayslips(employee.company_id, period, canViewCompanyWide ? {} : { branch_id: employee.branch_id }) : Promise.resolve([]),
      ])
      setMyPayslips(mine)
      setAllPayslips(all)
    } catch (e) {
      toast(t('payroll.setupHint'), 'warning')
      setMyPayslips([])
      setAllPayslips([])
    } finally {
      setLoading(false)
    }
  }

  const togglePublish = async (row) => {
    try {
      const next = await publishPayslip(row.id, !row.is_published)
      setAllPayslips(p => p.map(x => x.id === row.id ? next : x))
      toast(next.is_published ? t('payroll.publishedToast') : t('payroll.unpublishedToast'))
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const handleImported = () => {
    setTab('all')
    load()
  }

  const handleExport = async () => {
    await exportPayrollRows(rows, `payroll-${period}.xlsx`)
    await writeActivityLog({
      company_id: employee.company_id,
      actor_employee_id: employee.id,
      action: 'export_payroll',
      target_type: 'payroll',
      target_id: period,
      description: `Exported payroll for ${period}`,
      metadata: { rows: rows.length },
    })
  }

  const rows = tab === 'my' ? myPayslips.filter(p => p.is_published || canManage) : allPayslips
  const totalNet = allPayslips.reduce((sum, row) => sum + Number(row.net_salary ?? calcNetSalary(row)), 0)
  const locale = i18n.language === 'en' ? 'en-US' : 'th-TH'
  const money = (value) => Number(value || 0).toLocaleString(locale, { style: 'currency', currency: 'THB' })

  return (
    <>
      {ToastEl}
      <PageHeader
        title={t('nav.payroll')}
        subtitle={t('payroll.subtitle')}
        action={(canManage || canExport) && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canManage && (
              <input
                type="month"
                value={period}
                onChange={e => setPeriod(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm"
              />
            )}
            {canExport && <Button variant="secondary" onClick={handleExport}>{payrollUi.exportPayroll}</Button>}
            {canManage && <Button variant="secondary" onClick={load}>{t('common.refresh')}</Button>}
          </div>
        )}
      />

      {canManage && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <Card className="bg-primary-50"><p className="text-xs text-slate-500">{t('payroll.period')}</p><p className="text-2xl font-bold text-primary-700">{period}</p></Card>
          <Card className="bg-emerald-50"><p className="text-xs text-slate-500">{t('payroll.publishedCount')}</p><p className="text-2xl font-bold text-emerald-700">{allPayslips.filter(p => p.is_published).length}</p></Card>
          <Card className="bg-slate-50"><p className="text-xs text-slate-500">{t('payroll.totalNet')}</p><p className="text-2xl font-bold text-slate-800">{money(totalNet)}</p></Card>
        </div>
      )}

      <div className="flex gap-1 bg-white border border-slate-100 rounded-2xl p-1 mb-5 w-fit">
        <button onClick={() => setTab('my')} className={`px-4 py-2 rounded-xl text-sm font-medium ${tab === 'my' ? 'bg-primary-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{t('payroll.myPayslips')}</button>
        {canManage && <button onClick={() => setTab('all')} className={`px-4 py-2 rounded-xl text-sm font-medium ${tab === 'all' ? 'bg-primary-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{t('payroll.manage')}</button>}
        {canImport && <button onClick={() => setTab('import')} className={`px-4 py-2 rounded-xl text-sm font-medium ${tab === 'import' ? 'bg-primary-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{payrollUi.importTab}</button>}
      </div>

      {tab === 'import' && canImport ? (
        <PayrollImportPanel
          companyId={employee.company_id}
          employeeId={employee.id}
          onImported={handleImported}
          toast={toast}
        />
      ) : (

      <Card padding={false}>
        <Table
          loading={loading}
          headers={[
            { label: tab === 'my' ? t('payroll.period') : t('payroll.employee') },
            { label: t('payroll.grossSalary') },
            { label: t('payroll.deductions') },
            { label: t('payroll.netSalary') },
            { label: t('common.status') },
            ...(tab === 'all' ? [{ label: t('payroll.manageAction'), align: 'right' }] : []),
          ]}
          empty={rows.length === 0 && <EmptyState icon="💰" title={t('payroll.noData')} subtitle={t('payroll.noDataSub')} />}
        >
          {rows.map(row => {
            const gross = Number(row.base_salary || 0) + Number(row.ot_amount || 0) + Number(row.allowance || 0) + Number(row.bonus || 0)
            const deducted = Number(row.deduction || 0) + Number(row.tax || 0) + Number(row.social_security || 0)
            const net = row.net_salary ?? calcNetSalary(row)
            return (
              <tr key={row.id} className="border-b border-slate-50">
                <td className="py-3 px-4">
                  {tab === 'my'
                    ? <span className="font-semibold text-slate-800">{row.period_month}</span>
                    : <div><p className="font-semibold text-slate-800">{row.employees?.first_name} {row.employees?.last_name}</p><p className="text-xs text-slate-400">{row.employees?.employee_code}</p></div>}
                </td>
                <td className="py-3 px-4 text-slate-700">{money(gross)}</td>
                <td className="py-3 px-4 text-red-600">{money(deducted)}</td>
                <td className="py-3 px-4 font-bold text-emerald-700">{money(net)}</td>
                <td className="py-3 px-4"><Badge color={row.is_published ? 'green' : 'amber'}>{row.is_published ? t('common.published') : t('common.draft')}</Badge></td>
                {tab === 'all' && (
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => togglePublish(row)} className="text-xs text-primary-600 hover:text-primary-800 font-semibold">
                      {row.is_published ? t('common.hide') : t('common.publish')}
                    </button>
                    {canManage && (
                      <button onClick={() => exportSinglePayslip({ ...row, net_salary: net })} className="ml-3 text-xs text-emerald-600 hover:text-emerald-800 font-semibold">
                        {payrollUi.generatePayslip}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </Table>
      </Card>
      )}
    </>
  )
}
