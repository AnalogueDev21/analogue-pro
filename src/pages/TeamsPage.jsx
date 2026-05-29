import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import { supabase } from '@/services/supabase'
import { getActivityLogs } from '@/features/activityLogs/services/activityLogService'
import {
  addTeamMember,
  setTeamLeader,
  removeTeamMember,
  TeamSummaryCard,
  transferTeamMember,
  updateTeamMemberRole,
  useTeams,
} from '@/features/teams'
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from '@/components/ui/index.jsx'
import { choose, fieldName } from '@/utils/lang'

const EMPTY_FORM = {
  code: '',
  name: '',
  name_en: '',
  branch_id: '',
  department_id: '',
  leader_employee_id: '',
  target_amount: 0,
  description: '',
  status: 'active',
}

const employeeName = (employee) => {
  if (!employee) return '-'
  return `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.employee_code || '-'
}

export default function TeamsPage() {
  const { t, i18n } = useTranslation()
  const { company, employee, can } = useAuthStore()
  const { show: toast, el: ToastEl } = useToast()
  const canManage = can('team.manage')

  const [filters, setFilters] = useState({ branch_id: '', department_id: '', status: 'active' })
  const [search, setSearch] = useState('')
  const [branches, setBranches] = useState([])
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [teamLogs, setTeamLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [memberEmployeeId, setMemberEmployeeId] = useState('')
  const [memberRole, setMemberRole] = useState('member')
  const [transferMember, setTransferMember] = useState(null)
  const [transferTeamId, setTransferTeamId] = useState('')
  const [saving, setSaving] = useState(false)

  const { teams, performance, loading, reload, createTeam, updateTeam } = useTeams(company?.id, filters)

  useEffect(() => { loadOptions() }, [])

  useEffect(() => {
    if (!selectedTeam) return
    const fresh = teams.find(team => team.id === selectedTeam.id)
    if (fresh) setSelectedTeam(fresh)
  }, [teams, selectedTeam?.id])

  const loadOptions = async () => {
    const [{ data: br }, { data: dp }, { data: em }] = await Promise.all([
      supabase.from('branches').select('id,name,name_en,code').eq('company_id', company.id).eq('is_active', true).order('code'),
      supabase.from('departments').select('id,name,name_en,branch_id').eq('company_id', company.id).eq('is_active', true).order('name'),
      supabase
        .from('employees')
        .select('id, employee_code, first_name, last_name, branch_id, department_id, avatar_url, positions(name), departments(name)')
        .eq('company_id', company.id)
        .eq('status', 'active')
        .order('employee_code'),
    ])
    setBranches(br || [])
    setDepartments(dp || [])
    setEmployees(em || [])
  }

  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return teams
    return teams.filter(team => {
      const haystack = [
        team.code,
        team.name,
        team.name_en,
        team.branches?.name,
        team.branches?.name_en,
        team.departments?.name,
        team.departments?.name_en,
      ].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [teams, search])

  const hierarchy = useMemo(() => {
    const branchesById = new Map(branches.map(branch => [branch.id, { ...branch, departments: new Map(), teams: [] }]))
    const unassignedBranch = { id: 'unassigned', name: 'Unassigned', name_en: 'Unassigned', departments: new Map(), teams: [] }

    filteredTeams.forEach(team => {
      const branch = team.branch_id ? branchesById.get(team.branch_id) || unassignedBranch : unassignedBranch
      const deptKey = team.department_id || 'unassigned'
      if (!branch.departments.has(deptKey)) {
        branch.departments.set(deptKey, {
          id: deptKey,
          name: team.departments?.name || 'Unassigned',
          name_en: team.departments?.name_en || 'Unassigned',
          teams: [],
        })
      }
      branch.departments.get(deptKey).teams.push(team)
    })

    const groups = Array.from(branchesById.values()).filter(branch => (
      branch.teams.length || branch.departments.size
    ))
    if (unassignedBranch.teams.length || unassignedBranch.departments.size) groups.push(unassignedBranch)

    return groups.map(branch => ({
      ...branch,
      departments: Array.from(branch.departments.values()),
    }))
  }, [branches, filteredTeams])

  const stats = useMemo(() => {
    const activeMembers = teams.reduce((sum, team) => (
      sum + (team.team_members?.filter(member => member.is_active).length || 0)
    ), 0)
    return {
      teams: teams.length,
      activeMembers,
      leaders: teams.filter(team => team.leader_employee_id).length,
      target: performance.reduce((sum, row) => sum + Number(row.target_amount || 0), 0),
    }
  }, [teams, performance])

  const departmentOptions = departments.filter(dept => !form.branch_id || dept.branch_id === form.branch_id)
  const filterDepartmentOptions = departments.filter(dept => !filters.branch_id || dept.branch_id === filters.branch_id)
  const activeMembers = selectedTeam?.team_members?.filter(member => member.is_active) || []
  const inactiveMembers = selectedTeam?.team_members?.filter(member => !member.is_active) || []
  const selectedPerformance = selectedTeam ? performance.find(row => row.team_id === selectedTeam.id) : null
  const availableMembers = employees.filter(emp => {
    if (!selectedTeam) return true
    return !activeMembers.some(member => member.employee_id === emp.id)
  })

  const openTeamDetail = async (team) => {
    setSelectedTeam(team)
    setLogsLoading(true)
    try {
      const logs = await getActivityLogs(company.id, {
        target_type: 'team',
        target_id: team.id,
        limit: 20,
      })
      setTeamLogs(logs)
    } catch {
      setTeamLogs([])
    } finally {
      setLogsLoading(false)
    }
  }

  const refreshSelectedTeam = async () => {
    await reload()
    if (selectedTeam) await openTeamDetail(selectedTeam)
  }

  const openAdd = () => {
    setEditItem(null)
    setForm({ ...EMPTY_FORM, branch_id: filters.branch_id, department_id: filters.department_id })
    setShowForm(true)
  }

  const openEdit = (team) => {
    setEditItem(team)
    setForm({
      code: team.code || '',
      name: team.name || '',
      name_en: team.name_en || '',
      branch_id: team.branch_id || '',
      department_id: team.department_id || '',
      leader_employee_id: team.leader_employee_id || '',
      target_amount: team.target_amount || 0,
      description: team.description || '',
      status: team.status || 'active',
    })
    setShowForm(true)
  }

  const saveTeam = async () => {
    if (!form.name.trim()) {
      toast(choose(i18n, 'กรุณากรอกชื่อทีม', 'Team name is required'), 'warning')
      return
    }

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

      if (form.leader_employee_id) {
        const hasLeaderMember = saved.team_members?.some(member => (
          member.is_active && member.employee_id === form.leader_employee_id
        ))
        if (!hasLeaderMember) {
          await addTeamMember({
            companyId: company.id,
            teamId: saved.id,
            employeeId: form.leader_employee_id,
            memberRole: 'leader',
            actorEmployeeId: employee.id,
          })
        }
      }

      await reload()
      setShowForm(false)
      toast(editItem ? choose(i18n, 'อัปเดตทีมแล้ว', 'Team updated') : choose(i18n, 'สร้างทีมแล้ว', 'Team created'))
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAddMember = async () => {
    if (!selectedTeam || !memberEmployeeId) return
    setSaving(true)
    try {
      await addTeamMember({
        companyId: company.id,
        teamId: selectedTeam.id,
        employeeId: memberEmployeeId,
        memberRole,
        actorEmployeeId: employee.id,
      })
      if (memberRole === 'leader') {
        await setTeamLeader({
          companyId: company.id,
          teamId: selectedTeam.id,
          employeeId: memberEmployeeId,
          actorEmployeeId: employee.id,
        })
      }
      setMemberEmployeeId('')
      setMemberRole('member')
      await refreshSelectedTeam()
      toast(choose(i18n, 'เพิ่มสมาชิกแล้ว', 'Member added'))
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveMember = async (member) => {
    setSaving(true)
    try {
      await removeTeamMember({
        memberId: member.id,
        companyId: company.id,
        teamId: member.team_id,
        actorEmployeeId: employee.id,
      })
      await refreshSelectedTeam()
      toast(choose(i18n, 'นำสมาชิกออกแล้ว', 'Member removed'), 'warning')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSetLeader = async (member) => {
    setSaving(true)
    try {
      await setTeamLeader({
        companyId: company.id,
        teamId: member.team_id,
        employeeId: member.employee_id,
        actorEmployeeId: employee.id,
      })
      await refreshSelectedTeam()
      toast(choose(i18n, 'อัปเดตหัวหน้าทีมแล้ว', 'Team leader updated'))
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleRoleChange = async (member, nextRole) => {
    setSaving(true)
    try {
      await updateTeamMemberRole({
        memberId: member.id,
        companyId: company.id,
        teamId: member.team_id,
        memberRole: nextRole,
        actorEmployeeId: employee.id,
      })
      if (nextRole === 'leader') {
        await setTeamLeader({
          companyId: company.id,
          teamId: member.team_id,
          employeeId: member.employee_id,
          actorEmployeeId: employee.id,
        })
      }
      await refreshSelectedTeam()
      toast(choose(i18n, 'อัปเดตบทบาทในทีมแล้ว', 'Team role updated'))
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleTransferMember = async () => {
    if (!transferMember || !transferTeamId) return
    setSaving(true)
    try {
      await transferTeamMember({
        memberId: transferMember.id,
        fromTeamId: transferMember.team_id,
        toTeamId: transferTeamId,
        companyId: company.id,
        employeeId: transferMember.employee_id,
        actorEmployeeId: employee.id,
      })
      setTransferMember(null)
      setTransferTeamId('')
      await refreshSelectedTeam()
      toast(choose(i18n, 'โอนย้ายทีมแล้ว', 'Team transfer complete'))
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {ToastEl}
      <PageHeader
        title={choose(i18n, 'ทีม', 'Teams')}
        subtitle={choose(i18n, 'จัดการทีม หัวหน้าทีม สมาชิก และการโอนย้ายทีม', 'Manage teams, leaders, members, and team transfers')}
        action={canManage ? <Button icon="+" onClick={openAdd}>{choose(i18n, 'เพิ่มทีม', 'Add Team')}</Button> : null}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[
          [choose(i18n, 'ทีมทั้งหมด', 'Teams'), stats.teams],
          [choose(i18n, 'สมาชิก', 'Members'), stats.activeMembers],
          [choose(i18n, 'หัวหน้าทีม', 'Leaders'), stats.leaders],
          [choose(i18n, 'เป้าหมาย', 'Target'), stats.target.toLocaleString()],
        ].map(([label, value]) => (
          <Card key={label} className="text-center">
            <p className="text-2xl font-bold text-primary-700">{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <SearchInput value={search} onChange={setSearch} placeholder={choose(i18n, 'ค้นหาทีม...', 'Search teams...')} />
          </div>
          <Select value={filters.branch_id} onChange={e => setFilters(p => ({ ...p, branch_id: e.target.value, department_id: '' }))}>
            <option value="">{choose(i18n, 'ทุกสาขา', 'All branches')}</option>
            {branches.map(branch => <option key={branch.id} value={branch.id}>{fieldName(i18n, branch)}</option>)}
          </Select>
          <Select value={filters.department_id} onChange={e => setFilters(p => ({ ...p, department_id: e.target.value }))}>
            <option value="">{choose(i18n, 'ทุกแผนก', 'All departments')}</option>
            {filterDepartmentOptions.map(dept => <option key={dept.id} value={dept.id}>{fieldName(i18n, dept)}</option>)}
          </Select>
        </div>
      </Card>

      <Card className="mb-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Organization Tree</h2>
            <p className="text-sm text-slate-500">Company / Branch / Department / Team</p>
          </div>
        </div>
        <div className="space-y-3">
          {hierarchy.map(branch => (
            <div key={branch.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-sm font-bold text-slate-800">{fieldName(i18n, branch)}</p>
              <div className="mt-3 space-y-2">
                {branch.departments.map(dept => (
                  <div key={dept.id} className="rounded-xl bg-white border border-slate-100 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">{fieldName(i18n, dept)}</p>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {dept.teams.map(team => {
                        const memberCount = team.team_members?.filter(member => member.is_active).length || 0
                        return (
                          <button
                            key={team.id}
                            onClick={() => openTeamDetail(team)}
                            className="text-left rounded-xl border border-slate-100 bg-slate-50 p-3 hover:border-primary-200 hover:bg-primary-50 transition-colors"
                          >
                            <p className="font-semibold text-slate-800 truncate">{fieldName(i18n, team)}</p>
                            <p className="text-xs text-slate-500 mt-1">{memberCount} members</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {hierarchy.length === 0 && (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No teams match the current filters.</p>
          )}
        </div>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-52" />)}
        </div>
      ) : filteredTeams.length === 0 ? (
        <EmptyState
          icon="T"
          title={choose(i18n, 'ยังไม่มีทีม', 'No teams yet')}
          subtitle={choose(i18n, 'เริ่มสร้างทีมเพื่อจัดกลุ่มพนักงานและดู performance', 'Create teams to group employees and track performance')}
          action={canManage ? <Button icon="+" onClick={openAdd}>{choose(i18n, 'เพิ่มทีม', 'Add Team')}</Button> : null}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTeams.map(team => (
            <div key={team.id} className="space-y-2">
              <TeamSummaryCard team={team} i18n={i18n} onEdit={canManage ? openEdit : null} />
              <button
                onClick={() => openTeamDetail(team)}
                className="h-11 w-full rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {choose(i18n, 'รายละเอียดทีม', 'Team Detail')}
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title={editItem ? choose(i18n, 'แก้ไขทีม', 'Edit Team') : choose(i18n, 'เพิ่มทีม', 'Add Team')} onClose={() => setShowForm(false)} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={choose(i18n, 'รหัสทีม', 'Team Code')}>
                <Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="TEAM-001" />
              </Field>
              <Field label={choose(i18n, 'สถานะ', 'Status')}>
                <Select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="active">{t('common.active')}</option>
                  <option value="inactive">{t('common.inactive')}</option>
                  <option value="archived">{choose(i18n, 'เก็บถาวร', 'Archived')}</option>
                </Select>
              </Field>
              <Field label={choose(i18n, 'ชื่อทีม', 'Team Name')} required>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </Field>
              <Field label={choose(i18n, 'ชื่อทีม (EN)', 'Team Name (EN)')}>
                <Input value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} />
              </Field>
              <Field label={t('employee.branch')}>
                <Select value={form.branch_id} onChange={e => setForm(p => ({ ...p, branch_id: e.target.value, department_id: '' }))}>
                  <option value="">{choose(i18n, 'เลือกสาขา', 'Select branch')}</option>
                  {branches.map(branch => <option key={branch.id} value={branch.id}>{fieldName(i18n, branch)}</option>)}
                </Select>
              </Field>
              <Field label={t('employee.department')}>
                <Select value={form.department_id} onChange={e => setForm(p => ({ ...p, department_id: e.target.value }))}>
                  <option value="">{choose(i18n, 'เลือกแผนก', 'Select department')}</option>
                  {departmentOptions.map(dept => <option key={dept.id} value={dept.id}>{fieldName(i18n, dept)}</option>)}
                </Select>
              </Field>
              <Field label={choose(i18n, 'หัวหน้าทีม', 'Team Leader')}>
                <Select value={form.leader_employee_id} onChange={e => setForm(p => ({ ...p, leader_employee_id: e.target.value }))}>
                  <option value="">{choose(i18n, 'ยังไม่กำหนด', 'Not assigned')}</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.employee_code} - {employeeName(emp)}</option>
                  ))}
                </Select>
              </Field>
              <Field label={choose(i18n, 'เป้าหมายทีม', 'Team Target')}>
                <Input type="number" value={form.target_amount} onChange={e => setForm(p => ({ ...p, target_amount: e.target.value }))} />
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

      {selectedTeam && (
        <Modal title={fieldName(i18n, selectedTeam)} onClose={() => setSelectedTeam(null)} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                [choose(i18n, 'สมาชิก Active', 'Active Members'), activeMembers.length],
                [choose(i18n, 'ออกจากทีมแล้ว', 'Inactive'), inactiveMembers.length],
                [choose(i18n, 'เป้าหมาย', 'Target'), Number(selectedTeam.target_amount || 0).toLocaleString()],
                ['Performance', selectedPerformance?.active_member_count || activeMembers.length],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 p-3 text-center">
                  <p className="text-xl font-bold text-primary-700">{value}</p>
                  <p className="text-xs text-slate-500 mt-1">{label}</p>
                </div>
              ))}
            </div>

            <Card className="bg-primary-50 border-primary-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide">Team Unit</p>
                  <p className="text-sm text-slate-700 mt-1">
                    {fieldName(i18n, selectedTeam.branches) || '-'} / {fieldName(i18n, selectedTeam.departments) || '-'}
                  </p>
                  {selectedTeam.description && (
                    <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap break-words">{selectedTeam.description}</p>
                  )}
                </div>
                {canManage && <Button variant="secondary" onClick={() => openEdit(selectedTeam)}>{t('common.edit')}</Button>}
              </div>
            </Card>

            {canManage && (
              <Card className="bg-slate-50">
                <Field label={choose(i18n, 'เพิ่มสมาชิก', 'Add Member')}>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_8rem_auto] gap-2">
                    <Select value={memberEmployeeId} onChange={e => setMemberEmployeeId(e.target.value)}>
                      <option value="">{choose(i18n, 'เลือกพนักงาน', 'Select employee')}</option>
                      {availableMembers.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.employee_code} - {employeeName(emp)}</option>
                      ))}
                    </Select>
                    <Select value={memberRole} onChange={e => setMemberRole(e.target.value)}>
                      <option value="member">Member</option>
                      <option value="leader">Leader</option>
                    </Select>
                    <Button loading={saving} onClick={handleAddMember}>{t('common.add')}</Button>
                  </div>
                </Field>
              </Card>
            )}

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-2">{choose(i18n, 'สมาชิกทีม', 'Team Members')}</h2>
              <div className="space-y-2">
                {activeMembers.map(member => {
                  const isLeader = selectedTeam.leader_employee_id === member.employee_id || member.member_role === 'leader'
                  return (
                    <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-800 truncate">{employeeName(member.employees)}</p>
                          {isLeader && <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700">Leader</span>}
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {member.employees?.employee_code} / {member.employees?.positions?.name || '-'}
                        </p>
                      </div>
                      {canManage && (
                        <div className="grid grid-cols-2 sm:flex gap-2">
                          <Select value={member.member_role || 'member'} onChange={e => handleRoleChange(member, e.target.value)}>
                            <option value="member">Member</option>
                            <option value="leader">Leader</option>
                          </Select>
                          {!isLeader && (
                            <Button size="sm" variant="secondary" onClick={() => handleSetLeader(member)}>
                              Set Leader
                            </Button>
                          )}
                          <Button size="sm" variant="secondary" onClick={() => { setTransferMember(member); setTransferTeamId('') }}>
                            {choose(i18n, 'โอนย้าย', 'Transfer')}
                          </Button>
                          <Button size="sm" variant="danger" loading={saving} onClick={() => handleRemoveMember(member)}>
                            {t('common.delete')}
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
                {activeMembers.length === 0 && <EmptyState title={choose(i18n, 'ยังไม่มีสมาชิกทีม', 'No team members')} />}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-2">{choose(i18n, 'ประวัติการโอนย้ายทีม', 'Team Transfer History')}</h2>
              <div className="space-y-2">
                {inactiveMembers.map(member => (
                  <div key={member.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="font-semibold text-slate-700">{employeeName(member.employees)}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {member.start_date || '-'} - {member.end_date || '-'}
                    </p>
                  </div>
                ))}
                {inactiveMembers.length === 0 && (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    {choose(i18n, 'ยังไม่มีประวัติการโอนย้าย', 'No transfer history yet')}
                  </p>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Activity Logs</h2>
              {logsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-14" />)}
                </div>
              ) : teamLogs.length ? (
                <div className="space-y-2">
                  {teamLogs.map(log => (
                    <div key={log.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-800">{log.description || log.action}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {log.actor ? employeeName(log.actor) : 'System'} / {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                  {choose(i18n, 'ยังไม่มี activity ของทีมนี้', 'No activity for this team yet')}
                </p>
              )}
            </section>

            <Card className="bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900 mb-2">Performance</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-white border border-slate-100 p-3">
                  <p className="text-xs text-slate-500">Active Members</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{selectedPerformance?.active_member_count || activeMembers.length}</p>
                </div>
                <div className="rounded-xl bg-white border border-slate-100 p-3">
                  <p className="text-xs text-slate-500">Team Target</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{Number(selectedTeam.target_amount || 0).toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-white border border-slate-100 p-3">
                  <p className="text-xs text-slate-500">Leader</p>
                  <p className="text-sm font-semibold text-slate-900 mt-2 truncate">
                    {employeeName(selectedTeam.leader || activeMembers.find(member => member.member_role === 'leader')?.employees)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Sales, attendance, and OT metrics can attach here when those phase tables are connected to teams.
              </p>
            </Card>
          </div>
        </Modal>
      )}

      {transferMember && (
        <Modal title={choose(i18n, 'โอนย้ายทีม', 'Transfer Team')} onClose={() => setTransferMember(null)} size="sm">
          <Field label={choose(i18n, 'ทีมปลายทาง', 'Destination Team')}>
            <Select value={transferTeamId} onChange={e => setTransferTeamId(e.target.value)}>
              <option value="">{choose(i18n, 'เลือกทีม', 'Select team')}</option>
              {teams.filter(team => team.id !== transferMember.team_id && team.status === 'active').map(team => (
                <option key={team.id} value={team.id}>{fieldName(i18n, team)}</option>
              ))}
            </Select>
          </Field>
          <div className="flex gap-3 mt-5">
            <Button variant="secondary" className="flex-1" onClick={() => setTransferMember(null)}>{t('common.cancel')}</Button>
            <Button className="flex-1" loading={saving} onClick={handleTransferMember}>{t('common.confirm')}</Button>
          </div>
        </Modal>
      )}
    </>
  )
}
