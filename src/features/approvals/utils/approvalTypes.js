export const APPROVAL_STATUS = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  cancelled: 'cancelled',
}

export const REQUEST_TYPES = [
  { value: 'leave_request', label: 'Leave Request' },
  { value: 'ot_request', label: 'OT Request' },
  { value: 'employee_transfer', label: 'Employee Transfer' },
  { value: 'payroll', label: 'Payroll Approval' },
]

export const requestTypeLabel = (type, language = 'en') => {
  const labels = {
    leave_request: { th: 'ใบลา', en: 'Leave request' },
    ot_request: { th: 'คำขอ OT', en: 'OT request' },
    employee_transfer: { th: 'โอนย้ายพนักงาน', en: 'Employee transfer' },
    payroll: { th: 'อนุมัติเงินเดือน', en: 'Payroll approval' },
  }
  return labels[type]?.[language === 'th' ? 'th' : 'en'] || type?.replace(/_/g, ' ') || '-'
}

export const approvalStatusLabel = (status, language = 'en') => {
  const labels = {
    pending: { th: 'รออนุมัติ', en: 'Pending' },
    approved: { th: 'อนุมัติแล้ว', en: 'Approved' },
    rejected: { th: 'ไม่อนุมัติ', en: 'Rejected' },
    cancelled: { th: 'ยกเลิก', en: 'Cancelled' },
    all: { th: 'ทั้งหมด', en: 'All' },
  }
  return labels[status]?.[language === 'th' ? 'th' : 'en'] || status || '-'
}

export const REQUEST_TABLES = {
  leave_request: {
    table: 'leave_requests',
    approve: (approverId) => ({ status: 'approved', approved_by: approverId, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
    reject: (approverId, comment) => ({ status: 'rejected', approved_by: approverId, approved_at: new Date().toISOString(), reject_reason: comment, updated_at: new Date().toISOString() }),
    cancel: () => ({ status: 'cancelled', updated_at: new Date().toISOString() }),
  },
  ot_request: {
    table: 'ot_requests',
    approve: (approverId) => ({ status: 'approved', approved_by: approverId, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
    reject: (approverId, comment) => ({ status: 'rejected', approved_by: approverId, approved_at: new Date().toISOString(), reject_reason: comment, updated_at: new Date().toISOString() }),
    cancel: () => ({ status: 'cancelled', updated_at: new Date().toISOString() }),
  },
  employee_transfer: {
    table: 'employee_transfers',
    approve: () => ({ status: 'approved' }),
    reject: () => ({ status: 'rejected' }),
    cancel: () => ({ status: 'cancelled' }),
  },
  payroll: {
    table: 'payslips',
    approve: (approverId) => ({ status: 'approved', approved_by: approverId, approved_at: new Date().toISOString(), is_published: true, published_at: new Date().toISOString() }),
    reject: (approverId, comment) => ({ status: 'rejected', approved_by: approverId, approved_at: new Date().toISOString(), reject_reason: comment, is_published: false }),
    cancel: () => ({ status: 'cancelled', is_published: false }),
  },
}

export const statusColor = (status) => ({
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
  cancelled: 'gray',
}[status] || 'gray')
