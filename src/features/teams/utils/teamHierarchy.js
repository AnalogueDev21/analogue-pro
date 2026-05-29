export const groupTeamsByDepartment = (teams = []) => {
  const groups = new Map()

  teams.forEach((team) => {
    const key = team.department_id || 'unassigned'
    const current = groups.get(key) || {
      department_id: team.department_id || null,
      department: team.departments || null,
      teams: [],
    }
    current.teams.push(team)
    groups.set(key, current)
  })

  return Array.from(groups.values())
}

export const getActiveTeamMembers = (team) => {
  return team?.team_members?.filter(member => member.is_active) || []
}

export const getTeamLeader = (team) => {
  if (team?.leader) return team.leader
  return getActiveTeamMembers(team).find(member => member.member_role === 'leader')?.employees || null
}
