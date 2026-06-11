"use client";

import { useState, useRef, useEffect, useCallback } from "react";

import { useAuth, useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Loader2,
  Sparkles,
  Rocket,
  Send,
  ChevronRight,
} from "lucide-react";

import { completeOnboarding } from "@/actions/onboarding";
import {
  AGE_RANGES,
  GENDERS,
  INTERESTS,
  simulationInitDemoPreset,
  type SimulationWizardInput,
} from "@/schemas/simulation";
import type { SimulationRequest } from "@/lib/types/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

/* ────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

type MessageRole = "buni" | "user";

/** Keys for the profile phase (before campaign data). */
type ProfileFieldKey = "nickname" | "businessType" | "experienceLevel";

interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  inputType?: "none" | "yesno" | "number" | "select" | "text" | "submit";
  selectOptions?: readonly string[];
  selectLabels?: Record<string, string>;
  fieldKey?: keyof SimulationWizardInput;
  /** Field key used during the profile-gathering phase. */
  profileKey?: ProfileFieldKey;
  answered?: boolean;
}

type BuniMood = "idle" | "happy" | "thinking" | "confused";

export interface OnboardingProfile {
  nickname: string;
  businessType: string;
  experienceLevel: string;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Constants                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

const BUSINESS_TYPES = [
  "E-commerce",
  "F-commerce",
  "SaaS",
  "Restaurant/Food",
  "Fashion",
  "Education",
  "Other",
] as const;

const EXPERIENCE_LEVELS = ["beginner", "intermediate", "expert"] as const;

const buniImages: Record<BuniMood, string> = {
  idle: "/companion/bunny-idle.webp.webp",
  happy: "/companion/bunny-happy.webp.webp",
  thinking: "/companion/bunny-thinking.webp.webp",
  confused: "/companion/bunny-confused.webp.webp",
};

/* ────────────────────────────────────────────────────────────────────────── */
/*  Component                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

export function ConversationalOnboarding({ locale }: { locale: string }) {

  const { userId, isLoaded, getToken } = useAuth();
  const { user } = useUser();
  const t = useTranslations("Onboarding");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [, setCurrentStep] = useState(0);
  const [hasPreviousCampaign, setHasPreviousCampaign] = useState<
    boolean | null
  >(null);
  const [formData, setFormData] = useState<Partial<SimulationWizardInput>>({});
  const [profileData, setProfileData] = useState<Partial<OnboardingProfile>>({});
  /** Tracks whether the 3 profile questions have been completed. */
  const [profilePhaseComplete, setProfilePhaseComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [buniMood, setBuniMood] = useState<BuniMood>("idle");
  const [isTyping, setIsTyping] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [numberInput, setNumberInput] = useState("");
  const [textInput, setTextInput] = useState("");

  /* ── Scroll to bottom ─────────────────────────────────────────────────── */
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  /* ── Build the profile question flow (Phase 1) ──────────────────────── */
  const getProfileFlow = useCallback((): ChatMessage[] => [
    {
      id: "p-welcome",
      role: "buni",
      text: t("q_nickname"),
      inputType: "text",
      profileKey: "nickname",
    },
    {
      id: "p-business",
      role: "buni",
      text: "", // filled dynamically with user's name
      inputType: "select",
      selectOptions: BUSINESS_TYPES,
      profileKey: "businessType",
    },
    {
      id: "p-experience",
      role: "buni",
      text: t("q_experience"),
      inputType: "select",
      selectOptions: EXPERIENCE_LEVELS,
      selectLabels: {
        beginner: t("exp_beginner"),
        intermediate: t("exp_intermediate"),
        expert: t("exp_expert"),
      },
      profileKey: "experienceLevel",
    },
  ], [t]);

  /* ── Build the campaign question flow (Phase 2) ────────────────────── */
  const getQuestionFlow = useCallback(
    (hasExperience: boolean | null): ChatMessage[] => {
      const name = profileData.nickname || "";
      const flow: ChatMessage[] = [
        {
          id: "welcome",
          role: "buni",
          text: t("greeting_transition", { name }),
          inputType: "yesno",
        },
      ];

      if (hasExperience === null) return flow;

      if (hasExperience) {
        flow.push(
          { id: "user-yes", role: "user", text: t("answer_yes"), answered: true },
          {
            id: "excited",
            role: "buni",
            text: t("excited_response"),
            inputType: "none",
          },
          {
            id: "q-impressions",
            role: "buni",
            text: t("q_impressions"),
            inputType: "number",
            fieldKey: "Impressions",
          },
          {
            id: "q-clicks",
            role: "buni",
            text: t("q_clicks"),
            inputType: "number",
            fieldKey: "Clicks",
          },
          {
            id: "q-spend-meta",
            role: "buni",
            text: t("q_spend_meta"),
            inputType: "number",
            fieldKey: "spend_meta",
          },
          {
            id: "q-spend-google",
            role: "buni",
            text: t("q_spend_google"),
            inputType: "number",
            fieldKey: "spend_google",
          },
          {
            id: "q-spend-tiktok",
            role: "buni",
            text: t("q_spend_tiktok"),
            inputType: "number",
            fieldKey: "spend_tiktok",
          },
          {
            id: "q-revenue",
            role: "buni",
            text: t("q_revenue"),
            inputType: "number",
            fieldKey: "revenue",
          },
          {
            id: "q-conversions",
            role: "buni",
            text: t("q_conversions"),
            inputType: "number",
            fieldKey: "Total_Conversion",
          },
          {
            id: "q-age",
            role: "buni",
            text: t("q_age"),
            inputType: "select",
            selectOptions: AGE_RANGES,
            fieldKey: "age",
          },
          {
            id: "q-gender",
            role: "buni",
            text: t("q_gender"),
            inputType: "select",
            selectOptions: GENDERS,
            selectLabels: { M: t("male"), F: t("female") },
            fieldKey: "gender",
          },
          {
            id: "q-interest",
            role: "buni",
            text: t("q_interest"),
            inputType: "select",
            selectOptions: INTERESTS,
            fieldKey: "interest",
          },
          {
            id: "q-urls",
            role: "buni",
            text: t("q_competitor_urls"),
            inputType: "text",
            fieldKey: "competitor_urls",
          },
          {
            id: "ready",
            role: "buni",
            text: t("ready_to_launch"),
            inputType: "submit",
          }
        );
      } else {
        flow.push(
          { id: "user-no", role: "user", text: t("answer_no"), answered: true },
          {
            id: "encourage",
            role: "buni",
            text: t("encourage_response"),
            inputType: "none",
          },
          {
            id: "demo-notice",
            role: "buni",
            text: t("demo_notice"),
            inputType: "none",
          },
          {
            id: "q-age-new",
            role: "buni",
            text: t("q_age"),
            inputType: "select",
            selectOptions: AGE_RANGES,
            fieldKey: "age",
          },
          {
            id: "q-gender-new",
            role: "buni",
            text: t("q_gender"),
            inputType: "select",
            selectOptions: GENDERS,
            selectLabels: { M: t("male"), F: t("female") },
            fieldKey: "gender",
          },
          {
            id: "q-interest-new",
            role: "buni",
            text: t("q_interest"),
            inputType: "select",
            selectOptions: INTERESTS,
            fieldKey: "interest",
          },
          {
            id: "q-urls-new",
            role: "buni",
            text: t("q_competitor_urls_optional"),
            inputType: "text",
            fieldKey: "competitor_urls",
          },
          {
            id: "ready-new",
            role: "buni",
            text: t("ready_to_launch"),
            inputType: "submit",
          }
        );
      }

      return flow;
    },
    [t, profileData.nickname]
  );

  /* ── Initialize first message (profile phase) ────────────────────────── */
  useEffect(() => {
    let mounted = true;
    if (messages.length === 0) {
      const profileFlow = getProfileFlow();
      setBuniMood("happy");
      setIsTyping(true);

      const initFlow = async () => {
        await sleep(800);
        if (!mounted) return;
        setMessages((prev) => prev.length === 0 ? [profileFlow[0]] : prev);
        setCurrentStep(1);
        setIsTyping(false);
      };
      initFlow();
    }
    return () => { mounted = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Advance to next question ─────────────────────────────────────────── */
  const advanceToNext = useCallback(
    async (
      userAnswer: string,
      updatedFormData: Partial<SimulationWizardInput>,
      experience: boolean | null
    ) => {
      const flow = getQuestionFlow(experience);

      // Find the current buni question index by matching the last shown buni message
      const buniQuestions = flow.filter((m) => m.role === "buni");
      const lastShownBuni = [...messages].reverse().find((m) => m.role === "buni");

      // Add user answer
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        text: userAnswer,
        answered: true,
      };

      setMessages((prev) => [...prev, userMsg]);
      scrollToBottom();

      // Find position of the last-shown buni message in the flow, then advance past it
      const currentBuniIdx = lastShownBuni
        ? buniQuestions.findIndex((q) => q.id === lastShownBuni.id)
        : -1;
      const nextBuniQuestions = buniQuestions.slice(currentBuniIdx + 1);

      if (nextBuniQuestions.length === 0) return;

      // Show typing, then add next buni messages
      setBuniMood("thinking");
      setIsTyping(true);

      // Some steps have consecutive buni messages (e.g. excited + question)
      const toAdd: ChatMessage[] = [];
      for (const q of nextBuniQuestions) {
        toAdd.push(q);
        if (q.inputType !== "none") break;
      }

      for (const msg of toAdd) {
        await sleep(600);
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
      }

      setIsTyping(false);
      setBuniMood(
        toAdd[toAdd.length - 1].inputType === "submit" ? "happy" : "idle"
      );
      setTimeout(() => inputRef.current?.focus(), 200);
      setCurrentStep((s) => s + toAdd.length);
    },
    [messages, getQuestionFlow, scrollToBottom]
  );

  /* ── Handle profile phase answers ─────────────────────────────────────── */
  const handleProfileTextSubmit = async () => {
    const val = textInput.trim();
    if (!val) return;

    const lastBuniMsg = [...messages]
      .reverse()
      .find((m) => m.role === "buni" && m.profileKey);
    if (!lastBuniMsg?.profileKey) return;

    const updated = { ...profileData, [lastBuniMsg.profileKey]: val };
    setProfileData(updated);
    setTextInput("");

    // Add user response bubble
    const userMsg: ChatMessage = {
      id: `user-profile-${lastBuniMsg.profileKey}`,
      role: "user",
      text: val,
      answered: true,
    };
    setMessages((prev) => [...prev, userMsg]);
    scrollToBottom();

    // Advance to next profile question
    await advanceProfilePhase(updated);
  };

  const handleProfileSelectSubmit = async (value: string) => {
    const lastBuniMsg = [...messages]
      .reverse()
      .find((m) => m.role === "buni" && m.profileKey);
    if (!lastBuniMsg?.profileKey) return;

    const updated = { ...profileData, [lastBuniMsg.profileKey]: value };
    setProfileData(updated);

    const displayLabel = lastBuniMsg.selectLabels?.[value] ?? value;

    const userMsg: ChatMessage = {
      id: `user-profile-${lastBuniMsg.profileKey}`,
      role: "user",
      text: displayLabel,
      answered: true,
    };
    setMessages((prev) => [...prev, userMsg]);
    scrollToBottom();

    await advanceProfilePhase(updated);
  };

  const advanceProfilePhase = async (updated: Partial<OnboardingProfile>) => {
    const profileFlow = getProfileFlow();
    const profileKeys: ProfileFieldKey[] = ["nickname", "businessType", "experienceLevel"];
    const answeredCount = profileKeys.filter((k) => updated[k]).length;

    setBuniMood("thinking");
    setIsTyping(true);

    if (answeredCount < profileKeys.length) {
      // Show next profile question
      const nextQ = { ...profileFlow[answeredCount] };
      // Personalise the business-type question with the user's name
      if (nextQ.profileKey === "businessType" && updated.nickname) {
        nextQ.text = t("q_business_type", { name: updated.nickname });
      }
      await sleep(600);
      setMessages((prev) => [...prev, nextQ]);
      setIsTyping(false);
      setBuniMood("happy");
      setTimeout(() => inputRef.current?.focus(), 200);
    } else {
      // Profile phase complete → transition to campaign questions
      setProfilePhaseComplete(true);
      setBuniMood("happy");

      await sleep(600);
      const flow = getQuestionFlow(null);
      setMessages((prev) => [...prev, flow[0]]);
      setIsTyping(false);
      setBuniMood("idle");
    }
  };

  /* ── Handle yes/no ────────────────────────────────────────────────────── */
  const handleYesNo = async (answer: boolean) => {
    setHasPreviousCampaign(answer);

    if (answer) {
      setBuniMood("happy");
      // User said yes
      const userMsg: ChatMessage = {
        id: "user-yes",
        role: "user",
        text: t("answer_yes"),
        answered: true,
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      const flow = getQuestionFlow(true);
      // Add "excited" + first question
      const toAdd = flow.filter(
        (m) => m.role === "buni" && m.id !== "welcome"
      );

      const batch = toAdd.slice(0, 2); // "excited" + first question
      for (const msg of batch) {
        await sleep(600);
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
      }

      setIsTyping(false);
      setBuniMood("idle");
      setTimeout(() => inputRef.current?.focus(), 200);
      setCurrentStep(3);
    } else {
      // User said no — use demo preset for numeric fields
      const demoData: Partial<SimulationWizardInput> = {
        Impressions: simulationInitDemoPreset.Impressions,
        Clicks: simulationInitDemoPreset.Clicks,
        spend_meta: simulationInitDemoPreset.spend_meta,
        spend_google: simulationInitDemoPreset.spend_google,
        spend_tiktok: simulationInitDemoPreset.spend_tiktok,
        Total_Conversion: simulationInitDemoPreset.Total_Conversion,
        revenue: simulationInitDemoPreset.revenue,
      };
      setFormData(demoData);
      setBuniMood("idle");

      const userMsg: ChatMessage = {
        id: "user-no",
        role: "user",
        text: t("answer_no"),
        answered: true,
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      const flow = getQuestionFlow(false);
      const toAdd = flow.filter(
        (m) => m.role === "buni" && m.id !== "welcome"
      );

      // Add "encourage" + "demo-notice" + first question (age)
      const batch = toAdd.slice(0, 3);
      for (const msg of batch) {
        await sleep(600);
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
      }

      setIsTyping(false);
      setBuniMood("idle");
      setCurrentStep(4);
    }
  };

  /* ── Handle number input ──────────────────────────────────────────────── */
  const handleNumberSubmit = () => {
    const val = parseFloat(numberInput);
    if (isNaN(val) || val < 0) return;

    const lastBuniMsg = [...messages]
      .reverse()
      .find((m) => m.role === "buni" && m.fieldKey);
    if (!lastBuniMsg?.fieldKey) return;

    const updated = { ...formData, [lastBuniMsg.fieldKey]: val };
    setFormData(updated);
    setNumberInput("");

    const displayVal =
      lastBuniMsg.fieldKey.startsWith("spend_") ||
      lastBuniMsg.fieldKey === "revenue"
        ? `৳${val.toLocaleString()}`
        : val.toLocaleString();

    advanceToNext(displayVal, updated, hasPreviousCampaign);
  };

  /* ── Handle select input ──────────────────────────────────────────────── */
  const handleSelectSubmit = (value: string) => {
    const lastBuniMsg = [...messages]
      .reverse()
      .find((m) => m.role === "buni" && m.fieldKey);
    if (!lastBuniMsg?.fieldKey) return;

    const updated = { ...formData, [lastBuniMsg.fieldKey]: value };
    setFormData(updated);

    const displayLabel =
      lastBuniMsg.selectLabels?.[value] ?? value;

    advanceToNext(displayLabel, updated, hasPreviousCampaign);
  };

  /* ── Handle text input ────────────────────────────────────────────────── */
  const handleTextSubmit = () => {
    const val = textInput.trim();
    const lastBuniMsg = [...messages]
      .reverse()
      .find((m) => m.role === "buni" && m.fieldKey);
    if (!lastBuniMsg?.fieldKey) return;

    const updated = { ...formData, [lastBuniMsg.fieldKey]: val || "" };
    setFormData(updated);
    setTextInput("");

    advanceToNext(val || t("skipped"), updated, hasPreviousCampaign);
  };

  /* ── Handle demo preset fill ──────────────────────────────────────────── */
  const handleDemoPreset = async () => {
    setFormData(simulationInitDemoPreset);
    setBuniMood("happy");

    const userMsg: ChatMessage = {
      id: `user-demo-${Date.now()}`,
      role: "user",
      text: "✨ " + t("demo_loaded"),
      answered: true,
    };

    // Clear and jump to submit
    setMessages((prev) => [
      ...prev,
      userMsg,
    ]);

    setIsTyping(true);
    await sleep(800);
    
    const readyMsg: ChatMessage = {
      id: "ready-demo",
      role: "buni",
      text: t("demo_preset_ready"),
      inputType: "submit",
    };
    setMessages((prev) => [...prev, readyMsg]);
    setIsTyping(false);
    setBuniMood("happy");
    scrollToBottom();
  };

  /* ── Handle final submit ──────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!isLoaded || !userId) {
      setSubmitError(t("auth_error"));
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setBuniMood("thinking");

    const finalData = formData as SimulationWizardInput;

    const competitorUrlList = finalData.competitor_urls
      ? finalData.competitor_urls
          .split(",")
          .map((u) => {
            const trimmed = u.trim();
            if (!trimmed) return "";
            if (/^https?:\/\//i.test(trimmed)) return trimmed;
            return `https://${trimmed}`;
          })
          .filter((u) => u.length > 0)
      : [];

    const payload: SimulationRequest = {
      clerk_user_id: userId,
      endogenous: {
        Impressions: finalData.Impressions ?? 0,
        Clicks: finalData.Clicks ?? 0,
        spend_meta: finalData.spend_meta ?? 0,
        spend_google: finalData.spend_google ?? 0,
        spend_tiktok: finalData.spend_tiktok ?? 0,
      },
      transactional: {
        Total_Conversion: finalData.Total_Conversion ?? 0,
        revenue: finalData.revenue ?? 0,
      },
      audience: {
        age: finalData.age ?? "25-29",
        gender: finalData.gender ?? "M",
        interest: finalData.interest ?? "Tech",
      },
      ...(competitorUrlList.length > 0 && {
        exogenous: { competitor_urls: competitorUrlList },
      }),
    };

    // Build profile for Clerk metadata
    const profile: OnboardingProfile = {
      nickname: profileData.nickname || "",
      businessType: profileData.businessType || "",
      experienceLevel: profileData.experienceLevel || "",
    };

    try {
      // Get a fresh JWT from the client-side Clerk SDK (auto-refreshes).
      // The server-side cookie may hold a stale token if the user spent
      // several minutes answering onboarding questions.
      const freshToken = await getToken();
      const result = await completeOnboarding(locale, payload, profile, freshToken ?? undefined);
      if (result.success) {
        setBuniMood("happy");
        const successMsg: ChatMessage = {
          id: "success",
          role: "buni",
          text: t("launch_success"),
          inputType: "none",
        };
        setMessages((prev) => [...prev, successMsg]);

        await user?.reload();
        setTimeout(() => {
          window.location.assign(`/${locale}/dashboard`);
        }, 1500);
      } else {
        setSubmitError(result.error);
        setBuniMood("confused");
        setIsSubmitting(false);
      }
    } catch {
      setSubmitError(t("connection_error"));
      setBuniMood("confused");
      setIsSubmitting(false);
    }
  };

  /* ── Get last interactive message ─────────────────────────────────────── */
  const lastBuniMsg = [...messages].reverse().find((m) => m.role === "buni");
  const activeInputType = lastBuniMsg?.inputType ?? "none";
  const isProfilePhase = !profilePhaseComplete && !!lastBuniMsg?.profileKey;
  const showNumberInput = activeInputType === "number" && !lastBuniMsg?.answered && !isProfilePhase;
  const showSelectInput = activeInputType === "select" && !lastBuniMsg?.answered && !isProfilePhase;
  const showTextInput = activeInputType === "text" && !lastBuniMsg?.answered && !isProfilePhase;
  const showYesNo = activeInputType === "yesno" && !lastBuniMsg?.answered;
  const showSubmit = activeInputType === "submit" && !lastBuniMsg?.answered;
  // Profile phase inputs
  const showProfileTextInput = isProfilePhase && activeInputType === "text" && !lastBuniMsg?.answered;
  const showProfileSelectInput = isProfilePhase && activeInputType === "select" && !lastBuniMsg?.answered;

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto">
      {/* Buni Avatar */}
      <div className="flex justify-center mb-4">
        <motion.div
          key={buniMood}
          initial={{ opacity: 0.5, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-28 h-28"
        >
          <Image
            src={buniImages[buniMood]}
            alt="Buni"
            fill
            className="object-contain drop-shadow-2xl"
            priority
          />
        </motion.div>
      </div>

      {/* Chat Container */}
      <div className="relative bg-zinc-900/50 backdrop-blur-2xl border border-zinc-800/60 rounded-3xl shadow-[0_0_80px_rgba(99,102,241,0.08)] overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute -top-32 -right-32 w-72 h-72 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-72 h-72 bg-purple-500/8 rounded-full blur-[100px] pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-zinc-800">
              <Image
                src={buniImages.happy}
                alt="Buni"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Buni
              </h2>
              <p className="text-[10px] text-emerald-400 font-medium">
                {t("online")} ✨
              </p>
            </div>
          </div>

          {/* Demo Preset Button */}
          <Button
            type="button"
            size="sm"
            onClick={handleDemoPreset}
            disabled={isSubmitting}
            className="rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 text-amber-400 border border-amber-500/20 px-4 h-8 text-[10px] uppercase tracking-wider font-bold transition-all"
          >
            <Sparkles className="w-3 h-3 mr-1 animate-pulse" />
            {t("demo_preset")}
          </Button>
        </div>

        {/* Messages */}
        <div className="relative z-10 flex flex-col justify-end gap-3 p-5 min-h-[450px] max-h-[600px] overflow-y-auto scroll-smooth">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex animate-fade-in-up ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed font-noto-bengali ${
                    msg.role === "user"
                      ? "bg-indigo-600/80 text-white rounded-2xl rounded-br-md shadow-lg shadow-indigo-500/10"
                      : "bg-zinc-800/60 text-zinc-100 rounded-2xl rounded-bl-md border border-zinc-700/30"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-zinc-800/60 border border-zinc-700/30 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="relative z-10 border-t border-zinc-800/60 px-5 py-4 bg-zinc-950/30">
          {/* Error */}
          {submitError && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 mb-3"
            >
              {submitError}
            </motion.p>
          )}

          {/* Yes/No buttons */}
          {showYesNo && !isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <Button
                onClick={() => handleYesNo(true)}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 text-sm transition-all shadow-lg shadow-emerald-500/15"
              >
                ✅ {t("answer_yes")}
              </Button>
              <Button
                onClick={() => handleYesNo(false)}
                className="flex-1 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white font-bold h-12 text-sm transition-all"
              >
                {t("answer_no")}
              </Button>
            </motion.div>
          )}

          {/* Number input */}
          {showNumberInput && !isTyping && (
            <motion.form
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={(e) => {
                e.preventDefault();
                handleNumberSubmit();
              }}
              className="flex gap-2"
            >
              <Input
                ref={inputRef}
                type="number"
                step="any"
                min="0"
                value={numberInput}
                onChange={(e) => setNumberInput(e.target.value)}
                placeholder={t("type_number")}
                className="flex-1 bg-zinc-800/60 border-zinc-700/40 text-white placeholder:text-zinc-500 rounded-xl h-12 font-mono focus-visible:ring-indigo-500/50"
                autoFocus
              />
              <Button
                type="submit"
                disabled={!numberInput || parseFloat(numberInput) < 0}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white h-12 px-5 shadow-lg shadow-indigo-500/20"
              >
                <Send className="w-4 h-4" />
              </Button>
            </motion.form>
          )}

          {/* Select input */}
          {showSelectInput && !isTyping && lastBuniMsg?.selectOptions && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-2"
            >
              {lastBuniMsg.selectOptions.map((opt) => (
                <Button
                  key={opt}
                  onClick={() => handleSelectSubmit(opt)}
                  className="rounded-xl bg-zinc-800/80 hover:bg-indigo-600/80 text-zinc-200 hover:text-white border border-zinc-700/40 hover:border-indigo-500/40 h-10 px-4 text-sm font-medium transition-all"
                >
                  {lastBuniMsg.selectLabels?.[opt] ?? opt}
                </Button>
              ))}
            </motion.div>
          )}

          {/* Text input */}
          {showTextInput && !isTyping && (
            <motion.form
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={(e) => {
                e.preventDefault();
                handleTextSubmit();
              }}
              className="flex gap-2"
            >
              <Input
                ref={inputRef}
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={t("type_urls")}
                className="flex-1 bg-zinc-800/60 border-zinc-700/40 text-white placeholder:text-zinc-500 rounded-xl h-12 font-mono focus-visible:ring-indigo-500/50"
                autoFocus
              />
              <Button
                type="submit"
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white h-12 px-5 shadow-lg shadow-indigo-500/20"
              >
                <Send className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                onClick={handleTextSubmit}
                variant="ghost"
                className="rounded-xl text-zinc-400 hover:text-white h-12 px-3 text-xs"
              >
                {t("skip")}
              </Button>
            </motion.form>
          )}

          {/* Profile phase — text input (nickname) */}
          {showProfileTextInput && !isTyping && (
            <motion.form
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={(e) => {
                e.preventDefault();
                handleProfileTextSubmit();
              }}
              className="flex gap-2"
            >
              <Input
                ref={inputRef}
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={t("q_nickname_placeholder")}
                className="flex-1 bg-zinc-800/60 border-zinc-700/40 text-white placeholder:text-zinc-500 rounded-xl h-12 focus-visible:ring-indigo-500/50"
                autoFocus
              />
              <Button
                type="submit"
                disabled={!textInput.trim()}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white h-12 px-5 shadow-lg shadow-indigo-500/20"
              >
                <Send className="w-4 h-4" />
              </Button>
            </motion.form>
          )}

          {/* Profile phase — select input (business type, experience) */}
          {showProfileSelectInput && !isTyping && lastBuniMsg?.selectOptions && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-2"
            >
              {lastBuniMsg.selectOptions.map((opt) => (
                <Button
                  key={opt}
                  onClick={() => handleProfileSelectSubmit(opt)}
                  className="rounded-xl bg-zinc-800/80 hover:bg-indigo-600/80 text-zinc-200 hover:text-white border border-zinc-700/40 hover:border-indigo-500/40 h-10 px-4 text-sm font-medium transition-all"
                >
                  {lastBuniMsg.selectLabels?.[opt] ?? opt}
                </Button>
              ))}
            </motion.div>
          )}

          {/* Submit/Launch button */}
          {showSubmit && !isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !isLoaded || !userId}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 hover:opacity-90 text-white font-bold shadow-xl shadow-indigo-500/25 h-14 text-base flex items-center justify-center gap-2 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t("launching")}
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5" />
                    {t("launch_button")}
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* Idle state (waiting for Buni) */}
          {activeInputType === "none" && !isTyping && !isSubmitting && (
            <div className="flex items-center justify-center py-2">
              <div className="flex items-center gap-2 text-zinc-500 text-xs">
                <ChevronRight className="w-3 h-3 animate-pulse" />
                <span>{t("buni_typing")}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {isSubmitting && <LoadingOverlay absolute />}
    </div>
  );
}
