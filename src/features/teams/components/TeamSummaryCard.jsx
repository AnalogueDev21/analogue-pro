import { Card, Badge } from '@/components/ui/index.jsx'
import { fieldName } from '@/utils/lang'
import { getActiveTeamMembers, getTeamLeader } from '../utils/teamHierarchy'

export default function TeamSummaryCard({ team, i18n, onEdit }) {
  const members = getActiveTeamMembers(team)
  const leader = getTeamLeader(team)
  const isActive = team.status === 'active'

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-bold text-slate-900 truncate">{fieldName(i18n, team)}</p>
          <p className="text-sm text-slate-500 truncate">
            {fieldName(i18n, team.branches) || '-'} / {fieldName(i18n, team.departments) || '-'}
          </p>
        </div>
        <Badge color={isActive ? 'green' : 'gray'}>{team.status}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-400">Leader</p>
          <p className="text-sm font-semibold text-slate-700 truncate">
            {leader ? `${leader.first_name} ${leader.last_name}` : '-'}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-400">Members</p>
          <p className="text-sm font-semibold text-slate-700">{members.length}</p>
        </div>
      </div>

      {onEdit && (
        <button
          onClick={() => onEdit(team)}
          className="mt-4 h-11 w-full rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Edit Team
        </button>
      )}
    </Card>
  )
}
