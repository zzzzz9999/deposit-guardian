import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { blacklistApi } from '../api'
import type { BlacklistEntry } from '../types'

export default function BlacklistPage() {
  const [tab, setTab] = useState<'search' | 'report'>('search')
  const [q, setQ] = useState('')
  const [city, setCity] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const { data, refetch, isFetching } = useQuery({
    queryKey: ['blacklist', q, city],
    queryFn: () => blacklistApi.search({ q, city }),
    enabled: false,
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (form: Partial<BlacklistEntry> & { description: string; entity_type: string; entity_name: string }) =>
      blacklistApi.report(form),
    onSuccess: () => setSubmitted(true),
  })

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* 页头 */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          <p className="section-label mb-1.5">社区监督</p>
          <h1 className="text-xl font-bold text-slate-900">房东 / 中介黑名单</h1>
          <p className="text-sm text-slate-500 mt-0.5">查询被举报的恶意房东和中介，或举报你遇到的不良行为</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">

        {/* 免责声明 */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 mb-5">
          <div className="flex items-start gap-2.5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
              <path d="M8 2L14 13H2L8 2Z" stroke="#d97706" strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M8 6v3M8 11v1" stroke="#d97706" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <p className="text-[12px] text-amber-800 leading-relaxed">
              <strong>免责声明：</strong>以上信息均为用户举报，经人工审核后公开，但不保证完全准确。如有异议请联系我们。举报内容需真实，虚假举报将承担法律责任。
            </p>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-2 mb-5">
          {([['search','查询黑名单'],['report','提交举报']] as const).map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold border-2 transition-all ${
                tab === t
                  ? 'text-white border-transparent'
                  : 'border-slate-200 text-slate-500 bg-white hover:border-slate-300'
              }`}
              style={tab === t ? { background: 'var(--navy)', borderColor: 'var(--navy)' } : {}}>
              {l}
            </button>
          ))}
        </div>

        {tab === 'search' ? (
          <div className="space-y-4">
            {/* 搜索框 */}
            <div className="card p-5">
              <div className="flex gap-3 flex-wrap sm:flex-nowrap">
                <div className="flex-1 relative min-w-0">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M9.5 9.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && refetch()}
                    placeholder="搜索姓名、电话或地址关键词"
                    className="input pl-9" />
                </div>
                <input value={city} onChange={e => setCity(e.target.value)} placeholder="城市（可选）"
                  className="input w-28 shrink-0" />
                <button onClick={() => refetch()} disabled={isFetching}
                  className="btn-primary shrink-0 disabled:opacity-50">
                  {isFetching ? '搜索中…' : '搜索'}
                </button>
              </div>
            </div>

            {/* 结果列表 */}
            {data?.entries.map(e => (
              <div key={e.id} className="card p-5">
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-slate-900">{e.entity_name}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: 'var(--coral-dim)', color: 'var(--coral-d)' }}>
                      {e.entity_type === 'landlord' ? '房东' : '中介'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span className="text-[11px] text-slate-500">被举报 {e.report_count} 次</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
                  {e.city && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M5 1a3 3 0 100 6 3 3 0 000-6z" stroke="currentColor" strokeWidth="1.1"/>
                        <path d="M5 9.5c0 0 4-3 4-5.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                      </svg>
                      {e.city}{e.district ? ' · ' + e.district : ''}
                    </span>
                  )}
                  {e.phone && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 1.5h2l1 2.5-1.5 1a6 6 0 002.5 2.5l1-1.5 2.5 1v2C7 9.5 1 6 2 1.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
                      </svg>
                      {e.phone}
                    </span>
                  )}
                  {e.amount && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: 'var(--coral-d)' }}>
                      涉及金额 ¥{e.amount.toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{e.description}</p>
              </div>
            ))}

            {data && data.entries.length === 0 && (
              <div className="card p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M4 10l4 4 8-8" stroke="var(--teal-d)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-600 mb-1">未找到相关记录</p>
                <p className="text-xs text-slate-400">该房东/中介暂无举报记录</p>
              </div>
            )}
          </div>
        ) : submitted ? (
          <div className="card p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-5">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 12l5 5L20 7" stroke="var(--teal-d)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-2">举报已提交</h3>
            <p className="text-slate-500 text-sm mb-6">审核通过后将公开显示，感谢你保护其他租客！</p>
            <button onClick={() => setSubmitted(false)} className="btn-ghost">
              再次举报
            </button>
          </div>
        ) : (
          <ReportForm onSubmit={(d) => mutate(d as Parameters<typeof mutate>[0])} isPending={isPending} />
        )}
      </div>
    </div>
  )
}

function ReportForm({ onSubmit, isPending }: {
  onSubmit: (d: Partial<BlacklistEntry> & { description: string; entity_type: string; entity_name: string }) => void
  isPending: boolean
}) {
  const [form, setForm] = useState({
    entity_type: 'landlord', entity_name: '', phone: '', city: '', district: '',
    address_hint: '', dispute_type: '', amount: '', description: '', is_anonymous: false,
  })
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="card p-6 space-y-4">
      {/* 举报类型 */}
      <div className="flex gap-2">
        {[['landlord','举报房东'],['agency','举报中介']].map(([v, l]) => (
          <button key={v} type="button" onClick={() => set('entity_type', v)}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold border-2 transition-all ${
              form.entity_type === v
                ? 'text-white border-transparent'
                : 'border-slate-200 text-slate-500 bg-white hover:border-slate-300'
            }`}
            style={form.entity_type === v ? { background: 'var(--coral-d)', borderColor: 'var(--coral-d)' } : {}}>
            {l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">姓名/公司名 *</label>
          <input value={form.entity_name} onChange={e => set('entity_name', e.target.value)} placeholder="李四"
            className="input" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">手机号（脱敏展示）</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="138xxxx1234"
            className="input" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">城市</label>
          <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="北京"
            className="input" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">涉及金额（元）</label>
          <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="6000"
            className="input" />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">模糊地址（如：朝阳区XX小区附近）</label>
        <input value={form.address_hint} onChange={e => set('address_hint', e.target.value)}
          placeholder="不需要精确地址，保护隐私"
          className="input" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">举报详情 *（请描述具体经过）</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4}
          placeholder="详细描述对方的不良行为，如：以墙壁发黄为由拒退押金6000元，催款3个月无果……"
          className="input resize-none" />
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer">
        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
          form.is_anonymous ? 'border-[color:var(--navy)] bg-[color:var(--navy)]' : 'border-slate-300'
        }`}>
          {form.is_anonymous && (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <input type="checkbox" checked={form.is_anonymous} onChange={e => set('is_anonymous', e.target.checked)} className="sr-only" />
        <span className="text-sm text-slate-600">匿名举报（不展示举报人信息）</span>
      </label>

      <button
        onClick={() => onSubmit({ ...form, amount: form.amount ? (Number(form.amount) as unknown as undefined) : undefined } as Parameters<typeof onSubmit>[0])}
        disabled={!form.entity_name || !form.description || isPending}
        className="btn-coral w-full justify-center py-2.5 disabled:opacity-50">
        {isPending ? '提交中…' : '提交举报'}
      </button>
    </div>
  )
}
