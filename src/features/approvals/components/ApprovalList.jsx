import { Badge, Button, Card, EmptyState, Skeleton } from '@/components/ui/index.jsx'
import { approvalStatusLabel, requestTypeLabel, statusColor } from '../utils/approvalTypes'

export default function ApprovalList({ items, loading, canManage, onApprove, onReject, language = 'en' }) {
  const isTh = language === 'th'

  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
  }

  if (items.length === 0) {
    return <EmptyState icon="APP" title={isTh ? 'ไม่มีคำขอรออนุมัติ' : 'No approval requests'} />
  }

  return (
    <div className="space-y-3">
      {items.map(item => (
        <Card key={item.id}>
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-slate-800">{requestTypeLabel(item.request_type, language)}</p>
                <Badge color={statusColor(item.status)}>{approvalStatusLabel(item.status, language)}</Badge>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {item.requester ? `${item.requester.first_name || ''} ${item.requester.last_name || ''}`.trim() : isTh ? 'ไม่พบผู้ขอ' : 'Unknown requester'}
                <span className="text-slate-300"> - </span>
                {item.created_at ? new Date(item.created_at).toLocaleString(isTh ? 'th-TH' : 'en-US') : '-'}
              </p>
              <p className="text-xs text-slate-400 mt-1 break-all">{item.request_id}</p>
              {item.comment && <p className="text-sm text-slate-600 mt-2">{item.comment}</p>}
            </div>
            {canManage && item.status === 'pending' && (
              <div className="flex gap-2 lg:w-56">
                <Button className="flex-1" size="sm" onClick={() => onApprove(item)}>{isTh ? 'อนุมัติ' : 'Approve'}</Button>
                <Button className="flex-1" size="sm" variant="danger" onClick={() => onReject(item)}>{isTh ? 'ไม่อนุมัติ' : 'Reject'}</Button>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}
