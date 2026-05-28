// src/pages/PinPage.jsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'

function PinDots({ value, length = 4 }) {
  return (
    <div className="flex gap-3 justify-center my-6">
      {Array.from({ length }).map((_, i) => (
        <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
          i < value.length
            ? 'bg-primary-700 border-primary-700 scale-110'
            : 'bg-transparent border-slate-300'
        }`} />
      ))}
    </div>
  )
}

function PinPad({ onPress, onDelete, onClear }) {
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫']
  return (
    <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
      {keys.map((k, i) => (
        <button
          key={i}
          onClick={() => {
            if (k === '⌫') onDelete()
            else if (k !== '') onPress(k)
          }}
          disabled={k === ''}
          className={`h-14 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${
            k === '' ? 'invisible' :
            k === '⌫' ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' :
            'bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 shadow-sm hover:shadow'
          }`}
        >
          {k}
        </button>
      ))}
    </div>
  )
}

export default function PinPage() {
  const { t } = useTranslation()
  const { employee, screen, verifyPin, setupPin, logout } = useAuthStore()
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [step, setStep] = useState('enter') // enter | confirm (for setup)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isSetup = screen === 'pin-setup'

  const handlePress = (key) => {
    setError('')
    if (isSetup) {
      if (step === 'enter' && pin.length < 4) {
        const next = pin + key
        setPin(next)
        if (next.length === 4) setStep('confirm')
      } else if (step === 'confirm' && confirmPin.length < 4) {
        const next = confirmPin + key
        setConfirmPin(next)
        if (next.length === 4) handleSetup(next)
      }
    } else {
      if (pin.length < 4) {
        const next = pin + key
        setPin(next)
        if (next.length === 4) handleVerify(next)
      }
    }
  }

  const handleDelete = () => {
    setError('')
    if (isSetup && step === 'confirm') setConfirmPin(p => p.slice(0, -1))
    else setPin(p => p.slice(0, -1))
  }

  const handleVerify = async (p) => {
    setLoading(true)
    const ok = await verifyPin(p)
    if (!ok) {
      setError(t('auth.pin.wrong'))
      setPin('')
    }
    setLoading(false)
  }

  const handleSetup = async (p) => {
    if (p !== pin) {
      setError(t('auth.pin.mismatch'))
      setConfirmPin('')
      setStep('enter')
      setPin('')
      return
    }
    setLoading(true)
    try {
      await setupPin(p)
    } catch (e) {
      setError(e.message)
      setConfirmPin('')
    }
    setLoading(false)
  }

  const currentPin = isSetup && step === 'confirm' ? confirmPin : pin
  const title = isSetup
    ? (step === 'enter' ? t('auth.pin.setup') : t('auth.pin.confirm'))
    : t('auth.pin.title')
  const subtitle = isSetup
    ? (step === 'enter' ? t('auth.pin.setupSub') : t('auth.pin.confirmSub'))
    : t('auth.pin.subtitle')

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
          {/* Avatar */}
          <div className="text-center mb-2">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-2xl font-bold mx-auto mb-3">
              {employee?.first_name?.[0]?.toUpperCase()}
            </div>
            <p className="font-semibold text-slate-800">{employee?.first_name} {employee?.last_name}</p>
            <p className="text-sm text-slate-400">{employee?.email}</p>
          </div>

          {/* Title */}
          <div className="text-center mt-5">
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          </div>

          {/* Dots */}
          <PinDots value={currentPin} />

          {/* Error */}
          {error && (
            <p className="text-center text-sm text-red-500 mb-3 -mt-2">{error}</p>
          )}

          {/* Pad */}
          {loading
            ? <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
            : <PinPad onPress={handlePress} onDelete={handleDelete} />
          }
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full mt-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
        >
          ← {t('auth.login')} {t('common.back')}
        </button>
      </div>
    </div>
  )
}
