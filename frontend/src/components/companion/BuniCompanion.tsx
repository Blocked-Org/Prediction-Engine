"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

export type BuniState = "idle" | "thinking" | "happy" | "confused";

interface BuniCompanionProps {
  state?: BuniState;
  speech?: string;
  className?: string;
}

const stateImages: Record<BuniState, string> = {
  idle: "/companion/bunny-idle.webp.webp",
  thinking: "/companion/bunny-thinking.webp.webp",
  happy: "/companion/bunny-happy.webp.webp",
  confused: "/companion/bunny-confused.webp.webp",
};

export const BuniCompanion: React.FC<BuniCompanionProps> = ({
  state = "idle",
  speech,
  className,
}) => {
  const [displayedSpeech, setDisplayedSpeech] = useState("");

  // Typing effect
  useEffect(() => {
    if (!speech) {
      setDisplayedSpeech("");
      return;
    }
    
    let i = 0;
    setDisplayedSpeech("");
    const timer = setInterval(() => {
      setDisplayedSpeech(speech.slice(0, i));
      i++;
      if (i > speech.length) {
        clearInterval(timer);
      }
    }, 30);

    return () => clearInterval(timer);
  }, [speech]);

  return (
    <div className={cn("relative flex items-end justify-center w-48 h-48", className)}>
      <AnimatePresence>
        {speech && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="absolute bottom-full mb-4 -left-2 sm:left-1/2 sm:-translate-x-1/2 w-max max-w-[calc(100vw-2rem)] sm:max-w-xs bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 p-3 rounded-2xl rounded-bl-sm sm:rounded-bl-2xl sm:rounded-br-sm shadow-xl border border-zinc-200 dark:border-zinc-700 z-10"
          >
            <p className="text-sm font-medium">{displayedSpeech}</p>
            {/* Speech bubble pointer */}
            <div className="absolute -bottom-2 left-6 sm:left-auto sm:right-4 w-4 h-4 bg-white dark:bg-zinc-800 border-b border-r border-zinc-200 dark:border-zinc-700 transform rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        key={state}
        initial={{ opacity: 0.5, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative w-full h-full"
      >
        <Image
          src={stateImages[state]}
          alt={`Buni looking ${state}`}
          fill
          className="object-contain drop-shadow-2xl"
          priority
        />
      </motion.div>
    </div>
  );
};
