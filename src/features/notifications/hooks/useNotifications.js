import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/services/supabase'
import {
  getNotifications,
  getPendingApprovalNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService'

export function useNotifications({ employee, can }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const employeeId = employee?.id

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.is_read && !n.read_at).length,
    [notifications],
  )

  const load = useCallback(async () => {
    if (!employeeId) return
    setLoading(true)
    setError('')
    try {
      const [saved, pendingTasks] = await Promise.all([
        getNotifications(employeeId),
        getPendingApprovalNotifications({ employee, can }),
      ])
      setNotifications([...pendingTasks, ...saved])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [employeeId, employee?.company_id, employee?.branch_id, can])

  useEffect(() => {
    load()
    const timer = setInterval(load, 15000)
    return () => clearInterval(timer)
  }, [load])

  useEffect(() => {
    if (!employee?.company_id) return

    const channel = supabase
      .channel(`notification-center:${employee.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `employee_id=eq.${employee.id}` },
        load,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leave_requests', filter: `company_id=eq.${employee.company_id}` },
        load,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ot_requests', filter: `company_id=eq.${employee.company_id}` },
        load,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'approval_requests', filter: `company_id=eq.${employee.company_id}` },
        load,
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [employee?.id, employee?.company_id, load])

  const markRead = async (id) => {
    if (String(id).includes(':')) return
    await markNotificationRead(id)
    setNotifications(p => p.map(n => n.id === id ? { ...n, is_read: true, read_at: n.read_at || new Date().toISOString() } : n))
  }

  const markAllRead = async () => {
    if (!employeeId) return
    await markAllNotificationsRead(employeeId)
    setNotifications(p => p.map(n => n.virtual ? n : { ...n, is_read: true, read_at: n.read_at || new Date().toISOString() }))
  }

  return { notifications, unreadCount, loading, error, load, markRead, markAllRead }
}
