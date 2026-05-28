import { useState } from 'react'
import { Button, Field, Modal, Textarea } from '@/components/ui/index.jsx'
import { requestTypeLabel } from '../utils/approvalTypes'

export default function ApprovalDecisionModal({ approval, action, saving, onClose, onConfirm, language = 'en' }) {
  const [comment, setComment] = useState('')
  const isReject = action === 'rejected'
  const isTh = language === 'th'

  return (
    <Modal title={isReject ? (isTh ? 'ไม่อนุมัติคำขอ' : 'Reject request') : (isTh ? 'อนุมัติคำขอ' : 'Approve request')} onClose={onClose}>
      <p className="text-sm text-slate-500 mb-3">
        {requestTypeLabel(approval.request_type, language)} {isTh ? 'ของ' : 'for'}{' '}
        <strong className="text-slate-800">{approval.requester?.first_name} {approval.requester?.last_name}</strong>
      </p>
      <Field label={isTh ? 'หมายเหตุ' : 'Comment'} required={isReject}>
        <Textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder={isTh ? 'เพิ่มหมายเหตุการอนุมัติ...' : 'Add approval note...'}
        />
      </Field>
      <div className="flex gap-3 mt-4">
        <Button variant="secondary" className="flex-1" onClick={onClose}>{isTh ? 'ยกเลิก' : 'Cancel'}</Button>
        <Button
          variant={isReject ? 'danger' : 'primary'}
          className="flex-1"
          loading={saving}
          onClick={() => onConfirm(comment)}
          disabled={isReject && !comment.trim()}
        >
          {isReject ? (isTh ? 'ไม่อนุมัติ' : 'Reject') : (isTh ? 'อนุมัติ' : 'Approve')}
        </Button>
      </div>
    </Modal>
  )
}
