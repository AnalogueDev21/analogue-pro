import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import { PermissionGate } from '@/core/rbac/PermissionGate'
import { ApprovalDecisionModal, ApprovalList, REQUEST_TYPES, approvalStatusLabel, requestTypeLabel } from '@/features/approvals'
import { useApprovals } from '@/features/approvals/hooks/useApprovals'
import { Button, Card, EmptyState, PageHeader, Select, useToast } from '@/components/ui/index.jsx'
import { usePersistedState } from '@/hooks/usePersistedState'
import { choose } from '@/utils/lang'

const TABS = ['pending', 'approved', 'rejected', 'all']

export default function ApprovalsPage() {
  const { t, i18n } = useTranslation()
  const { employee, can } = useAuthStore()
  const { show: toast, el: ToastEl } = useToast()
  const [status, setStatus] = usePersistedState('ap_approvals_status', 'pending')
  const [requestType, setRequestType] = usePersistedState('ap_approvals_request_type', '')
  const [decision, setDecision] = useState(null)
  const canViewCompanyWide =
    can('org.manage_company') ||
    can('employee.view_all') ||
    can('leave.approve_all') ||
    can('ot.approve_all') ||
    can('payroll.manage')
  const filters = useMemo(() => ({
    status,
    request_type: requestType,
    branch_id: canViewCompanyWide ? '' : employee?.branch_id,
  }), [status, requestType, canViewCompanyWide, employee?.branch_id])
  const { items, loading, saving, error, reload, decide } = useApprovals(employee?.company_id, filters)
  const canManage = can('approval.manage')

  const confirmDecision = async (comment) => {
    try {
      await decide({
        approval: decision.approval,
        actorEmployeeId: employee.id,
        status: decision.action,
        comment,
      })
      toast(decision.action === 'approved' ? choose(i18n, 'อนุมัติคำขอแล้ว', 'Request approved') : choose(i18n, 'ไม่อนุมัติคำขอแล้ว', 'Request rejected'))
      setDecision(null)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  return (
    <PermissionGate perms={['approval.view', 'approval.manage']} fallback={<EmptyState title={choose(i18n, 'ไม่มีสิทธิ์เข้าใช้งาน', 'No access')} />}>
      {ToastEl}
      <PageHeader
        title={choose(i18n, 'อนุมัติคำขอ', 'Approvals')}
        subtitle={choose(i18n, 'ตรวจสอบและอนุมัติคำขอลา OT โอนย้าย และเงินเดือน', 'Review requests from leave, OT, transfers, and payroll')}
        action={<Button variant="secondary" onClick={reload}>{t('common.refresh')}</Button>}
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        <div className="flex gap-1 bg-white border border-slate-100 rounded-2xl p-1 w-fit overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setStatus(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${status === tab ? 'bg-primary-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {approvalStatusLabel(tab, i18n.language)}
            </button>
          ))}
        </div>
        <Select value={requestType} onChange={e => setRequestType(e.target.value)}>
          <option value="">{choose(i18n, 'ทุกประเภทคำขอ', 'All request types')}</option>
          {REQUEST_TYPES.map(type => <option key={type.value} value={type.value}>{requestTypeLabel(type.value, i18n.language)}</option>)}
        </Select>
      </div>

      {error && (
        <Card className="mb-4 bg-amber-50 border-amber-100">
          <p className="text-sm text-amber-700">{error}</p>
        </Card>
      )}

      <ApprovalList
        items={items}
        loading={loading}
        canManage={canManage}
        language={i18n.language}
        onApprove={approval => setDecision({ approval, action: 'approved' })}
        onReject={approval => setDecision({ approval, action: 'rejected' })}
      />

      {decision && (
        <ApprovalDecisionModal
          approval={decision.approval}
          action={decision.action}
          language={i18n.language}
          saving={saving}
          onClose={() => setDecision(null)}
          onConfirm={confirmDecision}
        />
      )}
    </PermissionGate>
  )
}
