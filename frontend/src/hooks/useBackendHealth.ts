/**
 * useBackendHealth.ts — Day 6 Integration Hook
 *
 * Polls the FastAPI /health endpoint to verify backend connectivity.
 * Returns a simple status so the UI can surface a banner when Dev B's
 * backend is unreachable during integration testing.
 *
 * Usage:
 *   const { healthy, services, checking } = useBackendHealth();
 */

"use client";

import { useState, useEffect, useCallback } from "react";

export type ServiceStatus = "ok" | "error" | "unknown";

export type BackendHealthState = {
  /** Overall system health */
  healthy: boolean | null;
  /** Per-service breakdown (neo4j, redis, etc.) */
  services: Record<string, ServiceStatus>;
  /** True while the fetch is in flight */
  checking: boolean;
  /** Re-trigger a manual health check */
  refresh: () => void;
};

/**
 * Hits the internal Next.js health-check proxy at /api/health,
 * which forwards to the FastAPI /health endpoint.
 * Falls back gracefully if the backend is unreachable.
 */
export function useBackendHealth(
  autoRefreshMs: number = 0 // 0 = no auto-refresh by default
): BackendHealthState {
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [services, setServices] = useState<Record<string, ServiceStatus>>({});
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const data = await res.json();
      const ok = data?.status === "ok";
      setHealthy(ok);
      setServices(data?.services ?? {});
    } catch {
      setHealthy(false);
      setServices({});
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
    if (autoRefreshMs > 0) {
      const interval = setInterval(check, autoRefreshMs);
      return () => clearInterval(interval);
    }
  }, [check, autoRefreshMs]);

  return { healthy, services, checking, refresh: check };
}
