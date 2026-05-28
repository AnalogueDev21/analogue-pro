// src/pages/PositionsPage.jsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import { supabase } from '@/services/supabase'
import {
  Card, PageHeader, Field, Input, Button, Badge, Select,
  Modal, ConfirmDialog, EmptyState, SearchInput, Toggle, useToast, Skeleton, Table
} from '@/components/ui/index.jsx'
import { choose, fieldName } from '@/utils/lang'

const LEVELS = [
  { value: 10, label: 'Level 10 — Employee' },
  { value: 20, label: 'Level 20 — Supervisor' },
  { value: 40, label: 'Level 40 — Manager' },
  { value: 50, label: 'Level 50 — Finance / HR' },
  { value: 60, label: 'Level 60 — Senior Manager' },
  { value: 80, label: 'Level 80 — Director' },
  { value: 100, label: 'Level 100 — C-Level / Executive' },
]

const EMPTY_FORM = { name: '', name_en: '', department_id: '', level: 10, is_active: true }

export default function PositionsPage() {
  const { t, i18n } = useTranslation()
  const { company } = useAuthStore()
  const { show: toast, el: ToastEl } = useToast()
  const [positions, setPositions] = useState([])
  const [departments, setDepartments] = useState([])
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
      const [{ data: p }, { data: d }] = await Promise.all([
        supabase.from('positions')
          .select('*, departments(name, name_en)')
          .eq('company_id', company.id)
          .order('level', { ascending: false })
          .order('name'),
        supabase.from('departments')
          .select('id, name, name_en')
          .eq('company_id', company.id)
          .eq('is_active', true)
          .order('name'),
      ])
      setPositions(p || [])
      setDepartments(d || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const filtered = positions.filter(p =>
    !search || p.name.includes(search) || p.name_en?.includes(search)
  )

  const openAdd = () => { setForm(EMPTY_FORM); setErrors({}); setEditItem(null); setShowForm(true) }
  const openEdit = (p) => {
    setForm({ name: p.name, name_en: p.name_en || '', department_id: p.department_id || '', level: p.level, is_active: p.is_active })
    setErrors({}); setEditItem(p); setShowForm(true)
  }

  const save = async () => {
    if (!form.name.trim()) { setErrors({ name: choose(i18n, 'กรุณากรอกชื่อตำแหน่ง', 'Please enter position name') }); return }
    setSaving(true)
    try {
      const payload = { name: form.name, name_en: form.name_en || null, department_id: form.department_id || null, level: parseInt(form.level), is_active: form.is_active, company_id: company.id }
      if (editItem) {
        const { data, error } = await supabase.from('positions').update(payload).eq('id', editItem.id).select('*, departments(name, name_en)').single()
        if (error) throw error
        setPositions(p => p.map(x => x.id === data.id ? data : x))
        toast(choose(i18n, 'แก้ไขตำแหน่งสำเร็จ ✓', 'Position updated ✓'))
      } else {
        const { data, error } = await supabase.from('positions').insert(payload).select('*, departments(name, name_en)').single()
        if (error) throw error
        setPositions(p => [...p, data].sort((a, b) => b.level - a.level))
        toast(choose(i18n, 'เพิ่มตำแหน่งสำเร็จ ✓', 'Position added ✓'))
      }
      setShowForm(false)
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const remove = async () => {
    try {
      await supabase.from('positions').delete().eq('id', deleteId)
      setPositions(p => p.filter(x => x.id !== deleteId))
      toast(choose(i18n, 'ลบตำแหน่งแล้ว', 'Position deleted'), 'error')
      setDeleteId(null)
    } catch (e) { toast(e.message, 'error') }
  }

  const levelColor = (level) => {
    if (level >= 80) return 'violet'
    if (level >= 50) return 'blue'
    if (level >= 40) return 'amber'
    return 'gray'
  }

  return (
    <>
      {ToastEl}
      <PageHeader
        title={t('org.position.title')}
        subtitle={choose(i18n, `ทั้งหมด ${positions.length} ตำแหน่ง`, `${positions.length} positions total`)}
        action={<Button icon="+" onClick={openAdd}>{t('org.position.add')}</Button>}
      />

      <Card padding={false}>
        <div className="p-4 border-b border-slate-100">
          <SearchInput value={search} onChange={setSearch} placeholder={choose(i18n, 'ค้นหาตำแหน่ง...', 'Search positions...')} />
        </div>
        <Table
          loading={loading}
          headers={[
            { label: t('employee.position') }, { label: t('employee.department') }, { label: t('org.position.level') },
            { label: t('common.status') }, { label: '', align: 'right' },
          ]}
          empty={filtered.length === 0 && !loading
            ? <EmptyState icon="🎯" title={choose(i18n, 'ยังไม่มีตำแหน่ง', 'No positions yet')} subtitle={choose(i18n, 'กด + เพิ่มตำแหน่ง เพื่อเริ่มต้น', 'Click + Add Position to get started')} />
            : null
          }
        >
          {filtered.map(p => (
            <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
              <td className="py-3.5 px-4">
                <p className="font-semibold text-slate-800 text-sm">{fieldName(i18n, p)}</p>
                {i18n.language !== 'en' && p.name_en && <p className="text-xs text-slate-400">{p.name_en}</p>}
              </td>
              <td className="py-3.5 px-4 text-sm text-slate-600">{fieldName(i18n, p.departments)}</td>
              <td className="py-3.5 px-4">
                <Badge color={levelColor(p.level)}>L{p.level}</Badge>
              </td>
              <td className="py-3.5 px-4">
                <Badge color={p.is_active ? 'green' : 'gray'}>{p.is_active ? t('common.active') : t('common.inactive')}</Badge>
              </td>
              <td className="py-3.5 px-4 text-right">
                <div className="flex gap-2 justify-end">
                  <button onClick={() => openEdit(p)} className="px-3 py-1.5 text-xs text-primary-600 hover:bg-primary-50 rounded-lg font-medium transition-colors">{t('common.edit')}</button>
                  <button onClick={() => setDeleteId(p.id)} className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg font-medium transition-colors">{t('common.delete')}</button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      {showForm && (
        <Modal title={editItem ? choose(i18n, 'แก้ไขตำแหน่ง', 'Edit Position') : t('org.position.add')} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('org.position.name')} required error={errors.name}>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={choose(i18n, 'ผู้จัดการ', 'Manager')} error={errors.name} />
              </Field>
              <Field label={`${t('org.position.name')} (EN)`}>
                <Input value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} placeholder="Manager" />
              </Field>
            </div>
            <Field label={t('org.position.department')}>
              <Select value={form.department_id} onChange={e => setForm(p => ({ ...p, department_id: e.target.value }))}>
                <option value="">— {choose(i18n, 'ทุกแผนก', 'All Departments')} —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{fieldName(i18n, d)}</option>)}
              </Select>
            </Field>
            <Field label={t('org.position.level')} hint={choose(i18n, 'ระดับสูงกว่า = สิทธิ์มากกว่า', 'Higher level means more access')}>
              <Select value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))}>
                {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
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
        <ConfirmDialog title={choose(i18n, 'ลบตำแหน่ง', 'Delete Position')} message={choose(i18n, 'ต้องการลบตำแหน่งนี้?', 'Delete this position?')} onConfirm={remove} onCancel={() => setDeleteId(null)} danger />
      )}
    </>
  )
}
