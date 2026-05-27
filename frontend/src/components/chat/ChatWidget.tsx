"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useLocale } from "next-intl";
import {
  MessageCircle,
  X,
  Brain,
  Send,
  Sparkles,
} from "lucide-react";
import dynamic from "next/dynamic";
import type { DashboardSimulationData } from "@/lib/dashboard";

const ReactMarkdown = dynamic(() => import("react-markdown"), {
  ssr: false,
  loading: () => (
    <span className="text-muted-foreground text-xs animate-pulse">…</span>
  ),
});

/* ── Quick-action pill definitions ── */
const QUICK_ACTIONS = [
  { emoji: "📊", label: "Summarize my results" },
  { emoji: "💰", label: "How should I reallocate budget?" },
  { emoji: "📈", label: "What's my ROI?" },
  { emoji: "🔮", label: "What should I do next?" },
] as const;

/* ── Helpers ── */

/** Extract the full text content from a UIMessage's parts array. */
function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

/** Check if any text part is still streaming. */
function isMessageStreaming(message: UIMessage): boolean {
  return message.parts.some(
    (p) => p.type === "text" && (p as { state?: string }).state === "streaming"
  );
}

/* ── Props ── */
interface ChatWidgetProps {
  simulationData: DashboardSimulationData;
}

export function ChatWidget({ simulationData }: ChatWidgetProps) {
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    sendMessage,
    status,
    error,
  } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/assistant",
      body: {
        simulationData,
        locale,
        provider: "cloud",
      },
    }),
    onFinish: () => {
      if (!isOpen) setHasUnread(true);
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  /* Auto-scroll on new messages */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  /* Focus input when panel opens */
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  /* Send handler */
  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || isLoading) return;
    sendMessage({ text });
    setInputValue("");
  }, [inputValue, isLoading, sendMessage]);

  /* Quick action handler */
  const handleQuickAction = useCallback(
    (text: string) => {
      if (isLoading) return;
      sendMessage({ text });
    },
    [isLoading, sendMessage]
  );

  /* Keyboard: Enter sends, Shift+Enter inserts newline */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* ═══════════ Chat Panel ═══════════ */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 flex flex-col
            w-[400px] max-w-[calc(100vw-1.5rem)] h-[500px] max-h-[calc(100vh-7rem)]
            bg-zinc-900/95 backdrop-blur-xl border border-zinc-800/60 rounded-2xl
            shadow-2xl shadow-indigo-500/10
            animate-chat-slide-up
            max-sm:inset-0 max-sm:bottom-0 max-sm:right-0 max-sm:w-full max-sm:h-full
            max-sm:max-w-full max-sm:max-h-full max-sm:rounded-none"
          id="chat-panel"
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400">
                <Brain className="w-5 h-5" />
                <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-amber-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  BrandOS AI
                </h3>
                <p className="text-[10px] text-zinc-400 font-medium">
                  Ask about your campaign performance
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800
                transition-colors cursor-pointer"
              aria-label="Close chat"
              id="chat-close-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Quick Actions (shown when no messages) ── */}
          {messages.length === 0 && (
            <div className="px-4 pt-3 pb-1 flex flex-wrap gap-2 shrink-0">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(`${action.emoji} ${action.label}`)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                    rounded-full border border-zinc-700/60 bg-zinc-800/50 text-zinc-300
                    hover:bg-indigo-600/20 hover:border-indigo-500/40 hover:text-indigo-300
                    transition-all duration-200 cursor-pointer disabled:opacity-50
                    disabled:cursor-not-allowed"
                  id={`quick-action-${action.label.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  <span>{action.emoji}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── Message List ── */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth scrollbar-thin">
            {/* Welcome message */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center opacity-60">
                <Brain className="w-10 h-10 text-indigo-400/60" />
                <p className="text-xs text-zinc-400 max-w-[240px] leading-relaxed">
                  Hi! I&apos;m your AI assistant. Ask me anything about your simulation results,
                  budget allocation, or campaign strategy.
                </p>
              </div>
            )}

            {messages.map((message) => {
              const text = getMessageText(message);
              if (!text) return null;

              return (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "bg-indigo-600/80 text-white rounded-2xl rounded-br-md"
                        : "bg-zinc-800/60 text-zinc-100 rounded-2xl rounded-bl-md border border-zinc-700/30"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div
                        className="prose prose-sm prose-invert max-w-none
                          prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5
                          prose-headings:text-zinc-100 prose-strong:text-indigo-300
                          prose-code:text-indigo-400 prose-code:bg-zinc-900/60
                          prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                          prose-code:before:content-none prose-code:after:content-none
                          font-noto-bengali"
                      >
                        <ReactMarkdown>{text}</ReactMarkdown>
                        {isMessageStreaming(message) && (
                          <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-400 animate-pulse align-middle" />
                        )}
                      </div>
                    ) : (
                      <span className="font-noto-bengali">{text}</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator — shown when submitted but no streaming content yet */}
            {status === "submitted" && (
              <div className="flex justify-start">
                <div className="bg-zinc-800/60 border border-zinc-700/30 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-typing-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-typing-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-typing-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="px-3 py-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
                {error.message || "Something went wrong. Please try again."}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input Area ── */}
          <div className="flex items-end gap-2 px-4 py-3 border-t border-zinc-800/60 shrink-0">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your campaign..."
              rows={1}
              className="flex-1 resize-none rounded-xl bg-zinc-800/60 border border-zinc-700/40
                text-sm text-white placeholder:text-zinc-500 px-3.5 py-2.5
                focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/40
                transition-colors font-noto-bengali max-h-[100px] overflow-y-auto"
              id="chat-input"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="shrink-0 p-2.5 rounded-xl bg-indigo-600 text-white
                hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed
                transition-all duration-200 cursor-pointer active:scale-95
                shadow-lg shadow-indigo-500/20"
              aria-label="Send message"
              id="chat-send-btn"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════ Floating Toggle Button ═══════════ */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full
          bg-gradient-to-br from-indigo-600 to-purple-600
          flex items-center justify-center
          shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50
          hover:scale-105 active:scale-95
          transition-all duration-300 cursor-pointer
          ${hasUnread ? "animate-chat-pulse" : ""}`}
        aria-label={isOpen ? "Close chat" : "Open chat"}
        id="chat-toggle-btn"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}

        {/* Unread badge */}
        {hasUnread && !isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-zinc-900 animate-pulse" />
        )}
      </button>
    </>
  );
}
