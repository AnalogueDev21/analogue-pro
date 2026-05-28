// src/pages/OTPage.jsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import {
  getMyOT, getAllOT, submitOT, approveOT, rejectOT, cancelOT,
  calcHours, detectDayType
} from '@/services/otService'
import {
  Card, PageHeader, Field, Input, Textarea, Button, Badge, Select,
  Modal, EmptyState, useToast, Skeleton
} from '@/components/ui/index.jsx'
import { choose, localeOf } from '@/utils/lang'
import { usePersistedState } from '@/hooks/usePersistedState'

const STATUS_COLOR = { pending: 'amber', approved: 'green', rejected: 'red', cancelled: 'gray' }
const STATUS_LABEL = {
  th: { pending: 'รออนุมัติ', approved: 'อนุมัติ', rejected: 'ไม่อนุมัติ', cancelled: 'ยกเลิก' },
  en: { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled' },
}

export default function OTPage() {
  const { t, i18n } = useTranslation()
  const { employee, can } = useAuthStore()
  const { show: toast, el: ToastEl } = useToast()

  const isManager = can('ot.approve_team') || can('ot.approve_all')
  const canApproveAll = can('ot.approve_all')

  const [tab, setTab] = usePersistedState('ap_ot_tab', 'my')
  const [myOT, setMyOT] = useState([])
  const [allOT, setAllOT] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = usePersistedState('ap_ot_status_filter', 'pending')

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    start_time: '18:00',
    end_time: '20:00',
    day_type: 'normal',
    detail: '',
  })
  const [errors, setErrors] = useState({})
  const locale = localeOf(i18n)
  const statusLabel = STATUS_LABEL[i18n.language === 'en' ? 'en' : 'th']

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [mine, all] = await Promise.all([
        getMyOT(employee.id),
        isManager ? getAllOT(employee.company_id, canApproveAll ? {} : { branch_id: employee.branch_id }) : Promise.resolve([]),
      ])
      setMyOT(mine)
      setAllOT(all)
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  const hours = calcHours(form.start_time, form.end_time)

  const handleDateChange = (date) => {
    setForm(p => ({ ...p, date, day_type: detectDayType(date) }))
  }

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
      const data = await submitOT({
        ...form,
        hours,
        employee_id: employee.id,
        company_id: employee.company_id,
      })
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
      toast(choose(i18n, 'อนุมัติ OT สำเร็จ ✓', 'OT request approved ✓'))
    } catch (e) { toast(e.message, 'error') }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast(choose(i18n, 'กรุณาระบุเหตุผล', 'Please enter a reason'), 'warning'); return }
    try {
      const data = await rejectOT(rejectModal.id, employee.id, rejectReason)
      setAllOT(p => p.map(x => x.id === rejectModal.id ? data : x))
      toast(choose(i18n, 'ปฏิเสธ OT แล้ว', 'OT request rejected'), 'error')
      setRejectModal(null)
      setRejectReason('')
    } catch (e) { toast(e.message, 'error') }
  }

  const handleCancel = async (id) => {
    try {
      const data = await cancelOT(id)
      setMyOT(p => p.map(x => x.id === id ? data : x))
      toast(choose(i18n, 'ยกเลิก OT แล้ว', 'OT request cancelled'), 'warning')
    } catch (e) { toast(e.message, 'error') }
  }

  const filteredAll = allOT.filter(o => !statusFilter || o.status === statusFilter)
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

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: choose(i18n, 'OT รวม (อนุมัติ)', 'Approved OT Total'), value: `${approvedHours} ${t('ot.hours')}`, color: 'text-primary-700', bg: 'bg-primary-50' },
          { label: statusLabel.pending, value: myOT.filter(o => o.status === 'pending').length, color: 'text-amber-600', bg: 'bg-amber-50' },
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
              ? <EmptyState icon="⏱" title={choose(i18n, 'ยังไม่มีรายการ OT', 'No OT requests yet')}
                  action={<Button icon="+" onClick={() => setShowForm(true)}>{t('ot.apply')}</Button>} />
              : (
                <div className="divide-y divide-slate-50">
                  {myOT.map(o => (
                    <div key={o.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-semibold text-slate-800 text-sm">
                              {new Date(o.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              o.day_type === 'holiday' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {o.day_type === 'holiday' ? t('ot.holiday') : t('ot.normal')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{o.start_time} – {o.end_time} · {o.hours} {t('ot.hours')}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{o.detail}</p>
                          {o.reject_reason && <p className="text-xs text-red-500 mt-1">{t('leave.reason')}: {o.reject_reason}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge color={STATUS_COLOR[o.status]}>{statusLabel[o.status]}</Badge>
                          {o.status === 'pending' && (
                            <button onClick={() => handleCancel(o.id)}
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
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'pending', label: statusLabel.pending, count: allOT.filter(o => o.status === 'pending').length },
              { key: 'approved', label: statusLabel.approved, count: allOT.filter(o => o.status === 'approved').length },
              { key: 'rejected', label: statusLabel.rejected, count: allOT.filter(o => o.status === 'rejected').length },
              { key: '', label: t('common.all'), count: allOT.length },
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
            : filteredAll.length === 0
              ? <EmptyState icon="⏱" title={choose(i18n, 'ไม่มีรายการ OT', 'No OT requests')} />
              : filteredAll.map(o => (
                <Card key={o.id}>
                  <div className="flex items-start gap-4 flex-wrap">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
                        {o.employees?.first_name?.[0]}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{o.employees?.first_name} {o.employees?.last_name}</p>
                        <p className="text-xs text-slate-400">{o.employees?.departments?.name} · {o.employees?.positions?.name}</p>
                      </div>
                    </div>
                    <Badge color={STATUS_COLOR[o.status]}>{statusLabel[o.status]}</Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      [t('ot.date'), new Date(o.date).toLocaleDateString(locale)],
                      [choose(i18n, 'เวลา', 'Time'), `${o.start_time} – ${o.end_time}`],
                      [choose(i18n, 'จำนวน', 'Amount'), `${o.hours} ${t('ot.hours')}`],
                      [t('ot.type'), o.day_type === 'holiday' ? t('ot.holiday') : t('ot.normal')],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-slate-50 rounded-xl p-2.5">
                        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                        <p className="text-sm font-semibold text-slate-700">{value}</p>
                      </div>
                    ))}
                  </div>

                  <p className="text-sm text-slate-600 mt-2">{o.detail}</p>

                  {o.reject_reason && (
                    <p className="text-xs text-red-500 mt-2">{choose(i18n, 'เหตุผลที่ไม่อนุมัติ', 'Rejection reason')}: {o.reject_reason}</p>
                  )}

                  {o.status === 'pending' && (
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => handleApprove(o.id)}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors">
                        ✓ {t('leave.approve')}
                      </button>
                      <button onClick={() => setRejectModal(o)}
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
        <Modal title={t('ot.apply')} onClose={() => { setShowForm(false); setErrors({}) }}>
          <div className="space-y-4">
            <Field label={t('ot.date')} required error={errors.date}>
              <Input type="date" value={form.date} onChange={e => handleDateChange(e.target.value)} error={errors.date} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('ot.startTime')} required>
                <Input type="time" value={form.start_time}
                  onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} />
              </Field>
              <Field label={t('ot.endTime')} required error={errors.end_time}>
                <Input type="time" value={form.end_time}
                  onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} error={errors.end_time} />
              </Field>
            </div>

            {hours > 0 && (
              <div className="bg-primary-50 border border-primary-200 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-primary-700">{t('ot.hours')}</span>
                <span className="text-xl font-bold text-primary-700">{hours} {t('ot.hours')}</span>
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
                placeholder={choose(i18n, 'ระบุงานที่ทำ...', 'Describe the work...')} error={errors.detail} />
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
        <Modal title={choose(i18n, 'ระบุเหตุผลที่ไม่อนุมัติ', 'Enter rejection reason')} onClose={() => { setRejectModal(null); setRejectReason('') }}>
          <p className="text-sm text-slate-500 mb-3">
            {choose(i18n, 'OT ของ', 'OT request for')} <strong className="text-slate-800">{rejectModal.employees?.first_name} {rejectModal.employees?.last_name}</strong>
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
