/**
 * useTaskPoller.ts — Day 6 Integration Hook
 *
 * Polls /api/simulate/:taskId every `intervalMs` milliseconds until the
 * Celery task resolves to SUCCESS or FAILURE. Accepts an onSuccess and
 * onError callback so any component can react without coupling to routing.
 *
 * Usage:
 *   const { status, result, error } = useTaskPoller(taskId, {
 *     onSuccess: (result) => router.push('/dashboard'),
 *     onError:   (err)    => toast.error(err),
 *   });
 */

"use client";

import { useState, useEffect, useRef } from "react";

export type TaskState = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILURE" | "idle";

export type TaskPollerOptions = {
  /** Called once when the backend task reaches SUCCESS state. */
  onSuccess?: (result: unknown) => void;
  /** Called once when the backend task reaches FAILURE state. */
  onError?: (error: string) => void;
  /** How often to poll in ms. Defaults to 2000ms. */
  intervalMs?: number;
  /** Stop polling after this many ms regardless of state. Defaults to 5 minutes. */
  timeoutMs?: number;
};

export type TaskPollerReturn = {
  status: TaskState;
  result: unknown;
  error: string | null;
  /** Manually stop polling (e.g. component unmount cleanup) */
  stop: () => void;
};

/**
 * Polls the Next.js proxy route `/api/simulate/${taskId}` which in turn
 * polls the FastAPI `/api/v1/task/${taskId}` endpoint.
 */
export function useTaskPoller(
  taskId: string | null,
  options: TaskPollerOptions = {}
): TaskPollerReturn {
  const { intervalMs = 2000, timeoutMs = 5 * 60 * 1000, onSuccess, onError } = options;

  const [status, setStatus] = useState<TaskState>("idle");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  // Use refs for callbacks to avoid re-triggering the effect when they change
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const isActiveRef = useRef(false);

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isActiveRef.current = false;
  };

  useEffect(() => {
    if (!taskId) {
      setStatus("idle");
      return;
    }

    setStatus("PENDING");
    setResult(null);
    setError(null);
    startTimeRef.current = Date.now();
    isActiveRef.current = true;

    const poll = async () => {
      if (!isActiveRef.current) return;

      // Timeout guard
      if (Date.now() - startTimeRef.current > timeoutMs) {
        setError("Simulation timed out. Please try again.");
        setStatus("FAILURE");
        onErrorRef.current?.("Simulation timed out. Please try again.");
        stop();
        return;
      }

      try {
        const res = await fetch(`/api/simulate/${taskId}`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Backend error ${res.status}: ${text}`);
        }
        const data = await res.json();

        if (data.status === "SUCCESS") {
          setStatus("SUCCESS");
          setResult(data.result);
          onSuccessRef.current?.(data.result);
          stop();
        } else if (data.status === "FAILURE") {
          const errMsg = data.error ?? "Simulation failed.";
          setStatus("FAILURE");
          setError(errMsg);
          onErrorRef.current?.(errMsg);
          stop();
        } else {
          // PENDING / STARTED / RETRY — keep polling
          setStatus("PROCESSING");
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Polling error";
        setError(errMsg);
        setStatus("FAILURE");
        onErrorRef.current?.(errMsg);
        stop();
      }
    };

    // Kick off immediately, then every intervalMs
    poll();
    intervalRef.current = setInterval(poll, intervalMs);

    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, intervalMs, timeoutMs]);

  return { status, result, error, stop };
}
