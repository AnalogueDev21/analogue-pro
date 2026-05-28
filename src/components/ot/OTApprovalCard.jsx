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
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
            {o.employees?.first_name?.[0]}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-800 truncate">{o.employees?.first_name} {o.employees?.last_name}</p>
            <p className="text-xs text-slate-400 truncate">{o.employees?.departments?.name} / {o.employees?.positions?.name}</p>
          </div>
        </div>
        <Badge color={STATUS_COLOR[o.status]}>{statusLabel[o.status]}</Badge>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-3">
        {[
          [choose(i18n, 'วันที่', 'Date'), new Date(o.date).toLocaleDateString(locale)],
          [choose(i18n, 'เวลา', 'Time'), `${o.start_time} - ${o.end_time}`],
          [choose(i18n, 'จำนวน', 'Hours'), `${o.hours} ${lang === 'en' ? 'hrs' : 'ชม.'}`],
          [choose(i18n, 'ประเภท', 'Type'), o.day_type === 'holiday'
            ? (lang === 'en' ? 'Holiday (x1.5)' : 'วันหยุด (x1.5)')
            : (lang === 'en' ? 'Weekday (x1.0)' : 'วันธรรมดา (x1.0)')
          ],
        ].map(([label, value]) => (
          <div key={label} className="bg-slate-50 rounded-xl p-2.5">
            <p className="text-xs text-slate-400 mb-0.5">{label}</p>
            <p className="text-sm font-semibold text-slate-700 break-words">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
        <p className="text-xs font-semibold text-slate-400 mb-1">{choose(i18n, 'เหตุผล / รายละเอียดงาน', 'Reason / Work detail')}</p>
        <p className="text-sm leading-6 text-slate-700 whitespace-pre-wrap break-words">
          {o.detail || choose(i18n, 'ไม่ได้ระบุรายละเอียด', 'No detail provided')}
        </p>
      </div>

      {o.reject_reason && (
        <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3">
          <p className="text-xs font-semibold text-red-500 mb-1">
            {choose(i18n, 'เหตุผลที่ไม่อนุมัติ', 'Rejection reason')}
          </p>
          <p className="text-sm leading-6 text-red-700 whitespace-pre-wrap break-words">{o.reject_reason}</p>
        </div>
      )}

      {o.status === 'pending' && (
        <div className="flex gap-2 mt-4">
          <button onClick={() => onApprove(o.id)}
            className="flex-1 min-h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors">
            {choose(i18n, 'อนุมัติ', 'Approve')}
          </button>
          <button onClick={() => onReject(o)}
            className="flex-1 min-h-11 border border-red-200 text-red-500 hover:bg-red-50 rounded-xl text-sm font-bold transition-colors">
            {choose(i18n, 'ไม่อนุมัติ', 'Reject')}
          </button>
        </div>
      )}
    </Card>
  )
}
