// src/components/layout/AppShell.jsx
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import { usePermission } from '@/core/rbac/PermissionGate'
import { NotificationCenter } from '@/features/notifications'
import { fieldName } from '@/utils/lang'

const NAV = [
  {
    group: 'nav.dashboard',
    items: [
      { id: 'dashboard', icon: '▦', labelKey: 'nav.dashboard' },
    ],
  },
  {
    group: 'nav.organization',
    items: [
      { id: 'company',     icon: '🏢', labelKey: 'nav.company',     perm: 'org.manage_company' },
      { id: 'branches',    icon: '🏬', labelKey: 'nav.branches',    perm: 'org.manage_branch'  },
      { id: 'departments', icon: '🗂',  labelKey: 'nav.departments', perm: 'org.manage_dept'    },
      { id: 'positions',   icon: '🎯', labelKey: 'nav.positions',   perm: 'org.manage_position'},
      { id: 'roles',       icon: '🔐', labelKey: 'nav.roles',       perm: 'org.manage_role'    },
    ],
  },
  {
    group: 'nav.organization',
    items: [
      { id: 'teams', icon: 'T', labelKey: 'nav.teams', fallback: 'Teams', perms: ['team.view','team.manage'] },
    ],
  },
  {
    group: 'nav.employees',
    items: [
      { id: 'employees', icon: '👥', labelKey: 'nav.employees',
        perms: ['employee.view_all','employee.view_team','employee.view_self'] },
    ],
  },
  {
    group: 'nav.attendance',
    items: [
      { id: 'attendance', icon: '🕐', labelKey: 'nav.attendance' },
      { id: 'leave',      icon: '📅', labelKey: 'nav.leave'      },
      { id: 'ot',         icon: '⏱',  labelKey: 'nav.ot'         },
      { id: 'approvals',  icon: '✓',  labelKey: 'nav.approvals',
        perms: ['approval.view','approval.manage'] },
    ],
  },
  {
    group: 'nav.payroll',
    items: [
      { id: 'payroll', icon: '💰', labelKey: 'nav.payroll',
        perms: ['payroll.view_self','payroll.view_all'] },
      { id: 'payroll-import', icon: '📥', labelKey: 'nav.payrollImport',
        perms: ['payroll.import','payroll.manage'] },
    ],
  },
  {
    group: 'Business OS',
    items: [
      { id: 'executive', icon: '📊', labelKey: 'nav.executive', fallback: 'Executive', perm: 'dashboard.executive' },
      { id: 'sales',     icon: '💹', labelKey: 'nav.sales',     fallback: 'Sales',     perms: ['sales.view','sales.manage'] },
      { id: 'inventory', icon: 'I', labelKey: 'nav.inventory', fallback: 'Inventory',
        perms: ['stock.view','stock.manage','stock.request','stock.issue','stock.receive','stock.count','stock.adjust'] },
    ],
  },
  {
    group: 'nav.reports',
    items: [
      { id: 'reports', icon: '📊', labelKey: 'nav.reports', perm: 'report.view' },
      { id: 'activity-logs', icon: '🧾', labelKey: 'nav.activityLogs',
        perms: ['activity.view','activity.export'] },
    ],
  },
]

const BottomIcon = ({ type }) => {
  const common = 'w-5 h-5'
  const stroke = 'currentColor'
  if (type === 'dashboard') return (
    <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5h7v6H4V5Zm9 0h7v4h-7V5ZM4 13h7v6H4v-6Zm9-2h7v8h-7v-8Z" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
  if (type === 'employees') return (
    <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-6 1.8-6 4v2h12v-2c0-2.2-2.7-4-6-4Zm8-1a3 3 0 1 0 0-6m0 8c1.9.2 4 1.5 4 3.2V19h-4" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  if (type === 'leave') return (
    <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3v4M17 3v4M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm3 9 2 2 4-5" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  if (type === 'payroll') return (
    <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 7h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm0 3h14M8 15h4m5 0h.01" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" stroke={stroke} strokeWidth="1.8" />
      <path d="M19 12a7.3 7.3 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7.3 7.3 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 3.1h5l.3-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function AppShell({ page, setPage, children }) {
  const { t, i18n } = useTranslation()
  const { employee, company, logout } = useAuthStore()
  const { can, canAny } = usePermission()
  const [sideOpen, setSideOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('ap_theme') || 'light')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('ap_theme', theme)
  }, [theme])

  useEffect(() => {
    const handleThemeChange = (event) => setTheme(event.detail?.theme || localStorage.getItem('ap_theme') || 'light')
    window.addEventListener('ap-theme-change', handleThemeChange)
    return () => window.removeEventListener('ap-theme-change', handleThemeChange)
  }, [])

  const toggleLang = () => {
    const next = i18n.language === 'th' ? 'en' : 'th'
    localStorage.setItem('ap_lang', next)
    i18n.changeLanguage(next)
  }

  const toggleTheme = () => setTheme(p => p === 'dark' ? 'light' : 'dark')

  const canSee = (item) => {
    if (!item.perm && !item.perms) return true
    if (item.perm) return can(item.perm)
    if (item.perms) return canAny(...item.perms)
    return false
  }

  const navLabel = (item) => {
    if (item.id === 'teams') return i18n.language?.startsWith('th') ? 'ทีม' : 'Teams'
    if (item.id === 'inventory') return i18n.language?.startsWith('th') ? 'คลังสินค้า' : 'Inventory'
    if (item.id === 'executive') return i18n.language?.startsWith('th') ? 'Executive Dashboard' : 'Executive Dashboard'
    if (item.id === 'sales') return i18n.language?.startsWith('th') ? 'ยอดขาย' : 'Sales'
    return t(item.labelKey, item.fallback || item.labelKey)
  }

  const NavItem = ({ item }) => (
    <button
      onClick={() => { setPage(item.id); setSideOpen(false) }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
        page === item.id
          ? 'bg-primary-50 text-primary-700 font-semibold'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <span className={`text-base w-5 text-center flex-shrink-0 ${page === item.id ? 'text-primary-700' : 'text-slate-400'}`}>
        {item.icon}
      </span>
      <span>{navLabel(item)}</span>
      {page === item.id && <div className="ml-auto w-1.5 h-1.5 bg-primary-700 rounded-full" />}
    </button>
  )

  const specialPageLabels = { 'payroll-import': 'nav.payrollImport', approvals: 'nav.approvals', 'activity-logs': 'nav.activityLogs', executive: 'nav.executive', sales: 'nav.sales' }
  const pageLabelKey = specialPageLabels[page] || `nav.${page}`

  const Sidebar = () => (
    <aside className="w-64 flex-shrink-0 h-full flex flex-col bg-white border-r border-slate-100 overflow-hidden">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-100 flex items-center gap-3">
        <div className="w-9 h-9 bg-primary-700 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-white font-black text-sm">A</span>
        </div>
        <div className="overflow-hidden">
          <p className="font-bold text-slate-800 text-sm truncate">{t('app.name')}</p>
          <p className="text-xs text-slate-400 truncate">{fieldName(i18n, company, 'Loading...')}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV.map(({ group, items }) => {
          const visible = items.filter(canSee)
          if (!visible.length) return null
          return (
            <div key={group}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
                {t(group)}
              </p>
              <div className="space-y-0.5">
                {visible.map(item => <NavItem key={item.id} item={item} />)}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
          onClick={() => setProfileOpen(!profileOpen)}>
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold flex-shrink-0">
            {employee?.first_name?.[0]}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold text-slate-700 truncate">
              {employee?.first_name} {employee?.last_name}
            </p>
            <p className="text-xs text-slate-400 truncate">{employee?.roles?.name_en || employee?.roles?.name}</p>
          </div>
          <span className="text-slate-400 text-xs">⋯</span>
        </div>

        {profileOpen && (
          <div className="mt-1 px-1">
            <button onClick={toggleLang}
              className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-2 transition-colors">
              🌐 {i18n.language === 'th' ? 'English' : t('common.thai')}
            </button>
            <button onClick={() => setPage('settings')}
              className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-2 transition-colors">
              ⚙️ {t('common.settings')}
            </button>
            <button onClick={logout}
              className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors">
              🚪 {t('common.logout')}
            </button>
          </div>
        )}
      </div>
    </aside>
  )

  return (
    <div className="h-dvh min-h-dvh flex bg-slate-50 overflow-hidden">
      {/* Mobile overlay */}
      {sideOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSideOpen(false)} />
      )}

      {/* Sidebar Desktop */}
      <div className="hidden lg:block h-full">
        <Sidebar />
      </div>

      {/* Sidebar Mobile */}
      <div className={`fixed inset-y-0 left-0 z-40 lg:hidden transition-transform duration-300 ${sideOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-slate-100 flex items-center px-4 sm:px-4 gap-2 sm:gap-3 flex-shrink-0">
          <button onClick={() => setSideOpen(true)}
            className="lg:hidden w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors flex items-center justify-center">
            ☰
          </button>

          {/* Breadcrumb */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-700 capitalize truncate">{t(pageLabelKey, page)}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
              title={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors text-sm sm:text-base flex items-center justify-center"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              onClick={toggleLang}
              aria-label={t('common.language')}
              title={t('common.language')}
              className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors text-xs font-bold flex items-center gap-1"
            >
              <span>🌐</span>
              {i18n.language === 'th' ? 'TH' : 'EN'}
            </button>
            {can('notification.view') && (
              <NotificationCenter employee={employee} can={can} onNavigate={setPage} />
            )}
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold cursor-pointer">
              {employee?.first_name?.[0]}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-4 py-4 md:p-6 lg:p-8 pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-8 animate-fade-in">
          <div className="w-full max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 h-[calc(72px+env(safe-area-inset-bottom))] bg-white border-t border-slate-100 flex z-20 shadow-lg pb-[env(safe-area-inset-bottom)]">
          {[
            { id:'dashboard', icon:'dashboard', key:'nav.dashboard' },
            { id:'employees', icon:'employees', key:'nav.employees' },
            { id:'leave',     icon:'leave', key:'nav.leave'     },
            { id:'payroll',   icon:'payroll', key:'nav.payroll'   },
            { id:'settings',  icon:'settings', key:'common.settings'},
          ].map(item => (
            <button key={item.id} onClick={() => setPage(item.id)}
              className={`relative flex-1 h-[72px] flex flex-col items-center justify-center gap-1 transition-colors ${
                page === item.id ? 'text-primary-700 bg-primary-50' : 'text-slate-400'
              }`}>
              <span className="leading-none w-6 h-6 flex items-center justify-center"><BottomIcon type={item.icon} /></span>
              <span className="text-[11px] leading-tight font-semibold">{t(item.key)}</span>
              {page === item.id && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-700 rounded-full" />
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
