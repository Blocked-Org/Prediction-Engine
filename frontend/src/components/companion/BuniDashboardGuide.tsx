"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { X, ChevronRight, ChevronLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ────────────────────────────────────────────────────────────────────────── */
/*  Constants                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

const GUIDE_STORAGE_KEY = "buni-dashboard-guide-seen";

interface GuideStep {
  key: string;
  sectionId: string;
}

const GUIDE_STEPS: GuideStep[] = [
  { key: "kpi_cards", sectionId: "dashboard-kpi-section" },
  { key: "recommendations", sectionId: "dashboard-recommendations-section" },
  { key: "performance_chart", sectionId: "dashboard-performance-section" },
  { key: "data_table", sectionId: "dashboard-table-section" },
  { key: "system_status", sectionId: "dashboard-status-section" },
];

/* ────────────────────────────────────────────────────────────────────────── */
/*  Component                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

export function BuniDashboardGuide() {
  const t = useTranslations("BuniGuide");
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const seen = localStorage.getItem(GUIDE_STORAGE_KEY);
    if (!seen) {
      // Auto-start on first visit after a short delay
      const timer = setTimeout(() => setIsActive(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  /* ── Scroll to & highlight the current section ────────────────────────── */
  useEffect(() => {
    if (!isActive || !mounted) return;

    const step = GUIDE_STEPS[stepIndex];
    const el = document.getElementById(step.sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("buni-guide-highlight");
    }

    return () => {
      // Remove highlight from all sections
      GUIDE_STEPS.forEach((s) => {
        const section = document.getElementById(s.sectionId);
        section?.classList.remove("buni-guide-highlight");
      });
    };
  }, [isActive, stepIndex, mounted]);

  const handleNext = useCallback(() => {
    if (stepIndex < GUIDE_STEPS.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      handleDismiss();
    }
  }, [stepIndex]);

  const handlePrev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleDismiss = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(GUIDE_STORAGE_KEY, "true");
    // Remove all highlights
    GUIDE_STEPS.forEach((s) => {
      const el = document.getElementById(s.sectionId);
      el?.classList.remove("buni-guide-highlight");
    });
  }, []);

  if (!mounted || !isActive) return null;

  const currentStep = GUIDE_STEPS[stepIndex];
  const isLast = stepIndex === GUIDE_STEPS.length - 1;

  return (
    <>
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] pointer-events-auto"
        onClick={handleDismiss}
      />

      {/* Guide popup */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[70] w-[440px] max-w-[calc(100vw-2rem)]"
        >
          <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl shadow-2xl shadow-indigo-500/10 overflow-hidden">
            {/* Header with Buni */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800/60">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                <Image
                  src="/companion/bunny-happy.webp.webp"
                  alt="Buni"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">
                    {t("title")}
                  </h3>
                  <span className="text-[10px] text-zinc-400 font-medium">
                    {stepIndex + 1}/{GUIDE_STEPS.length}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-1.5 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${((stepIndex + 1) / GUIDE_STEPS.length) * 100}%`,
                    }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                aria-label="Close guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-4">
              <p className="text-sm text-zinc-100 leading-relaxed font-noto-bengali">
                {t(`steps.${currentStep.key}`)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800/60 bg-zinc-950/30">
              <Button
                size="sm"
                variant="ghost"
                onClick={handlePrev}
                disabled={stepIndex === 0}
                className="text-zinc-400 hover:text-white rounded-lg h-8 px-3 text-xs"
              >
                <ChevronLeft className="w-3 h-3 mr-1" />
                {t("prev")}
              </Button>

              <Button
                size="sm"
                onClick={handleNext}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white h-8 px-4 text-xs font-bold shadow-lg shadow-indigo-500/20"
              >
                {isLast ? t("done") : t("next")}
                {!isLast && <ChevronRight className="w-3 h-3 ml-1" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  "Show Guide Again" Button — to be placed in the sidebar                  */
/* ────────────────────────────────────────────────────────────────────────── */

export function ShowGuideAgainButton() {
  const t = useTranslations("BuniGuide");

  const handleClick = () => {
    localStorage.removeItem(GUIDE_STORAGE_KEY);
    window.location.reload();
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors group"
    >
      <RotateCcw className="w-3.5 h-3.5 group-hover:rotate-[-180deg] transition-transform duration-500" />
      <span className="font-medium">{t("show_again")}</span>
    </button>
  );
}
