// src/services/attendanceService.js
import { supabase } from './supabase'

// ── Check In ──────────────────────────────────────────────────────
export const checkIn = async (employeeId, companyId, lat = null, lng = null) => {
  const today = new Date().toISOString().split('T')[0]
  const now = new Date()
  const hour = now.getHours()
  const status = hour >= 9 ? 'late' : 'on_time'

  const { data, error } = await supabase
    .from('attendance')
    .upsert({
      employee_id: employeeId,
      company_id: companyId,
      date: today,
      check_in: now.toISOString(),
      check_in_lat: lat,
      check_in_lng: lng,
      status,
    }, { onConflict: 'employee_id,date' })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Check Out ─────────────────────────────────────────────────────
export const checkOut = async (employeeId, lat = null, lng = null) => {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('attendance')
    .update({
      check_out: new Date().toISOString(),
      check_out_lat: lat,
      check_out_lng: lng,
    })
    .eq('employee_id', employeeId)
    .eq('date', today)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Get Today ─────────────────────────────────────────────────────
export const getTodayAttendance = async (employeeId) => {
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('date', today)
    .maybeSingle()
  return data
}

// ── Get History ───────────────────────────────────────────────────
export const getAttendanceHistory = async (employeeId, months = 1) => {
  const from = new Date()
  from.setMonth(from.getMonth() - months)
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('date', from.toISOString().split('T')[0])
    .order('date', { ascending: false })
  if (error) throw error
  return data || []
}

// ── Get All (Admin) ───────────────────────────────────────────────
export const getAllAttendance = async (companyId, date) => {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, employees(id, first_name, last_name, employee_code, avatar_url, departments(name), positions(name))')
    .eq('company_id', companyId)
    .eq('date', date)
    .order('check_in', { ascending: true })
  if (error) throw error
  return data || []
}

// ── Get Monthly Summary ───────────────────────────────────────────
export const getMonthlySummary = async (employeeId, year, month) => {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const to = new Date(year, month, 0).toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('date', from)
    .lte('date', to)
  if (error) throw error
  const records = data || []
  return {
    workDays: records.filter(r => r.check_in).length,
    lateDays: records.filter(r => r.status === 'late').length,
    absentDays: records.filter(r => r.status === 'absent').length,
    records,
  }
}

// ── Format time ───────────────────────────────────────────────────
export const fmtTime = (ts) => {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

export const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}
