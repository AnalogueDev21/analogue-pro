// src/components/ot/OTApprovalCard.jsx
import { useTranslation } from 'react-i18next'
import { Badge, Card } from '@/components/ui/index.jsx'
import { choose, localeOf } from '@/utils/lang'

const STATUS_COLOR = { pending: 'amber', approved: 'green', rejected: 'red', cancelled: 'gray' }
const STATUS_LABEL = {
  th: { pending: 'รออนุมัติ', approved: 'อนุมัติ', rejected: 'ไม่อนุมัติ', cancelled: 'ยกเลิก' },
  en: { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled' },
}

export default function OTApprovalCard({ ot: o, onApprove, onReject, t }) {
  const { i18n } = useTranslation()
  const locale = localeOf(i18n)
  const lang = i18n.language === 'en' ? 'en' : 'th'
  const statusLabel = STATUS_LABEL[lang]

  return (
    <Card>
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
            {o.employees?.first_name?.[0]}
          </div>
          <div>
            <p className="font-bold text-slate-800">{o.employees?.first_name} {o.employees?.last_name}</p>
            <p className="text-xs text-slate-400">{o.employees?.departments?.name} · {o.employees?.positions?.name}</p>
          </div>
        </div>
        <Badge color={STATUS_COLOR[o.status]}>{statusLabel[o.status]}</Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          [choose(i18n, 'วันที่', 'Date'), new Date(o.date).toLocaleDateString(locale)],
          [choose(i18n, 'เวลา', 'Time'), `${o.start_time} – ${o.end_time}`],
          [choose(i18n, 'จำนวน', 'Hours'), `${o.hours} ${lang === 'en' ? 'hrs' : 'ชม.'}`],
          [choose(i18n, 'ประเภท', 'Type'), o.day_type === 'holiday'
            ? (lang === 'en' ? 'Holiday (x1.5)' : 'วันหยุด (x1.5)')
            : (lang === 'en' ? 'Weekday (x1.0)' : 'วันธรรมดา (x1.0)')
          ],
        ].map(([label, value]) => (
          <div key={label} className="bg-slate-50 rounded-xl p-2.5">
            <p className="text-xs text-slate-400 mb-0.5">{label}</p>
            <p className="text-sm font-semibold text-slate-700">{value}</p>
          </div>
        ))}
      </div>

      {o.detail && <p className="text-sm text-slate-600 mt-2">{o.detail}</p>}

      {o.reject_reason && (
        <p className="text-xs text-red-500 mt-2">
          {choose(i18n, 'เหตุผลที่ไม่อนุมัติ', 'Rejection reason')}: {o.reject_reason}
        </p>
      )}

      {o.status === 'pending' && (
        <div className="flex gap-2 mt-4">
          <button onClick={() => onApprove(o.id)}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors">
            ✓ {choose(i18n, 'อนุมัติ', 'Approve')}
          </button>
          <button onClick={() => onReject(o)}
            className="flex-1 py-2.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-xl text-sm font-bold transition-colors">
            ✕ {choose(i18n, 'ไม่อนุมัติ', 'Reject')}
          </button>
        </div>
      )}
    </Card>
  )
}
