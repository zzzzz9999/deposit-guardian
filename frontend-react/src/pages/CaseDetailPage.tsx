import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { casesApi } from '../api'

export default function CaseDetailPage() {
  const { caseId } = useParams()
  const navigate = useNavigate()
  const { data: c, isLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => casesApi.get(caseId!),
    enabled: !!caseId,
  })

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-[color:var(--navy)] rounded-full animate-spin" />
        <p className="text-sm text-slate-400">加载中…</p>
      </div>
    </div>
  )

  if (!c) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500" style={{ background: 'var(--bg)' }}>
      案例不存在
    </div>
  )

  const DIFF_MAP: Record<string, string> = { easy: '相对容易', medium: '需要坚持', hard: '需要专业帮助' }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* 页头 */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-800 mb-4 transition-colors group">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            返回案例库
          </button>
          <h1 className="text-xl font-bold text-slate-900 mb-1">{c.title}</h1>
          <p className="text-sm text-slate-500">{c.subtitle}</p>
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="badge-teal">胜率 {c.success_rate}%</span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
              {DIFF_MAP[c.difficulty] ?? c.difficulty}
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold"
              style={{ background: 'var(--navy-dim)', color: 'var(--navy)' }}>
              有法律依据
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* 安抚横幅 */}
        <div className="rounded-xl border p-4 flex items-start gap-3"
          style={{ background: 'var(--teal-dim)', borderColor: '#99f6e4' }}>
          <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center"
            style={{ background: 'var(--teal-d)' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7l3.5 3.5L12 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p className="font-semibold text-[13px] text-slate-800">你遇到的情况很常见，有解决办法</p>
            <p className="text-[12px] text-slate-600 mt-0.5 leading-relaxed">
              这类纠纷胜率约 {c.success_rate}%。先冷静看完这个案例，了解你的权利，然后按步骤行动。
            </p>
          </div>
        </div>

        {/* 典型情况描述 */}
        <Section title="典型情况描述">
          <p className="text-sm text-slate-700 leading-relaxed">{c.description}</p>
        </Section>

        {/* 房东话术 */}
        {c.landlord_scripts?.length > 0 && (
          <Section title="房东常见话术">
            <p className="text-[11px] text-slate-400 mb-3">识别这些话术，帮助你不被忽悠</p>
            <div className="space-y-2">
              {c.landlord_scripts.map((s, i) => (
                <div key={i} className="rounded-xl p-3 border"
                  style={{ background: 'var(--coral-dim)', borderColor: 'var(--coral-border)' }}>
                  <span className="text-[11px] font-bold mr-1.5" style={{ color: 'var(--coral-d)' }}>房东说：</span>
                  <span className="text-sm text-slate-700">{s}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 法律依据 */}
        {c.legal_basis?.length > 0 && (
          <Section title="法律依据">
            <div className="space-y-2">
              {c.legal_basis.map((lb, i) => (
                <div key={i} className="rounded-xl border-l-[3px] pl-4 pr-3 py-3 bg-slate-50 border border-slate-200"
                  style={{ borderLeftColor: 'var(--navy)' }}>
                  <div className="text-[11px] font-bold mb-1" style={{ color: 'var(--navy)' }}>{lb.law}</div>
                  <div className="text-sm text-slate-700 leading-relaxed">{lb.content}</div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 证据清单 */}
        {c.evidence_needed?.length > 0 && (
          <Section title="需要准备的证据">
            <div className="space-y-1.5">
              {c.evidence_needed.map((e, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                  <div className="w-5 h-5 rounded border-2 border-slate-300 flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  </div>
                  <span className="text-sm text-slate-700">{e}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 行动步骤 */}
        {c.action_steps?.length > 0 && (
          <Section title="行动步骤">
            <div className="relative pl-5">
              <div className="absolute left-[10px] top-4 bottom-4 w-px bg-slate-200" />
              {c.action_steps.map((s, i) => (
                <div key={i} className="relative mb-4 last:mb-0">
                  <div className="absolute -left-[14px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                    style={{ background: 'var(--navy)' }}>
                    {s.step}
                  </div>
                  <div className="font-semibold text-[13px] text-slate-800 mb-0.5">{s.title}</div>
                  <div className="text-[12px] text-slate-500 leading-relaxed">{s.detail}</div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 消息模板 */}
        {c.template_messages?.length > 0 && (
          <Section title="可直接使用的消息模板">
            <p className="text-[11px] text-slate-400 mb-3">替换方括号内容后直接发送给房东</p>
            <div className="space-y-3">
              {c.template_messages.map((t, i) => (
                <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                    <span className="text-[12px] font-semibold text-slate-700">{t.title}</span>
                    <button onClick={() => navigator.clipboard.writeText(t.content)}
                      className="btn-ghost text-[11px] py-1 px-2.5">
                      复制
                    </button>
                  </div>
                  <pre className="px-4 py-3 text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed bg-white">{t.content}</pre>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 成功案例 */}
        {c.outcome_examples?.length > 0 && (
          <Section title="类似案例结果">
            <div className="space-y-2">
              {c.outcome_examples.map((e, i) => (
                <div key={i} className="flex items-start gap-2.5 py-2">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'var(--teal-dim)' }}>
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 4l2 2 4-4" stroke="var(--teal-d)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-sm text-slate-700 leading-relaxed">{e}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* CTA */}
        <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--navy)' }}>
          <h3 className="font-bold text-white text-[15px] mb-1.5">还是不确定怎么处理？</h3>
          <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.65)' }}>
            向 AI 描述你的具体情况，它会一步步帮你分析并给出定制化方案
          </p>
          <Link to={`/chat?case=${c.id}`}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white rounded-xl font-semibold text-sm hover:-translate-y-0.5 transition-all shadow-md"
            style={{ color: 'var(--navy)' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2h10v8H8l-4 2V2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            </svg>
            让 AI 帮我分析
          </Link>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <p className="section-label mb-3">{title}</p>
      {children}
    </div>
  )
}
