// src/components/leave/LeaveApprovalCard.jsx
import { useTranslation } from 'react-i18next'
import { Badge, Card } from '@/components/ui/index.jsx'
import { choose, localeOf } from '@/utils/lang'

const STATUS_COLOR = { pending: 'amber', approved: 'green', rejected: 'red', cancelled: 'gray' }
const STATUS_LABEL = {
  th: { pending: 'รออนุมัติ', approved: 'อนุมัติ', rejected: 'ไม่อนุมัติ', cancelled: 'ยกเลิก' },
  en: { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled' },
}

export default function LeaveApprovalCard({ leave: l, onApprove, onReject, t }) {
  const { i18n } = useTranslation()
  const locale = localeOf(i18n)
  const lang = i18n.language === 'en' ? 'en' : 'th'
  const statusLabel = STATUS_LABEL[lang]
  const typeName = lang === 'en'
    ? (l.leave_types?.name_en || l.leave_types?.name || '—')
    : (l.leave_types?.name || l.leave_types?.name_en || '—')

  return (
    <Card>
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
            {l.employees?.first_name?.[0]}
          </div>
          <div>
            <p className="font-bold text-slate-800">{l.employees?.first_name} {l.employees?.last_name}</p>
            <p className="text-xs text-slate-400">{l.employees?.departments?.name} · {l.employees?.positions?.name}</p>
          </div>
        </div>
        <Badge color={STATUS_COLOR[l.status]}>{statusLabel[l.status]}</Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          [t('leave.type'), typeName],
          [choose(i18n, 'ช่วงเวลา', 'Period'), `${new Date(l.start_date).toLocaleDateString(locale)} – ${new Date(l.end_date).toLocaleDateString(locale)}`],
          [choose(i18n, 'จำนวน', 'Days'), `${l.days} ${t('leave.days')}`],
          [t('leave.reason'), l.reason],
        ].map(([label, value]) => (
          <div key={label} className="bg-slate-50 rounded-xl p-2.5">
            <p className="text-xs text-slate-400 mb-0.5">{label}</p>
            <p className="text-sm font-semibold text-slate-700 truncate">{value}</p>
          </div>
        ))}
      </div>

      {l.reject_reason && (
        <p className="text-xs text-red-500 mt-2">
          {choose(i18n, 'เหตุผลที่ไม่อนุมัติ', 'Rejection reason')}: {l.reject_reason}
        </p>
      )}

      {l.status === 'pending' && (
        <div className="flex gap-2 mt-4">
          <button onClick={() => onApprove(l.id)}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors">
            ✓ {t('leave.approve')}
          </button>
          <button onClick={() => onReject(l)}
            className="flex-1 py-2.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-xl text-sm font-bold transition-colors">
            ✕ {t('leave.reject')}
          </button>
        </div>
      )}
    </Card>
  )
}
