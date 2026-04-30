"use client";

import { useCallback } from "react";
import { useChatStore, type Message } from "@/stores/chat-store";
import { getAccessToken } from "@/lib/api-client";

const API_BASE =
  (typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/v1";

export function useSSEChat() {
  const {
    addMessage,
    setStreaming,
    appendStreamContent,
    finalizeStream,
    messages,
    enableWebSearch,
  } = useChatStore();

  const sendMessage = useCallback(
    async (userContent: string) => {
      if (!userContent.trim()) return;

      // Add user message
      const userMsg: Omit<Message, "id"> = { role: "user", content: userContent };
      addMessage(userMsg);
      setStreaming(true);

      const allMessages = [
        ...messages,
        { role: "user" as const, content: userContent },
      ];

      try {
        const token = getAccessToken();
        const response = await fetch(`${API_BASE}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            messages: allMessages,
            enable_web_search: enableWebSearch,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            try {
              const event = JSON.parse(raw);
              if (event.type === "text") {
                appendStreamContent(event.content);
              } else if (event.type === "done") {
                finalizeStream();
                return;
              } else if (event.type === "error") {
                appendStreamContent(`\n\n⚠️ ${event.message}`);
                finalizeStream();
                return;
              }
            } catch {
              // ignore parse errors
            }
          }
        }

        finalizeStream();
      } catch (error) {
        appendStreamContent(`\n\n⚠️ 连接失败：${error instanceof Error ? error.message : "未知错误"}`);
        finalizeStream();
      }
    },
    [messages, enableWebSearch, addMessage, setStreaming, appendStreamContent, finalizeStream]
  );

  return { sendMessage };
}
