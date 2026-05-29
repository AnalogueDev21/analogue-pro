// src/pages/RolesPage.jsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import { supabase } from '@/services/supabase'
import {
  Card, PageHeader, Field, Input, Button, Badge,
  Modal, ConfirmDialog, EmptyState, useToast, Skeleton, Toggle
} from '@/components/ui/index.jsx'
import { choose } from '@/utils/lang'

const MODULES = [
  { key: 'employee', icon: '👥', labelKey: 'permission.modules.employee' },
  { key: 'leave',    icon: '📅', labelKey: 'permission.modules.leave' },
  { key: 'ot',       icon: '⏱',  label: 'OT'            },
  { key: 'attendance',icon:'🕐', labelKey: 'permission.modules.attendance' },
  { key: 'payroll',  icon: '💰', labelKey: 'permission.modules.payroll' },
  { key: 'org',      icon: '🏢', labelKey: 'permission.modules.org' },
  { key: 'report',   icon: '📊', labelKey: 'permission.modules.report' },
]

const LEVEL_PRESETS = [
  { value: 10,  label: 'Employee',      color: 'gray'   },
  { value: 20,  label: 'Supervisor',    color: 'gray'   },
  { value: 40,  label: 'Manager',       color: 'amber'  },
  { value: 50,  label: 'Finance / HR',  color: 'blue'   },
  { value: 60,  label: 'HR Manager',    color: 'blue'   },
  { value: 80,  label: 'Company Admin', color: 'violet' },
  { value: 100, label: 'Super Admin',   color: 'violet' },
]

export default function RolesPage() {
  const { t, i18n } = useTranslation()
  const { company } = useAuthStore()
  const { show: toast, el: ToastEl } = useToast()
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [selectedPerms, setSelectedPerms] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [form, setForm] = useState({ name: '', name_en: '', level: 10 })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [{ data: r }, { data: p }] = await Promise.all([
        supabase.from('roles').select('*, role_permissions(permission_id)').eq('company_id', company.id).order('level', { ascending: false }),
        supabase.from('permissions').select('*').order('module').order('action'),
      ])
      setRoles(r || [])
      setPermissions(p || [])
      if (r?.length) {
        setSelected(r[0])
        setSelectedPerms(r[0].role_permissions?.map(rp => rp.permission_id) || [])
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const selectRole = (role) => {
    setSelected(role)
    setSelectedPerms(role.role_permissions?.map(rp => rp.permission_id) || [])
  }

  const togglePerm = (permId) => {
    setSelectedPerms(p => p.includes(permId) ? p.filter(x => x !== permId) : [...p, permId])
  }

  const toggleModule = (moduleKey) => {
    const modulePerms = permissions.filter(p => p.module === moduleKey).map(p => p.id)
    const allSelected = modulePerms.every(id => selectedPerms.includes(id))
    if (allSelected) setSelectedPerms(p => p.filter(id => !modulePerms.includes(id)))
    else setSelectedPerms(p => [...new Set([...p, ...modulePerms])])
  }

  const savePerms = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await supabase.from('role_permissions').delete().eq('role_id', selected.id)
      if (selectedPerms.length) {
        await supabase.from('role_permissions').insert(
          selectedPerms.map(pid => ({ role_id: selected.id, permission_id: pid }))
        )
      }
      setRoles(p => p.map(r => r.id === selected.id
        ? { ...r, role_permissions: selectedPerms.map(id => ({ permission_id: id })) }
        : r
      ))
      toast(choose(i18n, 'บันทึกสิทธิ์สำเร็จ ✓', 'Permissions saved ✓'))
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const addRole = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const { data, error } = await supabase.from('roles')
        .insert({ ...form, company_id: company.id, level: parseInt(form.level), is_system: false })
        .select('*, role_permissions(permission_id)').single()
      if (error) throw error
      setRoles(p => [...p, data].sort((a, b) => b.level - a.level))
      setShowAdd(false)
      setForm({ name: '', name_en: '', level: 10 })
      toast(choose(i18n, 'เพิ่ม Role สำเร็จ ✓', 'Role added ✓'))
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const removeRole = async () => {
    try {
      await supabase.from('roles').delete().eq('id', deleteId)
      setRoles(p => p.filter(r => r.id !== deleteId))
      if (selected?.id === deleteId) { setSelected(null); setSelectedPerms([]) }
      toast(choose(i18n, 'ลบ Role แล้ว', 'Role deleted'), 'error')
      setDeleteId(null)
    } catch (e) { toast(e.message, 'error') }
  }

  const levelColor = (level) => {
    if (level >= 80) return 'violet'
    if (level >= 50) return 'blue'
    if (level >= 40) return 'amber'
    return 'gray'
  }

  const groupedPerms = MODULES.map(mod => ({
    ...mod,
    perms: permissions.filter(p => p.module === mod.key),
  }))

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>

  return (
    <>
      {ToastEl}
      <PageHeader
        title={t('org.role.title')}
        subtitle={choose(i18n, 'กำหนดสิทธิ์การใช้งานแต่ละ Role', 'Configure permissions for each role')}
        action={<Button icon="+" onClick={() => setShowAdd(true)}>{t('org.role.add')}</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Role List */}
        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-1 lg:pb-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-3">
            Roles ({roles.length})
          </p>
          {roles.map(role => (
            <button key={role.id}
              onClick={() => selectRole(role)}
              className={`w-full text-left px-4 py-3.5 rounded-2xl border transition-all ${
                selected?.id === role.id
                  ? 'bg-primary-50 border-primary-200 shadow-sm'
                  : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
              }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-semibold text-sm ${selected?.id === role.id ? 'text-primary-800' : 'text-slate-800'}`}>
                    {role.name}
                  </p>
                  {role.name_en && <p className="text-xs text-slate-400 mt-0.5">{role.name_en}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={levelColor(role.level)}>L{role.level}</Badge>
                  {role.is_system && <Badge color="violet">System</Badge>}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                {role.role_permissions?.length || 0} {choose(i18n, 'สิทธิ์', 'permissions')}
              </p>
            </button>
          ))}
        </div>

        {/* Permissions */}
        <div className="lg:col-span-2">
          {selected ? (
            <Card padding={false}>
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">{selected.name}</p>
                  <p className="text-xs text-slate-400">{selectedPerms.length} / {permissions.length} {choose(i18n, 'สิทธิ์', 'permissions')}</p>
                </div>
                <div className="flex gap-2">
                  {!selected.is_system && (
                    <button onClick={() => setDeleteId(selected.id)}
                      className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg font-medium transition-colors">
                      {choose(i18n, 'ลบ Role', 'Delete Role')}
                    </button>
                  )}
                  <Button size="sm" loading={saving} onClick={savePerms}>{choose(i18n, 'บันทึกสิทธิ์', 'Save Permissions')}</Button>
                </div>
              </div>

              <div className="divide-y divide-slate-50">
                {groupedPerms.map(({ key, icon, label, labelKey, perms }) => {
                  if (!perms.length) return null
                  const moduleSelected = perms.every(p => selectedPerms.includes(p.id))
                  const someSelected = perms.some(p => selectedPerms.includes(p.id))
                  return (
                    <div key={key} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{icon}</span>
                          <p className="font-semibold text-slate-700 text-sm">{labelKey ? t(labelKey) : label}</p>
                          <span className="text-xs text-slate-400">
                            ({perms.filter(p => selectedPerms.includes(p.id)).length}/{perms.length})
                          </span>
                        </div>
                        <button onClick={() => toggleModule(key)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                            moduleSelected ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}>
                          {moduleSelected ? t('common.clearAll') : t('common.selectAll')}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {perms.map(perm => (
                          <label key={perm.id}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer border transition-all ${
                              selectedPerms.includes(perm.id)
                                ? 'bg-primary-50 border-primary-200'
                                : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                            }`}>
                            <input type="checkbox"
                              checked={selectedPerms.includes(perm.id)}
                              onChange={() => togglePerm(perm.id)}
                              className="w-4 h-4 rounded text-primary-600 accent-primary-700"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-700">{perm.description_en || perm.code}</p>
                              <p className="text-xs text-slate-400 font-mono truncate">{perm.code}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          ) : (
            <EmptyState icon="🔐" title={choose(i18n, 'เลือก Role เพื่อจัดการสิทธิ์', 'Select a role to manage permissions')} />
          )}
        </div>
      </div>

      {showAdd && (
        <Modal title={t('org.role.add')} onClose={() => setShowAdd(false)} size="sm">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label={choose(i18n, 'ชื่อ Role', 'Role Name')} required>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Manager" />
              </Field>
              <Field label={choose(i18n, 'ชื่อ (EN)', 'Name (EN)')}>
                <Input value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} placeholder="Manager" />
              </Field>
            </div>
            <Field label={t('org.role.level')} hint={choose(i18n, 'ตัวเลขสูง = สิทธิ์มากกว่า', 'Higher number means more access')}>
              <select value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                {LEVEL_PRESETS.map(l => <option key={l.value} value={l.value}>{l.label} (Level {l.value})</option>)}
              </select>
            </Field>
          </div>
          <div className="flex gap-3 mt-6">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>{t('common.cancel')}</Button>
            <Button className="flex-1" loading={saving} onClick={addRole}>{t('common.save')}</Button>
          </div>
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog title={choose(i18n, 'ลบ Role', 'Delete Role')} message={choose(i18n, 'ต้องการลบ Role นี้? พนักงานที่ใช้ Role นี้จะสูญเสียสิทธิ์', 'Delete this role? Employees using it will lose permissions.')}
          onConfirm={removeRole} onCancel={() => setDeleteId(null)} danger />
      )}
    </>
  )
}
