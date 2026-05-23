"use client";

import type { DashboardSimulationData } from "@/lib/dashboard";
import { ChatWidget } from "./ChatWidget";

interface ChatWidgetWrapperProps {
  simulationData: DashboardSimulationData | null;
}

/**
 * Client wrapper that conditionally renders the ChatWidget
 * only when simulation data is available.
 */
export function ChatWidgetWrapper({ simulationData }: ChatWidgetWrapperProps) {
  if (!simulationData) return null;
  return <ChatWidget simulationData={simulationData} />;
}
