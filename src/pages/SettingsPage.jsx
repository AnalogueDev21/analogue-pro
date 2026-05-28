import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import { updateEmployee, uploadAvatar } from '@/services/employeeService'
import { setEmployeePin } from '@/features/auth/services/pinService'
import { Button, Field, Input, PageHeader, SettingsSection, Toggle, useToast } from '@/components/ui/index.jsx'

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { employee, refreshEmployee, logout } = useAuthStore()
  const { show: toast, el: ToastEl } = useToast()
  const [saving, setSaving] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('ap_theme') || 'light')
  const [inAppNotifications, setInAppNotifications] = useState(() => localStorage.getItem('ap_in_app_notifications') !== 'false')
  const [emailNotifications, setEmailNotifications] = useState(false)
  const [profile, setProfile] = useState({
    first_name: employee?.first_name || '',
    last_name: employee?.last_name || '',
    phone: employee?.phone || '',
    email: employee?.email || '',
  })
  const [pin, setPin] = useState('')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('ap_theme', theme)
    window.dispatchEvent(new CustomEvent('ap-theme-change', { detail: { theme } }))
  }, [theme])

  useEffect(() => {
    localStorage.setItem('ap_in_app_notifications', String(inAppNotifications))
  }, [inAppNotifications])

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

  const sectionText = i18n.language === 'en'
    ? {
      profileDesc: 'Keep your contact details current for HR and workflow notifications.',
      appearance: 'Appearance',
      appearanceDesc: 'Control display preferences for this device.',
      security: 'Security',
      securityDesc: 'Manage your PIN and account protection settings.',
      notifications: 'Notifications',
      notificationsDesc: 'Choose which channels Analogue Pro can use.',
      system: 'System / Demo',
      systemDesc: 'Build information and demo account context.',
      darkMode: 'Dark mode',
      language: 'Language',
      preview: 'Theme preview',
      pinInfo: 'PIN is used after login to protect the active session.',
      passwordInfo: 'Password and Microsoft 365 security are managed by the authentication provider.',
      logoutAll: 'Logout all sessions',
      logoutAllHint: 'Placeholder for a future organization-wide session control.',
      inApp: 'In-app notifications',
      email: 'Email notifications',
      emailHint: 'Email delivery will be connected after SMTP/provider setup.',
      inAppHint: 'Bell, approval, payroll, and employee events',
      version: 'App version',
      demoMode: 'Demo mode',
      role: 'Current role',
      account: 'Account',
    }
    : {
      profileDesc: 'อัปเดตข้อมูลติดต่อสำหรับ HR และ workflow notification',
      appearance: 'การแสดงผล',
      appearanceDesc: 'ตั้งค่าหน้าตาแอปสำหรับเครื่องนี้',
      security: 'ความปลอดภัย',
      securityDesc: 'จัดการ PIN และข้อมูลความปลอดภัยของบัญชี',
      notifications: 'การแจ้งเตือน',
      notificationsDesc: 'เลือกช่องทางแจ้งเตือนของ Analogue Pro',
      system: 'ระบบ / เดโม',
      systemDesc: 'ข้อมูลเวอร์ชันและบริบทบัญชีเดโม',
      darkMode: 'โหมดมืด',
      language: 'ภาษา',
      preview: 'ตัวอย่างธีม',
      pinInfo: 'PIN ใช้ยืนยันหลังล็อกอินเพื่อป้องกัน session ที่เปิดอยู่',
      passwordInfo: 'รหัสผ่านและ Microsoft 365 security จัดการผ่านผู้ให้บริการ Auth',
      logoutAll: 'ออกจากระบบทุก session',
      logoutAllHint: 'Placeholder สำหรับควบคุม session ระดับองค์กรในอนาคต',
      inApp: 'แจ้งเตือนในแอป',
      email: 'แจ้งเตือนทางอีเมล',
      emailHint: 'จะเชื่อมต่ออีเมลหลังตั้งค่า SMTP/provider',
      inAppHint: 'แจ้งเตือนคำขออนุมัติ เงินเดือน และข้อมูลพนักงาน',
      version: 'เวอร์ชันแอป',
      demoMode: 'โหมดเดโม',
      role: 'บทบาทปัจจุบัน',
      account: 'บัญชี',
    }

  return (
    <>
      {ToastEl}
      <PageHeader title={t('settingsPage.title')} subtitle={t('settingsPage.subtitle')} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <SettingsSection title={t('settingsPage.profile')} description={sectionText.profileDesc}>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl bg-primary-100 overflow-hidden flex items-center justify-center text-primary-700 font-bold text-xl flex-shrink-0">
              {employee?.avatar_url ? <img src={employee.avatar_url} alt="" className="w-full h-full object-cover" /> : employee?.first_name?.[0]}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 truncate">{employee?.first_name} {employee?.last_name}</p>
              <p className="text-sm text-slate-500 truncate">{employee?.employee_code}</p>
              <label className="mt-2 inline-flex cursor-pointer px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">
                {t('settingsPage.upload')}
                <input type="file" accept="image/*" className="hidden" onChange={e => handleAvatar(e.target.files?.[0])} />
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('settingsPage.firstName')}><Input value={profile.first_name} onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))} /></Field>
            <Field label={t('settingsPage.lastName')}><Input value={profile.last_name} onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))} /></Field>
            <Field label={t('settingsPage.email')}><Input value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} /></Field>
            <Field label={t('settingsPage.phone')}><Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} /></Field>
          </div>
          <Button className="w-full sm:w-auto mt-5" loading={saving} onClick={saveProfile}>{t('settingsPage.saveProfile')}</Button>
        </SettingsSection>

        <SettingsSection title={sectionText.appearance} description={sectionText.appearanceDesc}>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-4">
              <div>
                <p className="font-semibold text-slate-800 text-sm">{sectionText.darkMode}</p>
                <p className="text-xs text-slate-500">{theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}</p>
              </div>
              <Toggle value={theme === 'dark'} onChange={value => setTheme(value ? 'dark' : 'light')} />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-4">
              <div>
                <p className="font-semibold text-slate-800 text-sm">{sectionText.language}</p>
                <p className="text-xs text-slate-500">{i18n.language === 'th' ? 'ไทย' : 'English'}</p>
              </div>
              <Button variant="secondary" onClick={toggleLang}>{i18n.language === 'th' ? 'EN' : 'TH'}</Button>
            </div>
            <div className="rounded-xl border border-slate-100 p-4 bg-slate-50">
              <p className="text-xs font-semibold text-slate-500 mb-3">{sectionText.preview}</p>
              <div className="h-20 rounded-xl bg-white border border-slate-100 p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary-700" />
                <div className="space-y-2 flex-1">
                  <div className="h-2.5 rounded-full bg-slate-300 w-2/3" />
                  <div className="h-2.5 rounded-full bg-primary-200 w-1/2" />
                </div>
              </div>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title={sectionText.security} description={sectionText.securityDesc}>
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-100 p-4">
              <Field label={t('settingsPage.newPin')} hint={sectionText.pinInfo}>
                <Input value={pin} onChange={e => setPin(e.target.value)} maxLength={4} inputMode="numeric" placeholder="0000" />
              </Field>
              <Button className="w-full sm:w-auto mt-4" loading={saving} onClick={savePin}>{t('settingsPage.changePin')}</Button>
            </div>
            <div className="rounded-xl border border-slate-100 p-4">
              <p className="font-semibold text-slate-800 text-sm">Password / SSO</p>
              <p className="text-sm text-slate-500 mt-1">{sectionText.passwordInfo}</p>
            </div>
            <div className="rounded-xl border border-dashed border-slate-200 p-4">
              <p className="font-semibold text-slate-800 text-sm">{sectionText.logoutAll}</p>
              <p className="text-sm text-slate-500 mt-1">{sectionText.logoutAllHint}</p>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title={sectionText.notifications} description={sectionText.notificationsDesc}>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-4">
              <div>
                <p className="font-semibold text-slate-800 text-sm">{sectionText.inApp}</p>
                <p className="text-xs text-slate-500">{sectionText.inAppHint}</p>
              </div>
              <Toggle value={inAppNotifications} onChange={setInAppNotifications} />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-4">
              <div>
                <p className="font-semibold text-slate-800 text-sm">{sectionText.email}</p>
                <p className="text-xs text-slate-500">{sectionText.emailHint}</p>
              </div>
              <Toggle value={emailNotifications} onChange={setEmailNotifications} />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title={sectionText.system} description={sectionText.systemDesc}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              [sectionText.version, '0.1.0 PWA'],
              [sectionText.demoMode, 'Enabled'],
              [sectionText.role, employee?.roles?.name_en || employee?.roles?.name || '-'],
              [sectionText.account, employee?.email || '-'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="font-semibold text-slate-800 text-sm mt-1 break-words">{value}</p>
              </div>
            ))}
          </div>
          <Button variant="danger" className="w-full sm:w-auto mt-5" onClick={logout}>{t('common.logout')}</Button>
        </SettingsSection>
      </div>
    </>
  )
}
