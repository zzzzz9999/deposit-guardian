import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { casesApi, submissionsApi } from '../api'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import type { Case, CaseCategory } from '../types'

const DIFF_LABEL: Record<string, string> = {
  easy: '易', medium: '中', hard: '难',
}
const DIFF_COLOR: Record<string, string> = {
  easy: 'text-teal-dark bg-teal-dim', medium: 'text-amber-700 bg-amber-50', hard: 'text-coral-dark bg-coral-dim',
}
const GROUP_COLORS: Record<string, string> = {
  '押金纠纷': '#1e3a8a', '租住权益': '#0d9488', '签约陷阱': '#ea580c',
}
const OUTCOME_LABEL: Record<string, string> = {
  won: '胜诉', settled: '和解', lost: '败诉', ongoing: '进行中',
}
const OUTCOME_COLOR: Record<string, string> = {
  won: 'text-teal-700 bg-teal-50', settled: 'text-amber-700 bg-amber-50',
  lost: 'text-red-600 bg-red-50', ongoing: 'text-slate-500 bg-slate-100',
}

function CaseCard({ c, categories }: { c: Case; categories: CaseCategory[] }) {
  const cat = categories.find(x => x.id === c.category)
  const navigate = useNavigate()
  const groupColor = GROUP_COLORS[cat?.group ?? ''] ?? '#64748b'

  return (
    <div onClick={() => navigate(`/cases/${c.id}`)}
      className="card p-5 cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 group relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: c.source === 'ai_generated' ? '#0891b2' : c.is_user_submission ? '#7c3aed' : (cat?.color ?? '#94a3b8') }} />

      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex flex-wrap gap-1.5">
          {c.source === 'ai_generated' ? (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md text-cyan-700 bg-cyan-50 border border-cyan-200">
              AI 案例
            </span>
          ) : c.is_user_submission ? (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md text-purple-700 bg-purple-50">
              用户案例
            </span>
          ) : (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
              style={{ background: `${groupColor}12`, color: groupColor }}>
              {cat?.group}
            </span>
          )}
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md text-slate-500 bg-slate-100">
            {cat?.name?.split('·')[1] ?? cat?.name ?? '其他'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${DIFF_COLOR[c.difficulty]}`}>
            {DIFF_LABEL[c.difficulty]}
          </span>
          <span className="text-[11px] font-bold" style={{ color: 'var(--teal-d)' }}>
            {c.success_rate}%
          </span>
        </div>
      </div>

      <h3 className="font-semibold text-slate-800 text-sm leading-snug mb-1">{c.title}</h3>
      <p className="text-xs text-slate-500 mb-3 leading-relaxed">{c.subtitle}</p>

      {!c.is_user_submission && c.landlord_scripts?.length > 0 && (
        <div className="rounded-lg p-2.5 mb-3" style={{ background: 'var(--coral-dim)', borderLeft: '2px solid var(--coral)' }}>
          <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--coral-d)' }}>
            房东常见话术
          </p>
          {c.landlord_scripts.slice(0, 1).map((s, i) => (
            <p key={i} className="text-[11px] text-slate-600 truncate">「{s}」</p>
          ))}
        </div>
      )}

      {(c.is_user_submission || c.source === 'ai_generated') && (
        <div className={`rounded-lg p-2.5 mb-3 ${
          c.source === 'ai_generated'
            ? 'bg-cyan-50 border-l-2 border-cyan-300'
            : 'bg-purple-50 border-l-2 border-purple-300'
        }`}>
          <p className="text-[11px] text-slate-600 line-clamp-2">{c.description}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={e => { e.stopPropagation(); navigate(`/cases/${c.id}`) }}
          className="flex-1 py-1.5 text-[12px] font-medium border border-slate-200 rounded-lg text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors">
          查看详情
        </button>
        <button onClick={e => { e.stopPropagation(); navigate(`/chat?case=${c.id}`) }}
          className="flex-1 py-1.5 text-[12px] font-semibold rounded-lg text-white transition-all hover:opacity-90"
          style={{ background: 'var(--navy)' }}>
          AI 分析
        </button>
      </div>
    </div>
  )
}

// ── 投稿弹窗 ──────────────────────────────────────────────────────────────────

const OUTCOME_OPTIONS = [
  { value: 'won', label: '已胜诉/全额追回' },
  { value: 'settled', label: '协商和解' },
  { value: 'lost', label: '未能追回' },
  { value: 'ongoing', label: '仍在进行中' },
]

function SubmitModal({ onClose, categories }: { onClose: () => void; categories: CaseCategory[] }) {
  const { user } = useAuthStore()
  const addToast = useToastStore(s => s.add)
  const qc = useQueryClient()
  const [form, setForm] = useState({
    title: '', description: '', category_id: '', city: '',
    deposit_amount: '', outcome: '' as '' | 'won' | 'lost' | 'settled' | 'ongoing',
    recovered_amount: '', is_anonymous: false, contact_email: '',
  })

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
      addToast({ type: 'success', message: '投稿已提交！审核通过后将出现在案例库中，感谢你的贡献。' })
      qc.invalidateQueries({ queryKey: ['cases'] })
      onClose()
    },
    onError: () => addToast({ type: 'error', message: '提交失败，请稍后重试' }),
  })

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900">分享你的真实案例</h2>
            <p className="text-xs text-slate-400 mt-0.5">帮助更多租客，审核通过后加入案例库</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400">
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">案例标题 *</label>
            <input className="input text-sm w-full" placeholder="如：房东以墙壁发黄为由扣押2000元押金"
              value={form.title} onChange={e => set('title', e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">纠纷类型</label>
            <select className="input text-sm w-full" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
              <option value="">请选择（可不填）</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">城市</label>
              <input className="input text-sm w-full" placeholder="如：上海" value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">押金金额（元）</label>
              <input type="number" className="input text-sm w-full" placeholder="如：3000"
                value={form.deposit_amount} onChange={e => set('deposit_amount', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">案例经过 *</label>
            <textarea className="input text-sm w-full resize-none" rows={4}
              placeholder="描述你遇到的情况、采取了什么行动、最终结果如何…"
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">最终结果</label>
              <select className="input text-sm w-full" value={form.outcome} onChange={e => set('outcome', e.target.value)}>
                <option value="">请选择</option>
                {OUTCOME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">追回金额（元）</label>
              <input type="number" className="input text-sm w-full" placeholder="如：2000"
                value={form.recovered_amount} onChange={e => set('recovered_amount', e.target.value)} />
            </div>
          </div>

          {user && (
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">联系邮箱（可选，仅编辑可见）</label>
              <input type="email" className="input text-sm w-full" placeholder={user.email}
                value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="rounded" checked={form.is_anonymous}
              onChange={e => set('is_anonymous', e.target.checked)} />
            <span className="text-xs text-slate-600">匿名投稿（不显示用户名）</span>
          </label>
        </div>

        <div className="p-5 border-t border-slate-100 flex gap-2 justify-end">
          <button onClick={onClose} className="btn-ghost text-sm">取消</button>
          <button
            disabled={!form.title.trim() || !form.description.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed">
            {mutation.isPending ? '提交中…' : '提交案例'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 主页 ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [query, setQuery] = useState('')
  const [activeGroup, setActiveGroup] = useState('')
  const [activeCategory, setActiveCategory] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [showSubmit, setShowSubmit] = useState(false)

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
  const allCases: Case[] = data?.cases ?? []
  const groups = Array.from(new Set(categories.map(c => c.group)))
  const userCaseCount = allCases.filter(c => c.is_user_submission).length
  const aiCaseCount = allCases.filter(c => c.source === 'ai_generated').length

  let displayCases = debouncedQ ? (searchData?.results ?? []) : allCases
  if (activeCategory) displayCases = displayCases.filter(c => c.category === activeCategory)
  else if (activeGroup) {
    const catIds = categories.filter(c => c.group === activeGroup).map(c => c.id)
    displayCases = displayCases.filter(c => catIds.includes(c.category))
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── 页头 ── */}
      <div className="border-b border-slate-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--navy-dim)', color: 'var(--navy)' }}>
                  案例数据库
                </span>
                <span className="text-[11px] text-slate-400">
                  {allCases.length} 个案例 · 12 类纠纷
                  {userCaseCount > 0 && (
                    <span className="ml-1 text-purple-500">· {userCaseCount} 个用户投稿</span>
                  )}
                  {aiCaseCount > 0 && (
                    <span className="ml-1 text-cyan-600">· {aiCaseCount} 个 AI 案例</span>
                  )}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                租房纠纷案例库
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                真实案例 · 法律依据 · 行动模板 · 一站式维权指引
              </p>
            </div>

            <div className="flex gap-2 shrink-0">
              <button onClick={() => setShowSubmit(true)}
                className="btn-ghost flex items-center gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                分享案例
              </button>
              <Link to="/chat" className="btn-primary">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2h10v8H8l-4 2V2z" stroke="white" strokeWidth="1.3" strokeLinejoin="round"/>
                </svg>
                AI 维权顾问
              </Link>
              <Link to="/tools" className="btn-ghost">
                法律工具
              </Link>
            </div>
          </div>

          {/* 搜索栏 */}
          <div className="mt-5 relative max-w-xl">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="搜索案例，如：押金、涨租、中介跑路…"
              className="input pl-9 pr-4 py-2.5 text-sm" />
          </div>
        </div>
      </div>

      {/* ── 分类筛选 ── */}
      <div className="bg-white border-b border-slate-200/80 sticky top-14 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-thin">
            <button onClick={() => { setActiveGroup(''); setActiveCategory('') }}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                !activeGroup && !activeCategory
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
              style={!activeGroup && !activeCategory ? { background: 'var(--navy)' } : {}}>
              全部
            </button>

            {groups.map(g => (
              <button key={g} onClick={() => { setActiveGroup(activeGroup === g ? '' : g); setActiveCategory('') }}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                  activeGroup === g
                    ? 'text-white'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
                style={activeGroup === g ? { background: GROUP_COLORS[g] ?? 'var(--navy)' } : {}}>
                {g}
              </button>
            ))}

            <div className="w-px h-4 bg-slate-200 mx-1 shrink-0" />

            {categories
              .filter(c => !activeGroup || c.group === activeGroup)
              .map(cat => (
                <button key={cat.id}
                  onClick={() => setActiveCategory(activeCategory === cat.id ? '' : cat.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border ${
                    activeCategory === cat.id
                      ? 'text-white border-transparent'
                      : 'text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  style={activeCategory === cat.id ? { background: cat.color, borderColor: cat.color } : {}}>
                  {cat.name.split('·')[1] ?? cat.name}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* ── 案例网格 ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="card h-52 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : displayCases.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="9" cy="9" r="6" stroke="#94a3b8" strokeWidth="1.5"/>
                <path d="M14 14l4 4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="font-semibold text-slate-700 mb-1">未找到相关案例</p>
            <p className="text-sm text-slate-400">
              换个关键词，或{' '}
              <Link to="/chat" className="font-medium" style={{ color: 'var(--navy-l)' }}>
                直接向 AI 描述情况
              </Link>
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[12px] text-slate-400">
                共 <span className="font-semibold text-slate-700">{displayCases.length}</span> 个案例
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayCases.map(c => (
                <CaseCard key={c.id} c={c} categories={categories} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── 投稿引导横幅 ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-6">
        <div className="rounded-2xl p-5 flex items-center justify-between gap-4"
          style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', border: '1px solid #ddd6fe' }}>
          <div>
            <p className="font-semibold text-purple-900 text-sm">你有过类似经历吗？</p>
            <p className="text-xs text-purple-600 mt-0.5">分享真实案例，帮助更多租客维权，审核通过后将加入案例库</p>
          </div>
          <button onClick={() => setShowSubmit(true)}
            className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: '#7c3aed' }}>
            投稿案例
          </button>
        </div>
      </div>

      {/* ── 底部渠道速查 ── */}
      <div className="border-t border-slate-200/80 bg-white mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <p className="section-label mb-4">维权渠道速查</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { name: '12345 政务热线', desc: '综合投诉' },
              { name: '当地住建委', desc: '租赁纠纷' },
              { name: '法院小额诉讼', desc: '法律效力最强' },
              { name: '12348 法律援助', desc: '免费咨询' },
              { name: '12315 消费投诉', desc: '大平台纠纷' },
              { name: '黑猫投诉平台', desc: '舆论压力' },
            ].map(ch => (
              <div key={ch.name} className="card p-3.5 hover:shadow-card-hover transition-all">
                <p className="text-[12px] font-semibold text-slate-700 leading-snug">{ch.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{ch.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 投稿弹窗 ── */}
      {showSubmit && <SubmitModal onClose={() => setShowSubmit(false)} categories={categories} />}
    </div>
  )
}
