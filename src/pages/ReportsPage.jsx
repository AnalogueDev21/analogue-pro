import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import { downloadCsv, getReportSnapshot, toCsv } from '@/services/reportService'
import { Badge, Button, Card, EmptyState, PageHeader, Skeleton, Table, useToast } from '@/components/ui/index.jsx'
import { usePersistedState } from '@/hooks/usePersistedState'

export default function ReportsPage() {
  const { t } = useTranslation()
  const { employee } = useAuthStore()
  const { show: toast, el: ToastEl } = useToast()
  const [period, setPeriod] = usePersistedState('ap_reports_period', new Date().toISOString().slice(0, 7))
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [period])

  const load = async () => {
    setLoading(true)
    try {
      setSnapshot(await getReportSnapshot(employee.company_id, period))
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const s = snapshot || { employees: [], attendance: [], leaves: [], ot: [], payslips: [] }
    return [
      { label: t('reports.employees'), value: s.employees.length, color: 'text-primary-700', bg: 'bg-primary-50' },
      { label: t('reports.attendance'), value: s.attendance.length, color: 'text-emerald-700', bg: 'bg-emerald-50' },
      { label: t('reports.leave'), value: s.leaves.length, color: 'text-amber-700', bg: 'bg-amber-50' },
      { label: 'OT', value: s.ot.length, color: 'text-violet-700', bg: 'bg-violet-50' },
      { label: t('reports.payslips'), value: s.payslips.length, color: 'text-slate-800', bg: 'bg-slate-50' },
    ]
  }, [snapshot])

  const exportSummary = () => {
    const rows = stats.map(s => ({ period, metric: s.label, value: s.value }))
    downloadCsv(`analogue-report-${period}.csv`, toCsv(rows))
  }

  return (
    <>
      {ToastEl}
      <PageHeader
        title={t('nav.reports')}
        subtitle={t('reports.subtitle')}
        action={<div className="flex gap-2"><input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm" /><Button onClick={exportSummary}>Export CSV</Button></div>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {stats.map(s => (
          <Card key={s.label} className={s.bg}>
            <p className={`text-3xl font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card padding={false}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="font-semibold text-slate-700">{t('reports.overview')}</p>
          <Badge color="blue">{period}</Badge>
        </div>
        {loading
          ? <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          : (
            <Table
              headers={[{ label: t('reports.category') }, { label: t('reports.count') }, { label: t('reports.note') }]}
              empty={stats.every(s => s.value === 0) && <EmptyState icon="📊" title={t('reports.noData')} />}
            >
              {stats.map(s => (
                <tr key={s.label} className="border-b border-slate-50">
                  <td className="py-3 px-4 font-semibold text-slate-800">{s.label}</td>
                  <td className="py-3 px-4">{s.value}</td>
                  <td className="py-3 px-4 text-slate-500 text-sm">{t('reports.sourceNote')}</td>
                </tr>
              ))}
            </Table>
          )}
      </Card>
    </>
  )
}
