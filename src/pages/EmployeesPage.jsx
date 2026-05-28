// src/pages/EmployeesPage.jsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import { supabase } from '@/services/supabase'
import { getEmployees, generateEmployeeCode } from '@/services/employeeService'
import { writeActivityLog } from '@/features/activityLogs/services/activityLogService'
import { createNotification, NOTIFICATION_TYPES } from '@/features/notifications/services/notificationService'
import { Button, ConfirmDialog, EmptyState, PageHeader, SearchInput, Skeleton, useToast } from '@/components/ui/index.jsx'
import EmployeeCard from '@/components/employees/EmployeeCard'
import EmployeeTable from '@/components/employees/EmployeeTable'
import EmployeeForm from '@/components/employees/EmployeeForm'
import { choose } from '@/utils/lang'
import { usePersistedState } from '@/hooks/usePersistedState'

const STATUSES = ['active', 'inactive', 'probation', 'on_leave', 'terminated']
const EMPTY_FORM = {
  employee_code: '', first_name: '', last_name: '', first_name_en: '', last_name_en: '',
  email: '', phone: '', gender: '', date_of_birth: '', national_id: '',
  branch_id: '', department_id: '', position_id: '', role_id: '', manager_id: '',
  employment_type: 'full_time', hire_date: new Date().toISOString().split('T')[0],
  probation_end_date: '', status: 'active',
}

export default function EmployeesPage({ onViewDetail }) {
  const { t, i18n } = useTranslation()
  const { company, employee, can } = useAuthStore()
  const { show: toast, el: ToastEl } = useToast()

  const canViewAll = can('employee.view_all')
  const canViewTeam = can('employee.view_team')
  const canViewSelf = can('employee.view_self')
  const canManage = can('employee.create')
  const canViewCompanyWide = can('org.manage_company')

  const [employees, setEmployees] = useState([])
  const [branches, setBranches] = useState([])
  const [departments, setDepartments] = useState([])
  const [positions, setPositions] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = usePersistedState('ap_employees_view', 'grid')
  const [search, setSearch] = usePersistedState('ap_employees_search', '')
  const [filters, setFilters] = usePersistedState('ap_employees_filters', { status: '', branch_id: '', department_id: '' })
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const loadEmps = async () => {
        if (canViewAll) return getEmployees(company.id, canViewCompanyWide ? {} : { branch_id: employee.branch_id })
        if (canViewTeam) {
          const [team, self] = await Promise.all([
            getEmployees(company.id, { manager_id: employee.id }),
            canViewSelf ? getEmployees(company.id, { employee_id: employee.id }) : [],
          ])
          return Array.from(new Map([...self, ...team].map(r => [r.id, r])).values())
        }
        if (canViewSelf) return getEmployees(company.id, { employee_id: employee.id })
        return []
      }
      const [emps, { data: br }, { data: dp }, { data: po }, { data: ro }] = await Promise.all([
        loadEmps(),
        supabase.from('branches').select('id,name,name_en,code').eq('company_id', company.id).eq('is_active', true).order('code'),
        supabase.from('departments').select('id,name,name_en').eq('company_id', company.id).eq('is_active', true).order('name'),
        supabase.from('positions').select('id,name,name_en,level').eq('company_id', company.id).eq('is_active', true).order('level', { ascending: false }),
        supabase.from('roles').select('id,name,name_en,level').eq('company_id', company.id).order('level', { ascending: false }),
      ])
      setEmployees(emps); setBranches(br||[]); setDepartments(dp||[]); setPositions(po||[]); setRoles(ro||[])
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  const filtered = employees.filter(e => {
    const q = `${e.first_name} ${e.last_name} ${e.first_name_en||''} ${e.last_name_en||''} ${e.employee_code} ${e.email}`.toLowerCase()
    if (search && !q.includes(search.toLowerCase())) return false
    if (filters.status && e.status !== filters.status) return false
    if (filters.branch_id && e.branch_id !== filters.branch_id) return false
    if (filters.department_id && e.department_id !== filters.department_id) return false
    return true
  })

  const openAdd = async () => {
    if (!canManage) return
    const code = await generateEmployeeCode(company.id)
    setForm({ ...EMPTY_FORM, employee_code: code })
    setErrors({}); setEditItem(null); setShowForm(true)
  }

  const openEdit = (emp) => {
    if (!canManage) return
    setForm({
      employee_code: emp.employee_code, first_name: emp.first_name, last_name: emp.last_name,
      first_name_en: emp.first_name_en||'', last_name_en: emp.last_name_en||'',
      email: emp.email, phone: emp.phone||'', gender: emp.gender||'',
      date_of_birth: emp.date_of_birth||'', national_id: emp.national_id||'',
      branch_id: emp.branch_id||'', department_id: emp.department_id||'',
      position_id: emp.position_id||'', role_id: emp.role_id||'',
      manager_id: emp.manager_id||'', employment_type: emp.employment_type,
      hire_date: emp.hire_date, probation_end_date: emp.probation_end_date||'', status: emp.status,
    })
    setErrors({}); setEditItem(emp); setShowForm(true)
  }

  const validate = () => {
    const e = {}
    if (!form.first_name.trim()) e.first_name = choose(i18n, 'กรุณากรอกชื่อ', 'Required')
    if (!form.last_name.trim()) e.last_name = choose(i18n, 'กรุณากรอกนามสกุล', 'Required')
    if (!form.email.trim()) e.email = choose(i18n, 'กรุณากรอกอีเมล', 'Required')
    if (!form.employee_code.trim()) e.employee_code = choose(i18n, 'กรุณากรอกรหัส', 'Required')
    return e
  }

  const save = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const payload = {
        ...form, company_id: company.id,
        branch_id: form.branch_id||null, department_id: form.department_id||null,
        position_id: form.position_id||null, role_id: form.role_id||null,
        manager_id: form.manager_id||null, probation_end_date: form.probation_end_date||null,
        date_of_birth: form.date_of_birth||null,
      }
      const sel = '*, branches(id,name,name_en,code), departments(id,name,name_en), positions(id,name,name_en,level), roles(id,name,level), manager:manager_id(id,first_name,last_name)'
      if (editItem) {
        const { data, error } = await supabase.from('employees').update(payload).eq('id', editItem.id).select(sel).single()
        if (error) throw error
        setEmployees(p => p.map(x => x.id === data.id ? data : x))
        await writeActivityLog({
          company_id: company.id,
          actor_employee_id: employee.id,
          action: 'update_employee',
          target_type: 'employee',
          target_id: data.id,
          description: `Updated employee ${data.employee_code}`,
        })
        await createNotification({
          company_id: company.id,
          employee_id: data.id,
          title: 'Employee profile updated',
          message: 'Your employee profile was updated.',
          type: NOTIFICATION_TYPES.employee_updated,
          link: 'employees',
        })
        toast(choose(i18n, 'แก้ไขสำเร็จ ✓', 'Updated ✓'))
      } else {
        const { data, error } = await supabase.from('employees').insert(payload).select(sel).single()
        if (error) throw error
        setEmployees(p => [...p, data])
        await writeActivityLog({
          company_id: company.id,
          actor_employee_id: employee.id,
          action: 'create_employee',
          target_type: 'employee',
          target_id: data.id,
          description: `Created employee ${data.employee_code}`,
        })
        toast(choose(i18n, 'เพิ่มพนักงานสำเร็จ ✓', 'Employee added ✓'))
      }
      setShowForm(false)
    } catch (e) {
      toast(e.message.includes('duplicate') ? choose(i18n, 'อีเมลหรือรหัสนี้มีในระบบแล้ว', 'Email or code already exists') : e.message, 'error')
    } finally { setSaving(false) }
  }

  const handleStatusChange = async () => {
    if (!confirmAction) return
    try {
      const sel = '*, branches(id,name,name_en,code), departments(id,name,name_en), positions(id,name,name_en,level), roles(id,name,level)'
      const { data, error } = await supabase.from('employees').update({ status: confirmAction.newStatus }).eq('id', confirmAction.id).select(sel).single()
      if (error) throw error
      setEmployees(p => p.map(x => x.id === data.id ? data : x))
      await writeActivityLog({
        company_id: company.id,
        actor_employee_id: employee.id,
        action: confirmAction.newStatus === 'inactive' ? 'suspend_employee' : 'update_employee',
        target_type: 'employee',
        target_id: data.id,
        description: `Employee status changed to ${confirmAction.newStatus}`,
      })
      toast(choose(i18n, 'อัปเดตสถานะสำเร็จ ✓', 'Status updated ✓'))
      setConfirmAction(null)
    } catch (e) { toast(e.message, 'error') }
  }

  const statusCounts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: employees.filter(e => e.status === s).length }), {})

  return (
    <>
      {ToastEl}
      <PageHeader
        title={t('employee.title')}
        subtitle={choose(i18n, `ทั้งหมด ${employees.length} คน · แสดง ${filtered.length} คน`, `${employees.length} total · ${filtered.length} shown`)}
        action={canManage ? <Button icon="+" onClick={openAdd}>{t('employee.add')}</Button> : null}
      />

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        {[
          { key: '', label: t('common.all'), count: employees.length },
          { key: 'active', label: t('employee.statuses.active'), count: statusCounts.active },
          { key: 'probation', label: t('employee.statuses.probation'), count: statusCounts.probation },
          { key: 'on_leave', label: t('employee.statuses.on_leave'), count: statusCounts.on_leave },
          { key: 'inactive', label: t('employee.statuses.inactive'), count: statusCounts.inactive },
          { key: 'terminated', label: t('employee.statuses.terminated'), count: statusCounts.terminated },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilters(f => ({ ...f, status: tab.key }))}
            className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
              filters.status === tab.key ? 'bg-primary-700 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}>
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${filters.status === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex-1 min-w-48">
          <SearchInput value={search} onChange={setSearch} placeholder={choose(i18n, 'ค้นหาชื่อ, อีเมล, รหัส...', 'Search...')} />
        </div>
        <select value={filters.branch_id} onChange={e => setFilters(f => ({ ...f, branch_id: e.target.value }))}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">{choose(i18n, 'ทุกสาขา', 'All Branches')}</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={filters.department_id} onChange={e => setFilters(f => ({ ...f, department_id: e.target.value }))}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">{choose(i18n, 'ทุกแผนก', 'All Departments')}</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <div className="flex border border-slate-200 rounded-xl overflow-hidden">
          {['grid', 'table'].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-2 text-sm transition-colors ${view === v ? 'bg-primary-700 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
              {v === 'grid' ? '⊞' : '☰'}
            </button>
          ))}
        </div>
      </div>

      {!loading && filtered.length === 0 && (
        <EmptyState icon="👥" title={choose(i18n, 'ไม่พบพนักงาน', 'No employees found')}
          subtitle={search ? choose(i18n, 'ลองเปลี่ยนคำค้นหา', 'Try a different search') : choose(i18n, 'กด + เพิ่มพนักงาน', 'Click + Add Employee')}
          action={!search && canManage ? <Button icon="+" onClick={openAdd}>{t('employee.add')}</Button> : null}
        />
      )}

      {view === 'grid' && (
        loading
          ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-52" />)}</div>
          : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(emp => <EmployeeCard key={emp.id} emp={emp} onView={onViewDetail} onEdit={openEdit} canEdit={canManage} />)}
            </div>
      )}

      {view === 'table' && (
        <EmployeeTable employees={filtered} loading={loading} t={t}
          onView={onViewDetail} onEdit={openEdit} canEdit={canManage}
          onStatusChange={emp => setConfirmAction({ id: emp.id, name: `${emp.first_name} ${emp.last_name}`, newStatus: emp.status === 'active' ? 'inactive' : 'active' })}
        />
      )}

      <EmployeeForm
        open={showForm} onClose={() => setShowForm(false)}
        editItem={editItem} form={form} setForm={setForm}
        errors={errors} saving={saving} onSave={save}
        branches={branches} departments={departments} positions={positions} roles={roles} employees={employees}
      />

      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.newStatus === 'inactive' ? choose(i18n, 'ระงับบัญชี', 'Suspend') : choose(i18n, 'เปิดใช้งาน', 'Activate')}
          message={choose(i18n, `ต้องการ${confirmAction.newStatus === 'inactive' ? 'ระงับ' : 'เปิดใช้งาน'}บัญชีของ ${confirmAction.name}?`, `${confirmAction.newStatus === 'inactive' ? 'Suspend' : 'Activate'} ${confirmAction.name}?`)}
          onConfirm={handleStatusChange} onCancel={() => setConfirmAction(null)}
          danger={confirmAction.newStatus === 'inactive'}
        />
      )}
    </>
  )
}
