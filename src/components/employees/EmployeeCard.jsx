// src/components/employees/EmployeeCard.jsx
import { useTranslation } from 'react-i18next'
import { StatusBadge } from '@/components/ui/index.jsx'
import { fieldName } from '@/utils/lang'

export default function EmployeeCard({ emp, onView, onEdit, canEdit }) {
  const { i18n } = useTranslation()
  return (
    <div
      className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-all cursor-pointer group"
      onClick={() => onView(emp.id)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="relative">
          {emp.avatar_url
            ? <img src={emp.avatar_url} className="w-14 h-14 rounded-2xl object-cover" />
            : (
              <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-700 text-xl font-bold">
                {emp.first_name?.[0]}{emp.last_name?.[0]}
              </div>
            )
          }
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
            emp.status === 'active' ? 'bg-emerald-500' :
            emp.status === 'probation' ? 'bg-amber-500' :
            emp.status === 'on_leave' ? 'bg-blue-500' : 'bg-slate-300'
          }`} />
        </div>
        {canEdit && (
          <button
            onClick={e => { e.stopPropagation(); onEdit(emp) }}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all text-sm"
          >
            ✏️
          </button>
        )}
      </div>

      <p className="font-bold text-slate-800 text-sm truncate">{emp.first_name} {emp.last_name}</p>
      {(emp.first_name_en || emp.last_name_en) && (
        <p className="text-xs text-slate-400 truncate">{emp.first_name_en} {emp.last_name_en}</p>
      )}
      <p className="text-xs text-slate-500 mt-1">{fieldName(i18n, emp.positions) || '—'}</p>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>🏬</span>
          <span className="truncate">{fieldName(i18n, emp.branches) || '—'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>🗂</span>
          <span className="truncate">{fieldName(i18n, emp.departments) || '—'}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
        <span className="font-mono text-xs text-slate-400">{emp.employee_code}</span>
        <StatusBadge status={emp.status} />
      </div>
    </div>
  )
}
