"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { MessageCircle, X, Send } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function FloatingBuni() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/buni",
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    sendMessage({ text });
    setInput("");
  };

  // Hide on auth/onboarding pages
  if (
    !pathname ||
    pathname.includes("/sign-in") ||
    pathname.includes("/sign-up") ||
    pathname.includes("/onboarding") ||
    pathname === "/"
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="mb-4 w-80 sm:w-96 bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[500px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/50">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-zinc-800">
                  <Image
                    src="/companion/bunny-happy.webp.webp"
                    alt="Buni"
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-100">Buni Assistant</h3>
                  <p className="text-xs text-green-400">Online ✨</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-zinc-500 mt-10">
                  <p className="text-sm">Hi! I'm Buni. Ask me anything about your simulations! 🐰</p>
                </div>
              )}
              {messages.map((m) => {
                const text = getMessageText(m);
                return (
                  <div
                    key={m.id}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                        m.role === "user"
                          ? "bg-indigo-600 text-white rounded-br-sm"
                          : "bg-zinc-800 text-zinc-200 rounded-bl-sm"
                      }`}
                    >
                      {text}
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800 text-zinc-400 p-3 rounded-2xl rounded-bl-sm text-sm flex gap-1">
                    <span className="animate-bounce">.</span>
                    <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: "0.4s" }}>.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form
              onSubmit={handleSubmit}
              className="p-3 border-t border-zinc-800 bg-zinc-950/50 flex gap-2"
            >
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder="Ask Buni..."
                className="flex-1 bg-zinc-900 border-zinc-700 text-white focus-visible:ring-indigo-500 rounded-full"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="rounded-full bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bunny Toggle */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-20 h-20 group"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-full h-full relative drop-shadow-2xl"
        >
          <Image
            src={isOpen ? "/companion/bunny-happy.webp.webp" : "/companion/bunny-idle.webp.webp"}
            alt="Toggle Chat"
            fill
            className="object-contain"
          />
        </motion.div>
        {!isOpen && (
          <div className="absolute -top-2 -right-2 bg-indigo-500 text-white p-1.5 rounded-full shadow-lg">
            <MessageCircle className="w-4 h-4" />
          </div>
        )}
      </motion.button>
    </div>
  );
}
