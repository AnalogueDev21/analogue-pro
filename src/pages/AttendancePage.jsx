// src/pages/AttendancePage.jsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import { checkIn, checkOut, getTodayAttendance, getAttendanceHistory, fmtTime } from '@/services/attendanceService'
import { Card, PageHeader, Badge, useToast, Skeleton } from '@/components/ui/index.jsx'
import { choose, localeOf } from '@/utils/lang'

const STATUS_COLOR = { on_time: 'green', late: 'amber', absent: 'red', leave: 'blue', holiday: 'gray' }
const STATUS_LABEL = {
  th: { on_time: 'ตรงเวลา', late: 'มาสาย', absent: 'ขาดงาน', leave: 'ลางาน', holiday: 'วันหยุด' },
  en: { on_time: 'On time', late: 'Late', absent: 'Absent', leave: 'On leave', holiday: 'Holiday' },
}

export default function AttendancePage() {
  const { t, i18n } = useTranslation()
  const { employee } = useAuthStore()
  const { show: toast, el: ToastEl } = useToast()
  const [now, setNow] = useState(new Date())
  const [today, setToday] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const locale = localeOf(i18n)
  const statusLabel = STATUS_LABEL[i18n.language === 'en' ? 'en' : 'th']

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    load()
    return () => clearInterval(timer)
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [tod, hist] = await Promise.all([
        getTodayAttendance(employee.id),
        getAttendanceHistory(employee.id, 1),
      ])
      setToday(tod)
      setHistory(hist)
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  const handleCheckIn = () => {
    setChecking(true)
    const doCheckIn = async (lat, lng) => {
      try {
        const att = await checkIn(employee.id, employee.company_id, lat, lng)
        setToday(att)
        setHistory(p => [att, ...p.filter(x => x.date !== att.date)])
        toast(att.status === 'late'
          ? choose(i18n, '⏰ บันทึกเวลาสำเร็จ — มาสาย', '⏰ Time recorded — Late')
          : choose(i18n, '✓ บันทึกเวลาสำเร็จ — ตรงเวลา', '✓ Time recorded — On time'),
          att.status === 'late' ? 'warning' : 'success')
      } catch (e) { toast(e.message, 'error') }
      finally { setChecking(false) }
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => doCheckIn(pos.coords.latitude, pos.coords.longitude),
        () => doCheckIn(null, null),
        { timeout: 5000 }
      )
    } else { doCheckIn(null, null) }
  }

  const handleCheckOut = async () => {
    setChecking(true)
    try {
      const att = await checkOut(employee.id)
      setToday(att)
      setHistory(p => p.map(x => x.id === att.id ? att : x))
      toast(choose(i18n, '✓ บันทึกเวลาสำเร็จ', '✓ Time recorded'))
    } catch (e) { toast(e.message, 'error') }
    finally { setChecking(false) }
  }

  // Stats
  const thisMonthHist = history.filter(h => {
    const d = new Date(h.date)
    const n = new Date()
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
  })
  const workDays = thisMonthHist.filter(h => h.check_in).length
  const lateDays = thisMonthHist.filter(h => h.status === 'late').length

  return (
    <>
      {ToastEl}
      <PageHeader title={t('nav.attendance')} subtitle={choose(i18n, 'บันทึกเวลาทำงาน', 'Record working time')} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — Time */}
        <div className="space-y-4">
          {/* Clock */}
          <Card className="text-center">
            <p className="text-xs text-slate-400 mb-1">
              {now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="text-5xl font-bold text-slate-800 tabular-nums my-3">
              {now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>

            {/* Status indicator */}
            {today && (
              <div className="flex justify-center mb-3">
                <Badge color={STATUS_COLOR[today.status]}>{statusLabel[today.status]}</Badge>
              </div>
            )}

            {/* Today's times */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { key: 'start', value: fmtTime(today?.check_in), color: 'text-emerald-600' },
                { key: 'end', value: fmtTime(today?.check_out), color: 'text-red-500' },
              ].map(({ key, value, color }) => (
                <div key={key} className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className={`text-2xl font-bold tabular-nums ${value !== '—' ? color : 'text-slate-300'}`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCheckIn}
                disabled={!!today?.check_in || checking}
                aria-label={choose(i18n, 'บันทึกเวลาเริ่มต้น', 'Record start time')}
                title={choose(i18n, 'บันทึกเวลาเริ่มต้น', 'Record start time')}
                className="h-12 bg-primary-700 hover:bg-primary-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center justify-center shadow-sm"
              >
                {checking ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : '📍'}
              </button>
              <button
                onClick={handleCheckOut}
                disabled={!today?.check_in || !!today?.check_out || checking}
                aria-label={choose(i18n, 'บันทึกเวลาสิ้นสุด', 'Record end time')}
                title={choose(i18n, 'บันทึกเวลาสิ้นสุด', 'Record end time')}
                className="h-12 border-2 border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-xl transition-all flex items-center justify-center"
              >
                🏁
              </button>
            </div>

            {today?.check_in_lat && (
              <p className="text-xs text-slate-400 mt-3">
                📍 GPS: {today.check_in_lat.toFixed(4)}, {today.check_in_lng.toFixed(4)}
              </p>
            )}
          </Card>

          {/* Monthly Summary */}
          <Card>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{choose(i18n, 'เดือนนี้', 'This Month')}</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: choose(i18n, 'วันทำงาน', 'Work Days'), value: workDays, color: 'text-primary-700', bg: 'bg-primary-50' },
                { label: choose(i18n, 'มาสาย', 'Late'), value: lateDays, color: 'text-amber-600', bg: 'bg-amber-50' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`${bg} rounded-2xl p-3 text-center`}>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right — History */}
        <div className="lg:col-span-2">
          <Card padding={false}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <p className="font-semibold text-slate-700">{choose(i18n, 'ประวัติการลงเวลา', 'Time History')}</p>
              <button onClick={load} className="text-xs text-primary-600 hover:text-primary-700 font-medium">🔄 {t('common.refresh')}</button>
            </div>

            {loading
              ? <div className="p-4 space-y-3">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
              : history.length === 0
                ? <div className="py-12 text-center text-slate-400 text-sm">{choose(i18n, 'ยังไม่มีข้อมูลการลงเวลา', 'No attendance records yet')}</div>
                : (
                  <div className="divide-y divide-slate-50">
                    {history.map(h => {
                      const isToday = h.date === new Date().toISOString().split('T')[0]
                      const duration = h.check_in && h.check_out
                        ? (() => {
                          const diff = new Date(h.check_out) - new Date(h.check_in)
                          const hrs = Math.floor(diff / 3600000)
                          const mins = Math.floor((diff % 3600000) / 60000)
                          return `${hrs}h ${mins}m`
                        })() : null
                      return (
                        <div key={h.id} className={`px-5 py-3.5 flex items-center gap-4 ${isToday ? 'bg-primary-50/50' : ''}`}>
                          <div className="w-12 text-center flex-shrink-0">
                            <p className="text-xs font-bold text-slate-700">
                              {new Date(h.date).toLocaleDateString(locale, { day: 'numeric' })}
                            </p>
                            <p className="text-xs text-slate-400">
                              {new Date(h.date).toLocaleDateString(locale, { month: 'short' })}
                            </p>
                            {isToday && <p className="text-xs text-primary-600 font-bold">{choose(i18n, 'วันนี้', 'Today')}</p>}
                          </div>
                          <div className="flex-1 grid grid-cols-3 gap-3 items-center">
                            <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                              <p className={`text-sm font-semibold ${h.check_in ? 'text-slate-800' : 'text-slate-300'}`}>
                                {fmtTime(h.check_in)}
                              </p>
                            </div>
                            <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                              <p className={`text-sm font-semibold ${h.check_out ? 'text-slate-800' : 'text-slate-300'}`}>
                                {fmtTime(h.check_out)}
                              </p>
                            </div>
                            <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                              <p className="text-sm font-semibold text-slate-800">{duration || '—'}</p>
                            </div>
                          </div>
                          <Badge color={STATUS_COLOR[h.status]}>{statusLabel[h.status]}</Badge>
                        </div>
                      )
                    })}
                  </div>
                )
            }
          </Card>
        </div>
      </div>
    </>
  )
}
