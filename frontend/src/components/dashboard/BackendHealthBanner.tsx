"use client";

/**
 * BackendHealthBanner.tsx — Day 6 Integration Component
 *
 * Shows a dismissible banner in the dashboard layout when the FastAPI backend
 * or its dependent services (Neo4j, Redis) are unreachable. Only visible during
 * integration testing — hidden in production once the backend is stable.
 */

import { useBackendHealth } from "@/hooks/useBackendHealth";
import { useEffect, useState } from "react";

export function BackendHealthBanner() {
  const { healthy, services, checking, refresh } = useBackendHealth();
  const [dismissed, setDismissed] = useState(false);

  // Auto-undismiss when status changes to degraded
  useEffect(() => {
    if (healthy === false) setDismissed(false);
  }, [healthy]);

  // Don't render during the initial check or if everything is fine
  if (checking && healthy === null) return null;
  if (healthy === true) return null;
  if (dismissed) return null;

  const degradedServices = Object.entries(services)
    .filter(([, status]) => status === "error")
    .map(([name]) => name);

  const message =
    degradedServices.length > 0
      ? `Backend degraded — services unreachable: ${degradedServices.join(", ")}.`
      : "Backend is unreachable. Start the FastAPI server and Docker services.";

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 rounded-lg border border-[#EF4444]/40 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#EF4444]"
    >
      <div className="flex items-center gap-2">
        {/* Warning icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span>{message}</span>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <button
          onClick={refresh}
          disabled={checking}
          className="rounded px-2 py-1 text-xs font-medium underline-offset-2 hover:underline disabled:opacity-50"
        >
          {checking ? "Checking…" : "Retry"}
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="rounded p-1 hover:bg-[#EF4444]/20"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
