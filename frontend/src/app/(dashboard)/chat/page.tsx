"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChatStore } from "@/stores/chat-store";
import { useSSEChat } from "@/hooks/use-sse-chat";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isStreaming, streamingContent, enableWebSearch, toggleWebSearch } = useChatStore();
  const { sendMessage } = useSSEChat();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    const msg = input;
    setInput("");
    await sendMessage(msg);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="border-b bg-white dark:bg-gray-900 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-gray-900 dark:text-white">🤖 AI 法律顾问</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            专业租房权益保护，注入法律原文 + 实时搜索
          </p>
        </div>
        <button
          onClick={toggleWebSearch}
          className={cn(
            "text-xs px-3 py-1 rounded-full border transition-colors",
            enableWebSearch
              ? "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-300 text-gray-500"
          )}
        >
          {enableWebSearch ? "🌐 联网搜索开" : "🌐 联网搜索关"}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🛡️</div>
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              你好，我是租客卫士 AI
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-sm">
              我可以帮你处理押金纠纷、租房维权等问题。请描述你遇到的情况，我会给出专业的法律建议和行动步骤。
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2 max-w-sm mx-auto">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-blue-400 transition-colors text-gray-700 dark:text-gray-300"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              )}
            >
              {msg.role === "assistant" ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  className="prose prose-sm dark:prose-invert max-w-none"
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
              {streamingContent ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  className="prose prose-sm dark:prose-invert max-w-none"
                >
                  {streamingContent}
                </ReactMarkdown>
              ) : (
                <span className="text-gray-400 animate-pulse">正在思考中…</span>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-white dark:bg-gray-900 px-4 py-4">
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-3xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }
            }}
            placeholder="描述你遇到的租房问题，比如：房东扣押了我2000元押金说墙壁划痕是我造成的…"
            rows={2}
            disabled={isStreaming}
            className="flex-1 resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-xl font-medium transition-colors text-sm"
          >
            {isStreaming ? "⏳" : "发送"}
          </button>
        </form>
      </div>
    </div>
  );
}

const quickQuestions = [
  "房东说我墙壁有划痕要扣押金，合理吗？",
  "租期内房东要涨租金，我该怎么办？",
  "中介跑路了押金怎么追？",
  "房东不提前通知就进我房间",
];
