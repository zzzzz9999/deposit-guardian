import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { citiesApi } from '../api'

export default function CityInfoPage() {
  const [selectedCity, setSelectedCity] = useState('')

  const { data: citiesData } = useQuery({ queryKey: ['cities'], queryFn: () => citiesApi.list() })
  const { data: detail, isLoading } = useQuery({
    queryKey: ['city', selectedCity],
    queryFn: () => citiesApi.get(selectedCity),
    enabled: !!selectedCity,
  })

  const cities = citiesData?.cities ?? []

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* 页头 */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <p className="section-label mb-1.5">地区信息</p>
          <h1 className="text-xl font-bold text-slate-900">城市专项信息</h1>
          <p className="text-sm text-slate-500 mt-0.5">各城市押金上限规定、住建委联系方式、真实判决案例</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">

        {/* 城市选择 */}
        <div className="flex flex-wrap gap-2 mb-6">
          {cities.map(c => (
            <button key={c.id} onClick={() => setSelectedCity(c.id)}
              className={`px-4 py-2 rounded-xl text-[13px] font-semibold border-2 transition-all ${
                selectedCity === c.id
                  ? 'text-white border-transparent'
                  : 'border-slate-200 text-slate-600 bg-white hover:border-slate-300'
              }`}
              style={selectedCity === c.id ? { background: 'var(--navy)', borderColor: 'var(--navy)' } : {}}>
              {c.name}
            </button>
          ))}
        </div>

        {!selectedCity && (
          <div className="card p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#94a3b8" strokeWidth="1.5"/>
                <circle cx="12" cy="9" r="2.5" stroke="#94a3b8" strokeWidth="1.5"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">选择城市查看专项信息</p>
            <p className="text-xs text-slate-400">政策规定、投诉渠道、真实判决案例</p>
          </div>
        )}

        {isLoading && (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="card h-32 animate-pulse bg-slate-100" />)}
          </div>
        )}

        {detail && (
          <div className="space-y-5">
            {/* 押金政策 */}
            {detail.policies.length > 0 && (
              <div className="card p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-1 h-5 rounded-full" style={{ background: 'var(--navy)' }} />
                  <h2 className="font-semibold text-slate-900 text-[15px]">押金相关政策</h2>
                </div>
                <div className="space-y-3">
                  {detail.policies.map((p, i) => (
                    <div key={i} className="rounded-xl p-4 border"
                      style={{ background: 'var(--navy-dim)', borderColor: '#dbeafe' }}>
                      <div className="flex items-start justify-between mb-1.5 gap-3">
                        <h3 className="font-semibold text-[13px]" style={{ color: 'var(--navy)' }}>{p.title}</h3>
                        {p.effective_date && (
                          <span className="text-[11px] text-slate-400 shrink-0">{p.effective_date}</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{p.content}</p>
                      {p.source_url && (
                        <a href={p.source_url} target="_blank" rel="noopener"
                          className="inline-flex items-center gap-1 text-[11px] mt-2 font-medium hover:underline"
                          style={{ color: 'var(--navy)' }}>
                          查看原文
                          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                            <path d="M1.5 7.5L7.5 1.5M7.5 1.5H4.5M7.5 1.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 投诉渠道 */}
            {detail.contacts.length > 0 && (
              <div className="card p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-1 h-5 rounded-full" style={{ background: 'var(--teal-d)' }} />
                  <h2 className="font-semibold text-slate-900 text-[15px]">当地投诉渠道</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {detail.contacts.map((c, i) => (
                    <div key={i} className="rounded-xl p-4 border"
                      style={{ background: 'var(--teal-dim)', borderColor: '#99f6e4' }}>
                      <div className="font-semibold text-[13px] mb-2" style={{ color: 'var(--teal-d)' }}>
                        {c.department}
                      </div>
                      <div className="flex items-center gap-2">
                        {c.contact_type === 'phone' ? (
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                            <path d="M2.5 2H5L6.5 5.5 4.5 6.5a8 8 0 003 3l1-2 3.5 1.5v2.5C10.5 12 1 7 2.5 2z" stroke="var(--teal-d)" strokeWidth="1.1" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                            <circle cx="6.5" cy="6.5" r="5" stroke="var(--teal-d)" strokeWidth="1.1"/>
                            <path d="M1.5 6.5h10M6.5 1.5c-2 2-2 7 0 10M6.5 1.5c2 2 2 7 0 10" stroke="var(--teal-d)" strokeWidth="1.1"/>
                          </svg>
                        )}
                        <span className="text-sm font-medium text-slate-700">{c.value}</span>
                      </div>
                      {c.note && <p className="text-[11px] text-slate-500 mt-1.5">{c.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 真实判决 */}
            {detail.verdicts.length > 0 && (
              <div className="card p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-1 h-5 rounded-full bg-amber-400" />
                  <h2 className="font-semibold text-slate-900 text-[15px]">真实判决案例</h2>
                </div>
                <div className="space-y-3">
                  {detail.verdicts.map((v, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between mb-2 gap-3">
                        <span className="text-[11px] font-medium text-slate-500">{v.case_reference}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {v.year && <span className="text-[11px] text-slate-400">{v.year}年</span>}
                          {v.outcome && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              v.outcome === 'tenant_won' ? 'badge-teal' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {v.outcome === 'tenant_won' ? '租客胜诉' : v.outcome}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{v.summary}</p>
                      {v.source_url && (
                        <a href={v.source_url} target="_blank" rel="noopener"
                          className="inline-flex items-center gap-1 text-[11px] mt-2 font-medium hover:underline"
                          style={{ color: 'var(--navy)' }}>
                          查看判决书
                          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                            <path d="M1.5 7.5L7.5 1.5M7.5 1.5H4.5M7.5 1.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detail.policies.length === 0 && detail.contacts.length === 0 && detail.verdicts.length === 0 && (
              <div className="card p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 4v12M4 10h12" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-600 mb-1">该城市数据整理中</p>
                <p className="text-xs text-slate-400">敬请期待</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
