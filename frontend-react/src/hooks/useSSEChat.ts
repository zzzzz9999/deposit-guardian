import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { streamFetch } from '../api/client'
import { chatApi } from '../api'
import { useChatStore } from '../stores/chatStore'
import { useAuthStore } from '../stores/authStore'
import type { Message } from '../types'

// 全局 AbortController 表，每个 sessionId 对应一个
const abortControllers = new Map<string, AbortController>()

// 每个 session 的标题缓存（首条用户消息截取，流结束后同步到云端）
const sessionTitles = new Map<string, string>()

export function useSSEChat() {
  const store = useChatStore()
  const queryClient = useQueryClient()

  const abortSession = useCallback((sessionId: string) => {
    abortControllers.get(sessionId)?.abort()
    abortControllers.delete(sessionId)
  }, [])

  const sendMessage = useCallback(async (sessionId: string, content: string) => {
    const { streamingSessionIds } = useChatStore.getState()
    if (streamingSessionIds.has(sessionId)) return

    const userMsg: Message = { role: 'user', content }
    store.addMessageToSession(sessionId, userMsg)

    // 记录标题（首条用户消息）
    if (!sessionTitles.has(sessionId)) {
      sessionTitles.set(sessionId, content.slice(0, 28) + (content.length > 28 ? '…' : ''))
    }

    const snapshot = useChatStore.getState().sessionMessages[sessionId] ?? []

    store.setStreaming(sessionId, true)
    store.setSearchMessage(sessionId, '正在联网搜索最新信息…')

    const controller = new AbortController()
    abortControllers.set(sessionId, controller)

    let fullText = ''
    let aiMsgAdded = false

    try {
      const resp = await streamFetch(
        '/api/chat',
        { messages: snapshot, enable_web_search: true },
        controller.signal,
      )

      if (!resp.ok) {
        store.addMessageToSession(sessionId, {
          role: 'assistant',
          content: `服务暂时不可用（${resp.status}），请稍后重试。`,
        })
        return
      }

      const reader = resp.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (controller.signal.aborted) break

        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''

        for (const part of parts) {
          if (controller.signal.aborted) break
          const line = part.trim()
          if (!line.startsWith('data:')) continue
          const raw = line.slice(5).trim()
          if (!raw) continue
          let evt: { type: string; content?: string; message?: string }
          try { evt = JSON.parse(raw) } catch { continue }

          if (evt.type === 'ping') {
            // 心跳保活，忽略
          } else if (evt.type === 'searching') {
            store.setSearching(sessionId, true)
            if (evt.message) store.setSearchMessage(sessionId, evt.message)
          } else if (evt.type === 'text') {
            store.setSearching(sessionId, false)
            fullText += evt.content ?? ''
            if (!aiMsgAdded) {
              store.addMessageToSession(sessionId, { role: 'assistant', content: fullText })
              aiMsgAdded = true
            } else {
              store.updateLastMessage(sessionId, fullText)
            }
          } else if (evt.type === 'done') {
            store.setSearching(sessionId, false)
            if (!aiMsgAdded && fullText) {
              store.addMessageToSession(sessionId, { role: 'assistant', content: fullText })
            }
          } else if (evt.type === 'error') {
            store.setSearching(sessionId, false)
            if (!aiMsgAdded) {
              store.addMessageToSession(sessionId, {
                role: 'assistant',
                content: `⚠️ ${evt.message ?? '回复失败，请重试'}`,
              })
            }
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        store.addMessageToSession(sessionId, {
          role: 'assistant',
          content: '⚠️ 网络错误，请检查连接后重试。',
        })
      }
    } finally {
      store.setStreaming(sessionId, false)
      store.setSearching(sessionId, false)
      store.setSearchMessage(sessionId, '')
      abortControllers.delete(sessionId)

      // 流结束后云端同步（已登录时）
      const { isAuthenticated } = useAuthStore.getState()
      if (isAuthenticated && fullText) {
        const finalMsgs = useChatStore.getState().sessionMessages[sessionId] ?? []
        const title = sessionTitles.get(sessionId)
        chatApi.updateSession(sessionId, { title, messages: finalMsgs })
          .then(() => queryClient.invalidateQueries({ queryKey: ['chat-sessions'] }))
          .catch(() => { /* 静默失败，不影响用户 */ })
      }
    }
  }, [store, queryClient])

  return { sendMessage, abortSession }
}
