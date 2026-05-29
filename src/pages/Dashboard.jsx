// src/pages/Dashboard.jsx
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import { supabase } from '@/services/supabase'
import { choose, fieldName, localeOf } from '@/utils/lang'
import { Skeleton } from '@/components/ui/index.jsx'

function StatCard({ icon, label, value, sub, color = 'blue', loading }) {
  const colors = {
    blue:   { bg: 'bg-primary-50',  val: 'text-primary-700',  border: 'border-l-4 border-primary-500'  },
    green:  { bg: 'bg-emerald-50',  val: 'text-emerald-700',  border: 'border-l-4 border-emerald-500'  },
    amber:  { bg: 'bg-amber-50',    val: 'text-amber-700',    border: 'border-l-4 border-amber-500'    },
    red:    { bg: 'bg-red-50',      val: 'text-red-700',      border: 'border-l-4 border-red-500'      },
    violet: { bg: 'bg-violet-50',   val: 'text-violet-700',   border: 'border-l-4 border-violet-500'   },
  }
  const c = colors[color] || colors.blue
  return (
    <div className={`bg-white rounded-2xl p-4 md:p-5 ${c.border} shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs md:text-sm text-slate-500 font-medium leading-tight">{label}</p>
        <span className="text-lg md:text-xl">{icon}</span>
      </div>
      {loading
        ? <Skeleton className="h-8 w-16 mt-1" />
        : <p className={`text-2xl md:text-3xl font-bold ${c.val}`}>{value}</p>
      }
      {sub && !loading && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

function ErrorBanner({ onRetry }) {
  const { t } = useTranslation()
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-red-500">⚠️</span>
        <p className="text-sm text-red-700">{t('common.error')} — ไม่สามารถโหลดข้อมูลได้</p>
      </div>
      <button onClick={onRetry}
        className="text-xs text-red-600 hover:text-red-800 font-semibold border border-red-300 px-3 py-1.5 rounded-lg transition-colors">
        ลองใหม่
      </button>
    </div>
  )
}

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const { employee, company, can } = useAuthStore()
  const [stats, setStats] = useState({ total: 0, active: 0, pendingLeave: 0, pendingOT: 0, checkedIn: 0, newThisMonth: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const loadStats = useCallback(async () => {
    if (!employee?.company_id) return
    setLoading(true)
    setError(false)
    try {
      const today = new Date().toISOString().split('T')[0]
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

      const [
        { count: total },
        { count: active },
        { count: pendingLeave },
        { count: pendingOT },
        { count: checkedIn },
        { count: newEmps },
      ] = await Promise.all([
        supabase.from('employees').select('id', { count: 'exact', head: true }).eq('company_id', employee.company_id),
        supabase.from('employees').select('id', { count: 'exact', head: true }).eq('company_id', employee.company_id).eq('status', 'active'),
        supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('company_id', employee.company_id).eq('status', 'pending'),
        supabase.from('ot_requests').select('id', { count: 'exact', head: true }).eq('company_id', employee.company_id).eq('status', 'pending'),
        supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('company_id', employee.company_id).eq('date', today).not('check_in', 'is', null),
        supabase.from('employees').select('id', { count: 'exact', head: true }).eq('company_id', employee.company_id).gte('hire_date', monthStart),
      ])

      setStats({
        total: total || 0, active: active || 0,
        pendingLeave: pendingLeave || 0, pendingOT: pendingOT || 0,
        checkedIn: checkedIn || 0, newThisMonth: newEmps || 0,
      })
    } catch (e) {
      console.error(e)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [employee?.company_id])

  useEffect(() => { loadStats() }, [loadStats])

  const now = new Date()
  const locale = localeOf(i18n)
  const isAdmin = can('employee.view_all')

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-800">
          {t('auth.welcomeBack', { name: employee?.first_name })} 👋
        </h1>
        <p className="text-slate-500 text-xs md:text-sm mt-1">
          {now.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Error */}
      {error && <ErrorBanner onRetry={loadStats} />}

      {/* Stats — show all for admin, limited for employee */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard icon="👥" label={t('dashboard.totalEmployees')} value={stats.total} loading={loading} color="blue" />
        <StatCard icon="✅" label={t('dashboard.activeEmployees')} value={stats.active} loading={loading} color="green" />
        {isAdmin ? (
          <>
            <StatCard icon="📅" label={t('dashboard.pendingLeave')} value={stats.pendingLeave} loading={loading} color="amber" />
            <StatCard icon="⏱" label={t('dashboard.pendingOT')} value={stats.pendingOT} loading={loading} color="violet" />
          </>
        ) : (
          <>
            <StatCard icon="🕐" label={t('dashboard.checkedInToday')} value={stats.checkedIn} loading={loading} color="amber" />
            <StatCard icon="🆕" label={t('dashboard.newThisMonth')} value={stats.newThisMonth} loading={loading} color="violet" />
          </>
        )}
      </div>

      {/* Company info */}
      {company && (
        <div className="bg-white rounded-2xl p-4 md:p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-700 text-xl md:text-2xl font-bold flex-shrink-0">
              {fieldName(i18n, company)?.[0]}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-800 truncate">{fieldName(i18n, company)}</h3>
              {i18n.language !== 'en' && company.name_en && (
                <p className="text-sm text-slate-500 truncate">{company.name_en}</p>
              )}
              <div className="flex flex-wrap gap-2 md:gap-3 mt-1">
                {company.email && <span className="text-xs text-slate-400 truncate">📧 {company.email}</span>}
                {company.phone && <span className="text-xs text-slate-400">📞 {company.phone}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* My Info */}
      <div className="bg-white rounded-2xl p-4 md:p-6 border border-slate-100 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-3 md:mb-4 text-sm md:text-base">
          {choose(i18n, 'ข้อมูลของฉัน', 'My Information')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            [t('employee.code'), employee?.employee_code],
            [t('employee.department'), fieldName(i18n, employee?.departments)],
            [t('employee.position'), fieldName(i18n, employee?.positions)],
            [t('employee.branch'), fieldName(i18n, employee?.branches)],
          ].map(([label, value]) => (
            <div key={label} className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-0.5 truncate">{label}</p>
              <p className="text-sm font-semibold text-slate-700 truncate">{value || '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Admin quick stats */}
      {isAdmin && (
        <div className="bg-white rounded-2xl p-4 md:p-6 border border-slate-100 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-3 text-sm md:text-base">
            {choose(i18n, 'สถิติวันนี้', "Today's Stats")}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              {loading ? <Skeleton className="h-7 w-12 mx-auto mb-1" /> : (
                <p className="text-2xl font-bold text-emerald-700">{stats.checkedIn}</p>
              )}
              <p className="text-xs text-emerald-600">{t('dashboard.checkedInToday')}</p>
            </div>
            <div className="bg-primary-50 rounded-xl p-3 text-center">
              {loading ? <Skeleton className="h-7 w-12 mx-auto mb-1" /> : (
                <p className="text-2xl font-bold text-primary-700">{stats.newThisMonth}</p>
              )}
              <p className="text-xs text-primary-600">{t('dashboard.newThisMonth')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
