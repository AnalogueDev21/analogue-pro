// src/pages/LeavePage.jsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import {
  getLeaveTypes, getMyLeaves, getAllLeaves,
  submitLeave, approveLeave, rejectLeave, cancelLeave, calcDays
} from '@/services/leaveService'
import {
  Card, PageHeader, Field, Input, Textarea, Button, Badge, Select,
  Modal, ConfirmDialog, EmptyState, useToast, Skeleton, Table
} from '@/components/ui/index.jsx'
import { choose, localeOf } from '@/utils/lang'
import { usePersistedState } from '@/hooks/usePersistedState'

const STATUS_COLOR = { pending: 'amber', approved: 'green', rejected: 'red', cancelled: 'gray' }
const STATUS_LABEL = {
  th: { pending: 'รออนุมัติ', approved: 'อนุมัติ', rejected: 'ไม่อนุมัติ', cancelled: 'ยกเลิก' },
  en: { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled' },
}

const FALLBACK_LEAVE_TYPES = [
  { id: 'fallback_annual', name: 'Annual Leave', name_en: 'Annual Leave', color: '#22c55e', days_per_year: 10 },
  { id: 'fallback_sick', name: 'Sick Leave', name_en: 'Sick Leave', color: '#ef4444', days_per_year: 30 },
  { id: 'fallback_personal', name: 'Personal Leave', name_en: 'Personal Leave', color: '#3b82f6', days_per_year: 6 },
  { id: 'fallback_maternity', name: 'Maternity Leave', name_en: 'Maternity Leave', color: '#a855f7', days_per_year: 98 },
]

export default function LeavePage() {
  const { t, i18n } = useTranslation()
  const { employee, can } = useAuthStore()
  const { show: toast, el: ToastEl } = useToast()

  const isManager = can('leave.approve_team') || can('leave.approve_all')
  const canApproveAll = can('leave.approve_all')

  const [tab, setTab] = usePersistedState('ap_leave_tab', 'my')
  const [leaveTypes, setLeaveTypes] = useState([])
  const [myLeaves, setMyLeaves] = useState([])
  const [allLeaves, setAllLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = usePersistedState('ap_leave_status_filter', 'pending')

  const [form, setForm] = useState({
    leave_type_id: '', start_date: '', end_date: '', reason: '',
  })
  const [errors, setErrors] = useState({})
  const locale = localeOf(i18n)
  const statusLabel = STATUS_LABEL[i18n.language === 'en' ? 'en' : 'th']
  const availableLeaveTypes = leaveTypes.length ? leaveTypes : FALLBACK_LEAVE_TYPES

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [types, mine, all] = await Promise.all([
        getLeaveTypes(employee.company_id),
        getMyLeaves(employee.id),
        isManager ? getAllLeaves(employee.company_id, canApproveAll ? {} : { branch_id: employee.branch_id }) : Promise.resolve([]),
      ])
      setLeaveTypes(types)
      setMyLeaves(mine)
      setAllLeaves(all)
      setForm(f => ({ ...f, leave_type_id: (types[0] || FALLBACK_LEAVE_TYPES[0]).id }))
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  const days = calcDays(form.start_date, form.end_date)

  const validate = () => {
    const e = {}
    if (!form.leave_type_id) e.leave_type_id = choose(i18n, 'กรุณาเลือกประเภทการลา', 'Please select leave type')
    if (!form.start_date) e.start_date = choose(i18n, 'กรุณาเลือกวันที่', 'Please select a date')
    if (!form.end_date) e.end_date = choose(i18n, 'กรุณาเลือกวันที่', 'Please select a date')
    if (form.start_date && form.end_date && form.end_date < form.start_date) e.end_date = choose(i18n, 'วันสิ้นสุดต้องหลังวันเริ่มต้น', 'End date must be after start date')
    if (!form.reason.trim()) e.reason = choose(i18n, 'กรุณาระบุเหตุผล', 'Please enter a reason')
    return e
  }

  const submit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const data = await submitLeave({
        ...form,
        employee_id: employee.id,
        company_id: employee.company_id,
        days,
      })
      const selectedType = availableLeaveTypes.find(lt => lt.id === form.leave_type_id)
      setMyLeaves(p => [{ ...data, leave_types: data.leave_types || selectedType }, ...p])
      toast(choose(i18n, 'ยื่นใบลาสำเร็จ ✓', 'Leave request submitted ✓'))
      setShowForm(false)
      setForm({ leave_type_id: availableLeaveTypes[0]?.id || '', start_date: '', end_date: '', reason: '' })
      setErrors({})
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const handleApprove = async (id) => {
    try {
      const data = await approveLeave(id, employee.id)
      setAllLeaves(p => p.map(x => x.id === id ? data : x))
      toast(choose(i18n, 'อนุมัติใบลาสำเร็จ ✓', 'Leave request approved ✓'))
    } catch (e) { toast(e.message, 'error') }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast(choose(i18n, 'กรุณาระบุเหตุผล', 'Please enter a reason'), 'warning'); return }
    try {
      const data = await rejectLeave(rejectModal.id, employee.id, rejectReason)
      setAllLeaves(p => p.map(x => x.id === rejectModal.id ? data : x))
      toast(choose(i18n, 'ปฏิเสธใบลาแล้ว', 'Leave request rejected'), 'error')
      setRejectModal(null)
      setRejectReason('')
    } catch (e) { toast(e.message, 'error') }
  }

  const handleCancel = async (id) => {
    try {
      const data = await cancelLeave(id)
      setMyLeaves(p => p.map(x => x.id === id ? data : x))
      toast(choose(i18n, 'ยกเลิกใบลาแล้ว', 'Leave request cancelled'), 'warning')
    } catch (e) { toast(e.message, 'error') }
  }

  const filteredAll = allLeaves.filter(l => !statusFilter || l.status === statusFilter)
  const pendingCount = allLeaves.filter(l => l.status === 'pending').length

  return (
    <>
      {ToastEl}
      <PageHeader
        title={t('nav.leave')}
        subtitle={choose(i18n, 'จัดการการลางาน', 'Manage leave requests')}
        action={<Button icon="+" onClick={() => setShowForm(true)}>{t('leave.apply')}</Button>}
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-slate-100 rounded-2xl p-1 mb-5 w-fit">
        <button onClick={() => setTab('my')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'my' ? 'bg-primary-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
          {choose(i18n, 'ใบลาของฉัน', 'My Leave')}
        </button>
        {isManager && (
          <button onClick={() => setTab('approve')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${tab === 'approve' ? 'bg-primary-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
            {choose(i18n, 'อนุมัติใบลา', 'Leave Approvals')}
            {pendingCount > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === 'approve' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>
                {pendingCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* My Leaves */}
      {tab === 'my' && (
        <Card padding={false}>
          {loading
            ? <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
            : myLeaves.length === 0
              ? <EmptyState icon="📅" title={choose(i18n, 'ยังไม่มีใบลา', 'No leave requests yet')}
                  action={<Button icon="+" onClick={() => setShowForm(true)}>{t('leave.apply')}</Button>} />
              : (
                <div className="divide-y divide-slate-50">
                  {myLeaves.map(l => (
                    <div key={l.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                            style={{ backgroundColor: l.leave_types?.color || '#3b82f6' }} />
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{i18n.language === 'en' ? (l.leave_types?.name_en || l.leave_types?.name || '—') : (l.leave_types?.name || l.leave_types?.name_en || '—')}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {new Date(l.start_date).toLocaleDateString(locale)} — {new Date(l.end_date).toLocaleDateString(locale)} · {l.days} {t('leave.days')}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">{l.reason}</p>
                            {l.reject_reason && (
                              <p className="text-xs text-red-500 mt-1">{t('leave.reason')}: {l.reject_reason}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge color={STATUS_COLOR[l.status]}>{statusLabel[l.status]}</Badge>
                          {l.status === 'pending' && (
                            <button onClick={() => handleCancel(l.id)}
                              className="text-xs text-slate-400 hover:text-red-500 transition-colors">{t('common.cancel')}</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
          }
        </Card>
      )}

      {/* Approve Tab */}
      {tab === 'approve' && isManager && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'pending', label: statusLabel.pending, count: allLeaves.filter(l => l.status === 'pending').length },
              { key: 'approved', label: statusLabel.approved, count: allLeaves.filter(l => l.status === 'approved').length },
              { key: 'rejected', label: statusLabel.rejected, count: allLeaves.filter(l => l.status === 'rejected').length },
              { key: '', label: t('common.all'), count: allLeaves.length },
            ].map(s => (
              <button key={s.key} onClick={() => setStatusFilter(s.key)}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-all ${
                  statusFilter === s.key ? 'bg-primary-700 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                }`}>
                {s.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusFilter === s.key ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                  {s.count}
                </span>
              </button>
            ))}
          </div>

          {loading
            ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
            : filteredAll.length === 0
              ? <EmptyState icon="📋" title={t('common.noData')} />
              : filteredAll.map(l => (
                <Card key={l.id}>
                  <div className="flex items-start gap-4 flex-wrap">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
                        {l.employees?.first_name?.[0]}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{l.employees?.first_name} {l.employees?.last_name}</p>
                        <p className="text-xs text-slate-400">{l.employees?.departments?.name} · {l.employees?.positions?.name}</p>
                      </div>
                    </div>
                    <Badge color={STATUS_COLOR[l.status]}>{statusLabel[l.status]}</Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      [t('leave.type'), i18n.language === 'en' ? (l.leave_types?.name_en || l.leave_types?.name || '—') : (l.leave_types?.name || l.leave_types?.name_en || '—')],
                      [choose(i18n, 'ช่วงเวลา', 'Period'), `${new Date(l.start_date).toLocaleDateString(locale)} – ${new Date(l.end_date).toLocaleDateString(locale)}`],
                      [choose(i18n, 'จำนวน', 'Amount'), `${l.days} ${t('leave.days')}`],
                      [t('leave.reason'), l.reason],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-slate-50 rounded-xl p-2.5">
                        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                        <p className="text-sm font-semibold text-slate-700 truncate">{value}</p>
                      </div>
                    ))}
                  </div>

                  {l.reject_reason && (
                    <p className="text-xs text-red-500 mt-2">{choose(i18n, 'เหตุผลที่ไม่อนุมัติ', 'Rejection reason')}: {l.reject_reason}</p>
                  )}

                  {l.status === 'pending' && (
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => handleApprove(l.id)}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors">
                        ✓ {t('leave.approve')}
                      </button>
                      <button onClick={() => setRejectModal(l)}
                        className="flex-1 py-2.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-xl text-sm font-bold transition-colors">
                        ✕ {t('leave.reject')}
                      </button>
                    </div>
                  )}
                </Card>
              ))
          }
        </div>
      )}

      {/* Submit Form */}
      {showForm && (
        <Modal title={t('leave.apply')} onClose={() => { setShowForm(false); setErrors({}) }} size="md">
          <div className="space-y-4">
            <Field label={t('leave.type')} required error={errors.leave_type_id}>
              <Select value={form.leave_type_id} onChange={e => setForm(p => ({ ...p, leave_type_id: e.target.value }))}>
                {availableLeaveTypes.map(lt => (
                  <option key={lt.id} value={lt.id}>
                    {i18n.language === 'en' ? (lt.name_en || lt.name) : (lt.name || lt.name_en)} ({lt.days_per_year} {choose(i18n, 'วัน/ปี', 'days/year')})
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('leave.startDate')} required error={errors.start_date}>
                <Input type="date" value={form.start_date}
                  onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} error={errors.start_date} />
              </Field>
              <Field label={t('leave.endDate')} required error={errors.end_date}>
                <Input type="date" value={form.end_date}
                  onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} error={errors.end_date} />
              </Field>
            </div>
            {days > 0 && (
              <div className="bg-primary-50 border border-primary-200 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-primary-700">{t('leave.days')}</span>
                <span className="text-xl font-bold text-primary-700">{days} {t('leave.days')}</span>
              </div>
            )}
            <Field label={t('leave.reason')} required error={errors.reason}>
              <Textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                placeholder={choose(i18n, 'ระบุเหตุผลการลา...', 'Enter leave reason...')} error={errors.reason} />
            </Field>
          </div>
          <div className="flex gap-3 mt-5">
            <Button variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button className="flex-1" loading={saving} onClick={submit}>{t('leave.apply')}</Button>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <Modal title={choose(i18n, 'ระบุเหตุผลที่ไม่อนุมัติ', 'Enter rejection reason')} onClose={() => { setRejectModal(null); setRejectReason('') }}>
          <p className="text-sm text-slate-500 mb-3">
            {choose(i18n, 'ใบลาของ', 'Leave request for')} <strong className="text-slate-800">{rejectModal.employees?.first_name} {rejectModal.employees?.last_name}</strong>
          </p>
          <Field label={t('leave.reason')} required>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder={choose(i18n, 'ระบุเหตุผล...', 'Enter reason...')} />
          </Field>
          <div className="flex gap-3 mt-4">
            <Button variant="secondary" className="flex-1" onClick={() => { setRejectModal(null); setRejectReason('') }}>{t('common.cancel')}</Button>
            <Button variant="danger" className="flex-1" onClick={handleReject}>{t('common.confirm')}</Button>
          </div>
        </Modal>
      )}
    </>
  )
}
