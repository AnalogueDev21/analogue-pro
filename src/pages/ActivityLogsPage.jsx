import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import { PermissionGate } from '@/core/rbac/PermissionGate'
import { ActivityLogsTable, downloadCsv } from '@/features/activityLogs'
import { useActivityLogs } from '@/features/activityLogs/hooks/useActivityLogs'
import { Button, Card, EmptyState, Field, Input, PageHeader, SearchInput, Select } from '@/components/ui/index.jsx'
import { usePersistedState } from '@/hooks/usePersistedState'

export default function ActivityLogsPage() {
  const { t } = useTranslation()
  const { employee, can } = useAuthStore()
  const [search, setSearch] = usePersistedState('ap_activity_search', '')
  const [filters, setFilters] = usePersistedState('ap_activity_filters', { action: '', actor_employee_id: '', from: '', to: '' })
  const canViewCompanyWide = can('org.manage_company') || can('employee.view_all') || can('activity.export')
  const scopedFilters = useMemo(() => ({
    ...filters,
    branch_id: canViewCompanyWide ? '' : employee?.branch_id,
  }), [filters, canViewCompanyWide, employee?.branch_id])
  const { logs, loading, error, reload } = useActivityLogs(employee?.company_id, scopedFilters)
  const canExport = can('activity.export')

  const filtered = useMemo(() => logs.filter(log => {
    const actor = log.actor ? `${log.actor.first_name || ''} ${log.actor.last_name || ''}` : ''
    return `${log.action || ''} ${log.target_type || ''} ${log.description || ''} ${actor}`.toLowerCase().includes(search.toLowerCase())
  }), [logs, search])

  const actions = useMemo(() => [...new Set(logs.map(log => log.action).filter(Boolean))], [logs])

  return (
    <PermissionGate perms={['activity.view', 'activity.export']} fallback={<EmptyState title="No access" />}>
      <PageHeader
        title={t('activity.title')}
        subtitle={t('activity.subtitle')}
        action={
          <div className="flex gap-2">
            {canExport && <Button variant="secondary" onClick={() => downloadCsv(filtered)}>Export CSV</Button>}
            <Button variant="secondary" onClick={reload}>{t('common.refresh')}</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px_160px_160px] gap-3 mb-5">
        <SearchInput value={search} onChange={setSearch} placeholder={t('activity.search')} />
        <Select value={filters.action} onChange={e => setFilters(p => ({ ...p, action: e.target.value }))}>
          <option value="">All actions</option>
          {actions.map(action => <option key={action} value={action}>{action}</option>)}
        </Select>
        <Field>
          <Input type="date" value={filters.from} onChange={e => setFilters(p => ({ ...p, from: e.target.value }))} />
        </Field>
        <Field>
          <Input type="date" value={filters.to} onChange={e => setFilters(p => ({ ...p, to: e.target.value }))} />
        </Field>
      </div>

      {error && (
        <Card className="mb-4 bg-amber-50 border-amber-100">
          <p className="text-sm text-amber-700">{t('activity.setupHint')}</p>
        </Card>
      )}

      <Card padding={false}>
        <ActivityLogsTable logs={filtered} loading={loading} emptyTitle={t('activity.noData')} />
      </Card>
    </PermissionGate>
  )
}
