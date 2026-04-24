import { create } from 'zustand'
import type { Message } from '../types'

interface ChatState {
  // 每个 sessionId 对应一组消息，后台可同时维护多个会话的消息
  sessionMessages: Record<string, Message[]>
  // 当前显示的会话 ID
  activeSessionId: string
  // 哪些会话正在流式生成
  streamingSessionIds: Set<string>
  // 哪些会话正在搜索
  searchingSessionIds: Set<string>

  // 当前显示会话的消息（快捷访问）
  get messages(): Message[]
  get isStreaming(): boolean
  get isSearching(): boolean

  // 切换显示的会话（不中断后台生成）
  setActiveSession: (id: string) => void
  // 设置某会话的全部消息（加载历史时用）
  setSessionMessages: (sessionId: string, msgs: Message[]) => void
  // 追加消息到某会话
  addMessageToSession: (sessionId: string, msg: Message) => void
  // 更新某会话最后一条消息（流式追加）
  updateLastMessage: (sessionId: string, content: string) => void
  // 清空某会话
  clearSession: (sessionId: string) => void
  // 标记流式状态
  setStreaming: (sessionId: string, v: boolean) => void
  setSearching: (sessionId: string, v: boolean) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessionMessages: {},
  activeSessionId: '',
  streamingSessionIds: new Set(),
  searchingSessionIds: new Set(),

  get messages() {
    const id = get().activeSessionId
    return get().sessionMessages[id] ?? []
  },
  get isStreaming() {
    return get().streamingSessionIds.has(get().activeSessionId)
  },
  get isSearching() {
    return get().searchingSessionIds.has(get().activeSessionId)
  },

  setActiveSession: (id) => set({ activeSessionId: id }),

  setSessionMessages: (sessionId, msgs) =>
    set((s) => ({ sessionMessages: { ...s.sessionMessages, [sessionId]: msgs } })),

  addMessageToSession: (sessionId, msg) =>
    set((s) => ({
      sessionMessages: {
        ...s.sessionMessages,
        [sessionId]: [...(s.sessionMessages[sessionId] ?? []), msg],
      },
    })),

  updateLastMessage: (sessionId, content) =>
    set((s) => {
      const msgs = [...(s.sessionMessages[sessionId] ?? [])]
      if (msgs.length === 0) return {}
      msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content }
      return { sessionMessages: { ...s.sessionMessages, [sessionId]: msgs } }
    }),

  clearSession: (sessionId) =>
    set((s) => {
      const next = { ...s.sessionMessages }
      delete next[sessionId]
      return { sessionMessages: next }
    }),

  setStreaming: (sessionId, v) =>
    set((s) => {
      const next = new Set(s.streamingSessionIds)
      v ? next.add(sessionId) : next.delete(sessionId)
      return { streamingSessionIds: next }
    }),

  setSearching: (sessionId, v) =>
    set((s) => {
      const next = new Set(s.searchingSessionIds)
      v ? next.add(sessionId) : next.delete(sessionId)
      return { searchingSessionIds: next }
    }),
}))
