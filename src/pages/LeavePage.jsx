// src/pages/LeavePage.jsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import { getLeaveTypes, getMyLeaves, getAllLeaves, submitLeave, approveLeave, rejectLeave, cancelLeave, calcDays } from '@/services/leaveService'
import { Card, PageHeader, Field, Input, Textarea, Button, Select, Modal, EmptyState, useToast, Skeleton } from '@/components/ui/index.jsx'
import LeaveCard from '@/components/leave/LeaveCard'
import LeaveApprovalCard from '@/components/leave/LeaveApprovalCard'
import { choose } from '@/utils/lang'
import { usePersistedState } from '@/hooks/usePersistedState'

const FALLBACK_TYPES = [
  { id: 'fallback_annual',   name: 'ลาพักร้อน', name_en: 'Annual Leave',   color: '#22c55e', days_per_year: 10 },
  { id: 'fallback_sick',     name: 'ลาป่วย',    name_en: 'Sick Leave',     color: '#ef4444', days_per_year: 30 },
  { id: 'fallback_personal', name: 'ลากิจ',     name_en: 'Personal Leave', color: '#3b82f6', days_per_year: 6  },
]

export default function LeavePage() {
  const { t, i18n } = useTranslation()
  const { employee, can } = useAuthStore()
  const { show: toast, el: ToastEl } = useToast()

  const isManager    = can('leave.approve_team') || can('leave.approve_all')
  const canApproveAll = can('leave.approve_all')

  const [tab, setTab]               = usePersistedState('ap_leave_tab', 'my')
  const [statusFilter, setStatusFilter] = usePersistedState('ap_leave_filter', 'pending')
  const [leaveTypes, setLeaveTypes] = useState([])
  const [myLeaves, setMyLeaves]     = useState([])
  const [allLeaves, setAllLeaves]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [saving, setSaving]         = useState(false)
  const [form, setForm]             = useState({ leave_type_id: '', start_date: '', end_date: '', reason: '' })
  const [errors, setErrors]         = useState({})

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [types, mine, all] = await Promise.all([
        getLeaveTypes(employee.company_id),
        getMyLeaves(employee.id),
        isManager ? getAllLeaves(employee.company_id, canApproveAll ? {} : { branch_id: employee.branch_id }) : [],
      ])
      setLeaveTypes(types)
      setMyLeaves(mine)
      setAllLeaves(all)
      setForm(f => ({ ...f, leave_type_id: (types[0] || FALLBACK_TYPES[0]).id }))
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  const types = leaveTypes.length ? leaveTypes : FALLBACK_TYPES
  const days = calcDays(form.start_date, form.end_date)

  const validate = () => {
    const e = {}
    if (!form.leave_type_id) e.leave_type_id = choose(i18n, 'กรุณาเลือกประเภทการลา', 'Please select leave type')
    if (!form.start_date)    e.start_date = choose(i18n, 'กรุณาเลือกวันที่', 'Please select a date')
    if (!form.end_date)      e.end_date   = choose(i18n, 'กรุณาเลือกวันที่', 'Please select a date')
    if (form.start_date && form.end_date && form.end_date < form.start_date)
      e.end_date = choose(i18n, 'วันสิ้นสุดต้องหลังวันเริ่มต้น', 'End date must be after start date')
    if (!form.reason.trim()) e.reason = choose(i18n, 'กรุณาระบุเหตุผล', 'Please enter a reason')
    return e
  }

  const submit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const data = await submitLeave({ ...form, employee_id: employee.id, company_id: employee.company_id, days })
      const type = types.find(lt => lt.id === form.leave_type_id)
      setMyLeaves(p => [{ ...data, leave_types: data.leave_types || type }, ...p])
      toast(choose(i18n, 'ยื่นใบลาสำเร็จ ✓', 'Leave request submitted ✓'))
      setShowForm(false)
      setForm({ leave_type_id: types[0]?.id || '', start_date: '', end_date: '', reason: '' })
      setErrors({})
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const handleApprove = async (id) => {
    try {
      const data = await approveLeave(id, employee.id)
      setAllLeaves(p => p.map(x => x.id === id ? data : x))
      toast(choose(i18n, 'อนุมัติใบลาสำเร็จ ✓', 'Leave approved ✓'))
    } catch (e) { toast(e.message, 'error') }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast(choose(i18n, 'กรุณาระบุเหตุผล', 'Please enter a reason'), 'warning'); return }
    try {
      const data = await rejectLeave(rejectModal.id, employee.id, rejectReason)
      setAllLeaves(p => p.map(x => x.id === rejectModal.id ? data : x))
      toast(choose(i18n, 'ปฏิเสธใบลาแล้ว', 'Leave rejected'), 'error')
      setRejectModal(null)
      setRejectReason('')
    } catch (e) { toast(e.message, 'error') }
  }

  const handleCancel = async (id) => {
    try {
      const data = await cancelLeave(id)
      setMyLeaves(p => p.map(x => x.id === id ? data : x))
      toast(choose(i18n, 'ยกเลิกใบลาแล้ว', 'Leave cancelled'), 'warning')
    } catch (e) { toast(e.message, 'error') }
  }

  const filtered = allLeaves.filter(l => !statusFilter || l.status === statusFilter)
  const pendingCount = allLeaves.filter(l => l.status === 'pending').length
  const lang = i18n.language === 'en' ? 'en' : 'th'

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
            {choose(i18n, 'อนุมัติใบลา', 'Approvals')}
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
              : <div className="divide-y divide-slate-50">
                  {myLeaves.map(l => <LeaveCard key={l.id} leave={l} onCancel={handleCancel} t={t} />)}
                </div>
          }
        </Card>
      )}

      {/* Approve Tab */}
      {tab === 'approve' && isManager && (
        <div className="space-y-4">
          {/* Status filter */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'pending',  label: choose(i18n, 'รออนุมัติ', 'Pending'),  count: allLeaves.filter(l => l.status === 'pending').length },
              { key: 'approved', label: choose(i18n, 'อนุมัติแล้ว', 'Approved'), count: allLeaves.filter(l => l.status === 'approved').length },
              { key: 'rejected', label: choose(i18n, 'ไม่อนุมัติ', 'Rejected'), count: allLeaves.filter(l => l.status === 'rejected').length },
              { key: '',         label: t('common.all'),                          count: allLeaves.length },
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
            : filtered.length === 0
              ? <EmptyState icon="📋" title={t('common.noData')} />
              : filtered.map(l => (
                  <LeaveApprovalCard key={l.id} leave={l} onApprove={handleApprove} onReject={setRejectModal} t={t} />
                ))
          }
        </div>
      )}

      {/* Submit Modal */}
      {showForm && (
        <Modal title={t('leave.apply')} onClose={() => { setShowForm(false); setErrors({}) }}>
          <div className="space-y-4">
            <Field label={t('leave.type')} required error={errors.leave_type_id}>
              <Select value={form.leave_type_id} onChange={e => setForm(p => ({ ...p, leave_type_id: e.target.value }))}>
                {types.map(lt => (
                  <option key={lt.id} value={lt.id}>
                    {lang === 'en' ? (lt.name_en || lt.name) : (lt.name || lt.name_en)} ({lt.days_per_year} {choose(i18n, 'วัน/ปี', 'days/yr')})
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t('leave.startDate')} required error={errors.start_date}>
                <Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} error={errors.start_date} />
              </Field>
              <Field label={t('leave.endDate')} required error={errors.end_date}>
                <Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} error={errors.end_date} />
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
        <Modal title={choose(i18n, 'ระบุเหตุผลที่ไม่อนุมัติ', 'Enter rejection reason')}
          onClose={() => { setRejectModal(null); setRejectReason('') }}>
          <p className="text-sm text-slate-500 mb-3">
            {choose(i18n, 'ใบลาของ', 'Leave request for')}{' '}
            <strong className="text-slate-800">{rejectModal.employees?.first_name} {rejectModal.employees?.last_name}</strong>
          </p>
          <Field label={t('leave.reason')} required>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder={choose(i18n, 'ระบุเหตุผล...', 'Enter reason...')} />
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
