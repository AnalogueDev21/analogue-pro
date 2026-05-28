// src/pages/OTPage.jsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import { getMyOT, getAllOT, submitOT, approveOT, rejectOT, cancelOT, calcHours, detectDayType } from '@/services/otService'
import { Card, PageHeader, Field, Input, Textarea, Button, Select, Modal, EmptyState, useToast, Skeleton } from '@/components/ui/index.jsx'
import OTCard from '@/components/ot/OTCard'
import OTApprovalCard from '@/components/ot/OTApprovalCard'
import { choose } from '@/utils/lang'
import { usePersistedState } from '@/hooks/usePersistedState'

export default function OTPage() {
  const { t, i18n } = useTranslation()
  const { employee, can } = useAuthStore()
  const { show: toast, el: ToastEl } = useToast()

  const isManager     = can('ot.approve_team') || can('ot.approve_all')
  const canApproveAll = can('ot.approve_all')

  const [tab, setTab]               = usePersistedState('ap_ot_tab', 'my')
  const [statusFilter, setStatusFilter] = usePersistedState('ap_ot_filter', 'pending')
  const [myOT, setMyOT]             = useState([])
  const [allOT, setAllOT]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [saving, setSaving]         = useState(false)
  const [form, setForm]             = useState({
    date: new Date().toISOString().split('T')[0],
    start_time: '18:00', end_time: '20:00', day_type: 'normal', detail: '',
  })
  const [errors, setErrors] = useState({})

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [mine, all] = await Promise.all([
        getMyOT(employee.id),
        isManager ? getAllOT(employee.company_id, canApproveAll ? {} : { branch_id: employee.branch_id }) : [],
      ])
      setMyOT(mine)
      setAllOT(all)
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  const hours = calcHours(form.start_time, form.end_time)

  const handleDateChange = (date) => setForm(p => ({ ...p, date, day_type: detectDayType(date) }))

  const validate = () => {
    const e = {}
    if (!form.date) e.date = choose(i18n, 'กรุณาเลือกวันที่', 'Please select a date')
    if (hours <= 0) e.end_time = choose(i18n, 'เวลาเลิกต้องหลังเวลาเริ่ม', 'End time must be after start time')
    if (hours > 12) e.end_time = choose(i18n, 'OT ไม่ควรเกิน 12 ชั่วโมง', 'OT should not exceed 12 hours')
    if (!form.detail.trim()) e.detail = choose(i18n, 'กรุณาระบุรายละเอียด', 'Please enter details')
    return e
  }

  const submit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const data = await submitOT({ ...form, hours, employee_id: employee.id, company_id: employee.company_id })
      setMyOT(p => [data, ...p])
      toast(choose(i18n, 'ยื่น OT สำเร็จ ✓', 'OT request submitted ✓'))
      setShowForm(false)
      setForm({ date: new Date().toISOString().split('T')[0], start_time: '18:00', end_time: '20:00', day_type: 'normal', detail: '' })
      setErrors({})
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const handleApprove = async (id) => {
    try {
      const data = await approveOT(id, employee.id)
      setAllOT(p => p.map(x => x.id === id ? data : x))
      toast(choose(i18n, 'อนุมัติ OT สำเร็จ ✓', 'OT approved ✓'))
    } catch (e) { toast(e.message, 'error') }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast(choose(i18n, 'กรุณาระบุเหตุผล', 'Please enter a reason'), 'warning'); return }
    try {
      const data = await rejectOT(rejectModal.id, employee.id, rejectReason)
      setAllOT(p => p.map(x => x.id === rejectModal.id ? data : x))
      toast(choose(i18n, 'ปฏิเสธ OT แล้ว', 'OT rejected'), 'error')
      setRejectModal(null)
      setRejectReason('')
    } catch (e) { toast(e.message, 'error') }
  }

  const handleCancel = async (id) => {
    try {
      const data = await cancelOT(id)
      setMyOT(p => p.map(x => x.id === id ? data : x))
      toast(choose(i18n, 'ยกเลิก OT แล้ว', 'OT cancelled'), 'warning')
    } catch (e) { toast(e.message, 'error') }
  }

  const filtered = allOT.filter(o => !statusFilter || o.status === statusFilter)
  const pendingCount = allOT.filter(o => o.status === 'pending').length
  const approvedHours = myOT.filter(o => o.status === 'approved').reduce((s, o) => s + o.hours, 0)

  return (
    <>
      {ToastEl}
      <PageHeader
        title={t('nav.ot')}
        subtitle={choose(i18n, 'จัดการการทำงานล่วงเวลา', 'Manage overtime requests')}
        action={<Button icon="+" onClick={() => setShowForm(true)}>{t('ot.apply')}</Button>}
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: choose(i18n, 'OT รวม (อนุมัติ)', 'Total OT (Approved)'), value: `${approvedHours} ${choose(i18n,'ชม.','hrs')}`, color: 'text-primary-700', bg: 'bg-primary-50' },
          { label: choose(i18n, 'รออนุมัติ', 'Pending'), value: myOT.filter(o => o.status === 'pending').length, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: t('common.all'), value: myOT.length, color: 'text-slate-700', bg: 'bg-slate-50' },
        ].map(({ label, value, color, bg }) => (
          <Card key={label} className={`text-center ${bg}`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-slate-100 rounded-2xl p-1 mb-5 w-fit">
        <button onClick={() => setTab('my')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'my' ? 'bg-primary-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
          {choose(i18n, 'OT ของฉัน', 'My OT')}
        </button>
        {isManager && (
          <button onClick={() => setTab('approve')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${tab === 'approve' ? 'bg-primary-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
            {choose(i18n, 'อนุมัติ OT', 'OT Approvals')}
            {pendingCount > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === 'approve' ? 'bg-white/20' : 'bg-amber-100 text-amber-700'}`}>
                {pendingCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* My OT */}
      {tab === 'my' && (
        <Card padding={false}>
          {loading
            ? <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
            : myOT.length === 0
              ? <EmptyState icon="⏱" title={choose(i18n, 'ยังไม่มีคำขอ OT', 'No OT requests yet')}
                  action={<Button icon="+" onClick={() => setShowForm(true)}>{t('ot.apply')}</Button>} />
              : <div className="divide-y divide-slate-50">
                  {myOT.map(o => <OTCard key={o.id} ot={o} onCancel={handleCancel} t={t} />)}
                </div>
          }
        </Card>
      )}

      {/* Approve Tab */}
      {tab === 'approve' && isManager && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'pending',  label: choose(i18n, 'รออนุมัติ', 'Pending'),  count: allOT.filter(o => o.status === 'pending').length },
              { key: 'approved', label: choose(i18n, 'อนุมัติแล้ว', 'Approved'), count: allOT.filter(o => o.status === 'approved').length },
              { key: 'rejected', label: choose(i18n, 'ไม่อนุมัติ', 'Rejected'), count: allOT.filter(o => o.status === 'rejected').length },
              { key: '',         label: t('common.all'), count: allOT.length },
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
            ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
            : filtered.length === 0
              ? <EmptyState icon="⏱" title={t('common.noData')} />
              : filtered.map(o => <OTApprovalCard key={o.id} ot={o} onApprove={handleApprove} onReject={setRejectModal} t={t} />)
          }
        </div>
      )}

      {/* Submit Modal */}
      {showForm && (
        <Modal title={t('ot.apply')} onClose={() => { setShowForm(false); setErrors({}) }}>
          <div className="space-y-4">
            <Field label={t('ot.date')} required error={errors.date}>
              <Input type="date" value={form.date} onChange={e => handleDateChange(e.target.value)} error={errors.date} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('ot.startTime')} required>
                <Input type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} />
              </Field>
              <Field label={t('ot.endTime')} required error={errors.end_time}>
                <Input type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} error={errors.end_time} />
              </Field>
            </div>
            {hours > 0 && (
              <div className="bg-primary-50 border border-primary-200 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-primary-700">{t('ot.hours')}</span>
                <span className="text-xl font-bold text-primary-700">{hours} {choose(i18n, 'ชั่วโมง', 'hours')}</span>
              </div>
            )}
            <Field label={t('ot.type')}>
              <Select value={form.day_type} onChange={e => setForm(p => ({ ...p, day_type: e.target.value }))}>
                <option value="normal">{t('ot.normal')}</option>
                <option value="holiday">{t('ot.holiday')}</option>
              </Select>
            </Field>
            <Field label={t('ot.detail')} required error={errors.detail}>
              <Textarea value={form.detail} onChange={e => setForm(p => ({ ...p, detail: e.target.value }))}
                placeholder={choose(i18n, 'ระบุงานที่ทำ...', 'Describe work done...')} error={errors.detail} />
            </Field>
          </div>
          <div className="flex gap-3 mt-5">
            <Button variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button className="flex-1" loading={saving} onClick={submit}>{t('ot.apply')}</Button>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <Modal title={choose(i18n, 'ระบุเหตุผลที่ไม่อนุมัติ', 'Enter rejection reason')}
          onClose={() => { setRejectModal(null); setRejectReason('') }}>
          <p className="text-sm text-slate-500 mb-3">
            {choose(i18n, 'OT ของ', 'OT request for')}{' '}
            <strong className="text-slate-800">{rejectModal.employees?.first_name} {rejectModal.employees?.last_name}</strong>
          </p>
          <Field label={choose(i18n, 'เหตุผล', 'Reason')} required>
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
