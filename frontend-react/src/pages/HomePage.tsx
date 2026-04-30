import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { casesApi, submissionsApi } from '../api'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import type { Case, CaseCategory } from '../types'

// ── 상수 ──────────────────────────────────────────────────────────────────────

const DIFF: Record<string, string> = {
  easy:   '易',
  medium: '中',
  hard:   '难',
}

const GROUP_COLOR: Record<string, string> = {
  '押金纠纷': '#1e3a8a',
  '租住权益': '#0d9488',
  '签约陷阱': '#ea580c',
}

// ── 案例卡片 ──────────────────────────────────────────────────────────────────

function CaseCard({ c, categories }: { c: Case; categories: CaseCategory[] }) {
  const navigate = useNavigate()
  const cat = categories.find(x => x.id === c.category)
  const isAI   = c.source === 'ai_generated'
  const isUser = c.source === 'user_submission' || c.is_user_submission
  const catLabel = cat?.name.includes('·') ? cat.name.split('·')[1] : cat?.name

  return (
    <article
      onClick={() => navigate(`/cases/${c.id}`)}
      className="group bg-white border border-slate-100 rounded-xl cursor-pointer transition-colors duration-150 hover:border-slate-200 hover:bg-slate-50 flex flex-col p-4"
    >
      {/* 顶部元信息行 */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] text-slate-400 truncate">{catLabel}</span>
          {(isAI || isUser) && (
            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
              {isAI ? 'AI' : '投稿'}
            </span>
          )}
        </div>
        <span className="text-[11px] text-slate-400 shrink-0">
          {DIFF[c.difficulty]}
        </span>
      </div>

      {/* 标题 */}
      <h3 className="text-[14px] font-semibold text-slate-800 leading-snug mb-1.5 line-clamp-2">
        {c.title}
      </h3>

      {/* 副标题 */}
      <p className="text-[12px] text-slate-500 leading-relaxed line-clamp-2 flex-1">
        {c.subtitle}
      </p>

      {/* 底部 */}
      <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100">
        <span className="text-[11px] text-slate-400">
          胜率 {c.success_rate}%
        </span>
        <button
          onClick={e => { e.stopPropagation(); navigate(`/chat?case=${c.id}`) }}
          className="text-[11px] font-medium text-white px-2.5 py-1 rounded-md transition-opacity hover:opacity-80"
          style={{ background: 'var(--navy)' }}
        >
          AI 分析
        </button>
      </div>
    </article>
  )
}

// ── 投稿弹窗 ──────────────────────────────────────────────────────────────────

const OUTCOME_OPTIONS = [
  { value: 'won',     label: '已胜诉 / 全额追回' },
  { value: 'settled', label: '协商和解' },
  { value: 'lost',    label: '未能追回' },
  { value: 'ongoing', label: '仍在进行中' },
]

function SubmitModal({ onClose, categories }: { onClose: () => void; categories: CaseCategory[] }) {
  const { user } = useAuthStore()
  const addToast = useToastStore(s => s.add)
  const qc = useQueryClient()
  const [form, setForm] = useState({
    title: '', description: '', category_id: '', city: '',
    deposit_amount: '',
    outcome: '' as '' | 'won' | 'lost' | 'settled' | 'ongoing',
    recovered_amount: '', is_anonymous: false, contact_email: '',
  })
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: () => submissionsApi.submit({
      title: form.title,
      description: form.description,
      category_id: form.category_id || undefined,
      city: form.city || undefined,
      deposit_amount: form.deposit_amount ? parseFloat(form.deposit_amount) : undefined,
      outcome: form.outcome || undefined,
      recovered_amount: form.recovered_amount ? parseFloat(form.recovered_amount) : undefined,
      is_anonymous: form.is_anonymous,
      contact_email: form.contact_email || undefined,
    }),
    onSuccess: () => {
      addToast({ type: 'success', message: '投稿已提交，审核通过后将出现在案例库中' })
      qc.invalidateQueries({ queryKey: ['cases'] })
      onClose()
    },
    onError: () => addToast({ type: 'error', message: '提交失败，请稍后重试' }),
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-[14px] font-semibold text-slate-900">分享真实案例</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">审核通过后加入案例库，帮助更多租客</p>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-[13px]"
          >
            ✕
          </button>
        </div>

        {/* 表单 */}
        <div className="px-5 py-4 space-y-3.5">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">案例标题 *</label>
            <input
              className="input text-[13px] w-full"
              placeholder="如：房东以墙壁发黄为由扣押 2000 元押金"
              value={form.title}
              onChange={e => set('title', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">纠纷类型</label>
            <select className="input text-[13px] w-full" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
              <option value="">请选择（可不填）</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">城市</label>
              <input className="input text-[13px] w-full" placeholder="如：上海" value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">押金金额（元）</label>
              <input type="number" className="input text-[13px] w-full" placeholder="3000" value={form.deposit_amount} onChange={e => set('deposit_amount', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">案例经过 *</label>
            <textarea
              className="input text-[13px] w-full resize-none"
              rows={4}
              placeholder="描述遇到的情况、采取了什么行动、最终结果如何…"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">最终结果</label>
              <select className="input text-[13px] w-full" value={form.outcome} onChange={e => set('outcome', e.target.value)}>
                <option value="">请选择</option>
                {OUTCOME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">追回金额（元）</label>
              <input type="number" className="input text-[13px] w-full" placeholder="2000" value={form.recovered_amount} onChange={e => set('recovered_amount', e.target.value)} />
            </div>
          </div>

          {user && (
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">联系邮箱（可选，仅编辑可见）</label>
              <input type="email" className="input text-[13px] w-full" placeholder={user.email} value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="rounded" checked={form.is_anonymous} onChange={e => set('is_anonymous', e.target.checked)} />
            <span className="text-[12px] text-slate-600">匿名投稿</span>
          </label>
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-ghost text-[13px] py-1.5 px-3">取消</button>
          <button
            disabled={!form.title.trim() || !form.description.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="btn-primary text-[13px] py-1.5 px-4 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? '提交中…' : '提交案例'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 主页 ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [query, setQuery]               = useState('')
  const [debouncedQ, setDebouncedQ]     = useState('')
  const [activeGroup, setActiveGroup]   = useState('')
  const [activeCat, setActiveCat]       = useState('')
  const [showSubmit, setShowSubmit]     = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 200)
    return () => clearTimeout(t)
  }, [query])

  const { data, isLoading } = useQuery({ queryKey: ['cases'], queryFn: () => casesApi.list() })
  const { data: searchData } = useQuery({
    queryKey: ['cases-search', debouncedQ],
    queryFn: () => casesApi.search(debouncedQ),
    enabled: debouncedQ.length > 0,
  })

  const categories: CaseCategory[] = data?.categories ?? []
  const allCases: Case[]            = data?.cases ?? []
  const groups = Array.from(new Set(categories.map(c => c.group)))

  let displayed = debouncedQ ? (searchData?.results ?? []) : allCases
  if (activeCat)        displayed = displayed.filter(c => c.category === activeCat)
  else if (activeGroup) {
    const ids = categories.filter(c => c.group === activeGroup).map(c => c.id)
    displayed = displayed.filter(c => ids.includes(c.category))
  }

  const visibleCats = categories.filter(c => !activeGroup || c.group === activeGroup)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── 页头 ── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

            {/* 标题区 */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-[18px] font-semibold text-slate-900">租房纠纷案例库</h1>
                <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {allCases.length} 个案例
                </span>
              </div>
              <p className="text-[12px] text-slate-400">
                真实案例 · 法律依据 · 行动模板
              </p>
            </div>

            {/* 操作区 */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowSubmit(true)}
                className="btn-ghost text-[13px] py-1.5 px-3"
              >
                分享案例
              </button>
              <Link to="/chat" className="btn-primary text-[13px] py-1.5 px-3">
                AI 维权顾问
              </Link>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="relative mt-4 max-w-sm">
            <svg
              width="14" height="14" viewBox="0 0 14 14" fill="none"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            >
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M9.5 9.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="搜索案例，如：押金、涨租、中介跑路…"
              className="input pl-8 text-[13px] w-full"
            />
          </div>
        </div>
      </div>

      {/* ── 分类筛选 ── */}
      <div className="bg-white border-b border-slate-200 sticky top-14 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-1 py-2.5 overflow-x-auto scrollbar-thin">

            {/* 全部 */}
            <button
              onClick={() => { setActiveGroup(''); setActiveCat('') }}
              className={[
                'shrink-0 px-3 py-1 rounded-full text-[12px] font-medium transition-colors',
                !activeGroup && !activeCat
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100',
              ].join(' ')}
            >
              全部
            </button>

            {/* 分组 */}
            {groups.map(g => {
              const active = activeGroup === g && !activeCat
              const color  = GROUP_COLOR[g] ?? '#64748b'
              return (
                <button
                  key={g}
                  onClick={() => { setActiveGroup(active ? '' : g); setActiveCat('') }}
                  className={[
                    'shrink-0 px-3 py-1 rounded-full text-[12px] font-medium transition-colors',
                    active ? 'text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100',
                  ].join(' ')}
                  style={active ? { background: color } : {}}
                >
                  {g}
                </button>
              )
            })}

            {/* 分隔线 */}
            <div className="w-px h-3.5 bg-slate-200 mx-1 shrink-0" />

            {/* 子分类 */}
            {visibleCats.map(cat => {
              const active = activeCat === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(active ? '' : cat.id)}
                  className={[
                    'shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-colors border',
                    active
                      ? 'text-white border-transparent'
                      : 'text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50',
                  ].join(' ')}
                  style={active ? { background: cat.color, borderColor: cat.color } : {}}
                >
                  {cat.name.includes('·') ? cat.name.split('·')[1] : cat.name}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── 案例网格 ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* 结果行 */}
        {!isLoading && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-[12px] text-slate-400">
              {debouncedQ
                ? <><span className="text-slate-700 font-medium">「{debouncedQ}」</span> 相关 {displayed.length} 条</>
                : <>{displayed.length} 个案例</>
              }
            </p>
            {(activeGroup || activeCat) && (
              <button
                onClick={() => { setActiveGroup(''); setActiveCat('') }}
                className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
              >
                清除筛选
              </button>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-44 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-[14px] font-medium text-slate-700 mb-1">未找到相关案例</p>
            <p className="text-[12px] text-slate-400 mb-5">
              换个关键词，或直接向 AI 描述你的情况
            </p>
            <Link to="/chat" className="btn-primary text-[13px] py-1.5 px-4">
              AI 维权顾问
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {displayed.map(c => (
              <CaseCard key={c.id} c={c} categories={categories} />
            ))}
          </div>
        )}
      </div>

      {/* ── 投稿引导横幅 ── */}
      {!debouncedQ && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-6">
          <div className="flex items-center justify-between gap-4 px-5 py-4 bg-white border border-slate-200 rounded-xl">
            <div>
              <p className="text-[13px] font-medium text-slate-800">有过类似经历？</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                分享真实案例，帮助更多租客维权，审核通过后加入案例库
              </p>
            </div>
            <button
              onClick={() => setShowSubmit(true)}
              className="shrink-0 btn-ghost text-[12px] py-1.5 px-3"
            >
              投稿案例
            </button>
          </div>
        </div>
      )}

      {/* ── 维权渠道速查 ── */}
      <div className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <p className="section-label mb-3">维权渠道速查</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { name: '12345 政务热线', desc: '综合投诉' },
              { name: '当地住建委',     desc: '租赁纠纷' },
              { name: '法院小额诉讼',   desc: '法律效力最强' },
              { name: '12348 法律援助', desc: '免费咨询' },
              { name: '12315 消费投诉', desc: '大平台纠纷' },
              { name: '黑猫投诉',       desc: '舆论压力' },
            ].map(ch => (
              <div key={ch.name} className="px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                <p className="text-[12px] font-medium text-slate-700">{ch.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{ch.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showSubmit && (
        <SubmitModal onClose={() => setShowSubmit(false)} categories={categories} />
      )}
    </div>
  )
}
