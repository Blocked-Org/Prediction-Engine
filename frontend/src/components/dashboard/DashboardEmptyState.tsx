"use client";

import { useTranslations } from "next-intl";

import type { DashboardStatus } from "@/lib/dashboard";

type DashboardEmptyStateProps = {
  status: DashboardStatus | "error";
};

export function DashboardEmptyState({ status }: DashboardEmptyStateProps) {
  const t = useTranslations("Dashboard");

  if (status === "no_campaign") {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-black tracking-tight text-[#0A0A0A] font-noto-bengali uppercase">
          {t("no_campaign_title")}
        </p>
        <p className="max-w-md text-sm text-[#6B6B6B] font-noto-bengali">
          {t("no_campaign_desc")}
        </p>
      </div>
    );
  }

  if (status === "processing") {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4 text-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-[#0A0A0A] border-t-transparent"
          aria-hidden
        />
        <p className="text-lg font-black tracking-tight text-[#0A0A0A] font-noto-bengali uppercase">
          {t("simulation_processing_title")}
        </p>
        <p className="max-w-md text-sm text-[#6B6B6B] font-noto-bengali">
          {t("simulation_processing_desc")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[320px] items-center justify-center text-[#EF4444] font-noto-bengali font-semibold">
      {t("load_failed")}
    </div>
  );
}
