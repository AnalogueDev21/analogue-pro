import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import { getActivityLogs } from '@/services/activityLogService'
import { Badge, Card, EmptyState, PageHeader, SearchInput, Select, Skeleton, useToast } from '@/components/ui/index.jsx'

export default function ActivityLogsPage() {
  const { t } = useTranslation()
  const { employee } = useAuthStore()
  const { show: toast, el: ToastEl } = useToast()
  const [logs, setLogs] = useState([])
  const [module, setModule] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [module])

  const load = async () => {
    setLoading(true)
    try {
      setLogs(await getActivityLogs(employee.company_id, { module }))
    } catch (e) {
      toast(t('activity.setupHint'), 'warning')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => logs.filter(log => {
    const text = `${log.action || ''} ${log.module || ''} ${log.description || ''} ${log.employees?.first_name || ''} ${log.employees?.last_name || ''}`.toLowerCase()
    return text.includes(search.toLowerCase())
  }), [logs, search])

  return (
    <>
      {ToastEl}
      <PageHeader title={t('activity.title')} subtitle={t('activity.subtitle')} />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3 mb-5">
        <SearchInput value={search} onChange={setSearch} placeholder={t('activity.search')} />
        <Select value={module} onChange={e => setModule(e.target.value)}>
          <option value="">{t('activity.allModules')}</option>
          <option value="employee">Employee</option>
          <option value="organization">Organization</option>
          <option value="attendance">Attendance</option>
          <option value="leave">Leave</option>
          <option value="ot">OT</option>
          <option value="payroll">Payroll</option>
        </Select>
      </div>

      <Card padding={false}>
        {loading
          ? <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          : filtered.length === 0
            ? <EmptyState icon="🧾" title={t('activity.noData')} subtitle={t('activity.noDataSub')} />
            : <div className="divide-y divide-slate-50">
                {filtered.map(log => (
                  <div key={log.id} className="px-5 py-4 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">↻</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800">{log.action || 'activity'}</p>
                        <Badge color="blue">{log.module || 'system'}</Badge>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{log.description || log.details || '—'}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {log.employees ? `${log.employees.first_name} ${log.employees.last_name}` : t('activity.system')} · {log.created_at ? new Date(log.created_at).toLocaleString(t('common.loading') === 'Loading...' ? 'en-US' : 'th-TH') : '—'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>}
      </Card>
    </>
  )
}
