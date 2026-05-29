export { default as TeamSummaryCard } from './components/TeamSummaryCard'
export { useTeams } from './hooks/useTeams'
export {
  addTeamMember,
  archiveTeam,
  createTeam,
  getEmployeeTeamMemberships,
  getTeam,
  getTeamPerformance,
  getTeams,
  removeTeamMember,
  setTeamLeader,
  transferTeamMember,
  updateTeamMemberRole,
  updateTeam,
} from './services/teamService'
export {
  getActiveTeamMembers,
  getTeamLeader,
  groupTeamsByDepartment,
} from './utils/teamHierarchy'
