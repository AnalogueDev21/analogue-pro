// src/pages/ExecutiveDashboard.jsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import { supabase } from '@/services/supabase'
import { getBranchSalesSummary, getTeamSalesSummary, getTopEmployees, getMonthlyTrend } from '@/features/sales/services/salesService'
import { Card, PageHeader, Skeleton } from '@/components/ui/index.jsx'
import { choose, localeOf } from '@/utils/lang'

const fmtBaht = (n) => Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 0 })

function KPICard({ icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-primary-50 text-primary-700 border-l-primary-500',
    green:  'bg-emerald-50 text-emerald-700 border-l-emerald-500',
    amber:  'bg-amber-50 text-amber-700 border-l-amber-500',
    red:    'bg-red-50 text-red-700 border-l-red-500',
    violet: 'bg-violet-50 text-violet-700 border-l-violet-500',
  }
  return (
    <div className={`bg-white rounded-2xl p-5 border-l-4 shadow-sm hover:shadow-md transition-shadow ${colors[color].split(' ')[2]}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-3xl font-bold ${colors[color].split(' ')[1]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function ExecutiveDashboard() {
  const { t, i18n } = useTranslation()
  const { employee, company } = useAuthStore()
  const locale = localeOf(i18n)

  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalEmployees: 0, activeEmployees: 0,
    pendingLeave: 0, pendingOT: 0, pendingApprovals: 0,
    totalSales: 0, checkedInToday: 0, newThisMonth: 0,
  })
  const [branches, setBranches] = useState([])
  const [branchSales, setBranchSales] = useState([])
  const [teams, setTeams] = useState([])
  const [topEmps, setTopEmps] = useState([])
  const [trend, setTrend] = useState([])

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

      const [
        { count: total }, { count: active },
        { count: pendingLeave }, { count: pendingOT },
        { count: pendingApprovals }, { count: checkedIn },
        { count: newEmps },
        { data: br },
        bSales, tSales, top, tr,
      ] = await Promise.all([
        supabase.from('employees').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
        supabase.from('employees').select('id', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'active'),
        supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'pending'),
        supabase.from('ot_requests').select('id', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'pending'),
        supabase.from('approval_requests').select('id', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'pending'),
        supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('company_id', company.id).eq('date', today).not('check_in', 'is', null),
        supabase.from('employees').select('id', { count: 'exact', head: true }).eq('company_id', company.id).gte('hire_date', monthStart),
        supabase.from('branches').select('id, name, name_en, code').eq('company_id', company.id).eq('is_active', true).order('code'),
        getBranchSalesSummary(company.id, month),
        getTeamSalesSummary(company.id, month),
        getTopEmployees(company.id, month, 5),
        getMonthlyTrend(company.id, 6),
      ])

      const totalSales = bSales.reduce((s, b) => s + b.total, 0)
      setStats({ totalEmployees: total || 0, activeEmployees: active || 0, pendingLeave: pendingLeave || 0, pendingOT: pendingOT || 0, pendingApprovals: pendingApprovals || 0, checkedInToday: checkedIn || 0, newThisMonth: newEmps || 0, totalSales })
      setBranches(br || [])
      setBranchSales(bSales)
      setTeams(tSales)
      setTopEmps(top)
      setTrend(tr)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const branchSalesMap = Object.fromEntries(branchSales.map(b => [b.branch_id, b.total]))
  const maxBranchSales = Math.max(...branchSales.map(b => b.total), 1)
  const maxTrend = Math.max(...trend.map(t => t.total), 1)

  return (
    <div className="space-y-6">
      <PageHeader
        title={choose(i18n, '📊 Executive Dashboard', '📊 Executive Dashboard')}
        subtitle={choose(i18n,
          `${company?.name} · ${new Date().toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}`,
          `${company?.name_en || company?.name} · ${new Date().toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}`
        )}
      />

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard icon="👥" label={choose(i18n,'พนักงานทั้งหมด','Total Employees')} value={stats.totalEmployees} sub={`${choose(i18n,'ใช้งาน','Active')}: ${stats.activeEmployees}`} color="blue" />
            <KPICard icon="💰" label={choose(i18n,'ยอดขายเดือนนี้','Monthly Sales')} value={`฿${fmtBaht(stats.totalSales)}`} color="green" />
            <KPICard icon="🕐" label={choose(i18n,'เช็กอินวันนี้','Checked In Today')} value={stats.checkedInToday} sub={choose(i18n,'คน','employees')} color="violet" />
            <KPICard icon="⚠️" label={choose(i18n,'รออนุมัติ','Pending Approvals')} value={stats.pendingApprovals} sub={`${choose(i18n,'ลา','Leave')}: ${stats.pendingLeave} · OT: ${stats.pendingOT}`} color="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Branch Sales Comparison */}
            <Card>
              <p className="font-semibold text-slate-700 mb-4">{choose(i18n,'ยอดขายตามสาขา','Sales by Branch')}</p>
              {branches.length === 0
                ? <p className="text-sm text-slate-400 text-center py-8">{choose(i18n,'ยังไม่มีข้อมูล','No data')}</p>
                : (
                  <div className="space-y-3">
                    {branches.map(br => {
                      const sales = branchSalesMap[br.id] || 0
                      return (
                        <div key={br.id} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-slate-700">{br.name}</span>
                            <span className="font-bold text-primary-700">฿{fmtBaht(sales)}</span>
                          </div>
                          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-500 rounded-full transition-all duration-700"
                              style={{ width: `${(sales / maxBranchSales) * 100}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              }
            </Card>

            {/* Monthly Trend */}
            <Card>
              <p className="font-semibold text-slate-700 mb-4">{choose(i18n,'แนวโน้มรายเดือน','Monthly Trend')}</p>
              <div className="space-y-2">
                {trend.map(t => (
                  <div key={t.month} className="flex items-center gap-3">
                    <p className="text-xs text-slate-400 w-14 flex-shrink-0">
                      {new Date(t.month + '-01').toLocaleDateString(locale, { month: 'short' })}
                    </p>
                    <div className="flex-1 h-7 bg-slate-100 rounded-xl overflow-hidden relative">
                      <div className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-xl"
                        style={{ width: `${(t.total / maxTrend) * 100}%` }} />
                      {t.total > 0 && (
                        <span className="absolute inset-0 flex items-center px-2.5 text-xs text-white font-semibold">
                          ฿{fmtBaht(t.total)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Team Ranking */}
            <Card>
              <p className="font-semibold text-slate-700 mb-4">{choose(i18n,'อันดับทีม','Team Rankings')}</p>
              {teams.length === 0
                ? <p className="text-sm text-slate-400 text-center py-8">{choose(i18n,'ยังไม่มีข้อมูล','No data')}</p>
                : (
                  <div className="space-y-2">
                    {teams.slice(0, 5).map((team, i) => (
                      <div key={team.team_id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                        <span className="text-xl w-8">{['🥇','🥈','🥉','4️⃣','5️⃣'][i] || `${i+1}`}</span>
                        <p className="flex-1 font-medium text-slate-700 text-sm">{team.team?.name || '—'}</p>
                        <p className="font-bold text-slate-800 text-sm">฿{fmtBaht(team.total)}</p>
                      </div>
                    ))}
                  </div>
                )
              }
            </Card>

            {/* Top Employees */}
            <Card>
              <p className="font-semibold text-slate-700 mb-4">{choose(i18n,'Top พนักงานขาย','Top Sales Employees')}</p>
              {topEmps.length === 0
                ? <p className="text-sm text-slate-400 text-center py-8">{choose(i18n,'ยังไม่มีข้อมูล','No data')}</p>
                : (
                  <div className="space-y-2">
                    {topEmps.map((r, i) => (
                      <div key={r.employee_id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                        <span className="text-xl w-8">{['🥇','🥈','🥉','4️⃣','5️⃣'][i] || `${i+1}`}</span>
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold flex-shrink-0">
                          {r.employees?.first_name?.[0]}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-700 text-sm">{r.employees?.first_name} {r.employees?.last_name}</p>
                          <p className="text-xs text-slate-400">{r.employees?.branches?.name}</p>
                        </div>
                        <p className="font-bold text-slate-800 text-sm">฿{fmtBaht(r.sales_amount)}</p>
                      </div>
                    ))}
                  </div>
                )
              }
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
