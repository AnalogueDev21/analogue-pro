import { useCallback, useEffect, useState } from 'react'
import {
  archiveTeam,
  createTeam,
  getTeamPerformance,
  getTeams,
  updateTeam,
} from '../services/teamService'

export const useTeams = (companyId, filters = {}) => {
  const [teams, setTeams] = useState([])
  const [performance, setPerformance] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      const [teamRows, performanceRows] = await Promise.all([
        getTeams(companyId, filters),
        getTeamPerformance(companyId, filters),
      ])
      setTeams(teamRows)
      setPerformance(performanceRows)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [companyId, filters.branch_id, filters.department_id, filters.status])

  useEffect(() => { load() }, [load])

  const create = async (payload) => {
    const team = await createTeam(payload)
    setTeams(current => [...current, team].sort((a, b) => a.name.localeCompare(b.name)))
    await load()
    return team
  }

  const update = async (teamId, updates, actorEmployeeId) => {
    const team = await updateTeam(teamId, updates, actorEmployeeId)
    setTeams(current => current.map(item => item.id === team.id ? team : item))
    await load()
    return team
  }

  const archive = async (teamId, actorEmployeeId) => {
    const team = await archiveTeam(teamId, actorEmployeeId)
    setTeams(current => current.map(item => item.id === team.id ? team : item))
    await load()
    return team
  }

  return {
    teams,
    performance,
    loading,
    error,
    reload: load,
    createTeam: create,
    updateTeam: update,
    archiveTeam: archive,
  }
}
