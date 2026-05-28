import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '../hooks/useNotifications'

export default function NotificationCenter({ employee, can, onNavigate }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications({ employee, can })

  const openPanel = () => setOpen(p => !p)

  const handleClick = async (notification) => {
    try { await markRead(notification.id) } catch {}
    if (notification.link && onNavigate) onNavigate(notification.link)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={openPanel}
        className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors text-sm sm:text-lg flex items-center justify-center"
        aria-label={t('common.notification')}
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4 font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed right-4 top-16 z-40 w-[min(380px,calc(100vw-2rem))] bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="font-semibold text-slate-800">Notifications</p>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={() => markAllRead()} className="text-xs font-semibold text-primary-700 hover:text-primary-800">
                  Mark read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100">×</button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="py-10 text-center text-sm text-slate-400">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">{t('common.noNotifications')}</div>
            ) : notifications.map(n => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className="w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${n.is_read || n.read_at ? 'bg-slate-200' : 'bg-primary-600'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{n.title || t('common.notification')}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message || '-'}</p>
                    <p className="text-xs text-slate-300 mt-1">{n.created_at ? new Date(n.created_at).toLocaleString('th-TH') : ''}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
