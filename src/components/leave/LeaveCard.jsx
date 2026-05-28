// src/components/leave/LeaveCard.jsx
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/index.jsx'
import { localeOf } from '@/utils/lang'

const STATUS_COLOR = { pending: 'amber', approved: 'green', rejected: 'red', cancelled: 'gray' }
const STATUS_LABEL = {
  th: { pending: 'รออนุมัติ', approved: 'อนุมัติ', rejected: 'ไม่อนุมัติ', cancelled: 'ยกเลิก' },
  en: { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled' },
}

export default function LeaveCard({ leave: l, onCancel, t }) {
  const { i18n } = useTranslation()
  const locale = localeOf(i18n)
  const lang = i18n.language === 'en' ? 'en' : 'th'
  const statusLabel = STATUS_LABEL[lang]
  const typeName = lang === 'en'
    ? (l.leave_types?.name_en || l.leave_types?.name || '—')
    : (l.leave_types?.name || l.leave_types?.name_en || '—')

  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
            style={{ backgroundColor: l.leave_types?.color || '#3b82f6' }} />
          <div>
            <p className="font-semibold text-slate-800 text-sm">{typeName}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date(l.start_date).toLocaleDateString(locale)} — {new Date(l.end_date).toLocaleDateString(locale)} · {l.days} {t('leave.days')}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{l.reason}</p>
            {l.reject_reason && (
              <p className="text-xs text-red-500 mt-1">{t('leave.reason')}: {l.reject_reason}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge color={STATUS_COLOR[l.status]}>{statusLabel[l.status]}</Badge>
          {l.status === 'pending' && onCancel && (
            <button onClick={() => onCancel(l.id)}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors">
              {t('common.cancel')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
