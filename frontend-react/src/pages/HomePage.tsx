import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { casesApi } from '../api'
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

function CaseCard({ c, categories }: { c: Case; categories: CaseCategory[] }) {
  const cat = categories.find(x => x.id === c.category)
  const navigate = useNavigate()
  const groupColor = GROUP_COLORS[cat?.group ?? ''] ?? '#64748b'

  return (
    <div onClick={() => navigate(`/cases/${c.id}`)}
      className="card p-5 cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 group relative overflow-hidden">
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: cat?.color ?? '#94a3b8' }} />

      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
            style={{ background: `${groupColor}12`, color: groupColor }}>
            {cat?.group}
          </span>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md text-slate-500 bg-slate-100">
            {cat?.name?.split('·')[1] ?? cat?.name}
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

      {/* Title */}
      <h3 className="font-semibold text-slate-800 text-sm leading-snug mb-1">{c.title}</h3>
      <p className="text-xs text-slate-500 mb-3 leading-relaxed">{c.subtitle}</p>

      {/* Landlord scripts */}
      {c.landlord_scripts?.length > 0 && (
        <div className="rounded-lg p-2.5 mb-3" style={{ background: 'var(--coral-dim)', borderLeft: '2px solid var(--coral)' }}>
          <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--coral-d)' }}>
            房东常见话术
          </p>
          {c.landlord_scripts.slice(0, 1).map((s, i) => (
            <p key={i} className="text-[11px] text-slate-600 truncate">「{s}」</p>
          ))}
        </div>
      )}

      {/* Actions */}
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

export default function HomePage() {
  const [query, setQuery] = useState('')
  const [activeGroup, setActiveGroup] = useState('')
  const [activeCategory, setActiveCategory] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')

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
                <span className="text-[11px] text-slate-400">{allCases.length} 个案例 · 12 类纠纷</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                租房纠纷案例库
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                真实案例 · 法律依据 · 行动模板 · 一站式维权指引
              </p>
            </div>

            {/* Quick actions */}
            <div className="flex gap-2 shrink-0">
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
            {/* 全部 */}
            <button onClick={() => { setActiveGroup(''); setActiveCategory('') }}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                !activeGroup && !activeCategory
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
              style={!activeGroup && !activeCategory ? { background: 'var(--navy)' } : {}}>
              全部
            </button>

            {/* 分组 */}
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

            {/* 子分类 */}
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
    </div>
  )
}
