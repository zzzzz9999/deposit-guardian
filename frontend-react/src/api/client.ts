import axios from 'axios'
import { useToastStore } from '../stores/toastStore'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || ''

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// 请求拦截器：注入 access_token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 响应拦截器：401 自动刷新 token，其他错误上报 Toast
let isRefreshing = false
let pendingQueue: Array<(token: string) => void> = []

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const status = error.response?.status

    // 非 401 错误：弹 Toast 提示（排除主动取消的请求）
    if (status && status !== 401) {
      const msg = error.response?.data?.detail || error.response?.data?.message || '操作失败，请稍后重试'
      useToastStore.getState().add({ type: 'error', message: String(msg) })
      return Promise.reject(error)
    }

    if (status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      clearAuth()
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve) => {
        pendingQueue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`
          resolve(apiClient(original))
        })
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, { refresh_token: refreshToken })
      const { access_token, refresh_token: newRefresh } = data
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', newRefresh)
      apiClient.defaults.headers.common.Authorization = `Bearer ${access_token}`
      pendingQueue.forEach((cb) => cb(access_token))
      pendingQueue = []
      original.headers.Authorization = `Bearer ${access_token}`
      return apiClient(original)
    } catch {
      clearAuth()
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  },
)

export function clearAuth() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  delete apiClient.defaults.headers.common.Authorization
}

// SSE 流式请求（不走 axios，用 fetch）
export function streamFetch(url: string, body: object, signal?: AbortSignal) {
  const token = localStorage.getItem('access_token')
  return fetch(`${BASE_URL}${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  })
}
