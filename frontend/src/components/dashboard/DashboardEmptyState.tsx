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
        <p className="text-lg font-semibold font-noto-bengali">
          {t("no_campaign_title")}
        </p>
        <p className="max-w-md text-sm text-muted-foreground font-noto-bengali">
          {t("no_campaign_desc")}
        </p>
      </div>
    );
  }

  if (status === "processing") {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4 text-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden
        />
        <p className="text-lg font-semibold font-noto-bengali">
          {t("simulation_processing_title")}
        </p>
        <p className="max-w-md text-sm text-muted-foreground font-noto-bengali">
          {t("simulation_processing_desc")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[320px] items-center justify-center text-destructive font-noto-bengali">
      {t("load_failed")}
    </div>
  );
}
