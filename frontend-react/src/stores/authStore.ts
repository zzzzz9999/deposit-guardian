import { create } from 'zustand'
import { authApi } from '../api'
import { clearAuth } from '../api/client'
import type { User } from '../types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { username: string; email: string; password: string; phone?: string }) => Promise<void>
  logout: () => Promise<void>
  restoreSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const data = await authApi.login({ email, password })
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      set({ user: data.user, isAuthenticated: true })
    } finally {
      set({ isLoading: false })
    }
  },

  register: async (formData) => {
    set({ isLoading: true })
    try {
      const data = await authApi.register(formData)
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      set({ user: data.user, isAuthenticated: true })
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    const rt = localStorage.getItem('refresh_token')
    if (rt) {
      try { await authApi.logout(rt) } catch { /* ignore */ }
    }
    clearAuth()
    set({ user: null, isAuthenticated: false })
  },

  restoreSession: async () => {
    const rt = localStorage.getItem('refresh_token')
    if (!rt) return
    try {
      const data = await authApi.refresh(rt)
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      const user = await authApi.me()
      set({ user, isAuthenticated: true })
    } catch {
      clearAuth()
    }
  },
}))
