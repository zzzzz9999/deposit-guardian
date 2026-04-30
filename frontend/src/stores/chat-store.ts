"use client";

import { create } from "zustand";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: Date;
}

interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  sessionId: string | null;
  enableWebSearch: boolean;

  addMessage: (msg: Omit<Message, "id">) => void;
  setStreaming: (value: boolean) => void;
  appendStreamContent: (chunk: string) => void;
  finalizeStream: () => void;
  clearMessages: () => void;
  setSessionId: (id: string | null) => void;
  toggleWebSearch: () => void;
}

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const useChatStore = create<ChatState>()((set, get) => ({
  messages: [],
  isStreaming: false,
  streamingContent: "",
  sessionId: null,
  enableWebSearch: false,

  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages, { ...msg, id: generateId(), createdAt: new Date() }],
    })),

  setStreaming: (value) => set({ isStreaming: value, streamingContent: value ? "" : get().streamingContent }),

  appendStreamContent: (chunk) =>
    set((state) => ({ streamingContent: state.streamingContent + chunk })),

  finalizeStream: () =>
    set((state) => {
      if (!state.streamingContent) {
        return { isStreaming: false, streamingContent: "" };
      }
      return {
        isStreaming: false,
        streamingContent: "",
        messages: [
          ...state.messages,
          {
            id: generateId(),
            role: "assistant" as const,
            content: state.streamingContent,
            createdAt: new Date(),
          },
        ],
      };
    }),

  clearMessages: () => set({ messages: [], streamingContent: "", isStreaming: false }),

  setSessionId: (id) => set({ sessionId: id }),

  toggleWebSearch: () => set((state) => ({ enableWebSearch: !state.enableWebSearch })),
}));
