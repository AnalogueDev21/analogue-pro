// src/components/ot/OTCard.jsx
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/index.jsx'
import { localeOf } from '@/utils/lang'

const STATUS_COLOR = { pending: 'amber', approved: 'green', rejected: 'red', cancelled: 'gray' }
const STATUS_LABEL = {
  th: { pending: 'รออนุมัติ', approved: 'อนุมัติ', rejected: 'ไม่อนุมัติ', cancelled: 'ยกเลิก' },
  en: { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled' },
}

export default function OTCard({ ot: o, onCancel, t }) {
  const { i18n } = useTranslation()
  const locale = localeOf(i18n)
  const lang = i18n.language === 'en' ? 'en' : 'th'
  const statusLabel = STATUS_LABEL[lang]

  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-semibold text-slate-800 text-sm">
              {new Date(o.date).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              o.day_type === 'holiday'
                ? 'bg-violet-100 text-violet-700'
                : 'bg-slate-100 text-slate-600'
            }`}>
              {o.day_type === 'holiday'
                ? (lang === 'en' ? 'Holiday x1.5' : 'วันหยุด x1.5')
                : (lang === 'en' ? 'Weekday x1.0' : 'วันธรรมดา x1.0')
              }
            </span>
          </div>
          <p className="text-xs text-slate-400">{o.start_time} – {o.end_time} · {o.hours} {lang === 'en' ? 'hrs' : 'ชั่วโมง'}</p>
          <p className="text-xs text-slate-500 mt-0.5">{o.detail}</p>
          {o.reject_reason && (
            <p className="text-xs text-red-500 mt-1">{lang === 'en' ? 'Reason' : 'เหตุผล'}: {o.reject_reason}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge color={STATUS_COLOR[o.status]}>{statusLabel[o.status]}</Badge>
          {o.status === 'pending' && onCancel && (
            <button onClick={() => onCancel(o.id)}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors">
              {t('common.cancel')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
