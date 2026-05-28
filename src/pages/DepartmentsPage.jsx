// src/pages/DepartmentsPage.jsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import { supabase } from '@/services/supabase'
import {
  Card, PageHeader, Field, Input, Button, Badge, Select,
  Modal, ConfirmDialog, EmptyState, SearchInput, Toggle, useToast, Skeleton
} from '@/components/ui/index.jsx'
import { choose, fieldName } from '@/utils/lang'

const EMPTY_FORM = { name: '', name_en: '', code: '', branch_id: '', parent_id: '', is_active: true }

export default function DepartmentsPage() {
  const { t, i18n } = useTranslation()
  const { company } = useAuthStore()
  const { show: toast, el: ToastEl } = useToast()
  const [depts, setDepts] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [{ data: d }, { data: b }] = await Promise.all([
        supabase.from('departments')
          .select('*, branches(name, name_en, code), parent:parent_id(name, name_en)')
          .eq('company_id', company.id)
          .order('name'),
        supabase.from('branches')
          .select('id, name, name_en, code')
          .eq('company_id', company.id)
          .eq('is_active', true)
          .order('code'),
      ])
      setDepts(d || [])
      setBranches(b || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const filtered = depts.filter(d =>
    !search || d.name.includes(search) || d.name_en?.includes(search) || d.code?.includes(search)
  )

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    setEditItem(null)
    setShowForm(true)
  }

  const openEdit = (d) => {
    setForm({
      name: d.name, name_en: d.name_en || '', code: d.code || '',
      branch_id: d.branch_id || '', parent_id: d.parent_id || '',
      is_active: d.is_active,
    })
    setErrors({})
    setEditItem(d)
    setShowForm(true)
  }

  const save = async () => {
    if (!form.name.trim()) { setErrors({ name: choose(i18n, 'กรุณากรอกชื่อแผนก', 'Please enter department name') }); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        name_en: form.name_en || null,
        code: form.code || null,
        branch_id: form.branch_id || null,
        parent_id: form.parent_id || null,
        is_active: form.is_active,
        company_id: company.id,
      }
      if (editItem) {
        const { data, error } = await supabase.from('departments')
          .update(payload).eq('id', editItem.id).select('*, branches(name, name_en, code), parent:parent_id(name, name_en)').single()
        if (error) throw error
        setDepts(p => p.map(d => d.id === data.id ? data : d))
        toast(choose(i18n, 'แก้ไขแผนกสำเร็จ ✓', 'Department updated ✓'))
      } else {
        const { data, error } = await supabase.from('departments')
          .insert(payload).select('*, branches(name, name_en, code), parent:parent_id(name, name_en)').single()
        if (error) throw error
        setDepts(p => [...p, data])
        toast(choose(i18n, 'เพิ่มแผนกสำเร็จ ✓', 'Department added ✓'))
      }
      setShowForm(false)
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const remove = async () => {
    try {
      const { error } = await supabase.from('departments').delete().eq('id', deleteId)
      if (error) throw error
      setDepts(p => p.filter(d => d.id !== deleteId))
      toast(choose(i18n, 'ลบแผนกแล้ว', 'Department deleted'), 'error')
      setDeleteId(null)
    } catch (e) { toast(e.message, 'error') }
  }

  return (
    <>
      {ToastEl}
      <PageHeader
        title={t('org.department.title')}
        subtitle={choose(i18n, `ทั้งหมด ${depts.length} แผนก`, `${depts.length} departments total`)}
        action={<Button icon="+" onClick={openAdd}>{t('org.department.add')}</Button>}
      />

      {/* Search */}
      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder={choose(i18n, 'ค้นหาแผนก...', 'Search departments...')} />
      </div>

      {loading
        ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        : filtered.length === 0
          ? <EmptyState icon="🗂" title={choose(i18n, 'ยังไม่มีแผนก', 'No departments yet')} subtitle={choose(i18n, 'กด + เพิ่มแผนก เพื่อเริ่มต้น', 'Click + Add Department to get started')}
              action={<Button icon="+" onClick={openAdd}>{t('org.department.add')}</Button>} />
          : (
            <div className="space-y-2">
              {filtered.map(d => (
                <div key={d.id}
                  className={`bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between gap-4 hover:shadow-sm transition-shadow ${d.parent_id ? 'ml-8 border-l-4 border-l-slate-200' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 text-lg">
                      🗂
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800 text-sm">{fieldName(i18n, d)}</p>
                        {d.code && <span className="font-mono text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{d.code}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {i18n.language !== 'en' && d.name_en && <p className="text-xs text-slate-400">{d.name_en}</p>}
                        {d.branches && <p className="text-xs text-slate-400">📍 {fieldName(i18n, d.branches)}</p>}
                        {d.parent && <p className="text-xs text-slate-400">↳ {fieldName(i18n, d.parent)}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge color={d.is_active ? 'green' : 'gray'}>
                      {d.is_active ? t('common.active') : t('common.inactive')}
                    </Badge>
                    <button onClick={() => openEdit(d)}
                      className="px-3 py-1.5 text-xs text-primary-600 hover:bg-primary-50 rounded-lg font-medium transition-colors">
                      {t('common.edit')}
                    </button>
                    <button onClick={() => setDeleteId(d.id)}
                      className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg font-medium transition-colors">
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
      }

      {showForm && (
        <Modal title={editItem ? choose(i18n, 'แก้ไขแผนก', 'Edit Department') : t('org.department.add')} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('org.department.name')} required error={errors.name}>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder={choose(i18n, 'ฝ่ายบุคคล', 'Human Resources')} error={errors.name} />
              </Field>
              <Field label={`${t('org.department.name')} (EN)`}>
                <Input value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))}
                  placeholder="Human Resources" />
              </Field>
            </div>
            <Field label={choose(i18n, 'รหัสแผนก', 'Department Code')} hint={choose(i18n, 'เช่น HR, FIN, IT', 'For example HR, FIN, IT')}>
              <Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="HR" />
            </Field>
            <Field label={t('employee.branch')}>
              <Select value={form.branch_id} onChange={e => setForm(p => ({ ...p, branch_id: e.target.value }))}>
                <option value="">— {choose(i18n, 'ไม่ระบุสาขา', 'No branch')} —</option>
                {branches.map(b => <option key={b.id} value={b.id}>{fieldName(i18n, b)} ({b.code})</option>)}
              </Select>
            </Field>
            <Field label={t('org.department.parent')} hint={choose(i18n, 'ถ้าเป็น sub-department', 'For sub-departments')}>
              <Select value={form.parent_id} onChange={e => setForm(p => ({ ...p, parent_id: e.target.value }))}>
                <option value="">— {choose(i18n, 'แผนกหลัก', 'Top-level department')} —</option>
                {depts.filter(d => d.id !== editItem?.id).map(d => (
                  <option key={d.id} value={d.id}>{fieldName(i18n, d)}</option>
                ))}
              </Select>
            </Field>
            <Toggle value={form.is_active} onChange={v => setForm(p => ({ ...p, is_active: v }))} label={t('common.active')} />
          </div>
          <div className="flex gap-3 mt-6">
            <Button variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button className="flex-1" loading={saving} onClick={save}>{t('common.save')}</Button>
          </div>
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog
          title={choose(i18n, 'ลบแผนก', 'Delete Department')}
          message={choose(i18n, 'ต้องการลบแผนกนี้? พนักงานในแผนกจะถูกยกเลิกการผูก', 'Delete this department? Employees linked to it will be unassigned.')}
          onConfirm={remove}
          onCancel={() => setDeleteId(null)}
          danger
        />
      )}
    </>
  )
}
