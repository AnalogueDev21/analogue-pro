import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import { updateEmployee, uploadAvatar } from '@/services/employeeService'
import { setEmployeePin } from '@/features/auth/services/pinService'
import { Button, Card, Field, Input, PageHeader, useToast } from '@/components/ui/index.jsx'

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { employee, refreshEmployee } = useAuthStore()
  const { show: toast, el: ToastEl } = useToast()
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState({
    first_name: employee?.first_name || '',
    last_name: employee?.last_name || '',
    phone: employee?.phone || '',
    email: employee?.email || '',
  })
  const [pin, setPin] = useState('')

  const toggleLang = () => {
    const next = i18n.language === 'th' ? 'en' : 'th'
    localStorage.setItem('ap_lang', next)
    i18n.changeLanguage(next)
  }

  const saveProfile = async () => {
    setSaving(true)
    try {
      await updateEmployee(employee.id, profile)
      await refreshEmployee()
      toast(t('settingsPage.profileSaved'))
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const savePin = async () => {
    if (!/^\d{4}$/.test(pin)) {
      toast(t('settingsPage.pinInvalid'), 'warning')
      return
    }
    setSaving(true)
    try {
      await setEmployeePin(pin)
      await refreshEmployee()
      setPin('')
      toast(t('settingsPage.pinSaved'))
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatar = async (file) => {
    if (!file) return
    setSaving(true)
    try {
      await uploadAvatar(employee.id, file)
      await refreshEmployee()
      toast(t('settingsPage.avatarSaved'))
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {ToastEl}
      <PageHeader title={t('settingsPage.title')} subtitle={t('settingsPage.subtitle')} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <h2 className="font-semibold text-slate-800 mb-4">{t('settingsPage.profile')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('settingsPage.firstName')}><Input value={profile.first_name} onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))} /></Field>
            <Field label={t('settingsPage.lastName')}><Input value={profile.last_name} onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))} /></Field>
            <Field label={t('settingsPage.email')}><Input value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} /></Field>
            <Field label={t('settingsPage.phone')}><Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} /></Field>
          </div>
          <div className="mt-5"><Button loading={saving} onClick={saveProfile}>{t('settingsPage.saveProfile')}</Button></div>
        </Card>

        <div className="space-y-5">
          <Card>
            <h2 className="font-semibold text-slate-800 mb-4">{t('settingsPage.avatar')}</h2>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary-100 overflow-hidden flex items-center justify-center text-primary-700 font-bold text-xl">
                {employee?.avatar_url ? <img src={employee.avatar_url} alt="" className="w-full h-full object-cover" /> : employee?.first_name?.[0]}
              </div>
              <label className="cursor-pointer px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">
                {t('settingsPage.upload')}
                <input type="file" accept="image/*" className="hidden" onChange={e => handleAvatar(e.target.files?.[0])} />
              </label>
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold text-slate-800 mb-4">{t('settingsPage.language')}</h2>
            <Button variant="secondary" onClick={toggleLang}>{i18n.language === 'th' ? t('settingsPage.switchToEnglish') : t('settingsPage.switchToThai')}</Button>
          </Card>

          <Card>
            <h2 className="font-semibold text-slate-800 mb-4">{t('settingsPage.pin')}</h2>
            <Field label={t('settingsPage.newPin')}><Input value={pin} onChange={e => setPin(e.target.value)} maxLength={4} inputMode="numeric" placeholder="0000" /></Field>
            <div className="mt-4"><Button loading={saving} onClick={savePin}>{t('settingsPage.changePin')}</Button></div>
          </Card>
        </div>
      </div>
    </>
  )
}
