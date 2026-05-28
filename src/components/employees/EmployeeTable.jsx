// src/components/employees/EmployeeTable.jsx
import { useTranslation } from 'react-i18next'
import { Badge, Card, EmptyState, StatusBadge, Table } from '@/components/ui/index.jsx'
import { choose, fieldName } from '@/utils/lang'

export default function EmployeeTable({ employees, loading, onView, onEdit, onStatusChange, canEdit, t }) {
  const { i18n } = useTranslation()
  return (
    <Card padding={false}>
      <Table
        loading={loading}
        headers={[
          { label: t('employee.code') },
          { label: choose(i18n, 'ชื่อ-นามสกุล', 'Full Name') },
          { label: `${t('employee.department')} / ${t('employee.position')}` },
          { label: t('employee.branch') },
          { label: 'Role' },
          { label: t('common.status') },
          { label: '', align: 'right' },
        ]}
        empty={!loading && employees.length === 0
          ? <EmptyState icon="👥" title={choose(i18n, 'ไม่พบพนักงาน', 'No employees found')} />
          : null
        }
      >
        {employees.map(emp => (
          <tr key={emp.id}
            className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
            onClick={() => onView(emp.id)}
          >
            <td className="py-3.5 px-4">
              <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">{emp.employee_code}</span>
            </td>
            <td className="py-3.5 px-4">
              <div className="flex items-center gap-3">
                {emp.avatar_url
                  ? <img src={emp.avatar_url} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  : <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold flex-shrink-0">
                      {emp.first_name?.[0]}
                    </div>
                }
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{emp.first_name} {emp.last_name}</p>
                  <p className="text-xs text-slate-400">{emp.email}</p>
                </div>
              </div>
            </td>
            <td className="py-3.5 px-4">
              <p className="text-sm text-slate-700">{fieldName(i18n, emp.positions)}</p>
              <p className="text-xs text-slate-400">{fieldName(i18n, emp.departments)}</p>
            </td>
            <td className="py-3.5 px-4 text-sm text-slate-600">{fieldName(i18n, emp.branches)}</td>
            <td className="py-3.5 px-4">
              {emp.roles
                ? <Badge color="blue">{emp.roles.name}</Badge>
                : <span className="text-slate-400 text-sm">—</span>
              }
            </td>
            <td className="py-3.5 px-4"><StatusBadge status={emp.status} /></td>
            <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
              {canEdit && (
                <div className="flex gap-2 justify-end">
                  <button onClick={() => onEdit(emp)}
                    className="px-3 py-1.5 text-xs text-primary-600 hover:bg-primary-50 rounded-lg font-medium transition-colors">
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={() => onStatusChange(emp)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      emp.status === 'active'
                        ? 'text-red-500 hover:bg-red-50'
                        : 'text-emerald-600 hover:bg-emerald-50'
                    }`}>
                    {emp.status === 'active'
                      ? choose(i18n, 'ระงับ', 'Suspend')
                      : choose(i18n, 'เปิดใช้', 'Activate')
                    }
                  </button>
                </div>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </Card>
  )
}
