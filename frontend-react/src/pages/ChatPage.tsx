import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useChatStore } from '../stores/chatStore'
import { useSSEChat } from '../hooks/useSSEChat'
import { useAuthStore } from '../stores/authStore'
import { chatApi } from '../api'
import AuthModal from '../components/auth/AuthModal'
import type { Message } from '../types'

const STARTERS = [
  { title: '押金·损耗纠纷', desc: '墙壁发黄、地板磨损被扣押金', msg: '房东以墙壁划痕/发黄为由扣押金，我觉得这是正常磨损，怎么办？' },
  { title: '押金·合同陷阱', desc: '提前退租、格式条款、押金变定金', msg: '房东以合同条款为由拒绝退押金，说我提前退租押金不退，这合理吗？' },
  { title: '押金·中介跑路', desc: '中介失联，押金两头落空', msg: '中介公司联系不上了，押金打水漂了，我该怎么办？' },
  { title: '押金·拖延不退', desc: '各种借口拖延，迟迟不退', msg: '退租后一个多月了，房东各种借口就是不退押金，怎么逼他退？' },
  { title: '租住·随意涨租', desc: '租期内突然涨价威胁搬走', msg: '我租期还没到，房东突然要涨租，说不涨就搬走，这合法吗？' },
  { title: '租住·强制驱逐', desc: '卖房或自住强制要求搬走', msg: '房东说要卖房，要求我一周内搬走，租期还有3个月，我有什么权利？' },
  { title: '签约·无中生有', desc: '捏造损坏，伪造发票索赔', msg: '房东搬出后发来照片说我损坏了东西，要我赔偿，但我根本没有，怎么办？' },
  { title: '押金·长租爆雷', desc: '蛋壳/自如等平台跑路', msg: '我住的是蛋壳/自如等长租公寓，平台出问题了，押金怎么追回？' },
]

const QUICK_REPLIES = ['我有照片证据', '没有书面合同', '押金超过1万', '中介不见了', '房东不回消息', '已退租超过一个月']

// ── localStorage 历史（未登录时使用）────────────────────────────────────────
const LS_KEY = 'dg_sessions'
const MAX_SESSIONS = 30

interface LocalSession { id: string; title: string; updatedAt: number; messages: Message[] }

function loadLocalSessions(): LocalSession[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    return (Array.isArray(data) ? data : []).map((s: Record<string, unknown>) => ({
      id: String(s.id ?? ''),
      title: String(s.title ?? '对话'),
      updatedAt: Number(s.updatedAt ?? s.createdAt ?? Date.now()),
      messages: (Array.isArray(s.messages) ? s.messages : []).map((m: Record<string, unknown>) => ({
        role: String(m.role ?? 'user') as 'user' | 'assistant',
        content: String(m.content ?? ''),
      })),
    })).filter(s => s.id && s.messages.length > 0)
  } catch { return [] }
}

function saveLocalSession(id: string, title: string, messages: Message[]) {
  const sessions = loadLocalSessions().filter(s => s.id !== id)
  sessions.unshift({ id, title, updatedAt: Date.now(), messages })
  if (sessions.length > MAX_SESSIONS) sessions.splice(MAX_SESSIONS)
  localStorage.setItem(LS_KEY, JSON.stringify(sessions))
}

function deleteLocalSession(id: string) {
  localStorage.setItem(LS_KEY, JSON.stringify(loadLocalSessions().filter(s => s.id !== id)))
}

function groupSessions(sessions: LocalSession[]) {
  const now = Date.now()
  const today: LocalSession[] = [], yesterday: LocalSession[] = [],
        week: LocalSession[] = [], older: LocalSession[] = []
  sessions.forEach(s => {
    const diff = now - s.updatedAt
    if (diff < 86400000) today.push(s)
    else if (diff < 172800000) yesterday.push(s)
    else if (diff < 604800000) week.push(s)
    else older.push(s)
  })
  return { today, yesterday, week, older }
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { sessionId: _sessionId } = useParams()
  const [searchParams] = useSearchParams()
  const store = useChatStore()
  const { sendMessage, abortSession } = useSSEChat()
  const { user, isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()

  const [input, setInput] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [localSessions, setLocalSessions] = useState<LocalSession[]>(() => loadLocalSessions())
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 云端会话列表（已登录时）
  const { data: cloudData } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: () => chatApi.listSessions(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  })

  const [activeId, setActiveId] = useState<string>(() => {
    const saved = sessionStorage.getItem('dg_current_session_id')
    if (saved) return saved
    const newId = Date.now().toString()
    sessionStorage.setItem('dg_current_session_id', newId)
    return newId
  })

  useEffect(() => { store.setActiveSession(activeId) }, [activeId])

  const sessionTitlesRef = useRef<Record<string, string>>({})

  // 监听消息变化 → 始终同步到 localStorage（作为即时本地缓存）
  const sessionMessages = store.sessionMessages
  useEffect(() => {
    Object.entries(sessionMessages).forEach(([sid, msgs]) => {
      if (msgs.length === 0) return
      if (!sessionTitlesRef.current[sid]) {
        const firstUser = msgs.find(m => m.role === 'user')
        if (firstUser) {
          sessionTitlesRef.current[sid] = firstUser.content.slice(0, 28) +
            (firstUser.content.length > 28 ? '…' : '')
        }
      }
      saveLocalSession(sid, sessionTitlesRef.current[sid] || '对话', msgs)
    })
    setLocalSessions(loadLocalSessions())
  }, [sessionMessages])

  const messages = sessionMessages[activeId] ?? []
  const isStreaming = store.streamingSessionIds.has(activeId)
  const isSearching = store.searchingSessionIds.has(activeId)

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isSearching])

  // URL case 参数自动发送
  useEffect(() => {
    const caseParam = searchParams.get('case')
    if (caseParam && messages.length === 0) {
      handleSend(`我遇到了和案例 ${caseParam} 类似的情况，请帮我分析该怎么处理。`)
    }
  }, [])

  const autoResize = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }, [])

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || isStreaming) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    await sendMessage(activeId, msg)
  }, [input, isStreaming, sendMessage, activeId])

  // 编辑重发：截断该条消息之后的内容，重新发送
  const handleEditResend = useCallback((idx: number, newContent: string) => {
    const trimmed = messages.slice(0, idx)
    store.setSessionMessages(activeId, trimmed)
    handleSend(newContent)
  }, [messages, store, activeId, handleSend])

  const loadSession = useCallback(async (id: string) => {
    setActiveId(id)
    store.setActiveSession(id)
    sessionStorage.setItem('dg_current_session_id', id)
    if (!store.sessionMessages[id]) {
      // 先尝试 localStorage（速度最快，包含正在流式的会话）
      const local = loadLocalSessions().find(x => x.id === id)
      if (local && local.messages.length > 0) {
        store.setSessionMessages(id, local.messages)
        sessionTitlesRef.current[id] = local.title
      } else if (isAuthenticated) {
        // localStorage 没有时从云端拉取
        try {
          const s = await chatApi.getSession(id)
          store.setSessionMessages(id, s.messages as Message[])
        } catch { /* 忽略加载失败 */ }
      }
    }
  }, [store, isAuthenticated])

  const handleNewChat = useCallback(() => {
    const newId = Date.now().toString()
    sessionStorage.setItem('dg_current_session_id', newId)
    setActiveId(newId)
    store.setActiveSession(newId)
  }, [store])

  const handleDeleteSession = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    // 始终清 localStorage
    deleteLocalSession(id)
    setLocalSessions(loadLocalSessions())
    if (isAuthenticated) {
      await chatApi.deleteSession(id).catch(() => {})
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] })
    }
    store.clearSession(id)
    if (activeId === id) {
      const newId = Date.now().toString()
      sessionStorage.setItem('dg_current_session_id', newId)
      setActiveId(newId)
      store.setActiveSession(newId)
    }
  }, [store, activeId, isAuthenticated, queryClient])

  // 统一的 sessions 列表：
  // - 未登录：纯 localStorage
  // - 已登录：localStorage（含正在生成的当前会话）+ 云端补充（去重），本地优先
  const sessions: LocalSession[] = (() => {
    if (!isAuthenticated) return localSessions
    const cloudSessions: LocalSession[] = (cloudData?.sessions ?? []).map(s => ({
      id: s.id,
      title: s.title ?? '对话',
      updatedAt: s.updated_at ? new Date(s.updated_at).getTime() : Date.now(),
      messages: [],
    }))
    // 合并：以 id 去重，本地版本优先（本地有更新的消息状态）
    const localIds = new Set(localSessions.map(s => s.id))
    const cloudOnly = cloudSessions.filter(s => !localIds.has(s.id))
    return [...localSessions, ...cloudOnly].sort((a, b) => b.updatedAt - a.updatedAt)
  })()
  const grouped = groupSessions(sessions)

  return (
    <>
      <div className="flex" style={{ height: 'calc(100vh - 56px)', background: 'var(--bg)' }}>

        {/* ── 侧边栏 ── */}
        <aside className={`
          flex-col shrink-0 border-r border-slate-200 bg-white
          transition-all duration-300 ease-in-out overflow-hidden
          ${sidebarOpen ? 'w-[240px]' : 'w-0'}
          hidden md:flex
        `}>
          <div className="flex flex-col h-full">
            <div className="p-3 border-b border-slate-100">
              <button onClick={handleNewChat}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-white text-[13px] font-semibold"
                style={{ background: 'var(--navy)' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1v10M1 6h10" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                新对话
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: 'thin' }}>
              {!isAuthenticated ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-[11px] text-slate-400 mb-3">登录后历史对话云端保存</p>
                  <button onClick={() => setShowAuthModal(true)}
                    className="text-[11px] px-3 py-1.5 rounded-lg text-white" style={{ background: 'var(--navy)' }}>
                    立即登录
                  </button>
                </div>
              ) : sessions.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-[11px] text-slate-400">暂无历史对话</p>
                  <p className="text-[11px] text-slate-300 mt-1">发送消息后自动保存</p>
                </div>
              ) : (
                <>
                  {[
                    { label: '今天', items: grouped.today },
                    { label: '昨天', items: grouped.yesterday },
                    { label: '本周', items: grouped.week },
                    { label: '更早', items: grouped.older },
                  ].map(({ label, items }) => items.length > 0 && (
                    <div key={label} className="mb-1">
                      <p className="text-[10px] font-bold text-slate-400 px-3.5 py-1.5 uppercase tracking-wider">{label}</p>
                      {items.map(s => (
                        <button key={s.id} onClick={() => loadSession(s.id)}
                          className={`w-full flex items-center justify-between px-3.5 py-2 text-left group transition-colors rounded-lg mx-1 ${
                            activeId === s.id ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                          }`} style={{ width: 'calc(100% - 8px)' }}>
                          <span className="text-[12px] truncate flex-1 leading-snug font-medium">{s.title || '对话'}</span>
                          <button onClick={e => handleDeleteSession(e, s.id)}
                            className="shrink-0 ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all">
                            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                              <path d="M2 2l7 7M9 2l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                            </svg>
                          </button>
                        </button>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="border-t border-slate-100 p-3">
              {isAuthenticated ? (
                <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: 'var(--navy)' }}>
                    {user?.username?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <span className="text-[12px] text-slate-600 truncate flex-1">{user?.username}</span>
                </div>
              ) : (
                <button onClick={() => setShowAuthModal(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 1a3 3 0 100 6 3 3 0 000-6zM1 12c0-3 2.5-5.5 5.5-5.5S12 9 12 12"
                      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  登录 / 注册
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* ── 主区 ── */}
        <div className="flex flex-col flex-1 min-w-0 bg-white">

          {/* 顶栏 */}
          <div className="h-11 border-b border-slate-100 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2">
              <button onClick={() => setSidebarOpen(v => !v)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M2 3.5h11M2 7.5h11M2 11.5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </button>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full transition-colors ${isStreaming ? 'bg-amber-400 animate-pulse' : 'bg-teal-400'}`} />
                <span className="text-[11px] text-slate-400">{isStreaming ? '正在回复…' : '在线'}</span>
              </div>
            </div>
            {messages.length > 0 && (
              <span className="text-[11px] text-slate-300">
                {isAuthenticated ? '已云端同步' : '已本地保存'}
              </span>
            )}
          </div>

          {/* 消息流 */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {!isAuthenticated ? (
              <div className="flex flex-col items-center justify-center min-h-full px-6 py-10">
                <div className="w-full max-w-sm text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                    style={{ background: 'var(--navy)' }}>
                    <ShieldIcon size={26} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">登录后开始维权</h2>
                  <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                    登录后即可使用 AI 维权顾问，对话记录云端保存，随时跨设备继续
                  </p>
                  <button onClick={() => setShowAuthModal(true)} className="btn-primary w-full justify-center py-3">
                    登录 / 注册（免费）
                  </button>
                  <p className="text-[11px] text-slate-400 mt-4">完全免费 · 无广告 · 数据加密存储</p>
                </div>
              </div>

            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-full px-6 py-10">
                <div className="w-full max-w-2xl">
                  <div className="text-center mb-8">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--navy)' }}>
                      <ShieldIcon size={22} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">
                      你好，我是<span style={{ color: 'var(--navy)' }}>租客卫士</span>
                    </h1>
                    <p className="mt-2 text-slate-500 text-sm max-w-sm mx-auto">
                      专业租房维权 AI · 引用真实法律 · 生成催款模板 · 一步步陪你维权
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {STARTERS.map(s => (
                      <button key={s.title} onClick={() => handleSend(s.msg)}
                        className="group flex flex-col p-4 rounded-xl text-left border border-slate-200 bg-white hover:border-[color:var(--navy)] hover:shadow-sm active:scale-[0.98] transition-all duration-150">
                        <p className="text-[13px] font-semibold text-slate-800 group-hover:text-[color:var(--navy)] transition-colors leading-snug mb-1">{s.title}</p>
                        <p className="text-[11px] text-slate-400 truncate">{s.desc}</p>
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-[11px] text-slate-400 mt-5">
                    或直接描述你的情况，按{' '}
                    <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono border border-slate-200">Enter</kbd>
                    {' '}发送
                  </p>
                </div>
              </div>

            ) : (
              <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                {messages.map((msg, idx) => (
                  <MessageBubble
                    key={idx}
                    msg={msg}
                    idx={idx}
                    isLast={idx === messages.length - 1}
                    isStreaming={isStreaming && idx === messages.length - 1}
                    copiedIdx={copiedIdx}
                    onCopy={(content, i) => {
                      navigator.clipboard.writeText(content)
                      setCopiedIdx(i)
                      setTimeout(() => setCopiedIdx(null), 2000)
                    }}
                    onResend={() => handleSend(msg.content)}
                    onEditResend={(newContent) => handleEditResend(idx, newContent)}
                  />
                ))}
                {isSearching && (
                  <div className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--navy)' }}>
                      <ShieldIcon size={13} />
                    </div>
                    <div className="flex items-center gap-2 pt-1.5">
                      <div className="flex gap-1">
                        {[0,1,2].map(i => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce"
                            style={{ animationDelay: `${i * 0.12}s` }} />
                        ))}
                      </div>
                      <span className="text-[11px] text-slate-400">正在加载法律条文…</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* 输入区 */}
          <div className="shrink-0 border-t border-slate-100 bg-white px-4 pt-3 pb-4">
            <div className="max-w-3xl mx-auto">
              {!isAuthenticated ? (
                <button onClick={() => setShowAuthModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 text-sm font-medium hover:border-[color:var(--navy)] hover:text-[color:var(--navy)] transition-colors">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1a3 3 0 100 6 3 3 0 000-6zM1 13c0-3.3 2.7-6 6-6s6 2.7 6 6"
                      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  登录后开始对话
                </button>
              ) : (
                <>
                  {messages.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mb-2.5">
                      {QUICK_REPLIES.map(r => (
                        <button key={r} onClick={() => { setInput(r); textareaRef.current?.focus() }}
                          className="text-[11px] px-2.5 py-1 rounded-full border border-slate-200 text-slate-500 hover:border-[color:var(--navy)] hover:text-[color:var(--navy)] hover:bg-[color:var(--navy-dim)] transition-colors">
                          {r}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className={`relative rounded-xl border-2 bg-white transition-all duration-200 ${
                    isStreaming
                      ? 'border-slate-200 opacity-80'
                      : 'border-slate-200 focus-within:border-[color:var(--navy)] focus-within:shadow-[0_0_0_3px_rgba(30,58,138,0.08)]'
                  }`}>
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={e => { setInput(e.target.value); autoResize() }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                      }}
                      placeholder={messages.length === 0 ? '描述你遇到的租房问题，例如：房东说地板有划痕要扣我押金…' : '继续提问，或补充更多信息…'}
                      disabled={isStreaming}
                      rows={1}
                      className="w-full px-4 pt-3 pb-2 resize-none outline-none text-sm text-slate-900 placeholder:text-slate-400 min-h-[48px] max-h-[200px] bg-transparent disabled:cursor-not-allowed rounded-xl"
                    />
                    <div className="flex items-center justify-between px-3 pb-2.5">
                      <span className={`text-[11px] ${input.length > 500 ? 'text-red-400' : 'text-slate-300'}`}>
                        {input.length > 0 ? `${input.length} 字` : 'Shift+Enter 换行'}
                      </span>
                      {/* 流式中显示停止按钮，否则显示发送按钮 */}
                      {isStreaming ? (
                        <button onClick={() => abortSession(activeId)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-100 text-red-500 hover:bg-red-200 transition-colors">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <rect x="2" y="2" width="6" height="6" rx="1" fill="currentColor"/>
                          </svg>
                        </button>
                      ) : (
                        <button onClick={() => handleSend()} disabled={!input.trim()}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 ${
                            input.trim() ? 'text-white hover:opacity-90 shadow-sm active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                          }`}
                          style={input.trim() ? { background: 'var(--navy)' } : {}}>
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                            <path d="M11.5 6.5L1 1.5L3.5 6.5L1 11.5L11.5 6.5Z" fill="currentColor"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-center text-[10px] text-slate-300 mt-1.5">
                    AI 引用真实法律原文 · 内容仅供参考，不构成正式法律意见
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </>
  )
}

// ── ShieldIcon ────────────────────────────────────────────────────────────────
function ShieldIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M10 2L3 5v5.5c0 4.2 2.8 8.1 7 9.5 4.2-1.4 7-5.3 7-9.5V5L10 2z" fill="white" fillOpacity=".92"/>
      <path d="M7 10.2l2.2 2.2 4-4" stroke="var(--navy)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ── MessageBubble ─────────────────────────────────────────────────────────────
interface MsgProps {
  msg: Message
  idx: number
  isLast: boolean
  isStreaming: boolean
  copiedIdx: number | null
  onCopy: (content: string, idx: number) => void
  onResend: () => void
  onEditResend: (newContent: string) => void
}

function MessageBubble({ msg, idx, isLast, isStreaming, copiedIdx, onCopy, onResend, onEditResend }: MsgProps) {
  const isUser = msg.role === 'user'
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(msg.content)

  if (isUser) {
    return (
      <div className="flex justify-end" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <div className="relative max-w-[72%]">
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                rows={3}
                className="w-full rounded-2xl rounded-br-sm px-4 py-3 text-sm bg-slate-100 border-2 border-[color:var(--navy)] outline-none resize-none"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditing(false)} className="btn-ghost text-[11px] py-1 px-2.5">取消</button>
                <button onClick={() => { setEditing(false); onEditResend(editText) }}
                  className="btn-primary text-[11px] py-1 px-2.5">重新发送</button>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-white"
                style={{ background: 'var(--navy)' }}>
                {msg.content}
              </div>
              <div className={`flex justify-end gap-1 mt-1 transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`}>
                <button onClick={() => onCopy(msg.content, idx)}
                  className="text-[10px] text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors">
                  {copiedIdx === idx ? '已复制' : '复制'}
                </button>
                <button onClick={() => { setEditing(true); setEditText(msg.content) }}
                  className="text-[10px] text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors">
                  编辑
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 items-start" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'var(--navy)' }}>
        <ShieldIcon size={13} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-slate-400 mb-1.5 tracking-wide uppercase">租客卫士</p>

        <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-800 leading-relaxed bg-slate-50 border border-slate-200">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
            p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
            h1: ({ children }) => <h1 className="text-base font-bold text-slate-900 mt-4 mb-2 first:mt-0">{children}</h1>,
            h2: ({ children }) => <h2 className="text-[15px] font-bold text-slate-900 mt-4 mb-2 first:mt-0">{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-900 mt-3 mb-1.5 first:mt-0">{children}</h3>,
            ul: ({ children }) => <ul className="list-disc list-outside pl-5 mb-3 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-outside pl-5 mb-3 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-[3px] pl-3.5 py-1 my-3 rounded-r-lg text-slate-700 text-sm"
                style={{ borderLeftColor: 'var(--navy)', background: 'var(--navy-dim)' }}>
                {children}
              </blockquote>
            ),
            code: ({ children, className }) => {
              if (className?.includes('language-')) return <code className={className}>{children}</code>
              return <code className="px-1.5 py-0.5 bg-slate-100 rounded text-[13px] font-mono text-slate-700 border border-slate-200">{children}</code>
            },
            pre: ({ children }) => (
              <div className="relative my-3 group/pre">
                <pre className="bg-slate-900 text-slate-100 rounded-xl px-4 py-3.5 overflow-x-auto text-[13px] leading-relaxed whitespace-pre-wrap font-mono">
                  {children}
                </pre>
                <button onClick={() => {
                  const el = (children as React.ReactElement)
                  const text = el?.props?.children
                  if (typeof text === 'string') navigator.clipboard.writeText(text)
                }} className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-white/10 hover:bg-white/20 text-white/50 hover:text-white text-[11px] rounded transition-colors opacity-0 group-hover/pre:opacity-100">
                  复制
                </button>
              </div>
            ),
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 hover:underline underline-offset-2 text-[13px]"
                style={{ color: 'var(--navy)' }}>
                {children}
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none" className="shrink-0 opacity-60">
                  <path d="M1.5 7.5L7.5 1.5M7.5 1.5H4.5M7.5 1.5v3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            ),
            hr: () => <hr className="border-slate-200 my-4" />,
            table: ({ children }) => (
              <div className="overflow-x-auto my-3 rounded-lg border border-slate-200 text-sm">
                <table className="w-full">{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead className="bg-slate-50 border-b border-slate-200">{children}</thead>,
            th: ({ children }) => <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">{children}</th>,
            td: ({ children }) => <td className="px-3 py-2.5 text-slate-700 border-b border-slate-100 last:border-0">{children}</td>,
          }}>
            {msg.content}
          </ReactMarkdown>
          {isStreaming && isLast && (
            <span className="inline-block w-0.5 h-[1em] bg-slate-400 animate-pulse ml-0.5 align-middle rounded-sm" />
          )}
        </div>

        <div className={`flex items-center gap-1 mt-1.5 transition-opacity ${hovered && !isStreaming ? 'opacity-100' : 'opacity-0'}`}>
          <button onClick={() => onCopy(msg.content, idx)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.1"/>
              <path d="M1 7V2A1 1 0 012 1h5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
            </svg>
            {copiedIdx === idx ? '已复制' : '复制'}
          </button>
          {isLast && (
            <button onClick={onResend}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 5a4 4 0 108 0" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                <path d="M1 5V2l2.5 3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              重新生成
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
