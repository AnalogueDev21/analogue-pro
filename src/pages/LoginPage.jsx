// src/pages/LoginPage.jsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'

const DEMO_PASSWORD = 'TestUser@2026'
const DEMO_PIN = '1234'
const DEMO_ACCOUNTS = [
  { role: 'Super Admin', email: 'super.admin@analogue-pro.local' },
  { role: 'Company Admin', email: 'company.admin@analogue-pro.local' },
  { role: 'HR Manager', email: 'hr.manager@analogue-pro.local' },
  { role: 'Finance / HR Staff', email: 'finance.hr.staff@analogue-pro.local' },
  { role: 'Manager', email: 'manager@analogue-pro.local' },
  { role: 'Supervisor', email: 'supervisor@analogue-pro.local' },
  { role: 'Employee', email: 'employee@analogue-pro.local' },
]

export default function LoginPage() {
  const { t, i18n } = useTranslation()
  const { login, loginWithMicrosoft } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [microsoftLoading, setMicrosoftLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedRole, setCopiedRole] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.email || !form.password) { setError(t('common.required')); return }
    setLoading(true)
    try {
      await login(form)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const submitMicrosoft = async () => {
    setError('')
    setMicrosoftLoading(true)
    try {
      await loginWithMicrosoft()
    } catch (e) {
      setError(e.message)
      setMicrosoftLoading(false)
    }
  }

  const toggleLang = () => {
    const next = i18n.language === 'th' ? 'en' : 'th'
    localStorage.setItem('ap_lang', next)
    i18n.changeLanguage(next)
  }

  const useDemoAccount = (account) => {
    setError('')
    setForm({ email: account.email, password: DEMO_PASSWORD })
  }

  const copyDemoAccount = async (account) => {
    const text = [
      `${account.role}`,
      `Email: ${account.email}`,
      `Password: ${DEMO_PASSWORD}`,
      `PIN: ${DEMO_PIN}`,
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopiedRole(account.role)
      setTimeout(() => setCopiedRole(''), 1600)
    } catch {
      setError(text)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left — Branding */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary-700 to-primary-900 flex-col justify-between p-12 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <span className="text-primary-700 font-black text-lg">A</span>
            </div>
            <span className="text-xl font-bold">{t('app.name')}</span>
          </div>
          <p className="text-primary-200 text-sm">{t('app.tagline')}</p>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            {t('loginHero.title').split('\n').map((line, i, arr) => (
              <span key={line}>{line}{i < arr.length - 1 && <br />}</span>
            ))}
          </h1>
          <p className="text-primary-200 text-base leading-relaxed max-w-sm">
            {t('loginHero.subtitle').split('\n').map((line, i, arr) => (
              <span key={line}>{line}{i < arr.length - 1 && <br />}</span>
            ))}
          </p>
          <div className="flex gap-8 pt-4">
            {[
              { n: 'Multi-Company', d: t('loginHero.multiCompany') },
              { n: 'RBAC', d: t('loginHero.rbac') },
              { n: 'i18n', d: t('loginHero.i18n') },
            ].map(({ n, d }) => (
              <div key={n}>
                <p className="font-bold text-sm">{n}</p>
                <p className="text-primary-300 text-xs">{d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-primary-300 text-sm">
          © 2025 Analogue Pro. All rights reserved.
        </p>
      </div>

      {/* Right — Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-16 relative">
        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="absolute top-6 right-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors hover:bg-white"
        >
          <span className="text-base">{i18n.language === 'th' ? '🇹🇭' : '🇬🇧'}</span>
          {i18n.language === 'th' ? 'TH' : 'EN'}
        </button>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="w-9 h-9 bg-primary-700 rounded-xl flex items-center justify-center">
            <span className="text-white font-black">A</span>
          </div>
          <span className="text-lg font-bold text-slate-800">{t('app.name')}</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800">{t('auth.welcome')}</h2>
            <p className="text-slate-500 text-sm mt-1">{t('auth.loginSubtitle')}</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              <span className="text-base">⚠️</span>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('auth.email')}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="you@company.com"
                autoComplete="email"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 pr-11 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-lg"
                >
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                {t('auth.forgotPassword')}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm mt-2"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : t('auth.loginBtn')
              }
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">{t('auth.or')}</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={submitMicrosoft}
            disabled={loading || microsoftLoading}
            className="w-full py-3 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 border border-slate-200 shadow-sm"
          >
            {microsoftLoading ? (
              <div className="w-4 h-4 border-2 border-slate-300 border-t-primary-700 rounded-full animate-spin" />
            ) : (
              <>
                <span className="grid grid-cols-2 gap-0.5 w-4 h-4" aria-hidden="true">
                  <span className="bg-[#f25022]" />
                  <span className="bg-[#7fba00]" />
                  <span className="bg-[#00a4ef]" />
                  <span className="bg-[#ffb900]" />
                </span>
                {t('auth.microsoftLogin')}
              </>
            )}
          </button>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-800">Demo Accounts</p>
                <p className="text-xs text-slate-400">Password: {DEMO_PASSWORD} · PIN: {DEMO_PIN}</p>
              </div>
              {copiedRole && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                  Copied
                </span>
              )}
            </div>
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
              {DEMO_ACCOUNTS.map(account => (
                <div key={account.email} className="px-4 py-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-700 truncate">{account.role}</p>
                    <p className="text-xs text-slate-400 truncate">{account.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => useDemoAccount(account)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                  >
                    Use
                  </button>
                  <button
                    type="button"
                    onClick={() => copyDemoAccount(account)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Copy
                  </button>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-8">
            {t('app.name')} · Enterprise HR Platform
          </p>
        </div>
      </div>
    </div>
  )
}
