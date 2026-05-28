// src/pages/BranchesPage.jsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import { supabase } from '@/services/supabase'
import {
  Card, PageHeader, Field, Input, Textarea, Button, Badge, MobileListCard,
  Modal, ConfirmDialog, EmptyState, Table, SearchInput, Toggle, useToast, Skeleton
} from '@/components/ui/index.jsx'
import { choose, fieldName } from '@/utils/lang'
import { usePersistedState } from '@/hooks/usePersistedState'

const EMPTY_FORM = { name: '', name_en: '', code: '', address: '', phone: '', is_headquarters: false, is_active: true }

export default function BranchesPage() {
  const { t, i18n } = useTranslation()
  const { company } = useAuthStore()
  const { show: toast, el: ToastEl } = useToast()
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = usePersistedState('ap_branches_search', '')
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
      const { data } = await supabase
        .from('branches')
        .select('*, employees(count)')
        .eq('company_id', company.id)
        .order('is_headquarters', { ascending: false })
        .order('code')
      setBranches(data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const filtered = branches.filter(b =>
    !search || b.name.includes(search) || b.name_en?.includes(search) || b.code.includes(search)
  )

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    setEditItem(null)
    setShowForm(true)
  }

  const openEdit = (b) => {
    setForm({ name: b.name, name_en: b.name_en || '', code: b.code, address: b.address || '', phone: b.phone || '', is_headquarters: b.is_headquarters, is_active: b.is_active })
    setErrors({})
    setEditItem(b)
    setShowForm(true)
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = choose(i18n, 'กรุณากรอกชื่อสาขา', 'Please enter branch name')
    if (!form.code.trim()) e.code = choose(i18n, 'กรุณากรอกรหัสสาขา', 'Please enter branch code')
    return e
  }

  const save = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      if (editItem) {
        const { data, error } = await supabase.from('branches')
          .update(form).eq('id', editItem.id).select().single()
        if (error) throw error
        setBranches(p => p.map(b => b.id === data.id ? { ...b, ...data } : b))
        toast(choose(i18n, 'แก้ไขสาขาสำเร็จ ✓', 'Branch updated ✓'))
      } else {
        const { data, error } = await supabase.from('branches')
          .insert({ ...form, company_id: company.id }).select().single()
        if (error) throw error
        setBranches(p => [...p, data])
        toast(choose(i18n, 'เพิ่มสาขาสำเร็จ ✓', 'Branch added ✓'))
      }
      setShowForm(false)
    } catch (e) {
      toast(e.message, 'error')
    } finally { setSaving(false) }
  }

  const remove = async () => {
    try {
      const { error } = await supabase.from('branches').delete().eq('id', deleteId)
      if (error) throw error
      setBranches(p => p.filter(b => b.id !== deleteId))
      toast(choose(i18n, 'ลบสาขาแล้ว', 'Branch deleted'), 'error')
      setDeleteId(null)
    } catch (e) { toast(e.message, 'error') }
  }

  return (
    <>
      {ToastEl}
      <PageHeader
        title={t('org.branch.title')}
        subtitle={choose(i18n, `ทั้งหมด ${branches.length} สาขา`, `${branches.length} branches total`)}
        action={<Button icon="+" onClick={openAdd}>{t('org.branch.add')}</Button>}
      />

      <Card padding={false}>
        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <SearchInput value={search} onChange={setSearch} placeholder={choose(i18n, 'ค้นหาสาขา...', 'Search branches...')} />
        </div>

        <Table
          loading={loading}
          headers={[
            { label: choose(i18n, 'รหัส', 'Code') }, { label: t('org.branch.name') }, { label: choose(i18n, 'ประเภท', 'Type') },
            { label: t('org.company.phone') }, { label: t('common.status') }, { label: '', align: 'right' }
          ]}
          empty={filtered.length === 0 && !loading
            ? <EmptyState icon="🏬" title={choose(i18n, 'ยังไม่มีสาขา', 'No branches yet')} subtitle={choose(i18n, 'กด + เพิ่มสาขา เพื่อเริ่มต้น', 'Click + Add Branch to get started')} />
            : null
          }
          mobileCards={filtered.map(b => (
            <MobileListCard
              key={b.id}
              title={fieldName(i18n, b)}
              subtitle={i18n.language !== 'en' && b.name_en ? b.name_en : null}
              meta={`${b.code || '—'} · ${b.phone || '—'}`}
              badge={<Badge color={b.is_active ? 'green' : 'gray'}>{b.is_active ? t('common.active') : t('common.inactive')}</Badge>}
              actions={
                <>
                  <button onClick={() => openEdit(b)} className="px-3 py-2 text-xs text-primary-600 bg-primary-50 rounded-lg font-semibold">{t('common.edit')}</button>
                  {!b.is_headquarters && <button onClick={() => setDeleteId(b.id)} className="px-3 py-2 text-xs text-red-500 bg-red-50 rounded-lg font-semibold">{t('common.delete')}</button>}
                </>
              }
            >
              {b.is_headquarters
                ? <Badge color="blue">🏢 {t('org.branch.headquarters')}</Badge>
                : <Badge color="gray">🏬 {t('org.branch.isBranch')}</Badge>}
            </MobileListCard>
          ))}
        >
          {filtered.map(b => (
            <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
              <td className="py-3.5 px-4">
                <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">{b.code}</span>
              </td>
              <td className="py-3.5 px-4">
                <p className="font-semibold text-slate-800 text-sm">{fieldName(i18n, b)}</p>
                {i18n.language !== 'en' && b.name_en && <p className="text-xs text-slate-400">{b.name_en}</p>}
              </td>
              <td className="py-3.5 px-4">
                {b.is_headquarters
                  ? <Badge color="blue">🏢 {t('org.branch.headquarters')}</Badge>
                  : <Badge color="gray">🏬 {t('org.branch.isBranch')}</Badge>
                }
              </td>
              <td className="py-3.5 px-4 text-sm text-slate-600">{b.phone || '—'}</td>
              <td className="py-3.5 px-4">
                <Badge color={b.is_active ? 'green' : 'gray'}>
                  {b.is_active ? t('common.active') : t('common.inactive')}
                </Badge>
              </td>
              <td className="py-3.5 px-4 text-right">
                <div className="flex gap-2 justify-end">
                  <button onClick={() => openEdit(b)}
                    className="px-3 py-1.5 text-xs text-primary-600 hover:bg-primary-50 rounded-lg font-medium transition-colors">
                    {t('common.edit')}
                  </button>
                  {!b.is_headquarters && (
                    <button onClick={() => setDeleteId(b.id)}
                      className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg font-medium transition-colors">
                      {t('common.delete')}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      {/* Form Modal */}
      {showForm && (
        <Modal title={editItem ? choose(i18n, 'แก้ไขสาขา', 'Edit Branch') : t('org.branch.add')} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('org.branch.name')} required error={errors.name}>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder={choose(i18n, 'สำนักงานใหญ่', 'Headquarters')} error={errors.name} />
              </Field>
              <Field label={`${t('org.branch.name')} (EN)`}>
                <Input value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))}
                  placeholder="Headquarters" />
              </Field>
            </div>
            <Field label={t('org.branch.code')} required error={errors.code}
              hint={choose(i18n, 'รหัสสั้นๆ เช่น HQ, BKK01, CMI01', 'Short code, for example HQ, BKK01, CMI01')}>
              <Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="HQ" error={errors.code} />
            </Field>
            <Field label={t('org.company.phone')}>
              <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="02-XXX-XXXX" />
            </Field>
            <Field label={t('org.company.address')}>
              <Textarea value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                placeholder={choose(i18n, 'ที่อยู่สาขา...', 'Branch address...')} />
            </Field>
            <div className="flex gap-6">
              <Toggle value={form.is_headquarters} onChange={v => setForm(p => ({ ...p, is_headquarters: v }))}
                label={t('org.branch.headquarters')} />
              <Toggle value={form.is_active} onChange={v => setForm(p => ({ ...p, is_active: v }))}
                label={t('common.active')} />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button className="flex-1" loading={saving} onClick={save}>{t('common.save')}</Button>
          </div>
        </Modal>
      )}

      {/* Confirm Delete */}
      {deleteId && (
        <ConfirmDialog
          title={choose(i18n, 'ลบสาขา', 'Delete Branch')}
          message={choose(i18n, 'ต้องการลบสาขานี้? ข้อมูลพนักงานในสาขาจะถูกยกเลิกการผูก', 'Delete this branch? Employees linked to this branch will be unassigned.')}
          onConfirm={remove}
          onCancel={() => setDeleteId(null)}
          danger
        />
      )}
    </>
  )
}
