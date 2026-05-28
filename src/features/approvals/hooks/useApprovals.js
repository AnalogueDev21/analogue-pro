import { useCallback, useEffect, useState } from 'react'
import { decideApprovalRequest, getApprovalRequests } from '../services/approvalService'

export function useApprovals(companyId, filters) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError('')
    try {
      setItems(await getApprovalRequests(companyId, filters))
    } catch (e) {
      setError(e.message)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [companyId, JSON.stringify(filters)])

  useEffect(() => { load() }, [load])

  const decide = async ({ approval, actorEmployeeId, status, comment }) => {
    setSaving(true)
    try {
      const updated = await decideApprovalRequest({ approval, actorEmployeeId, status, comment })
      setItems(p => p.map(item => item.id === updated.id ? updated : item))
      return updated
    } finally {
      setSaving(false)
    }
  }

  return { items, loading, saving, error, reload: load, decide }
}
