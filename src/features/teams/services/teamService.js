// src/features/teams/services/teamService.js
import { supabase } from '@/services/supabase'
import { writeActivityLog } from '@/features/activityLogs/services/activityLogService'

const SELECT_TEAM = `
  *,
  branches(id, name, name_en, code),
  departments(id, name, name_en),
  leader:employees!teams_leader_employee_id_fkey(id, first_name, last_name, employee_code, avatar_url),
  team_members(
    id, company_id, team_id, employee_id, member_role,
    start_date, end_date, is_active,
    employees!team_members_employee_id_fkey(
      id, first_name, last_name, employee_code, avatar_url,
      departments(name), positions(name)
    )
  )
`

const today = () => new Date().toISOString().split('T')[0]
const now   = () => new Date().toISOString()

// ── Teams CRUD ────────────────────────────────────────────────────

export const getTeams = async (companyId, filters = {}) => {
  let q = supabase.from('teams').select(SELECT_TEAM).eq('company_id', companyId).order('name')
  if (filters.branch_id)     q = q.eq('branch_id', filters.branch_id)
  if (filters.department_id) q = q.eq('department_id', filters.department_id)
  if (filters.status)        q = q.eq('status', filters.status)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export const getTeam = async (teamId) => {
  const { data, error } = await supabase
    .from('teams').select(SELECT_TEAM).eq('id', teamId).single()
  if (error) throw error
  return data
}

export const createTeam = async ({ actorEmployeeId, ...payload }) => {
  const { data, error } = await supabase
    .from('teams')
    .insert({ ...payload, created_by: actorEmployeeId })
    .select(SELECT_TEAM)
    .single()
  if (error) throw new Error(`สร้างทีมไม่ได้: ${error.message}`)
  writeActivityLog({ company_id: data.company_id, actor_employee_id: actorEmployeeId, action: 'create_team', target_type: 'team', target_id: data.id, description: `สร้างทีม ${data.name}` }).catch(() => {})
  return data
}

export const updateTeam = async (teamId, updates, actorEmployeeId) => {
  const { data, error } = await supabase
    .from('teams')
    .update({ ...updates, updated_at: now() })
    .eq('id', teamId)
    .select(SELECT_TEAM)
    .single()
  if (error) throw new Error(`อัปเดตทีมไม่ได้: ${error.message}`)
  writeActivityLog({ company_id: data.company_id, actor_employee_id: actorEmployeeId, action: 'update_team', target_type: 'team', target_id: data.id, description: `อัปเดตทีม ${data.name}` }).catch(() => {})
  return data
}

export const deleteTeam = async (teamId, companyId, actorEmployeeId) => {
  // Soft delete - set status to archived
  const { error } = await supabase
    .from('teams')
    .update({ status: 'archived', updated_at: now() })
    .eq('id', teamId)
    .eq('company_id', companyId)
  if (error) throw new Error(`ลบทีมไม่ได้: ${error.message}`)
  writeActivityLog({ company_id: companyId, actor_employee_id: actorEmployeeId, action: 'delete_team', target_type: 'team', target_id: teamId, description: 'ลบทีม (archived)' }).catch(() => {})
}

export const archiveTeam = async (teamId, actorEmployeeId) => {
  const { data: team } = await supabase.from('teams').select('company_id').eq('id', teamId).single()
  return updateTeam(teamId, { status: 'archived' }, actorEmployeeId)
}

// ── Team Members ──────────────────────────────────────────────────

export const addTeamMember = async ({ companyId, teamId, employeeId, memberRole = 'member', actorEmployeeId }) => {
  // Check if already an active member
  const { data: existing } = await supabase
    .from('team_members')
    .select('id, is_active')
    .eq('team_id', teamId)
    .eq('employee_id', employeeId)
    .eq('is_active', true)
    .maybeSingle()

  if (existing) throw new Error('พนักงานคนนี้อยู่ในทีมอยู่แล้ว')

  const { data, error } = await supabase
    .from('team_members')
    .insert({
      company_id:   companyId,
      team_id:      teamId,
      employee_id:  employeeId,
      member_role:  memberRole,
      is_active:    true,
      start_date:   today(),
      created_by:   actorEmployeeId,
    })
    .select(`
      *, employees!team_members_employee_id_fkey(
        id, first_name, last_name, employee_code, avatar_url,
        departments(name), positions(name)
      )
    `)
    .single()
  if (error) throw new Error(`เพิ่มสมาชิกไม่ได้: ${error.message}`)
  writeActivityLog({ company_id: companyId, actor_employee_id: actorEmployeeId, action: 'add_team_member', target_type: 'team', target_id: teamId, description: `เพิ่มสมาชิก ${employeeId} เข้าทีม` }).catch(() => {})
  return data
}

export const removeTeamMember = async ({ memberId, companyId, teamId, actorEmployeeId }) => {
  const { data, error } = await supabase
    .from('team_members')
    .update({ is_active: false, end_date: today(), updated_at: now() })
    .eq('id', memberId)
    .select()
    .single()
  if (error) throw new Error(`นำสมาชิกออกไม่ได้: ${error.message}`)
  writeActivityLog({ company_id: companyId, actor_employee_id: actorEmployeeId, action: 'remove_team_member', target_type: 'team', target_id: teamId, description: `นำสมาชิกออกจากทีม` }).catch(() => {})
  return data
}

export const updateTeamMemberRole = async ({ memberId, companyId, teamId, memberRole, actorEmployeeId }) => {
  const { data, error } = await supabase
    .from('team_members')
    .update({ member_role: memberRole, updated_at: now() })
    .eq('id', memberId)
    .select(`*, employees!team_members_employee_id_fkey(id, first_name, last_name, employee_code)`)
    .single()
  if (error) throw new Error(`อัปเดต role ไม่ได้: ${error.message}`)
  writeActivityLog({ company_id: companyId, actor_employee_id: actorEmployeeId, action: 'update_member_role', target_type: 'team', target_id: teamId, description: `เปลี่ยน role เป็น ${memberRole}` }).catch(() => {})
  return data
}

export const setTeamLeader = async ({ teamId, companyId, employeeId, actorEmployeeId }) => {
  // 1. Reset all members to 'member'
  await supabase.from('team_members')
    .update({ member_role: 'member', updated_at: now() })
    .eq('team_id', teamId).eq('company_id', companyId).eq('is_active', true)

  // 2. Set new leader's role
  if (employeeId) {
    await supabase.from('team_members')
      .update({ member_role: 'leader', updated_at: now() })
      .eq('team_id', teamId).eq('company_id', companyId)
      .eq('employee_id', employeeId).eq('is_active', true)
  }

  // 3. Update teams.leader_employee_id
  const { data, error } = await supabase
    .from('teams')
    .update({ leader_employee_id: employeeId || null, updated_at: now() })
    .eq('id', teamId).eq('company_id', companyId)
    .select(SELECT_TEAM).single()
  if (error) throw new Error(`ตั้งหัวหน้าทีมไม่ได้: ${error.message}`)
  writeActivityLog({ company_id: companyId, actor_employee_id: actorEmployeeId, action: 'set_team_leader', target_type: 'team', target_id: teamId, description: `ตั้งหัวหน้าทีม ${employeeId}` }).catch(() => {})
  return data
}

export const transferTeamMember = async ({ memberId, fromTeamId, toTeamId, companyId, employeeId, actorEmployeeId }) => {
  await removeTeamMember({ memberId, companyId, teamId: fromTeamId, actorEmployeeId })
  const data = await addTeamMember({ companyId, teamId: toTeamId, employeeId, memberRole: 'member', actorEmployeeId })
  writeActivityLog({ company_id: companyId, actor_employee_id: actorEmployeeId, action: 'transfer_member', target_type: 'team', target_id: toTeamId, description: `โอนย้ายสมาชิกจากทีม ${fromTeamId} ไปทีม ${toTeamId}` }).catch(() => {})
  return data
}

// ── Performance ───────────────────────────────────────────────────

export const getTeamPerformance = async (companyId, filters = {}) => {
  try {
    let q = supabase.from('team_performance_summary').select('*').eq('company_id', companyId).order('active_member_count', { ascending: false })
    if (filters.branch_id)     q = q.eq('branch_id', filters.branch_id)
    if (filters.department_id) q = q.eq('department_id', filters.department_id)
    const { data, error } = await q
    if (error) throw error
    return data || []
  } catch {
    // View อาจยังไม่มี — return empty
    return []
  }
}

export const getEmployeeTeamMemberships = async (companyId, employeeId) => {
  const { data, error } = await supabase
    .from('team_members')
    .select(`
      id, company_id, team_id, employee_id, member_role,
      start_date, end_date, is_active,
      teams!team_members_team_id_fkey(
        id, code, name, name_en, status, target_amount,
        branches(id, name, name_en, code),
        departments(id, name, name_en),
        leader:employees!teams_leader_employee_id_fkey(id, first_name, last_name, employee_code)
      )
    `)
    .eq('company_id', companyId)
    .eq('employee_id', employeeId)
    .order('is_active', { ascending: false })
    .order('start_date', { ascending: false })
  if (error) throw error
  return data || []
}
