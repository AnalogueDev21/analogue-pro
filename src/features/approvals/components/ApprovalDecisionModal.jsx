import { useState } from 'react'
import { Button, Field, Modal, Textarea } from '@/components/ui/index.jsx'

export default function ApprovalDecisionModal({ approval, action, saving, onClose, onConfirm }) {
  const [comment, setComment] = useState('')
  const isReject = action === 'rejected'

  return (
    <Modal title={isReject ? 'Reject Request' : 'Approve Request'} onClose={onClose}>
      <p className="text-sm text-slate-500 mb-3">
        {approval.request_type?.replace(/_/g, ' ')} for <strong className="text-slate-800">{approval.requester?.first_name} {approval.requester?.last_name}</strong>
      </p>
      <Field label="Comment" required={isReject}>
        <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add approval note..." />
      </Field>
      <div className="flex gap-3 mt-4">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button
          variant={isReject ? 'danger' : 'primary'}
          className="flex-1"
          loading={saving}
          onClick={() => onConfirm(comment)}
          disabled={isReject && !comment.trim()}
        >
          {isReject ? 'Reject' : 'Approve'}
        </Button>
      </div>
    </Modal>
  )
}
