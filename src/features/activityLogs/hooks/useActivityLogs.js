import { useCallback, useEffect, useState } from 'react'
import { getActivityLogs } from '../services/activityLogService'

export function useActivityLogs(companyId, filters) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError('')
    try {
      setLogs(await getActivityLogs(companyId, filters))
    } catch (e) {
      setError(e.message)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [companyId, JSON.stringify(filters)])

  useEffect(() => { load() }, [load])

  return { logs, loading, error, reload: load }
}
