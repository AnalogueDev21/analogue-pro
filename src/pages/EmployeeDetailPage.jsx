// src/pages/EmployeeDetailPage.jsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import { supabase } from '@/services/supabase'
import { getEmployee, getSubordinates } from '@/services/employeeService'
import { getEmployeeTeamMemberships } from '@/features/teams'
import { Card, Button, Badge, StatusBadge, useToast, Skeleton } from '@/components/ui/index.jsx'
import { choose, fieldName, localeOf } from '@/utils/lang'
import { usePersistedState } from '@/hooks/usePersistedState'

const TABS = [
  { id: 'profile',   label: ['โปรไฟล์', 'Profile'], icon: '👤' },
  { id: 'org',       label: ['ข้อมูลองค์กร', 'Organization'], icon: '🏢' },
  { id: 'employment',label: ['การจ้างงาน', 'Employment'], icon: '📋' },
  { id: 'transfers', label: ['ประวัติโอนย้าย', 'Transfers'], icon: '🔄' },
  { id: 'team',      label: ['ทีม', 'Team'], icon: '👥' },
]

export default function EmployeeDetailPage({ employeeId, onBack }) {
  const { t, i18n } = useTranslation()
  const { employee: currentUser } = useAuthStore()
  const { show: toast, el: ToastEl } = useToast()
  const [emp, setEmp] = useState(null)
  const [subordinates, setSubordinates] = useState([])
  const [teamMemberships, setTeamMemberships] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = usePersistedState('ap_employee_detail_tab', 'profile')
  const locale = localeOf(i18n)

  useEffect(() => { load() }, [employeeId])

  const load = async () => {
    setLoading(true)
    try {
      const [data, subs] = await Promise.all([
        getEmployee(employeeId),
        getSubordinates(employeeId),
      ])
      const memberships = data?.company_id ? await getEmployeeTeamMemberships(data.company_id, employeeId) : []
      setEmp(data)
      setSubordinates(subs)
      setTeamMemberships(memberships)
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  const isSelf = currentUser?.id === employeeId

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-48" />
      <Skeleton className="h-64" />
    </div>
  )

  if (!emp) return (
    <div className="text-center py-20">
      <p className="text-slate-500">{choose(i18n, 'ไม่พบข้อมูลพนักงาน', 'Employee not found')}</p>
      <Button variant="secondary" className="mt-4" onClick={onBack}>{t('common.back')}</Button>
    </div>
  )

  return (
    <>
      {ToastEl}

      {/* Back */}
      <button onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-5 transition-colors">
        ← {t('common.back')} / {t('employee.title')}
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-5">
        {/* Left — Profile Card */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="text-center">
            {/* Avatar */}
            <div className="relative inline-block mb-4">
              {emp.avatar_url
                ? <img src={emp.avatar_url} className="w-24 h-24 rounded-3xl object-cover mx-auto" />
                : (
                  <div className="w-24 h-24 rounded-3xl bg-primary-100 flex items-center justify-center text-primary-700 text-3xl font-bold mx-auto">
                    {emp.first_name?.[0]}{emp.last_name?.[0]}
                  </div>
                )
              }
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
                emp.status === 'active' ? 'bg-emerald-500' :
                emp.status === 'probation' ? 'bg-amber-500' :
                emp.status === 'on_leave' ? 'bg-blue-500' : 'bg-slate-300'
              }`} />
            </div>

            <p className="font-bold text-slate-800 text-lg">{emp.first_name} {emp.last_name}</p>
            {(emp.first_name_en || emp.last_name_en) && (
              <p className="text-sm text-slate-400">{emp.first_name_en} {emp.last_name_en}</p>
            )}
            <p className="text-sm text-slate-500 mt-1">{fieldName(i18n, emp.positions)}</p>

            <div className="mt-3 flex justify-center gap-2 flex-wrap">
              <StatusBadge status={emp.status} />
              {emp.roles && <Badge color="blue">{emp.roles.name}</Badge>}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-50 space-y-2 text-left">
              {[
                { icon: '🪪', label: emp.employee_code },
                { icon: '📧', label: emp.email },
                { icon: '📞', label: emp.phone || '—' },
                { icon: '🏬', label: fieldName(i18n, emp.branches) },
                { icon: '🗂', label: fieldName(i18n, emp.departments) },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-2.5 text-sm text-slate-600">
                  <span className="text-base w-5 text-center">{icon}</span>
                  <span className="truncate">{label}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Manager */}
          {emp.manager && (
            <Card>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('employee.manager')}</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-bold flex-shrink-0">
                  {emp.manager.first_name?.[0]}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{emp.manager.first_name} {emp.manager.last_name}</p>
                  <p className="text-xs text-slate-400">{emp.manager.employee_code}</p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right — Detail Tabs */}
        <div className="lg:col-span-3">
          {/* Tabs */}
          <div className="flex gap-1 bg-white border border-slate-100 rounded-2xl p-1 mb-4 overflow-x-auto">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === t.id
                    ? 'bg-primary-700 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}>
                <span>{t.icon}</span>
                <span>{choose(i18n, t.label[0], t.label[1])}</span>
              </button>
            ))}
          </div>

          {/* Profile Tab */}
          {tab === 'profile' && (
            <Card>
              <p className="font-semibold text-slate-700 mb-4">{choose(i18n, 'ข้อมูลส่วนตัว', 'Personal Information')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {[
                  [choose(i18n, 'ชื่อ (ไทย)', 'Name (TH)'), `${emp.first_name} ${emp.last_name}`],
                  [choose(i18n, 'ชื่อ (EN)', 'Name (EN)'), `${emp.first_name_en || ''} ${emp.last_name_en || ''}`.trim() || '—'],
                  [t('employee.email'), emp.email],
                  [t('employee.phone'), emp.phone || '—'],
                  [t('employee.gender'), emp.gender ? t(`employee.genders.${emp.gender}`) : '—'],
                  [t('employee.dob'), emp.date_of_birth ? new Date(emp.date_of_birth).toLocaleDateString(locale) : '—'],
                  [t('employee.nationalId'), emp.national_id || '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Org Tab */}
          {tab === 'org' && (
            <Card>
              <p className="font-semibold text-slate-700 mb-4">{choose(i18n, 'ข้อมูลองค์กร', 'Organization')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {[
                  [t('nav.company'), fieldName(i18n, emp.companies)],
                  [t('employee.branch'), emp.branches ? `${fieldName(i18n, emp.branches)} (${emp.branches.code})` : '—'],
                  [t('employee.department'), fieldName(i18n, emp.departments)],
                  [t('employee.position'), fieldName(i18n, emp.positions)],
                  ['Role / Permission', emp.roles?.name || '—'],
                  [t('org.role.level'), emp.roles ? `Level ${emp.roles.level}` : '—'],
                  [t('employee.manager'), emp.manager ? `${emp.manager.first_name} ${emp.manager.last_name}` : '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Employment Tab */}
          {tab === 'employment' && (
            <Card>
              <p className="font-semibold text-slate-700 mb-4">{choose(i18n, 'ข้อมูลการจ้างงาน', 'Employment')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {[
                  [t('employee.employmentType'), emp.employment_type ? t(`employee.types.${emp.employment_type}`) : '—'],
                  [t('employee.status'), emp.status ? t(`employee.statuses.${emp.status}`) : '—'],
                  [t('employee.hireDate'), emp.hire_date ? new Date(emp.hire_date).toLocaleDateString(locale) : '—'],
                  [t('employee.probationEnd'), emp.probation_end_date ? new Date(emp.probation_end_date).toLocaleDateString(locale) : '—'],
                  [choose(i18n, 'วันสิ้นสุดการจ้าง', 'Termination Date'), emp.termination_date ? new Date(emp.termination_date).toLocaleDateString(locale) : '—'],
                  [choose(i18n, 'เข้าสู่ระบบล่าสุด', 'Last Login'), emp.last_login_at ? new Date(emp.last_login_at).toLocaleString(locale) : '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-slate-800">{value || '—'}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Transfers Tab */}
          {tab === 'transfers' && (
            <Card padding={false}>
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="font-semibold text-slate-700">{choose(i18n, 'ประวัติการโอนย้าย', 'Transfer History')}</p>
              </div>
              {!emp.employee_transfers?.length
                ? <div className="py-12 text-center text-slate-400 text-sm">{choose(i18n, 'ยังไม่มีประวัติการโอนย้าย', 'No transfer history yet')}</div>
                : (
                  <div className="divide-y divide-slate-50">
                    {emp.employee_transfers.map(tr => (
                      <div key={tr.id} className="px-5 py-4">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-semibold text-slate-700">
                            {new Date(tr.effective_date).toLocaleDateString(locale)}
                          </p>
                          {tr.approved_by_emp && (
                            <p className="text-xs text-slate-400">
                              {choose(i18n, 'อนุมัติโดย', 'Approved by')} {tr.approved_by_emp.first_name} {tr.approved_by_emp.last_name}
                            </p>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                          {[
                            { label: t('employee.branch'), from: tr.from_branch?.name, to: tr.to_branch?.name },
                            { label: t('employee.department'), from: tr.from_department?.name, to: tr.to_department?.name },
                            { label: t('employee.position'), from: tr.from_position?.name, to: tr.to_position?.name },
                          ].map(({ label, from, to }) => (
                            (from || to) && (
                              <div key={label}>
                                <p className="text-xs text-slate-400 mb-1">{label}</p>
                                <p className="text-slate-400 line-through text-xs">{from || '—'}</p>
                                <p className="text-slate-800 font-medium text-xs">→ {to || '—'}</p>
                              </div>
                            )
                          ))}
                        </div>
                        {tr.reason && <p className="text-xs text-slate-400 mt-2">{tr.reason}</p>}
                      </div>
                    ))}
                  </div>
                )
              }
            </Card>
          )}

          {/* Team Tab */}
          {tab === 'team' && (
            <div className="space-y-4">
              <Card padding={false}>
                <div className="px-5 py-4 border-b border-slate-100">
                  <p className="font-semibold text-slate-700">Team Membership</p>
                </div>
                {!teamMemberships.length ? (
                  <div className="py-12 text-center text-slate-400 text-sm">No team membership yet</div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {teamMemberships.map(member => {
                      const team = member.teams
                      return (
                        <div key={member.id} className="px-5 py-4">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-slate-800">{fieldName(i18n, team)}</p>
                                <Badge color={member.is_active ? 'green' : 'gray'}>{member.is_active ? 'Active' : 'Ended'}</Badge>
                                <Badge color={member.member_role === 'leader' ? 'blue' : 'gray'}>{member.member_role}</Badge>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                {fieldName(i18n, team?.branches) || '-'} / {fieldName(i18n, team?.departments) || '-'}
                              </p>
                              <p className="text-xs text-slate-400 mt-1">{member.start_date || '-'} - {member.end_date || 'Present'}</p>
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="text-xs text-slate-400">Team Target</p>
                              <p className="font-bold text-primary-700">{Number(team?.target_amount || 0).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>

              <Card padding={false}>
                <div className="px-5 py-4 border-b border-slate-100">
                  <p className="font-semibold text-slate-700">Direct Reports ({subordinates.length})</p>
                </div>
                {!subordinates.length ? (
                  <div className="py-12 text-center text-slate-400 text-sm">No direct reports</div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {subordinates.map(sub => (
                      <div key={sub.id} className="px-5 py-3.5 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-bold flex-shrink-0">
                          {sub.first_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 text-sm truncate">{sub.first_name} {sub.last_name}</p>
                          <p className="text-xs text-slate-400 truncate">{sub.positions?.name || '-'} / {sub.employee_code}</p>
                        </div>
                        <StatusBadge status={sub.status} />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {false && tab === 'team' && (
            <Card padding={false}>
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="font-semibold text-slate-700">{choose(i18n, 'ทีม', 'Team')} ({subordinates.length})</p>
              </div>
              {!subordinates.length
                ? <div className="py-12 text-center text-slate-400 text-sm">{choose(i18n, 'ไม่มีผู้ใต้บังคับบัญชา', 'No direct reports')}</div>
                : (
                  <div className="divide-y divide-slate-50">
                    {subordinates.map(sub => (
                      <div key={sub.id} className="px-5 py-3.5 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-bold flex-shrink-0">
                          {sub.first_name?.[0]}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800 text-sm">{sub.first_name} {sub.last_name}</p>
                          <p className="text-xs text-slate-400">{sub.positions?.name || '—'} · {sub.employee_code}</p>
                        </div>
                        <StatusBadge status={sub.status} />
                      </div>
                    ))}
                  </div>
                )
              }
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
