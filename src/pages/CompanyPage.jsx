// src/pages/CompanyPage.jsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import { supabase } from '@/services/supabase'
import { Card, PageHeader, Field, Input, Textarea, Button, useToast, Skeleton } from '@/components/ui/index.jsx'
import { choose, fieldName } from '@/utils/lang'

export default function CompanyPage() {
  const { t, i18n } = useTranslation()
  const { company, refreshEmployee } = useAuthStore()
  const { show: toast, el: ToastEl } = useToast()
  const [data, setData] = useState(null)
  const [form, setForm] = useState({})
  const [edit, setEdit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState({ branches: 0, departments: 0, employees: 0 })

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const [{ data: co }, { count: br }, { count: dp }, { count: em }] = await Promise.all([
        supabase.from('companies').select('*').eq('id', company.id).single(),
        supabase.from('branches').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
        supabase.from('departments').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
        supabase.from('employees').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
      ])
      setData(co)
      setForm(co)
      setStats({ branches: br || 0, departments: dp || 0, employees: em || 0 })
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const save = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('companies')
        .update({
          name: form.name,
          name_en: form.name_en,
          tax_id: form.tax_id,
          address: form.address,
          phone: form.phone,
          email: form.email,
          website: form.website,
        })
        .eq('id', company.id)
      if (error) throw error
      toast(choose(i18n, 'บันทึกข้อมูลบริษัทสำเร็จ ✓', 'Company information saved ✓'))
      setData(form)
      setEdit(false)
      refreshEmployee()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48" />
    </div>
  )

  return (
    <>
      {ToastEl}
      <PageHeader
        title={t('org.company.title')}
        subtitle={choose(i18n, 'ข้อมูลองค์กรและการตั้งค่าหลัก', 'Organization profile and core settings')}
        action={
          !edit
            ? <Button icon="✏️" onClick={() => setEdit(true)}>{t('common.edit')}</Button>
            : <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { setEdit(false); setForm(data) }}>{t('common.cancel')}</Button>
                <Button loading={saving} onClick={save}>{t('common.save')}</Button>
              </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Stats */}
        <div className="lg:col-span-3 grid grid-cols-3 gap-4">
          {[
            { label: t('nav.branches'), value: stats.branches, icon: '🏬', color: 'text-primary-700' },
            { label: t('nav.departments'), value: stats.departments, icon: '🗂', color: 'text-emerald-700' },
            { label: t('nav.employees'), value: stats.employees, icon: '👥', color: 'text-violet-700' },
          ].map(s => (
            <Card key={s.label} className="text-center">
              <p className="text-2xl mb-1">{s.icon}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-slate-500 mt-1">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Company Logo */}
        <Card className="flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-primary-100 rounded-3xl flex items-center justify-center text-primary-700 text-4xl font-bold mb-4">
            {fieldName(i18n, data)?.[0]}
          </div>
          <p className="font-bold text-slate-800 text-lg">{fieldName(i18n, data)}</p>
          {i18n.language !== 'en' && data?.name_en && <p className="text-sm text-slate-500">{data.name_en}</p>}
          {data?.tax_id && (
            <p className="text-xs text-slate-400 mt-2">Tax ID: {data.tax_id}</p>
          )}
        </Card>

        {/* Company Info */}
        <Card className="lg:col-span-2">
          {edit ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t('org.company.name')} required>
                  <Input value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={choose(i18n, 'บริษัท ...', 'Company ...')} />
                </Field>
                <Field label={t('org.company.nameEn')}>
                  <Input value={form.name_en || ''} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} placeholder="Company Ltd." />
                </Field>
                <Field label={t('org.company.taxId')}>
                  <Input value={form.tax_id || ''} onChange={e => setForm(p => ({ ...p, tax_id: e.target.value }))} placeholder="0000000000000" />
                </Field>
                <Field label={t('org.company.phone')}>
                  <Input value={form.phone || ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="02-XXX-XXXX" />
                </Field>
                <Field label={t('org.company.email')}>
                  <Input type="email" value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="info@company.com" />
                </Field>
                <Field label={t('org.company.website')}>
                  <Input value={form.website || ''} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} placeholder="https://..." />
                </Field>
              </div>
              <Field label={t('org.company.address')}>
                <Textarea value={form.address || ''} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder={choose(i18n, 'ที่อยู่บริษัท...', 'Company address...')} />
              </Field>
            </div>
          ) : (
            <div className="space-y-0">
              {[
                [t('org.company.taxId'), data?.tax_id],
                [t('org.company.phone'), data?.phone],
                [t('org.company.email'), data?.email],
                [t('org.company.website'), data?.website],
                [t('org.company.address'), data?.address],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-4 py-3 border-b border-slate-50 last:border-0">
                  <p className="text-sm text-slate-400 w-48 flex-shrink-0">{label}</p>
                  <p className="text-sm text-slate-800 font-medium">{value || '—'}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
