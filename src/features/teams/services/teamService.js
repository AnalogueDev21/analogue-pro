import { supabase } from '@/services/supabase'
import { writeActivityLog } from '@/features/activityLogs/services/activityLogService'

const SELECT_TEAM = `
  *,
  branches(id, name, name_en, code),
  departments(id, name, name_en),
  leader:employees!teams_leader_employee_id_fkey(id, first_name, last_name, employee_code, avatar_url),
  team_members(
    id,
    company_id,
    team_id,
    employee_id,
    member_role,
    start_date,
    end_date,
    is_active,
    employees!team_members_employee_id_fkey(id, first_name, last_name, employee_code, avatar_url, departments(name), positions(name))
  )
`

export const getTeams = async (companyId, filters = {}) => {
  let query = supabase
    .from('teams')
    .select(SELECT_TEAM)
    .eq('company_id', companyId)
    .order('name')

  if (filters.branch_id) query = query.eq('branch_id', filters.branch_id)
  if (filters.department_id) query = query.eq('department_id', filters.department_id)
  if (filters.status) query = query.eq('status', filters.status)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export const getTeam = async (teamId) => {
  const { data, error } = await supabase
    .from('teams')
    .select(SELECT_TEAM)
    .eq('id', teamId)
    .single()
  if (error) throw error
  return data
}

export const createTeam = async ({ actorEmployeeId, ...payload }) => {
  const { data, error } = await supabase
    .from('teams')
    .insert({ ...payload, created_by: actorEmployeeId })
    .select(SELECT_TEAM)
    .single()
  if (error) throw error

  await writeActivityLog({
    company_id: data.company_id,
    actor_employee_id: actorEmployeeId,
    action: 'create_team',
    target_type: 'team',
    target_id: data.id,
    description: `Created team ${data.name}`,
  })

  return data
}

export const updateTeam = async (teamId, updates, actorEmployeeId) => {
  const { data, error } = await supabase
    .from('teams')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', teamId)
    .select(SELECT_TEAM)
    .single()
  if (error) throw error

  await writeActivityLog({
    company_id: data.company_id,
    actor_employee_id: actorEmployeeId,
    action: 'update_team',
    target_type: 'team',
    target_id: data.id,
    description: `Updated team ${data.name}`,
  })

  return data
}

export const archiveTeam = async (teamId, actorEmployeeId) => {
  return updateTeam(teamId, { status: 'archived' }, actorEmployeeId)
}

export const addTeamMember = async ({ companyId, teamId, employeeId, memberRole = 'member', actorEmployeeId }) => {
  const { data, error } = await supabase
    .from('team_members')
    .insert({
      company_id: companyId,
      team_id: teamId,
      employee_id: employeeId,
      member_role: memberRole,
      created_by: actorEmployeeId,
    })
    .select('*, employees!team_members_employee_id_fkey(id, first_name, last_name, employee_code)')
    .single()
  if (error) throw error

  await writeActivityLog({
    company_id: companyId,
    actor_employee_id: actorEmployeeId,
    action: 'add_team_member',
    target_type: 'team',
    target_id: teamId,
    description: `Added employee ${employeeId} to team`,
  })

  return data
}

export const removeTeamMember = async ({ memberId, companyId, teamId, actorEmployeeId }) => {
  const { data, error } = await supabase
    .from('team_members')
    .update({
      is_active: false,
      end_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId)
    .select()
    .single()
  if (error) throw error

  await writeActivityLog({
    company_id: companyId,
    actor_employee_id: actorEmployeeId,
    action: 'remove_team_member',
    target_type: 'team',
    target_id: teamId,
    description: `Removed team member ${memberId}`,
  })

  return data
}

export const updateTeamMemberRole = async ({ memberId, companyId, teamId, memberRole, actorEmployeeId }) => {
  const { data, error } = await supabase
    .from('team_members')
    .update({
      member_role: memberRole,
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId)
    .select('*, employees!team_members_employee_id_fkey(id, first_name, last_name, employee_code)')
    .single()
  if (error) throw error

  await writeActivityLog({
    company_id: companyId,
    actor_employee_id: actorEmployeeId,
    action: 'update_team_member_role',
    target_type: 'team',
    target_id: teamId,
    description: `Updated team member ${memberId} role to ${memberRole}`,
  })

  return data
}

export const setTeamLeader = async ({ teamId, companyId, employeeId, actorEmployeeId }) => {
  const { data, error } = await supabase
    .from('teams')
    .update({
      leader_employee_id: employeeId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', teamId)
    .eq('company_id', companyId)
    .select(SELECT_TEAM)
    .single()
  if (error) throw error

  await supabase
    .from('team_members')
    .update({ member_role: 'member', updated_at: new Date().toISOString() })
    .eq('team_id', teamId)
    .eq('company_id', companyId)
    .eq('is_active', true)

  if (employeeId) {
    await supabase
      .from('team_members')
      .update({ member_role: 'leader', updated_at: new Date().toISOString() })
      .eq('team_id', teamId)
      .eq('company_id', companyId)
      .eq('employee_id', employeeId)
      .eq('is_active', true)
  }

  await writeActivityLog({
    company_id: companyId,
    actor_employee_id: actorEmployeeId,
    action: 'set_team_leader',
    target_type: 'team',
    target_id: teamId,
    description: `Set team leader to ${employeeId || 'none'}`,
  })

  return data
}

export const transferTeamMember = async ({ memberId, fromTeamId, toTeamId, companyId, employeeId, actorEmployeeId }) => {
  await removeTeamMember({ memberId, companyId, teamId: fromTeamId, actorEmployeeId })
  const data = await addTeamMember({ companyId, teamId: toTeamId, employeeId, actorEmployeeId })

  await writeActivityLog({
    company_id: companyId,
    actor_employee_id: actorEmployeeId,
    action: 'transfer_team_member',
    target_type: 'team',
    target_id: toTeamId,
    description: `Transferred employee ${employeeId} from team ${fromTeamId} to team ${toTeamId}`,
  })

  return data
}

export const getTeamPerformance = async (companyId, filters = {}) => {
  let query = supabase
    .from('team_performance_summary')
    .select('*')
    .eq('company_id', companyId)
    .order('active_member_count', { ascending: false })

  if (filters.branch_id) query = query.eq('branch_id', filters.branch_id)
  if (filters.department_id) query = query.eq('department_id', filters.department_id)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export const getEmployeeTeamMemberships = async (companyId, employeeId) => {
  const { data, error } = await supabase
    .from('team_members')
    .select(`
      id,
      company_id,
      team_id,
      employee_id,
      member_role,
      start_date,
      end_date,
      is_active,
      teams!team_members_team_id_fkey(
        id,
        code,
        name,
        name_en,
        status,
        target_amount,
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
