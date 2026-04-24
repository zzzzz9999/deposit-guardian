import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { minfadianApi } from '../api'
import type { MinfadianArticle } from '../types'

const EVIDENCE_LISTS: Record<string, string[]> = {
  deposit_wear: ['入住时全屋拍照/录像（最关键）','退租时全屋拍照/录像','租房合同原件','与房东的微信/短信沟通记录'],
  contract_trap: ['租房合同原件（重点标注问题条款）','押金收据（确认是"押金"非"定金"）','退租通知记录','付款凭证（银行转账记录）'],
  agent_runaway: ['租房合同（查明合同主体）','押金付款凭证','中介公司营业执照信息','房产证或产权信息'],
  delay_tactics: ['退租通知记录','押金收据','租房合同','历次催款记录截图'],
  fabricated: ['入住时全屋录像（带时间戳）','退租时全屋录像','要求房东提供损坏时间戳照片'],
  long_rent_crash: ['与平台签订的租房合同','押金及租金付款凭证','平台营业执照信息','债权申报表'],
}

const EVIDENCE_LABELS: Record<string, string> = {
  deposit_wear: '自然损耗纠纷',
  contract_trap: '合同陷阱',
  agent_runaway: '中介跑路',
  delay_tactics: '拖延推诿',
  fabricated: '无中生有',
  long_rent_crash: '长租公寓爆雷',
}

const TEMPLATES: Record<string, { title: string; content: string }> = {
  first_notice: { title: '第一次催款通知', content: `您好，我是[姓名]，于[退租日期]退租了您位于[地址]的房屋。\n\n退租至今已[X]天，押金[金额]元仍未退还。请您在收到此消息后7日内将押金退还至：[账户信息]。\n\n如逾期仍未退还，我将向当地住建委投诉并申请法律途径维权。\n\n[姓名]\n[日期]` },
  escalation: { title: '升级催款（已超期）', content: `您好，这是我第[X]次催款。\n\n距退租已过[X]天，押金[金额]元仍未退还。\n\n我将于[具体日期]向[当地住建委/法院]正式提起投诉/诉讼，届时还将主张逾期利息。\n\n这是最后通知。\n\n[姓名]\n[日期]` },
  wear_dispute: { title: '反驳自然损耗扣押金', content: `您好，关于您以房屋损坏为由扣押押金的问题：\n\n根据《民法典》第713条，正常居住使用导致的损耗属于自然损耗，出租人不得要求赔偿。\n\n请您提供：①损坏位置的照片（带时间戳）②专业维修公司的报价单\n\n在收到上述合法证明材料前，我不认可任何赔偿要求，并要求您于7日内退还押金[金额]元。` },
}

export default function ToolsPage() {
  const [tab, setTab] = useState<'tools' | 'laws' | 'minfadian'>('tools')
  const [checklistType, setChecklistType] = useState('deposit_wear')
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [templateKey, setTemplateKey] = useState('first_notice')
  const [moveOutDate, setMoveOutDate] = useState(new Date().toISOString().split('T')[0])
  const [mfdQ, setMfdQ] = useState('')
  const [mfdPart, setMfdPart] = useState('')
  const [mfdOffset, setMfdOffset] = useState(0)
  const [mfdSearchQ, setMfdSearchQ] = useState('')

  const { data: partsData } = useQuery({ queryKey: ['mfd-parts'], queryFn: () => minfadianApi.parts() })
  const { data: mfdData, isLoading: mfdLoading } = useQuery({
    queryKey: ['mfd', mfdSearchQ, mfdPart, mfdOffset],
    queryFn: () => minfadianApi.search({ q: mfdSearchQ, part: mfdPart || undefined, limit: 30, offset: mfdOffset }),
    enabled: tab === 'minfadian',
  })

  const timeline = (() => {
    const d0 = new Date(moveOutDate)
    const add = (days: number) => { const d = new Date(d0); d.setDate(d.getDate() + days); return `${d.getMonth()+1}月${d.getDate()}日` }
    return [
      { day: add(0), action: '发送第一次书面催款', desc: '微信/短信发送正式催款通知，明确金额和7日期限', type: 'normal' },
      { day: add(7), action: '升级催款，告知将投诉', desc: '若无回应，发送升级版催款通知，明确告知将向住建委投诉', type: 'warn' },
      { day: add(14), action: '向住建委/12345正式投诉', desc: '携带合同、押金收据、催款记录，向当地住建委提交投诉材料', type: 'warn' },
      { day: add(30), action: '申请小额诉讼', desc: '向房屋所在地基层法院提起小额诉讼，同时主张逾期利息', type: 'normal' },
      { day: add(90), action: '诉讼时效提醒', desc: '大多数案件在此前已解决。押金纠纷诉讼时效3年，请勿超期', type: 'success' },
    ]
  })()

  const TABS = [
    { key: 'tools' as const, label: '实用工具' },
    { key: 'laws' as const, label: '法律条文库' },
    { key: 'minfadian' as const, label: '民法典全文' },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* 页头 */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <p className="section-label mb-1.5">工具中心</p>
          <h1 className="text-xl font-bold text-slate-900">法律工具箱</h1>
          <p className="text-sm text-slate-500 mt-0.5">证据清单、催款模板、法律条文速查，一站式维权工具</p>
        </div>

        {/* Tab 导航 */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex gap-0">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-5 py-3.5 text-[13px] font-semibold border-b-2 transition-all ${
                  tab === t.key
                    ? 'border-[color:var(--navy)] text-[color:var(--navy)]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 实用工具 */}
      {tab === 'tools' && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 证据清单 */}
            <div className="card p-5">
              <p className="section-label mb-3">证据清单生成器</p>
              <select value={checklistType} onChange={e => { setChecklistType(e.target.value); setCheckedItems({}) }}
                className="input mb-4 bg-white">
                {Object.entries(EVIDENCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <div className="space-y-2">
                {(EVIDENCE_LISTS[checklistType] ?? []).map((item, i) => (
                  <label key={i} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${
                    checkedItems[i]
                      ? 'bg-teal-50/60 border-teal-200 text-teal-800'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                      checkedItems[i] ? 'border-teal-500 bg-teal-500' : 'border-slate-300'
                    }`}>
                      {checkedItems[i] && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <input type="checkbox" checked={!!checkedItems[i]}
                      onChange={e => setCheckedItems(c => ({ ...c, [i]: e.target.checked }))}
                      className="sr-only" />
                    <span className={`text-sm ${checkedItems[i] ? 'line-through opacity-50' : ''}`}>{item}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 维权时间轴 */}
            <div className="card p-5">
              <p className="section-label mb-3">维权时间轴</p>
              <div className="mb-4">
                <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">退租日期</label>
                <input type="date" value={moveOutDate} onChange={e => setMoveOutDate(e.target.value)} className="input" />
              </div>
              <div className="relative pl-5">
                <div className="absolute left-1.5 top-2 bottom-2 w-px bg-slate-200" />
                {timeline.map((t, i) => (
                  <div key={i} className="relative mb-5">
                    <div className={`absolute -left-[14px] top-1 w-3 h-3 rounded-full border-2 border-white ${
                      t.type === 'warn' ? 'bg-amber-400' : t.type === 'success' ? 'bg-teal-400' : 'bg-navy'
                    }`} style={t.type === 'normal' ? { background: 'var(--navy)' } : {}} />
                    <div className="text-[11px] font-semibold text-slate-400 mb-0.5">{t.day}</div>
                    <div className="text-[13px] font-semibold text-slate-800">{t.action}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 催款模板库 */}
          <div className="card p-5">
            <p className="section-label mb-3">催款模板库</p>
            <select value={templateKey} onChange={e => setTemplateKey(e.target.value)}
              className="input mb-4 bg-white">
              {Object.entries(TEMPLATES).map(([k, v]) => <option key={k} value={k}>{v.title}</option>)}
            </select>
            <div className="relative">
              <textarea readOnly value={TEMPLATES[templateKey]?.content ?? ''} rows={8}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50/80 resize-none font-mono text-slate-700 leading-relaxed focus:outline-none" />
            </div>
            <button onClick={() => navigator.clipboard.writeText(TEMPLATES[templateKey]?.content ?? '')}
              className="btn-primary mt-3">
              复制模板
            </button>
          </div>

          {/* 快捷工具入口 */}
          <div>
            <p className="section-label mb-3">维权工具</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { to: '/deposit-calc', title: '押金计算器', desc: '计算可追回金额',
                  icon: <path d="M12 2H8a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7l-6-5zM8 13h6M8 10h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/> },
                { to: '/landlord-scripts', title: '话术识别器', desc: '识别房东话术',
                  icon: <><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.4"/><path d="M1 17c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></> },
                { to: '/document-gen', title: '文书生成器', desc: '一键生成投诉信',
                  icon: <><rect x="4" y="3" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></> },
                { to: '/progress', title: '维权进度', desc: '追踪维权进展',
                  icon: <><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.4"/><path d="M10 6v4l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></> },
              ].map(({ to, title, desc, icon }) => (
                <Link key={to} to={to}
                  className="card p-4 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 group">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: 'var(--navy-dim)' }}>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none"
                      style={{ color: 'var(--navy)' }}>
                      {icon}
                    </svg>
                  </div>
                  <div className="text-[13px] font-semibold text-slate-800 group-hover:text-[color:var(--navy)] transition-colors">{title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{desc}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 法律条文库 */}
      {tab === 'laws' && <LawsTab />}

      {/* 民法典全文 */}
      {tab === 'minfadian' && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-slate-900">中华人民共和国民法典</h2>
              <p className="text-slate-500 text-sm mt-0.5">2020年5月28日通过 · 共 <strong>{mfdData?.total ?? 1260}</strong> 条</p>
            </div>
            <a href="https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D"
              target="_blank" rel="noopener"
              className="btn-primary text-[12px]">
              查看官方原文
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M2 9L9 2M9 2H5.5M9 2v3.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>

          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="flex-1 relative min-w-48">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M9.5 9.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <input value={mfdQ} onChange={e => setMfdQ(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { setMfdSearchQ(mfdQ); setMfdOffset(0) } }}
                placeholder="搜索条文（按 Enter 搜索）"
                className="input pl-9" />
            </div>
            <select value={mfdPart} onChange={e => { setMfdPart(e.target.value); setMfdOffset(0) }}
              className="input bg-white min-w-40">
              <option value="">全部（7编）</option>
              {(partsData ?? []).map(p => <option key={p.part} value={p.part}>{p.part}（{p.count}条）</option>)}
            </select>
            <button onClick={() => { setMfdSearchQ(mfdQ); setMfdOffset(0) }}
              className="btn-primary">
              搜索
            </button>
          </div>

          <p className="text-[11px] text-slate-400 mb-4 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            提示：民法典用词是「承租人」「出租人」「定金」，搜「<strong className="text-slate-600">租赁</strong>」可找到所有租房相关条文
          </p>

          {mfdLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}</div>
          ) : (
            <>
              <p className="text-[12px] text-slate-400 mb-3">共 {mfdData?.total ?? 0} 条结果</p>
              <div className="space-y-2">
                {(mfdData?.articles ?? []).map((a: MinfadianArticle) => (
                  <div key={a.num} className="card p-4 hover:shadow-card-hover transition-all">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                        style={{ background: 'var(--navy-dim)', color: 'var(--navy)' }}>
                        {a.article}
                      </span>
                      <span className="text-[11px] text-slate-400">{[a.part, a.chapter, a.section].filter(Boolean).join(' › ')}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{a.content}</p>
                  </div>
                ))}
              </div>

              {mfdData && mfdData.total > 30 && (
                <div className="flex justify-center gap-2 mt-6">
                  <button disabled={mfdOffset === 0} onClick={() => setMfdOffset(Math.max(0, mfdOffset - 30))}
                    className="btn-ghost disabled:opacity-40">
                    上一页
                  </button>
                  <span className="px-4 py-2 text-sm text-slate-500">
                    第 {Math.floor(mfdOffset / 30) + 1} / {Math.ceil(mfdData.total / 30)} 页
                  </span>
                  <button disabled={mfdOffset + 30 >= mfdData.total} onClick={() => setMfdOffset(mfdOffset + 30)}
                    className="btn-ghost disabled:opacity-40">
                    下一页
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

const LAW_DB = [
  { article: '第713条', law: '民法典', title: '自然损耗不赔偿', tags: ['押金纠纷','核心'], scene: '房东以墙壁、地板、电器正常磨损索赔时', link: 'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D', text: '承租人在租赁物需要维修时可以请求出租人在合理期限内维修。出租人未履行维修义务的，承租人可以自行维修，维修费用由出租人负担。租赁物的正常损耗，由出租人承担。' },
  { article: '第496条', law: '民法典', title: '格式条款无效', tags: ['押金纠纷','签约陷阱','核心'], scene: '合同中有"提前退租押金不退"等霸王条款时', link: 'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D', text: '格式条款是当事人为了重复使用而预先拟定，并在订立合同时未与对方协商的条款。提供格式条款的一方未履行提示或者说明义务，对方可以主张该条款不成为合同的内容。' },
  { article: '第587条', law: '民法典', title: '押金与定金的区别', tags: ['押金纠纷','核心'], scene: '中介把押金写成"定金"试图不退时', link: 'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D', text: '债务人履行债务的，定金应当抵作价款或者收回。给付定金的一方不履行债务的，无权请求返还定金；收受定金的一方不履行债务的，应当双倍返还定金。' },
  { article: '第720条', law: '民法典', title: '租期内不得涨租', tags: ['租住权益','核心'], scene: '租期内房东突然宣布涨租时', link: 'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D', text: '在租赁期限内，因占有、使用租赁物获得的收益，归承租人所有，但是当事人另有约定的除外。出租人不得在租赁期限内单方面提高租金。' },
  { article: '第725条', law: '民法典', title: '买卖不破租赁', tags: ['租住权益','核心'], scene: '房东卖房要求租客立即搬走时', link: 'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D', text: '租赁物在承租人按照租赁合同占有期限内发生所有权变动的，不影响租赁合同的效力。' },
  { article: '第188条', law: '民法典', title: '诉讼时效3年', tags: ['维权程序'], scene: '提醒自己：押金纠纷维权期限为3年', link: 'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D', text: '向人民法院请求保护民事权利的诉讼时效期间为三年。诉讼时效期间自权利人知道或者应当知道权利受到损害以及义务人之日起计算。' },
  { article: '第8条', law: '消费者权益保护法', title: '消费者知情权', tags: ['签约陷阱','核心'], scene: '虚假房源、照片与实物不符时', link: 'https://flk.npc.gov.cn/detail2.html?ZmY4MDgxODE2ZjNjYmIzYzAxNmYzY2VlNjIxNzBiMzE%3D', text: '消费者享有知悉其购买、使用的商品或者接受的服务的真实情况的权利。' },
  { article: '第39条', law: '宪法', title: '住宅不受侵犯', tags: ['租住权益','核心'], scene: '房东不打招呼直接进门时', link: 'https://flk.npc.gov.cn/', text: '中华人民共和国公民的住宅不受侵犯。禁止非法搜查或者非法侵入公民的住宅。' },
]

function LawsTab() {
  const [q, setQ] = useState('')
  const [tag, setTag] = useState('')
  const allTags = Array.from(new Set(LAW_DB.flatMap(l => l.tags)))

  const filtered = LAW_DB.filter(l => {
    if (tag && !l.tags.includes(tag)) return false
    if (q) {
      const qL = q.toLowerCase()
      return l.title.toLowerCase().includes(qL) || l.article.includes(qL) || l.law.includes(qL) || l.text.toLowerCase().includes(qL) || l.scene.toLowerCase().includes(qL)
    }
    return true
  })

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-slate-900">法律条文速查库</h2>
          <p className="text-slate-500 text-sm mt-0.5">租房相关核心法律条文，含适用场景说明和官方原文链接</p>
        </div>
        <span className="text-[12px] text-slate-400 font-medium">{filtered.length} 条</span>
      </div>

      <div className="relative mb-4">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M9.5 9.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜索关键词，如：押金、涨租、维修…"
          className="input pl-9" />
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => setTag('')}
          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
            !tag ? 'text-white border-transparent' : 'border-slate-200 text-slate-500 hover:border-slate-300'
          }`}
          style={!tag ? { background: 'var(--navy)' } : {}}>
          全部 {LAW_DB.length}
        </button>
        {allTags.map(t => (
          <button key={t} onClick={() => setTag(t === tag ? '' : t)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
              tag === t ? 'text-white border-transparent' : 'border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
            style={tag === t ? { background: 'var(--navy)' } : {}}>
            {t} {LAW_DB.filter(l => l.tags.includes(t)).length}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((law, i) => (
          <div key={i} className="card p-5 hover:shadow-card-hover transition-all">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="text-[12px] font-bold px-2.5 py-1 rounded-lg"
                style={{ background: 'var(--navy-dim)', color: 'var(--navy)' }}>
                {law.article}
              </span>
              <span className="font-semibold text-slate-900 text-sm">{law.title}</span>
              <div className="flex gap-1.5 ml-auto">
                {law.tags.map(t => (
                  <span key={t} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    t === '核心' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-500'
                  }`}>{t}</span>
                ))}
              </div>
              <a href={law.link} target="_blank" rel="noopener"
                className="text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1"
                style={{ background: 'var(--navy-dim)', color: 'var(--navy)' }}>
                原文
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                  <path d="M1.5 7.5L7.5 1.5M7.5 1.5H4.5M7.5 1.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-3.5 border-l-[3px] font-serif mb-3"
              style={{ borderLeftColor: 'var(--navy)' }}>
              {law.text}
            </p>
            <div className="flex items-start gap-2 text-[11px] text-slate-500">
              <span className="font-bold shrink-0" style={{ color: 'var(--teal-d)' }}>适用场景</span>
              <span>{law.scene}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="card p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="9" cy="9" r="6" stroke="#94a3b8" strokeWidth="1.5"/>
                <path d="M14 14l4 4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">未找到相关条文</p>
            <p className="text-xs text-slate-400">试试「押金」「维修」「涨租」</p>
          </div>
        )}
      </div>
    </div>
  )
}
