// ── 用户 ──────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  username: string
  email: string
  phone?: string
  avatar_url?: string
  is_admin: boolean
  created_at: string
}

export interface AuthResponse {
  user: User
  access_token: string
  refresh_token: string
}

// ── 案例 ──────────────────────────────────────────────────────────────────────
export interface CaseCategory {
  id: string
  name: string
  icon: string
  color: string
  group: string
  desc: string
}

export interface LegalBasis {
  law: string
  content: string
}

export interface ActionStep {
  step: number
  title: string
  detail: string
}

export interface TemplateMessage {
  title: string
  content: string
}

export interface ComplaintChannel {
  name: string
  type: 'phone' | 'offline' | 'online' | 'legal'
}

export interface Case {
  id: string
  category: string
  title: string
  subtitle: string
  difficulty: 'easy' | 'medium' | 'hard'
  success_rate: number
  keywords: string[]
  description: string
  landlord_scripts: string[]
  legal_basis: LegalBasis[]
  evidence_needed: string[]
  action_steps: ActionStep[]
  template_messages: TemplateMessage[]
  complaint_channels: ComplaintChannel[]
  outcome_examples: string[]
  source?: string
  court_reference?: string
}

// ── 对话 ──────────────────────────────────────────────────────────────────────
export interface Message {
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

export interface ChatSession {
  id: string
  title: string
  category?: string
  updated_at: string
  messages?: Message[]
}

// ── 维权进度 ──────────────────────────────────────────────────────────────────
export type ProgressStage = 'notice' | 'complaint' | 'mediation' | 'arbitration' | 'lawsuit' | 'enforcement'
export type ProgressStatus = 'active' | 'won' | 'lost' | 'settled'

export interface ProgressEvent {
  id: string
  stage: ProgressStage
  stage_label: string
  event_type?: string
  title: string
  description?: string
  event_date: string
  is_milestone: boolean
  created_at: string
}

export interface ProgressTracker {
  id: string
  title: string
  category_id?: string
  deposit_amount?: number
  landlord_name?: string
  city?: string
  current_stage: ProgressStage
  current_stage_label: string
  status: ProgressStatus
  recovered_amount?: number
  created_at: string
  updated_at: string
  events?: ProgressEvent[]
  stages?: { id: string; label: string }[]
}

// ── 押金计算 ──────────────────────────────────────────────────────────────────
export interface DeductionItem {
  reason: string
  claimed_amount: number
  item_type?: string
  item_age_years?: number
  item_lifespan_years?: number
  is_natural_wear?: boolean
}

export interface DeductionDetail {
  reason: string
  claimed_amount: number
  valid_amount: number
  invalid_amount: number
  depreciation_rate: number
  legal_basis: string
  explanation: string
}

export interface CalcResult {
  summary: {
    deposit_amount: number
    total_claimed: number
    valid_deductions: number
    invalid_deductions: number
    recoverable_amount: number
  }
  deduction_details: DeductionDetail[]
  city_policy?: {
    policy: string
    max_allowed: number
    over_limit_amount: number
    note: string
  }
  legal_note: string
}

// ── 黑名单 ────────────────────────────────────────────────────────────────────
export interface BlacklistEntry {
  id: string
  entity_type: 'landlord' | 'agency'
  entity_name: string
  phone?: string
  city?: string
  district?: string
  address_hint?: string
  dispute_type?: string
  amount?: number
  description: string
  status: 'pending' | 'verified' | 'rejected'
  report_count: number
  created_at: string
}

// ── 城市信息 ──────────────────────────────────────────────────────────────────
export interface City {
  id: string
  name: string
  province?: string
}

export interface CityDetail {
  city: City
  policies: { policy_type?: string; title: string; content: string; effective_date?: string; source_url?: string }[]
  contacts: { department?: string; contact_type?: string; value?: string; note?: string }[]
  verdicts: { case_reference?: string; court?: string; year?: number; summary?: string; outcome?: string; source_url?: string }[]
}

// ── 生成文档 ──────────────────────────────────────────────────────────────────
export interface GeneratedDoc {
  doc_id: string
  doc_type: string
  doc_type_name: string
  content: string
  created_at: string
}

// ── 民法典 ────────────────────────────────────────────────────────────────────
export interface MinfadianArticle {
  num: number
  article: string
  part: string
  chapter: string
  section: string
  content: string
}
