import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { streamFetch } from '../api/client'

const EXAMPLES = [
  '这墙壁明显是你们弄的，正常住人哪会这样，要扣2000块重新粉刷。',
  '合同上白纸黑字写了，提前退租押金不退，你自己签的。',
  '押金我已经退给中介了，你去找中介要。',
  '现在市场价涨了，你要继续住就得每月多交500。',
  '我出差呢，等我回来再说，你急什么？',
]

export default function LandlordScriptPage() {
  const [message, setMessage] = useState('')
  const [rentMonths, setRentMonths] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [result, setResult] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const analyze = async () => {
    if (!message.trim() || isAnalyzing) return
    setResult('')
    setIsAnalyzing(true)
    abortRef.current = new AbortController()
    try {
      const resp = await streamFetch('/api/landlord-scripts/analyze', {
        message,
        context: {
          rent_months: rentMonths ? Number(rentMonths) : undefined,
          deposit_amount: depositAmount ? Number(depositAmount) : undefined,
        },
      }, abortRef.current.signal)
      if (!resp.ok) { setResult('服务暂时不可用，请稍后重试。'); return }
      const reader = resp.body!.getReader()
      const decoder = new TextDecoder()
      let buf = '', full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''
        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data:')) continue
          try {
            const evt = JSON.parse(line.slice(5).trim())
            if (evt.type === 'text') { full += evt.content; setResult(full) }
          } catch { /* ignore */ }
        }
      }
    } catch (e: unknown) {
      if ((e as Error)?.name !== 'AbortError') setResult('分析失败，请重试。')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <p className="section-label mb-1.5">维权工具</p>
          <h1 className="text-xl font-bold text-slate-900">房东话术识别器</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            粘贴房东消息，识别话术类型，获取法律反驳模板
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* 输入区 */}
          <div className="space-y-4">
            <div className="card p-5">
              <label className="section-label block mb-3">粘贴房东消息</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5}
                placeholder="粘贴房东/中介发来的消息内容…"
                className="input resize-none mb-3" />

              {/* 示例 */}
              <p className="text-[11px] font-semibold text-slate-400 mb-2">常见话术示例（点击填入）</p>
              <div className="space-y-1.5">
                {EXAMPLES.map((ex, i) => (
                  <button key={i} onClick={() => setMessage(ex)}
                    className="w-full text-left text-[11px] px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors truncate">
                    {ex.slice(0, 45)}…
                  </button>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <p className="section-label mb-3">背景信息（可选，提高准确性）</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">租住月数</label>
                  <input type="number" value={rentMonths} onChange={e => setRentMonths(e.target.value)}
                    placeholder="如：24" className="input" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">押金金额（元）</label>
                  <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
                    placeholder="如：6000" className="input" />
                </div>
              </div>
            </div>

            <button onClick={analyze} disabled={isAnalyzing || !message.trim()}
              className="btn-coral w-full justify-center py-2.5">
              {isAnalyzing ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  识别中…
                </span>
              ) : '识别话术并生成反驳'}
            </button>
          </div>

          {/* 结果区 */}
          <div>
            {result ? (
              <div className="card p-5 animate-slide-up">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--teal)' }} />
                  <p className="text-[12px] font-semibold text-slate-600">分析结果</p>
                </div>
                <div className="prose prose-sm max-w-none text-slate-800
                  prose-headings:font-bold prose-headings:text-slate-900
                  prose-strong:font-semibold prose-strong:text-slate-900
                  prose-blockquote:border-l-[3px] prose-blockquote:border-[color:var(--coral)]
                  prose-blockquote:bg-[color:var(--coral-dim)] prose-blockquote:rounded-r-lg prose-blockquote:py-1
                  prose-code:bg-slate-100 prose-code:rounded prose-code:text-[13px]
                  prose-pre:bg-slate-900 prose-pre:rounded-xl">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}
                    components={{
                      pre: ({ children }) => (
                        <div className="relative my-3">
                          <pre className="bg-slate-900 text-slate-100 rounded-xl px-4 py-3.5 text-[12px] whitespace-pre-wrap overflow-x-auto">
                            {children}
                          </pre>
                          <button onClick={() => {
                            const text = (children as React.ReactElement)?.props?.children as string ?? ''
                            navigator.clipboard.writeText(typeof text === 'string' ? text : '')
                          }} className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-white/10 hover:bg-white/20 text-white/60 hover:text-white text-[11px] rounded transition-colors">
                            复制
                          </button>
                        </div>
                      ),
                    }}>
                    {result}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="card p-10 text-center h-full flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 4v12M4 10h12" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-600 mb-1">粘贴房东消息</p>
                <p className="text-xs text-slate-400">识别结果将在此显示</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
