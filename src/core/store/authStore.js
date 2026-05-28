// src/core/store/authStore.js
import { create } from 'zustand'
import { supabase } from '@/services/supabase'
import i18n from '@/locales/i18n'

export const useAuthStore = create((set, get) => ({
  // State
  user: null,           // Supabase auth user
  employee: null,       // Employee record
  company: null,        // Company record
  permissions: [],      // Permission codes []
  roleLevel: 0,         // Role level number
  loading: true,
  screen: 'loading',    // loading | login | pin-setup | pin | app

  // ── Actions ────────────────────────────────────────────────────
  setScreen: (screen) => set({ screen }),

  loadSession: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { set({ loading: false, screen: 'login' }); return }

      await get().loadEmployee(session.user)
    } catch (e) {
      console.error(e)
      set({ loading: false, screen: 'login' })
    }
  },

  loadEmployee: async (user) => {
    try {
      const { data: emp, error } = await supabase
        .from('employees')
        .select(`
          *,
          companies(*),
          branches(id, name, name_en, code),
          departments(id, name, name_en),
          positions(id, name, name_en, level),
          roles(id, name, name_en, level)
        `)
        .eq('user_id', user.id)
        .single()

      if (error || !emp) {
        set({ loading: false, screen: 'login' })
        return
      }

      // Load permissions
      const { data: perms } = await supabase
        .from('role_permissions')
        .select('permissions(code)')
        .eq('role_id', emp.role_id)

      const permCodes = perms?.map(p => p.permissions?.code).filter(Boolean) || []

      set({
        user,
        employee: emp,
        company: emp.companies,
        permissions: permCodes,
        roleLevel: emp.roles?.level || 0,
        loading: false,
        screen: emp.pin_set ? 'pin' : 'pin-setup',
      })
    } catch (e) {
      console.error(e)
      set({ loading: false, screen: 'login' })
    }
  },

  login: async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(i18n.t('auth.loginError'))
    await get().loadEmployee(data.user)
  },

  loginWithMicrosoft: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: window.location.origin,
        scopes: 'openid email profile offline_access User.Read',
        queryParams: {
          prompt: 'select_account',
        },
      },
    })
    if (error) throw new Error(i18n.t('auth.microsoftError'))
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({
      user: null, employee: null, company: null,
      permissions: [], roleLevel: 0, screen: 'login',
    })
  },

  verifyPin: async (pin) => {
    const { employee } = get()
    if (!employee) return false
    if (employee.pin !== pin) return false
    set({ screen: 'app' })
    return true
  },

  setupPin: async (pin) => {
    const { employee } = get()
    const { error } = await supabase
      .from('employees')
      .update({ pin, pin_set: true })
      .eq('id', employee.id)
    if (error) throw error
    set({ employee: { ...employee, pin, pin_set: true }, screen: 'pin' })
  },

  // ── Helpers ────────────────────────────────────────────────────
  can: (permCode) => get().permissions.includes(permCode),

  canAny: (...codes) => codes.some(c => get().permissions.includes(c)),

  isLevel: (minLevel) => get().roleLevel >= minLevel,

  refreshEmployee: async () => {
    const { user } = get()
    if (user) await get().loadEmployee(user)
  },
}))
