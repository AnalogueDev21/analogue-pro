// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import { supabase } from '@/services/supabase'
import { countRows } from '@/services/dashboardService'
import { choose, fieldName, localeOf } from '@/utils/lang'

function StatCard({ icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   { bg: 'bg-primary-50',  icon: 'text-primary-600', val: 'text-primary-700', border: 'border-l-4 border-primary-500' },
    green:  { bg: 'bg-emerald-50',  icon: 'text-emerald-600', val: 'text-emerald-700', border: 'border-l-4 border-emerald-500' },
    amber:  { bg: 'bg-amber-50',    icon: 'text-amber-600',   val: 'text-amber-700',   border: 'border-l-4 border-amber-500'   },
    red:    { bg: 'bg-red-50',      icon: 'text-red-600',     val: 'text-red-700',     border: 'border-l-4 border-red-500'     },
    violet: { bg: 'bg-violet-50',   icon: 'text-violet-600',  val: 'text-violet-700',  border: 'border-l-4 border-violet-500'  },
  }
  const c = colors[color] || colors.blue
  return (
    <div className={`bg-white rounded-2xl p-5 ${c.border} shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <span className={`text-xl ${c.icon}`}>{icon}</span>
      </div>
      <p className={`text-3xl font-bold ${c.val}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const { employee, company, can } = useAuthStore()
  const [stats, setStats] = useState({ total: 0, active: 0, pendingLeave: 0, pendingOT: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadStats() }, [])

  const loadStats = async () => {
    try {
      const { count: total } = await supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', employee?.company_id)

      const { count: active } = await supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', employee?.company_id)
        .eq('status', 'active')

      const [pendingLeave, pendingOT] = await Promise.all([
        countRows('leave_requests', employee?.company_id, { status: 'pending' }),
        countRows('ot_requests', employee?.company_id, { status: 'pending' }),
      ])

      setStats({ total: total || 0, active: active || 0, pendingLeave, pendingOT })
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const now = new Date()
  const locale = localeOf(i18n)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          {t('auth.welcomeBack', { name: employee?.first_name })} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {now.toLocaleDateString(locale, { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="👥" label={t('dashboard.totalEmployees')} value={loading ? '—' : stats.total} color="blue" />
        <StatCard icon="✅" label={t('dashboard.activeEmployees')} value={loading ? '—' : stats.active} color="green" />
        <StatCard icon="📅" label={t('dashboard.pendingLeave')} value={loading ? '—' : stats.pendingLeave} color="amber" />
        <StatCard icon="⏱" label={t('dashboard.pendingOT')} value={loading ? '—' : stats.pendingOT} color="violet" />
      </div>

      {/* Company info card */}
      {company && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-700 text-2xl font-bold flex-shrink-0">
              {fieldName(i18n, company)?.[0]}
            </div>
            <div>
              <h3 className="font-bold text-slate-800">{fieldName(i18n, company)}</h3>
              {i18n.language !== 'en' && company.name_en && <p className="text-sm text-slate-500">{company.name_en}</p>}
              <div className="flex gap-3 mt-1">
                {company.email && <span className="text-xs text-slate-400">📧 {company.email}</span>}
                {company.phone && <span className="text-xs text-slate-400">📞 {company.phone}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* My Info */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-4">{choose(i18n, 'ข้อมูลของฉัน', 'My Information')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            [t('employee.code'), employee?.employee_code],
            [t('employee.department'), fieldName(i18n, employee?.departments)],
            [t('employee.position'), fieldName(i18n, employee?.positions)],
            [t('employee.branch'), fieldName(i18n, employee?.branches)],
          ].map(([label, value]) => (
            <div key={label} className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-0.5">{label}</p>
              <p className="text-sm font-semibold text-slate-700">{value || '—'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
