// src/pages/TeamsPage.jsx
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import { supabase } from '@/services/supabase'
import {
  addTeamMember, setTeamLeader, removeTeamMember,
  TeamSummaryCard, transferTeamMember, updateTeamMemberRole,
  useTeams,
} from '@/features/teams'
import { deleteTeam } from '@/features/teams/services/teamService'
import {
  Button, Card, ConfirmDialog, EmptyState, Field, Input,
  Modal, PageHeader, SearchInput, Select, Skeleton, Textarea, useToast,
} from '@/components/ui/index.jsx'
import { choose, fieldName } from '@/utils/lang'

const EMPTY_FORM = {
  code: '', name: '', name_en: '', branch_id: '', department_id: '',
  leader_employee_id: '', target_amount: 0, description: '', status: 'active',
}

const empName = (e) => e ? `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.employee_code || '—' : '—'

export default function TeamsPage() {
  const { t, i18n } = useTranslation()
  const { company, employee, can } = useAuthStore()
  const { show: toast, el: ToastEl } = useToast()
  const canManage = can('team.manage')

  const [filters, setFilters]     = useState({ branch_id: '', department_id: '', status: 'active' })
  const [search, setSearch]       = useState('')
  const [branches, setBranches]   = useState([])
  const [departments, setDepts]   = useState([])
  const [employees, setEmployees] = useState([])
  const [showForm, setShowForm]   = useState(false)
  const [editItem, setEditItem]   = useState(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [memberEmpId, setMemberEmpId]   = useState('')
  const [memberRole, setMemberRole]     = useState('member')
  const [transferMember, setTransferMember] = useState(null)
  const [transferTeamId, setTransferTeamId] = useState('')
  const [deleteTeamId, setDeleteTeamId]     = useState(null)
  const [saving, setSaving] = useState(false)

  const { teams, loading, reload, createTeam, updateTeam } = useTeams(company?.id, filters)

  useEffect(() => { loadOptions() }, [])

  // Sync selectedTeam when teams refresh
  useEffect(() => {
    if (!selectedTeam) return
    const fresh = teams.find(t => t.id === selectedTeam.id)
    if (fresh) setSelectedTeam(fresh)
  }, [teams, selectedTeam?.id])

  const loadOptions = async () => {
    const [{ data: br }, { data: dp }, { data: em }] = await Promise.all([
      supabase.from('branches').select('id,name,name_en,code').eq('company_id', company.id).eq('is_active', true).order('code'),
      supabase.from('departments').select('id,name,name_en,branch_id').eq('company_id', company.id).eq('is_active', true).order('name'),
      supabase.from('employees')
        .select('id,employee_code,first_name,last_name,branch_id,department_id,avatar_url,positions(name),departments(name)')
        .eq('company_id', company.id).eq('status', 'active').order('employee_code'),
    ])
    setBranches(br || [])
    setDepts(dp || [])
    setEmployees(em || [])
  }

  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return teams
    return teams.filter(team =>
      [team.code, team.name, team.name_en, team.branches?.name, team.departments?.name]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    )
  }, [teams, search])

  const stats = useMemo(() => ({
    teams: teams.length,
    activeMembers: teams.reduce((s, t) => s + (t.team_members?.filter(m => m.is_active).length || 0), 0),
    leaders: teams.filter(t => t.leader_employee_id).length,
  }), [teams])

  const deptOptions   = departments.filter(d => !form.branch_id || d.branch_id === form.branch_id)
  const filterDepts   = departments.filter(d => !filters.branch_id || d.branch_id === filters.branch_id)
  const activeMembers = selectedTeam?.team_members?.filter(m => m.is_active) || []
  const inactiveMembers = selectedTeam?.team_members?.filter(m => !m.is_active) || []
  const availableEmps = employees.filter(e => !activeMembers.some(m => m.employee_id === e.id))

  // ── Create / Edit ─────────────────────────────────────────────────
  const openAdd = () => {
    setEditItem(null)
    setForm({ ...EMPTY_FORM, branch_id: filters.branch_id, department_id: filters.department_id })
    setShowForm(true)
  }

  const openEdit = (team) => {
    setEditItem(team)
    setForm({
      code: team.code || '', name: team.name || '', name_en: team.name_en || '',
      branch_id: team.branch_id || '', department_id: team.department_id || '',
      leader_employee_id: team.leader_employee_id || '',
      target_amount: team.target_amount || 0,
      description: team.description || '', status: team.status || 'active',
    })
    setShowForm(true)
  }

  const saveTeam = async () => {
    if (!form.name.trim()) { toast(choose(i18n, 'กรุณากรอกชื่อทีม', 'Team name is required'), 'warning'); return }
    setSaving(true)
    try {
      const payload = {
        company_id: company.id,
        code: form.code.trim() || null,
        name: form.name.trim(),
        name_en: form.name_en.trim() || null,
        branch_id: form.branch_id || null,
        department_id: form.department_id || null,
        leader_employee_id: form.leader_employee_id || null,
        target_amount: Number(form.target_amount || 0),
        description: form.description.trim() || null,
        status: form.status,
      }

      const saved = editItem
        ? await updateTeam(editItem.id, payload, employee.id)
        : await createTeam({ ...payload, actorEmployeeId: employee.id })

      // Auto-add leader as member if not already
      if (form.leader_employee_id) {
        const isAlreadyMember = saved.team_members?.some(m => m.is_active && m.employee_id === form.leader_employee_id)
        if (!isAlreadyMember) {
          await addTeamMember({ companyId: company.id, teamId: saved.id, employeeId: form.leader_employee_id, memberRole: 'leader', actorEmployeeId: employee.id }).catch(() => {})
        }
        await setTeamLeader({ companyId: company.id, teamId: saved.id, employeeId: form.leader_employee_id, actorEmployeeId: employee.id }).catch(() => {})
      }

      await reload()
      setShowForm(false)
      toast(editItem ? choose(i18n, 'อัปเดตทีมแล้ว ✓', 'Team updated ✓') : choose(i18n, 'สร้างทีมแล้ว ✓', 'Team created ✓'))
    } catch (err) {
      toast(err.message, 'error')
    } finally { setSaving(false) }
  }

  // ── Delete Team ───────────────────────────────────────────────────
  const handleDeleteTeam = async () => {
    if (!deleteTeamId) return
    try {
      await deleteTeam(deleteTeamId, company.id, employee.id)
      await reload()
      if (selectedTeam?.id === deleteTeamId) setSelectedTeam(null)
      toast(choose(i18n, 'ลบทีมแล้ว', 'Team deleted'), 'error')
      setDeleteTeamId(null)
    } catch (err) { toast(err.message, 'error') }
  }

  // ── Members ───────────────────────────────────────────────────────
  const handleAddMember = async () => {
    if (!selectedTeam || !memberEmpId) return
    setSaving(true)
    try {
      await addTeamMember({ companyId: company.id, teamId: selectedTeam.id, employeeId: memberEmpId, memberRole, actorEmployeeId: employee.id })
      if (memberRole === 'leader') {
        await setTeamLeader({ companyId: company.id, teamId: selectedTeam.id, employeeId: memberEmpId, actorEmployeeId: employee.id })
      }
      setMemberEmpId(''); setMemberRole('member')
      await reload()
      toast(choose(i18n, 'เพิ่มสมาชิกแล้ว ✓', 'Member added ✓'))
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  const handleRemoveMember = async (member) => {
    setSaving(true)
    try {
      await removeTeamMember({ memberId: member.id, companyId: company.id, teamId: member.team_id, actorEmployeeId: employee.id })
      await reload()
      toast(choose(i18n, 'นำสมาชิกออกแล้ว', 'Member removed'), 'warning')
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  const handleSetLeader = async (member) => {
    setSaving(true)
    try {
      await setTeamLeader({ companyId: company.id, teamId: member.team_id, employeeId: member.employee_id, actorEmployeeId: employee.id })
      await reload()
      toast(choose(i18n, 'ตั้งหัวหน้าทีมแล้ว ✓', 'Leader updated ✓'))
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  const handleRoleChange = async (member, nextRole) => {
    setSaving(true)
    try {
      await updateTeamMemberRole({ memberId: member.id, companyId: company.id, teamId: member.team_id, memberRole: nextRole, actorEmployeeId: employee.id })
      if (nextRole === 'leader') {
        await setTeamLeader({ companyId: company.id, teamId: member.team_id, employeeId: member.employee_id, actorEmployeeId: employee.id })
      }
      await reload()
      toast(choose(i18n, 'อัปเดต role แล้ว ✓', 'Role updated ✓'))
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  const handleTransfer = async () => {
    if (!transferMember || !transferTeamId) return
    setSaving(true)
    try {
      await transferTeamMember({ memberId: transferMember.id, fromTeamId: transferMember.team_id, toTeamId: transferTeamId, companyId: company.id, employeeId: transferMember.employee_id, actorEmployeeId: employee.id })
      setTransferMember(null); setTransferTeamId('')
      await reload()
      toast(choose(i18n, 'โอนย้ายทีมแล้ว ✓', 'Transfer complete ✓'))
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  return (
    <>
      {ToastEl}
      <PageHeader
        title={choose(i18n, 'จัดการทีม', 'Teams')}
        subtitle={choose(i18n, 'จัดการทีม หัวหน้าทีม สมาชิก และการโอนย้าย', 'Manage teams, leaders, and members')}
        action={canManage ? <Button icon="+" onClick={openAdd}>{choose(i18n, 'เพิ่มทีม', 'Add Team')}</Button> : null}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          [choose(i18n, 'ทีมทั้งหมด', 'Total Teams'), stats.teams, 'text-primary-700', 'bg-primary-50'],
          [choose(i18n, 'สมาชิก', 'Members'), stats.activeMembers, 'text-emerald-700', 'bg-emerald-50'],
          [choose(i18n, 'มีหัวหน้า', 'With Leader'), stats.leaders, 'text-violet-700', 'bg-violet-50'],
        ].map(([label, value, color, bg]) => (
          <Card key={label} className={`text-center ${bg}`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder={choose(i18n, 'ค้นหาทีม...', 'Search teams...')} />
          <Select value={filters.branch_id} onChange={e => setFilters(p => ({ ...p, branch_id: e.target.value, department_id: '' }))}>
            <option value="">{choose(i18n, 'ทุกสาขา', 'All branches')}</option>
            {branches.map(b => <option key={b.id} value={b.id}>{fieldName(i18n, b)}</option>)}
          </Select>
          <Select value={filters.department_id} onChange={e => setFilters(p => ({ ...p, department_id: e.target.value }))}>
            <option value="">{choose(i18n, 'ทุกแผนก', 'All departments')}</option>
            {filterDepts.map(d => <option key={d.id} value={d.id}>{fieldName(i18n, d)}</option>)}
          </Select>
        </div>
      </Card>

      {/* Teams Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : filteredTeams.length === 0 ? (
        <EmptyState icon="👥" title={choose(i18n, 'ยังไม่มีทีม', 'No teams yet')}
          subtitle={choose(i18n, 'กด + เพิ่มทีม เพื่อเริ่มต้น', 'Click + Add Team to get started')}
          action={canManage ? <Button icon="+" onClick={openAdd}>{choose(i18n, 'เพิ่มทีม', 'Add Team')}</Button> : null}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTeams.map(team => {
            const memberCount = team.team_members?.filter(m => m.is_active).length || 0
            const leader = team.leader
            return (
              <div key={team.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {/* Header */}
                <div className="bg-primary-700 px-4 py-3 flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{fieldName(i18n, team)}</p>
                    {team.code && <p className="text-primary-200 text-xs">{team.code}</p>}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ml-2 ${
                    team.status === 'active' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-500/20 text-slate-300'
                  }`}>{team.status}</span>
                </div>

                {/* Body */}
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 rounded-xl p-2.5">
                      <p className="text-xs text-slate-400">{choose(i18n, 'สมาชิก', 'Members')}</p>
                      <p className="text-lg font-bold text-slate-800">{memberCount}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5">
                      <p className="text-xs text-slate-400">{choose(i18n, 'เป้าหมาย', 'Target')}</p>
                      <p className="text-sm font-bold text-slate-800 truncate">{Number(team.target_amount || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Leader */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold flex-shrink-0">
                      {leader?.first_name?.[0] || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">{choose(i18n, 'หัวหน้า', 'Leader')}</p>
                      <p className="text-sm font-semibold text-slate-700 truncate">{empName(leader)}</p>
                    </div>
                  </div>

                  {/* Branch / Dept */}
                  <div className="text-xs text-slate-400 truncate">
                    {fieldName(i18n, team.branches) || '—'} / {fieldName(i18n, team.departments) || '—'}
                  </div>
                </div>

                {/* Actions */}
                <div className="px-4 pb-4 flex gap-2">
                  <button onClick={() => setSelectedTeam(team)}
                    className="flex-1 py-2 text-sm bg-primary-50 text-primary-700 rounded-xl font-semibold hover:bg-primary-100 transition-colors">
                    {choose(i18n, 'จัดการ', 'Manage')}
                  </button>
                  {canManage && (
                    <>
                      <button onClick={() => openEdit(team)}
                        className="px-3 py-2 text-sm bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
                        ✏️
                      </button>
                      <button onClick={() => setDeleteTeamId(team.id)}
                        className="px-3 py-2 text-sm bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors">
                        🗑
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <Modal title={editItem ? choose(i18n, 'แก้ไขทีม', 'Edit Team') : choose(i18n, 'เพิ่มทีม', 'Add Team')} onClose={() => setShowForm(false)} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={choose(i18n, 'ชื่อทีม', 'Team Name')} required>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={choose(i18n, 'ทีม 1', 'Team 1')} />
              </Field>
              <Field label={choose(i18n, 'ชื่อทีม (EN)', 'Team Name (EN)')}>
                <Input value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} placeholder="Team 1" />
              </Field>
              <Field label={choose(i18n, 'รหัสทีม', 'Team Code')}>
                <Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="T-001" />
              </Field>
              <Field label={choose(i18n, 'สถานะ', 'Status')}>
                <Select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="active">{t('common.active')}</option>
                  <option value="inactive">{t('common.inactive')}</option>
                  <option value="archived">{choose(i18n, 'เก็บถาวร', 'Archived')}</option>
                </Select>
              </Field>
              <Field label={t('employee.branch')}>
                <Select value={form.branch_id} onChange={e => setForm(p => ({ ...p, branch_id: e.target.value, department_id: '' }))}>
                  <option value="">{choose(i18n, 'เลือกสาขา', 'Select branch')}</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{fieldName(i18n, b)}</option>)}
                </Select>
              </Field>
              <Field label={t('employee.department')}>
                <Select value={form.department_id} onChange={e => setForm(p => ({ ...p, department_id: e.target.value }))}>
                  <option value="">{choose(i18n, 'เลือกแผนก', 'Select department')}</option>
                  {deptOptions.map(d => <option key={d.id} value={d.id}>{fieldName(i18n, d)}</option>)}
                </Select>
              </Field>
              <Field label={choose(i18n, 'หัวหน้าทีม', 'Team Leader')}>
                <Select value={form.leader_employee_id} onChange={e => setForm(p => ({ ...p, leader_employee_id: e.target.value }))}>
                  <option value="">{choose(i18n, 'ยังไม่กำหนด', 'Not assigned')}</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.employee_code} - {empName(e)}</option>)}
                </Select>
              </Field>
              <Field label={choose(i18n, 'เป้าหมาย (บาท)', 'Target (THB)')}>
                <Input type="number" value={form.target_amount} onChange={e => setForm(p => ({ ...p, target_amount: e.target.value }))} placeholder="0" />
              </Field>
            </div>
            <Field label={choose(i18n, 'รายละเอียด', 'Description')}>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />
            </Field>
          </div>
          <div className="flex gap-3 mt-5">
            <Button variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button className="flex-1" loading={saving} onClick={saveTeam}>{t('common.save')}</Button>
          </div>
        </Modal>
      )}

      {/* Team Detail Modal */}
      {selectedTeam && (
        <Modal title={fieldName(i18n, selectedTeam)} onClose={() => setSelectedTeam(null)} size="lg">
          <div className="space-y-5">
            {/* Team Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                [choose(i18n, 'สมาชิก Active', 'Active'), activeMembers.length, 'text-emerald-700', 'bg-emerald-50'],
                [choose(i18n, 'ออกแล้ว', 'Inactive'), inactiveMembers.length, 'text-slate-600', 'bg-slate-50'],
                [choose(i18n, 'สาขา', 'Branch'), fieldName(i18n, selectedTeam.branches) || '—', 'text-primary-700', 'bg-primary-50'],
                [choose(i18n, 'เป้าหมาย', 'Target'), Number(selectedTeam.target_amount || 0).toLocaleString(), 'text-violet-700', 'bg-violet-50'],
              ].map(([label, value, color, bg]) => (
                <div key={label} className={`rounded-2xl p-3 text-center ${bg}`}>
                  <p className={`text-lg font-bold ${color} truncate`}>{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Add Member */}
            {canManage && (
              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-sm font-semibold text-slate-700 mb-3">{choose(i18n, '+ เพิ่มสมาชิก', '+ Add Member')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
                  <Select value={memberEmpId} onChange={e => setMemberEmpId(e.target.value)}>
                    <option value="">{choose(i18n, 'เลือกพนักงาน', 'Select employee')}</option>
                    {availableEmps.map(e => <option key={e.id} value={e.id}>{e.employee_code} — {empName(e)}</option>)}
                  </Select>
                  <Select value={memberRole} onChange={e => setMemberRole(e.target.value)}>
                    <option value="member">Member</option>
                    <option value="leader">Leader</option>
                  </Select>
                  <Button loading={saving} onClick={handleAddMember} disabled={!memberEmpId}>{t('common.add')}</Button>
                </div>
              </div>
            )}

            {/* Active Members */}
            <div>
              <p className="font-semibold text-slate-700 mb-3">{choose(i18n, 'สมาชิกทีม', 'Team Members')} ({activeMembers.length})</p>
              {activeMembers.length === 0
                ? <EmptyState icon="👥" title={choose(i18n, 'ยังไม่มีสมาชิก', 'No members yet')} />
                : (
                  <div className="space-y-2">
                    {activeMembers.map(member => {
                      const isLeader = selectedTeam.leader_employee_id === member.employee_id || member.member_role === 'leader'
                      return (
                        <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-slate-100 p-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-bold flex-shrink-0">
                              {member.employees?.first_name?.[0]}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-slate-800 text-sm truncate">{empName(member.employees)}</p>
                                {isLeader && <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-semibold">Leader</span>}
                              </div>
                              <p className="text-xs text-slate-400 truncate">{member.employees?.employee_code} · {member.employees?.positions?.name || '—'}</p>
                            </div>
                          </div>
                          {canManage && (
                            <div className="flex flex-wrap gap-2 flex-shrink-0">
                              <Select value={member.member_role || 'member'} onChange={e => handleRoleChange(member, e.target.value)} className="h-9 text-xs">
                                <option value="member">Member</option>
                                <option value="leader">Leader</option>
                              </Select>
                              <Button size="sm" variant="secondary" onClick={() => { setTransferMember(member); setTransferTeamId('') }}>
                                {choose(i18n, 'โอน', 'Transfer')}
                              </Button>
                              <Button size="sm" variant="danger" loading={saving} onClick={() => handleRemoveMember(member)}>
                                {choose(i18n, 'นำออก', 'Remove')}
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              }
            </div>

            {/* Transfer History */}
            {inactiveMembers.length > 0 && (
              <div>
                <p className="font-semibold text-slate-700 mb-3 text-sm">{choose(i18n, 'ประวัติสมาชิก', 'Member History')}</p>
                <div className="space-y-2">
                  {inactiveMembers.map(m => (
                    <div key={m.id} className="bg-slate-50 rounded-xl p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold flex-shrink-0">
                        {m.employees?.first_name?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-600">{empName(m.employees)}</p>
                        <p className="text-xs text-slate-400">{m.start_date || '—'} → {m.end_date || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Transfer Modal */}
      {transferMember && (
        <Modal title={choose(i18n, 'โอนย้ายทีม', 'Transfer Member')} onClose={() => setTransferMember(null)} size="sm">
          <p className="text-sm text-slate-500 mb-3">{empName(transferMember.employees)}</p>
          <Field label={choose(i18n, 'ทีมปลายทาง', 'Destination Team')}>
            <Select value={transferTeamId} onChange={e => setTransferTeamId(e.target.value)}>
              <option value="">{choose(i18n, 'เลือกทีม', 'Select team')}</option>
              {teams.filter(t => t.id !== transferMember.team_id && t.status === 'active').map(t => (
                <option key={t.id} value={t.id}>{fieldName(i18n, t)}</option>
              ))}
            </Select>
          </Field>
          <div className="flex gap-3 mt-5">
            <Button variant="secondary" className="flex-1" onClick={() => setTransferMember(null)}>{t('common.cancel')}</Button>
            <Button className="flex-1" loading={saving} onClick={handleTransfer} disabled={!transferTeamId}>{t('common.confirm')}</Button>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteTeamId && (
        <ConfirmDialog
          title={choose(i18n, 'ลบทีม', 'Delete Team')}
          message={choose(i18n, 'ต้องการลบทีมนี้? ทีมจะถูก archive ไม่ลบถาวร', 'Archive this team? Members will be unaffected.')}
          onConfirm={handleDeleteTeam}
          onCancel={() => setDeleteTeamId(null)}
          danger
        />
      )}
    </>
  )
}
