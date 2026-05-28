import { Badge, EmptyState, MobileListCard, Skeleton, Table } from '@/components/ui/index.jsx'

export default function ActivityLogsTable({ logs, loading, emptyTitle }) {
  if (loading) {
    return <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
  }

  return (
    <Table
      headers={[
        { label: 'Time' },
        { label: 'Actor' },
        { label: 'Action' },
        { label: 'Target' },
        { label: 'Description' },
      ]}
      empty={logs.length === 0 && <EmptyState icon="🧾" title={emptyTitle} />}
      mobileCards={logs.map(log => (
        <MobileListCard
          key={log.id}
          title={log.action || 'activity'}
          subtitle={log.actor ? `${log.actor.first_name || ''} ${log.actor.last_name || ''}`.trim() : 'System'}
          meta={log.created_at ? new Date(log.created_at).toLocaleString('th-TH') : '-'}
          badge={<Badge color="blue">{log.target_type || log.module || '-'}</Badge>}
        >
          <p className="text-sm text-slate-600">{log.description || '-'}</p>
          {log.target_id && <p className="text-xs text-slate-400 mt-1">{log.target_id}</p>}
        </MobileListCard>
      ))}
    >
      {logs.map(log => (
        <tr key={log.id} className="border-b border-slate-50 align-top">
          <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
            {log.created_at ? new Date(log.created_at).toLocaleString('th-TH') : '-'}
          </td>
          <td className="py-3 px-4">
            <p className="font-semibold text-slate-800">{log.actor ? `${log.actor.first_name || ''} ${log.actor.last_name || ''}`.trim() : 'System'}</p>
            <p className="text-xs text-slate-400">{log.actor?.employee_code || '-'}</p>
          </td>
          <td className="py-3 px-4"><Badge color="blue">{log.action || 'activity'}</Badge></td>
          <td className="py-3 px-4 text-sm text-slate-600">
            <p>{log.target_type || log.module || '-'}</p>
            <p className="text-xs text-slate-400">{log.target_id || '-'}</p>
          </td>
          <td className="py-3 px-4 text-sm text-slate-600">{log.description || '-'}</td>
        </tr>
      ))}
    </Table>
  )
}
