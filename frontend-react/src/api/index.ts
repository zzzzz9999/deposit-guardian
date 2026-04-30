import { apiClient } from './client'
import type {
  AuthResponse, User, Case, CaseCategory, ChatSession, Message,
  ProgressTracker, ProgressEvent, CalcResult, DeductionItem,
  BlacklistEntry, City, CityDetail, GeneratedDoc, MinfadianArticle,
  CaseSubmission,
} from '../types'

// ── 认证 ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { username: string; email: string; password: string; phone?: string }) =>
    apiClient.post<AuthResponse>('/api/auth/register', data).then(r => r.data),
  login: (data: { email: string; password: string }) =>
    apiClient.post<AuthResponse>('/api/auth/login', data).then(r => r.data),
  refresh: (refresh_token: string) =>
    apiClient.post<{ access_token: string; refresh_token: string }>('/api/auth/refresh', { refresh_token }).then(r => r.data),
  logout: (refresh_token: string) =>
    apiClient.post('/api/auth/logout', { refresh_token }),
  me: () => apiClient.get<User>('/api/auth/me').then(r => r.data),
  updateMe: (data: Partial<User>) => apiClient.patch<User>('/api/auth/me', data).then(r => r.data),
  changePassword: (old_password: string, new_password: string, confirm_password: string) =>
    apiClient.post('/api/auth/change-password', { old_password, new_password, confirm_password }).then(r => r.data),
}

// ── 案例库 ────────────────────────────────────────────────────────────────────
export const casesApi = {
  list: (category?: string) =>
    apiClient.get<{ cases: Case[]; categories: CaseCategory[] }>('/api/cases', { params: { category } }).then(r => r.data),
  get: (id: string) => apiClient.get<Case>(`/api/cases/${id}`).then(r => r.data),
  search: (q: string, category?: string) =>
    apiClient.get<{ results: Case[] }>('/api/search', { params: { q, category } }).then(r => r.data),
}

// ── 对话历史 ──────────────────────────────────────────────────────────────────
export const chatApi = {
  createSession: (data: { title?: string; messages: Message[]; category?: string }) =>
    apiClient.post<{ session_id: string; title: string }>('/api/chat/sessions', data).then(r => r.data),
  updateSession: (id: string, data: { title?: string; messages: Message[] }) =>
    apiClient.patch<{ session_id: string; title: string }>(`/api/chat/sessions/${id}`, data).then(r => r.data),
  listSessions: () =>
    apiClient.get<{ sessions: ChatSession[] }>('/api/chat/sessions').then(r => r.data),
  getSession: (id: string) =>
    apiClient.get<ChatSession>(`/api/chat/sessions/${id}`).then(r => r.data),
  deleteSession: (id: string) =>
    apiClient.delete(`/api/chat/sessions/${id}`),
}

// ── 文档生成 ──────────────────────────────────────────────────────────────────
export const documentsApi = {
  generate: (doc_type: string, form_data: Record<string, unknown>) =>
    apiClient.post<GeneratedDoc>('/api/documents/generate', { doc_type, form_data }).then(r => r.data),
  list: () =>
    apiClient.get<{ documents: GeneratedDoc[] }>('/api/documents/my').then(r => r.data),
  get: (id: string) =>
    apiClient.get<GeneratedDoc>(`/api/documents/${id}`).then(r => r.data),
}

// ── 押金计算 ──────────────────────────────────────────────────────────────────
export const depositCalcApi = {
  calculate: (data: {
    deposit_amount: number
    rent_monthly?: number
    rent_months: number
    city?: string
    deductions: DeductionItem[]
  }) => apiClient.post<CalcResult>('/api/deposit-calc/calculate', data).then(r => r.data),
}

// ── 维权进度 ──────────────────────────────────────────────────────────────────
export const progressApi = {
  create: (data: Partial<ProgressTracker>) =>
    apiClient.post<ProgressTracker>('/api/progress', data).then(r => r.data),
  list: () =>
    apiClient.get<{ trackers: ProgressTracker[] }>('/api/progress').then(r => r.data),
  get: (id: string) =>
    apiClient.get<ProgressTracker>(`/api/progress/${id}`).then(r => r.data),
  update: (id: string, data: Partial<ProgressTracker>) =>
    apiClient.patch<ProgressTracker>(`/api/progress/${id}`, data).then(r => r.data),
  addEvent: (trackerId: string, event: Partial<ProgressEvent>) =>
    apiClient.post<ProgressEvent>(`/api/progress/${trackerId}/events`, event).then(r => r.data),
  delete: (id: string) => apiClient.delete(`/api/progress/${id}`),
}

// ── 黑名单 ────────────────────────────────────────────────────────────────────
export const blacklistApi = {
  report: (data: Partial<BlacklistEntry> & { description: string; entity_type: string; entity_name: string }) =>
    apiClient.post('/api/blacklist/report', data).then(r => r.data),
  search: (params: { q?: string; city?: string; entity_type?: string; page?: number; limit?: number }) =>
    apiClient.get<{ entries: BlacklistEntry[]; disclaimer: string }>('/api/blacklist/search', { params }).then(r => r.data),
}

// ── 城市信息 ──────────────────────────────────────────────────────────────────
export const citiesApi = {
  list: () => apiClient.get<{ cities: City[] }>('/api/cities').then(r => r.data),
  get: (id: string) => apiClient.get<CityDetail>(`/api/cities/${id}`).then(r => r.data),
}

// ── 案例投稿 ──────────────────────────────────────────────────────────────────
export const submissionsApi = {
  submit: (data: {
    title: string
    description: string
    category_id?: string
    city?: string
    deposit_amount?: number
    rent_months?: number
    outcome?: 'won' | 'lost' | 'settled' | 'ongoing'
    recovered_amount?: number
    is_anonymous?: boolean
    contact_email?: string
  }) => apiClient.post<{ id: string; status: string; message: string }>('/api/submissions', data).then(r => r.data),
  mySubmissions: () =>
    apiClient.get<{ submissions: CaseSubmission[] }>('/api/submissions/my').then(r => r.data),
}

// ── 民法典 ────────────────────────────────────────────────────────────────────
export const minfadianApi = {
  search: (params: { q?: string; num?: number; part?: string; limit?: number; offset?: number }) =>
    apiClient.get<{ total: number; offset: number; limit: number; articles: MinfadianArticle[] }>(
      '/api/minfadian', { params }
    ).then(r => r.data),
  parts: () =>
    apiClient.get<{ part: string; count: number }[]>('/api/minfadian/parts').then(r => r.data),
}

// ── 新闻资讯 ──────────────────────────────────────────────────────────────────
export const newsApi = {
  list: () => apiClient.get('/api/news').then(r => r.data),
}
