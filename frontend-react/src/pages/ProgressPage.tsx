import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { progressApi } from '../api'
import { useAuthStore } from '../stores/authStore'
import AuthModal from '../components/auth/AuthModal'
import type { ProgressTracker, ProgressEvent } from '../types'

const STAGE_LABELS: Record<string, string> = {
  notice: '发催款通知', complaint: '投诉住建委',
  mediation: '申请调解', arbitration: '申请仲裁',
  lawsuit: '提起诉讼', enforcement: '申请执行',
}
const STAGES = Object.keys(STAGE_LABELS)
const STAGE_COLORS: Record<string, string> = {
  notice: '#1e3a8a', complaint: '#0d9488', mediation: '#d97706',
  arbitration: '#7c3aed', lawsuit: '#ea580c', enforcement: '#059669',
}
const STATUS_STYLES: Record<string, string> = {
  active: 'badge-navy', won: 'badge-teal', lost: 'text-red-600 bg-red-50 text-xs font-semibold px-2.5 py-0.5 rounded-full',
  settled: 'text-amber-700 bg-amber-50 text-xs font-semibold px-2.5 py-0.5 rounded-full',
}
const STATUS_LABELS: Record<string, string> = { active: '进行中', won: '已胜诉', lost: '已败诉', settled: '已和解' }

export default function ProgressPage() {
  const { isAuthenticated } = useAuthStore()
  const [showAuth, setShowAuth] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNewTracker, setShowNewTracker] = useState(false)
  const [showAddEvent, setShowAddEvent] = useState(false)
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['progress'],
    queryFn: () => progressApi.list(),
    enabled: isAuthenticated,
  })
  const { data: detail } = useQuery({
    queryKey: ['progress', selectedId],
    queryFn: () => progressApi.get(selectedId!),
    enabled: !!selectedId && isAuthenticated,
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => progressApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['progress'] }); setSelectedId(null) },
  })

  if (!isAuthenticated) return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
        style={{ background: 'var(--navy-dim)' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="11" width="14" height="10" rx="2" stroke="var(--navy)" strokeWidth="1.5"/>
          <path d="M8 11V7a4 4 0 018 0v4" stroke="var(--navy)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">登录后查看维权进度</h2>
      <p className="text-sm text-slate-500 mb-6">记录每一步维权行动，追踪案件进展</p>
      <button onClick={() => setShowAuth(true)} className="btn-primary">
        登录 / 注册
      </button>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  )

  const trackers = data?.trackers ?? []

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* 页头 */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-end justify-between gap-4">
          <div>
            <p className="section-label mb-1.5">案件管理</p>
            <h1 className="text-xl font-bold text-slate-900">维权进度追踪</h1>
            <p className="text-sm text-slate-500 mt-0.5">记录每一步行动，让过程清晰可追溯</p>
          </div>
          <button onClick={() => setShowNewTracker(true)} className="btn-primary shrink-0">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1v11M1 6.5h11" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            新建案件
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">

          {/* 左侧案件列表 */}
          <div className="space-y-2">
            {trackers.length === 0 ? (
              <div className="card p-8 text-center">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="3" y="3" width="12" height="12" rx="2" stroke="#94a3b8" strokeWidth="1.3"/>
                    <path d="M6 9h6M6 12h4" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-600 mb-1">暂无案件记录</p>
                <p className="text-xs text-slate-400">点击右上角新建第一个案件</p>
              </div>
            ) : trackers.map(t => (
              <button key={t.id} onClick={() => setSelectedId(t.id)}
                className={`w-full text-left card p-4 transition-all hover:shadow-card-hover ${
                  selectedId === t.id ? 'ring-2 ring-[color:var(--navy)] ring-offset-1' : ''
                }`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-[13px] font-semibold text-slate-800 leading-snug flex-1 line-clamp-2">
                    {t.title}
                  </h3>
                  <span className={STATUS_STYLES[t.status]}>{STATUS_LABELS[t.status]}</span>
                </div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-[11px] text-slate-500">{t.current_stage_label}</span>
                  {t.deposit_amount && (
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--navy)' }}>
                      ¥{t.deposit_amount.toLocaleString()}
                    </span>
                  )}
                </div>
                {/* 进度条 */}
                <div className="flex gap-0.5">
                  {STAGES.map((s, i) => {
                    const curIdx = STAGES.indexOf(t.current_stage)
                    return (
                      <div key={s} className="flex-1 h-1 rounded-full transition-all"
                        style={{ background: i <= curIdx ? STAGE_COLORS[s] : '#e2e8f0' }} />
                    )
                  })}
                </div>
              </button>
            ))}
          </div>

          {/* 右侧详情 */}
          <div>
            {!selectedId ? (
              <div className="card p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M4 10h12M10 4l6 6-6 6" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-600 mb-1">选择左侧案件查看详情</p>
                <p className="text-xs text-slate-400">或新建一个案件开始追踪维权进度</p>
              </div>
            ) : detail ? (
              <div className="card overflow-hidden">
                {/* 详情头部 */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-slate-900 truncate">{detail.title}</h2>
                    <div className="flex items-center gap-3 mt-0.5">
                      {detail.deposit_amount && (
                        <span className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>
                          ¥{detail.deposit_amount.toLocaleString()}
                        </span>
                      )}
                      {detail.city && <span className="text-xs text-slate-400">{detail.city}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setShowAddEvent(true)} className="btn-teal text-[12px] py-1.5 px-3">
                      记录事件
                    </button>
                    <button onClick={() => deleteMutation.mutate(detail.id)}
                      className="text-[12px] px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                      删除
                    </button>
                  </div>
                </div>

                {/* 阶段进度条（地铁线路图风格） */}
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 overflow-x-auto">
                  <div className="flex items-center min-w-max gap-0">
                    {STAGES.map((s, i) => {
                      const curIdx = STAGES.indexOf(detail.current_stage)
                      const done = curIdx > i
                      const active = curIdx === i
                      const color = STAGE_COLORS[s]
                      return (
                        <div key={s} className="flex items-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                              active ? 'animate-pulse-ring' : ''
                            }`}
                              style={{
                                background: done || active ? color : 'white',
                                borderColor: done || active ? color : '#e2e8f0',
                              }}>
                              {done ? (
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                                </svg>
                              ) : (
                                <div className="w-2 h-2 rounded-full"
                                  style={{ background: active ? 'white' : '#cbd5e1' }} />
                              )}
                            </div>
                            <span className="text-[10px] font-medium whitespace-nowrap"
                              style={{ color: active ? color : done ? '#64748b' : '#94a3b8' }}>
                              {STAGE_LABELS[s]}
                            </span>
                          </div>
                          {i < STAGES.length - 1 && (
                            <div className="w-8 h-0.5 mb-4 mx-1 transition-all"
                              style={{ background: done ? color : '#e2e8f0' }} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 事件时间轴 */}
                <div className="p-6">
                  {(!detail.events || detail.events.length === 0) ? (
                    <div className="text-center py-10">
                      <p className="text-sm text-slate-400 mb-3">暂无事件记录</p>
                      <button onClick={() => setShowAddEvent(true)} className="btn-ghost text-[12px]">
                        记录第一个事件
                      </button>
                    </div>
                  ) : (
                    <div className="relative pl-5">
                      <div className="absolute left-1.5 top-2 bottom-2 w-px bg-slate-200" />
                      {detail.events.map(e => (
                        <div key={e.id} className="relative mb-5 animate-slide-up">
                          <div className={`absolute -left-4 top-1 w-3 h-3 rounded-full border-2 border-white ${
                            e.is_milestone ? 'animate-pulse-ring' : ''
                          }`}
                            style={{
                              background: e.is_milestone ? STAGE_COLORS[e.stage] ?? 'var(--navy)' : '#cbd5e1',
                            }} />
                          <div className="card p-3.5 ml-1">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span className="text-[12px] font-semibold text-slate-800">{e.title}</span>
                              <span className="text-[11px] text-slate-400 shrink-0">{e.event_date}</span>
                            </div>
                            {e.description && (
                              <p className="text-[12px] text-slate-500 leading-relaxed">{e.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                                style={{ background: `${STAGE_COLORS[e.stage] ?? 'var(--navy)'}15`, color: STAGE_COLORS[e.stage] ?? 'var(--navy)' }}>
                                {e.stage_label}
                              </span>
                              {e.is_milestone && (
                                <span className="badge-teal text-[10px]">重要节点</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 新建案件弹窗 */}
      {showNewTracker && <NewTrackerModal onClose={() => setShowNewTracker(false)}
        onCreated={(id) => { setSelectedId(id); setShowNewTracker(false); qc.invalidateQueries({ queryKey: ['progress'] }) }} />}
      {showAddEvent && selectedId && <AddEventModal trackerId={selectedId} onClose={() => setShowAddEvent(false)}
        onAdded={() => { setShowAddEvent(false); qc.invalidateQueries({ queryKey: ['progress', selectedId] }) }} />}
    </div>
  )
}

function NewTrackerModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [form, setForm] = useState({ title: '', deposit_amount: '', landlord_name: '', city: '' })
  const { mutate, isPending } = useMutation({
    mutationFn: () => progressApi.create({
      title: form.title, deposit_amount: form.deposit_amount ? Number(form.deposit_amount) : undefined,
      landlord_name: form.landlord_name || undefined, city: form.city || undefined,
    }),
    onSuccess: (t) => onCreated(t.id),
  })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}>
      <div className="card w-full max-w-md p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-900">新建维权案件</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="space-y-3">
          <input className="input" placeholder="案件标题，如：与XX房东押金纠纷 *" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <input className="input" type="number" placeholder="押金金额（元）" value={form.deposit_amount}
              onChange={e => setForm(f => ({ ...f, deposit_amount: e.target.value }))} />
            <input className="input" placeholder="城市" value={form.city}
              onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
          </div>
          <input className="input" placeholder="房东姓名（可选）" value={form.landlord_name}
            onChange={e => setForm(f => ({ ...f, landlord_name: e.target.value }))} />
        </div>
        <button onClick={() => mutate()} disabled={!form.title || isPending}
          className="btn-primary w-full mt-4 justify-center">
          {isPending ? '创建中…' : '创建案件'}
        </button>
      </div>
    </div>
  )
}

function AddEventModal({ trackerId, onClose, onAdded }: { trackerId: string; onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ stage: 'notice', title: '', description: '', event_date: new Date().toISOString().split('T')[0], is_milestone: false })
  const { mutate, isPending } = useMutation({
    mutationFn: () => progressApi.addEvent(trackerId, { ...form } as Parameters<typeof progressApi.addEvent>[1]),
    onSuccess: onAdded,
  })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}>
      <div className="card w-full max-w-md p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-900">记录维权事件</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="space-y-3">
          <select className="input" value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
            {Object.entries(STAGE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input className="input" placeholder="事件标题 *" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <textarea className="input resize-none" rows={2} placeholder="详细说明（可选）" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex items-center gap-3">
            <input type="date" className="input flex-1" value={form.event_date}
              onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer shrink-0">
              <input type="checkbox" checked={form.is_milestone}
                onChange={e => setForm(f => ({ ...f, is_milestone: e.target.checked }))}
                className="w-4 h-4 rounded accent-[color:var(--navy)]" />
              重要节点
            </label>
          </div>
        </div>
        <button onClick={() => mutate()} disabled={!form.title || isPending}
          className="btn-primary w-full mt-4 justify-center">
          {isPending ? '保存中…' : '保存事件'}
        </button>
      </div>
    </div>
  )
}
