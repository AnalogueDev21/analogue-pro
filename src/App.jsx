// src/App.jsx
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/core/store/authStore'
import { supabase } from '@/services/supabase'
import LoginPage from '@/pages/LoginPage'
import PinPage from '@/pages/PinPage'
import AppShell from '@/components/layout/AppShell'
import Dashboard from '@/pages/Dashboard'
import CompanyPage from '@/pages/CompanyPage'
import BranchesPage from '@/pages/BranchesPage'
import DepartmentsPage from '@/pages/DepartmentsPage'
import PositionsPage from '@/pages/PositionsPage'
import RolesPage from '@/pages/RolesPage'
import EmployeesPage from '@/pages/EmployeesPage'
import EmployeeDetailPage from '@/pages/EmployeeDetailPage'
import AttendancePage from '@/pages/AttendancePage'
import LeavePage from '@/pages/LeavePage'
import OTPage from '@/pages/OTPage'
import PayrollPage from '@/pages/PayrollPage'
import ReportsPage from '@/pages/ReportsPage'
import ActivityLogsPage from '@/pages/ActivityLogsPage'
import SettingsPage from '@/pages/SettingsPage'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 bg-primary-700 rounded-2xl flex items-center justify-center text-white font-black text-2xl mx-auto mb-4 shadow-lg">A</div>
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    </div>
  )
}

export default function App() {
  const { screen, loadSession, setScreen } = useAuthStore()
  const [page, setPage] = useState('dashboard')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null)

  useEffect(() => {
    loadSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setScreen('login')
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleViewEmployee = (id) => {
    setSelectedEmployeeId(id)
    setPage('employee-detail')
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard':       return <Dashboard />
      case 'company':         return <CompanyPage />
      case 'branches':        return <BranchesPage />
      case 'departments':     return <DepartmentsPage />
      case 'positions':       return <PositionsPage />
      case 'roles':           return <RolesPage />
      case 'employees':       return <EmployeesPage onViewDetail={handleViewEmployee} />
      case 'employee-detail': return <EmployeeDetailPage employeeId={selectedEmployeeId} onBack={() => setPage('employees')} />
      case 'attendance':      return <AttendancePage />
      case 'leave':           return <LeavePage />
      case 'ot':              return <OTPage />
      case 'payroll':         return <PayrollPage />
      case 'reports':         return <ReportsPage />
      case 'activity-logs':   return <ActivityLogsPage />
      case 'settings':        return <SettingsPage />
      default:                return <Dashboard />
    }
  }

  if (screen === 'loading')   return <LoadingScreen />
  if (screen === 'login')     return <LoginPage />
  if (screen === 'pin-setup') return <PinPage />
  if (screen === 'pin')       return <PinPage />

  return (
    <AppShell page={page} setPage={setPage}>
      {renderPage()}
    </AppShell>
  )
}
