// src/components/ui/index.jsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

// ── Toast ──────────────────────────────────────────────────────────
export function useToast() {
  const [list, setList] = useState([])
  const show = (msg, type = 'success') => {
    const id = Date.now()
    setList(p => [...p, { id, msg, type }])
    setTimeout(() => setList(p => p.filter(t => t.id !== id)), 3500)
  }
  const el = (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 w-80 pointer-events-none">
      {list.map(t => (
        <div key={t.id}
          className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2.5 pointer-events-auto border animate-fade-in
            ${t.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : t.type === 'error'   ? 'bg-red-50 border-red-200 text-red-800'
            : t.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
          <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
          {t.msg}
        </div>
      ))}
    </div>
  )
  return { show, el }
}

export function MobilePageContainer({ children, className = '' }) {
  return <div className={`px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 ${className}`}>{children}</div>
}

export function MobileCard({ children, className = '', padding = true }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${padding ? 'p-4 md:p-6' : ''} ${className}`}>
      {children}
    </div>
  )
}

export function MobileHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4 md:mb-6 ${className}`}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-slate-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0 w-full sm:w-auto flex justify-start sm:justify-end">{action}</div>}
    </div>
  )
}

export function MobileModal({ children, className = '' }) {
  return (
    <div className={`w-[calc(100vw-24px)] max-w-md max-h-[85dvh] overflow-y-auto rounded-2xl bg-white shadow-xl ${className}`}>
      {children}
    </div>
  )
}

export function MobileFormGrid({ children, className = '' }) {
  return <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 ${className}`}>{children}</div>
}

// ── Modal ──────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, size = 'md' }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const sizes = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-3 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`w-[calc(100vw-24px)] ${sizes[size]} bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in max-h-[85dvh] flex flex-col`}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="font-semibold text-lg text-slate-800">{title}</h3>
          <button onClick={onClose}
            className="w-9 h-9 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center transition-colors text-lg">
            ×
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

// ── Drawer (slide from right) ──────────────────────────────────────
export function Drawer({ title, onClose, children, size = 'md' }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-xl' }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`w-full ${sizes[size]} bg-white h-full max-h-dvh shadow-xl flex flex-col animate-slide-in`}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center text-lg">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  )
}

// ── Confirm Dialog ─────────────────────────────────────────────────
export function ConfirmDialog({ title, message, onConfirm, onCancel, danger }) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-[calc(100vw-24px)] max-w-sm max-h-[85dvh] overflow-y-auto p-4 sm:p-6 animate-fade-in">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4 ${danger ? 'bg-red-100' : 'bg-amber-100'}`}>
          {danger ? '🗑' : '⚠️'}
        </div>
        <h3 className="font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
      <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 min-h-11 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            {t('common.cancel')}
          </button>
          <button onClick={onConfirm}
            className={`flex-1 min-h-11 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-700 hover:bg-primary-800'}`}>
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Form Field ─────────────────────────────────────────────────────
export function Field({ label, error, required, children, hint }) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ── Input ──────────────────────────────────────────────────────────
export function Input({ error, ...props }) {
  return (
    <input
      className={`w-full h-11 sm:h-12 md:h-11 px-3.5 border rounded-xl text-base md:text-sm bg-white text-slate-900 placeholder-slate-400
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all
        ${error ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
      {...props}
    />
  )
}

// ── Textarea ───────────────────────────────────────────────────────
export function Textarea({ error, rows = 3, ...props }) {
  return (
    <textarea
      rows={rows}
      className={`w-full min-h-28 px-3.5 py-3 border rounded-xl text-base md:text-sm bg-white text-slate-900 placeholder-slate-400
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none
        ${error ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
      {...props}
    />
  )
}

// ── Select ─────────────────────────────────────────────────────────
export function Select({ error, children, ...props }) {
  return (
    <select
      className={`w-full h-11 sm:h-12 md:h-11 px-3.5 border rounded-xl text-base md:text-sm bg-white text-slate-900
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all
        ${error ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
      {...props}
    >
      {children}
    </select>
  )
}

// ── Toggle ─────────────────────────────────────────────────────────
export function Toggle({ value, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div onClick={() => onChange(!value)}
        className={`relative w-10 h-6 rounded-full transition-colors ${value ? 'bg-primary-600' : 'bg-slate-200'}`}>
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? 'left-5' : 'left-1'}`} />
      </div>
      {label && <span className="text-sm text-slate-700">{label}</span>}
    </label>
  )
}

// ── Badge ──────────────────────────────────────────────────────────
export function Badge({ children, color = 'gray' }) {
  const colors = {
    gray:   'bg-slate-100 text-slate-700',
    blue:   'bg-primary-100 text-primary-700',
    green:  'bg-emerald-100 text-emerald-700',
    red:    'bg-red-100 text-red-700',
    amber:  'bg-amber-100 text-amber-700',
    violet: 'bg-violet-100 text-violet-700',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.gray}`}>
      {children}
    </span>
  )
}

// ── Status Badge ───────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const { t } = useTranslation()
  const cfg = {
    active:      { color: 'green',  label: t('employee.statuses.active') },
    inactive:    { color: 'gray',   label: t('employee.statuses.inactive') },
    probation:   { color: 'amber',  label: t('employee.statuses.probation') },
    on_leave:    { color: 'blue',   label: t('employee.statuses.on_leave') },
    terminated:  { color: 'red',    label: t('employee.statuses.terminated') },
  }
  const c = cfg[status] || { color: 'gray', label: status }
  return <Badge color={c.color}>{c.label}</Badge>
}

// ── Empty State ────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl mb-4">{icon}</div>
      <p className="font-semibold text-slate-700">{title}</p>
      {subtitle && <p className="text-sm text-slate-400 mt-1 max-w-xs">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────
export function Skeleton({ className = 'h-4' }) {
  return <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />
}

// ── Table ──────────────────────────────────────────────────────────
export function Table({ headers, children, loading, empty, mobileCards }) {
  return (
    <>
    {mobileCards && (
      <div className="md:hidden divide-y divide-slate-100">
        {loading
          ? <div className="p-3 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
          : mobileCards}
      </div>
    )}
    <div className={`overflow-x-auto ${mobileCards ? 'hidden md:block' : ''}`}>
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {headers.map((h, i) => (
              <th key={i} className={`py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider ${h.align === 'right' ? 'text-right' : 'text-left'}`}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {headers.map((_, j) => (
                    <td key={j} className="py-3 px-4"><Skeleton /></td>
                  ))}
                </tr>
              ))
            : children
          }
        </tbody>
      </table>
    </div>
    {!loading && empty}
    </>
  )
}

// ── Page Header ────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return <MobileHeader title={title} subtitle={subtitle} action={action} />
}

// ── Button ─────────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', loading, icon, ...props }) {
  const variants = {
    primary:   'bg-primary-700 hover:bg-primary-800 text-white shadow-sm',
    secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200',
    danger:    'bg-red-600 hover:bg-red-700 text-white',
    ghost:     'text-slate-600 hover:bg-slate-100',
  }
  const sizes = {
    sm: 'px-3 text-xs h-10',
    md: 'px-4 text-sm h-11 sm:h-12 md:h-11',
    lg: 'px-5 text-base h-12',
  }
  return (
    <button
      className={`inline-flex items-center gap-2 font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]}`}
      disabled={loading}
      {...props}
    >
      {loading
        ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        : icon && <span>{icon}</span>
      }
      {children}
    </button>
  )
}

// ── Card ───────────────────────────────────────────────────────────
export function Card({ children, className = '', padding = true }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${padding ? 'p-4 md:p-6' : ''} ${className}`}>
      {children}
    </div>
  )
}

export function ResponsiveCard({ children, className = '' }) {
  return <Card className={className}>{children}</Card>
}

export function MobileListCard({ title, subtitle, meta, actions, children, badge }) {
  return (
    <div className="p-4 border-b border-slate-100 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 text-sm truncate">{title}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          {meta && <p className="text-xs text-slate-400 mt-1">{meta}</p>}
        </div>
        {badge && <div className="flex-shrink-0">{badge}</div>}
      </div>
      {children && <div className="mt-3 text-sm text-slate-600">{children}</div>}
      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function SettingsSection({ title, description, children, action }) {
  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      {children}
    </Card>
  )
}

// ── Search Input ───────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder }) {
  const { t } = useTranslation()
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-3 text-slate-400 text-sm">🔍</span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || `${t('common.search')}...`}
        className="w-full h-11 sm:h-12 md:h-11 pl-9 pr-4 border border-slate-200 rounded-xl text-base md:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      />
    </div>
  )
}
