"""
Lightweight async API benchmark for the Brand Simulation Engine.

Fires 10–20 concurrent requests against the /api/v1/simulate (async)
and /api/v1/simulate/results (sync) endpoints, then reports:
  - Average latency
  - 95th-percentile latency
  - Error rate

Requires:
    pip install httpx

Usage:
    python -m scripts.benchmark_api                    # defaults
    python -m scripts.benchmark_api --url http://HOST:PORT --concurrency 20
"""

from __future__ import annotations

import argparse
import asyncio
import json
import statistics
import sys
import time
from dataclasses import dataclass, field

import httpx


# ── Default payload (matches SimulationRequest schema) ───────────────────
DEFAULT_SIMULATE_PAYLOAD: dict = {
    "Impressions": 45_000.0,
    "Clicks": 1_125,
    "Spent": 15_000.0,
    "Total_Conversion": 22,
    "age": "25-29",
    "gender": "M",
    "interest": "Travel",
}

# Sync dashboard endpoint uses a clerk_user_id path param
DEFAULT_CLERK_USER_ID = "demo_clerk_user_001"


@dataclass
class BenchmarkResult:
    """Aggregated statistics for a single endpoint benchmark."""

    endpoint: str
    total_requests: int = 0
    success_count: int = 0
    error_count: int = 0
    latencies_ms: list[float] = field(default_factory=list)

    @property
    def error_rate(self) -> float:
        return self.error_count / max(self.total_requests, 1)

    @property
    def avg_latency_ms(self) -> float:
        return statistics.mean(self.latencies_ms) if self.latencies_ms else 0.0

    @property
    def p95_latency_ms(self) -> float:
        if not self.latencies_ms:
            return 0.0
        sorted_lat = sorted(self.latencies_ms)
        idx = int(len(sorted_lat) * 0.95)
        return sorted_lat[min(idx, len(sorted_lat) - 1)]

    @property
    def min_latency_ms(self) -> float:
        return min(self.latencies_ms) if self.latencies_ms else 0.0

    @property
    def max_latency_ms(self) -> float:
        return max(self.latencies_ms) if self.latencies_ms else 0.0

    def report(self) -> str:
        return (
            f"\n{'─' * 60}\n"
            f"  Endpoint:    {self.endpoint}\n"
            f"  Requests:    {self.total_requests}\n"
            f"  Success:     {self.success_count}\n"
            f"  Errors:      {self.error_count} ({self.error_rate:.1%})\n"
            f"  Avg latency: {self.avg_latency_ms:,.1f} ms\n"
            f"  P95 latency: {self.p95_latency_ms:,.1f} ms\n"
            f"  Min latency: {self.min_latency_ms:,.1f} ms\n"
            f"  Max latency: {self.max_latency_ms:,.1f} ms\n"
            f"{'─' * 60}"
        )


async def _fire_post(
    client: httpx.AsyncClient,
    url: str,
    payload: dict,
    result: BenchmarkResult,
    request_id: int,
) -> None:
    """Send a single POST request and record timing."""
    start = time.perf_counter()
    try:
        resp = await client.post(url, json=payload)
        elapsed_ms = (time.perf_counter() - start) * 1_000
        result.latencies_ms.append(elapsed_ms)
        result.total_requests += 1
        if resp.status_code < 400:
            result.success_count += 1
            print(f"  [{request_id:>3}]  ✓  {resp.status_code}  {elapsed_ms:>8.1f} ms")
        else:
            result.error_count += 1
            print(f"  [{request_id:>3}]  ✗  {resp.status_code}  {elapsed_ms:>8.1f} ms  — {resp.text[:120]}")
    except Exception as exc:
        elapsed_ms = (time.perf_counter() - start) * 1_000
        result.total_requests += 1
        result.error_count += 1
        result.latencies_ms.append(elapsed_ms)
        print(f"  [{request_id:>3}]  ✗  ERROR  {elapsed_ms:>8.1f} ms  — {exc}")


async def _fire_get(
    client: httpx.AsyncClient,
    url: str,
    result: BenchmarkResult,
    request_id: int,
) -> None:
    """Send a single GET request and record timing."""
    start = time.perf_counter()
    try:
        resp = await client.get(url)
        elapsed_ms = (time.perf_counter() - start) * 1_000
        result.latencies_ms.append(elapsed_ms)
        result.total_requests += 1
        if resp.status_code < 400:
            result.success_count += 1
            print(f"  [{request_id:>3}]  ✓  {resp.status_code}  {elapsed_ms:>8.1f} ms")
        else:
            result.error_count += 1
            print(f"  [{request_id:>3}]  ✗  {resp.status_code}  {elapsed_ms:>8.1f} ms  — {resp.text[:120]}")
    except Exception as exc:
        elapsed_ms = (time.perf_counter() - start) * 1_000
        result.total_requests += 1
        result.error_count += 1
        result.latencies_ms.append(elapsed_ms)
        print(f"  [{request_id:>3}]  ✗  ERROR  {elapsed_ms:>8.1f} ms  — {exc}")


async def benchmark_simulate_async(
    base_url: str,
    concurrency: int,
    timeout: float,
) -> BenchmarkResult:
    """POST /api/v1/simulate — async Celery-enqueue endpoint."""
    url = f"{base_url}/api/v1/simulate"
    result = BenchmarkResult(endpoint=f"POST {url}")

    print(f"\n🚀 Benchmarking: POST /api/v1/simulate × {concurrency}")
    async with httpx.AsyncClient(timeout=timeout) as client:
        tasks = [
            _fire_post(client, url, DEFAULT_SIMULATE_PAYLOAD, result, i + 1)
            for i in range(concurrency)
        ]
        await asyncio.gather(*tasks)
    return result


async def benchmark_dashboard_results(
    base_url: str,
    concurrency: int,
    timeout: float,
    clerk_user_id: str,
) -> BenchmarkResult:
    """GET /api/v1/simulate/results/{clerk_user_id} — sync dashboard endpoint."""
    url = f"{base_url}/api/v1/simulate/results/{clerk_user_id}"
    result = BenchmarkResult(endpoint=f"GET {url}")

    print(f"\n🚀 Benchmarking: GET /api/v1/simulate/results/{clerk_user_id} × {concurrency}")
    async with httpx.AsyncClient(timeout=timeout) as client:
        tasks = [
            _fire_get(client, url, result, i + 1)
            for i in range(concurrency)
        ]
        await asyncio.gather(*tasks)
    return result


async def benchmark_health(
    base_url: str,
    timeout: float,
) -> BenchmarkResult:
    """GET /health — quick connectivity sanity check."""
    url = f"{base_url}/health"
    result = BenchmarkResult(endpoint=f"GET {url}")

    print(f"\n🩺 Health check: GET /health")
    async with httpx.AsyncClient(timeout=timeout) as client:
        await _fire_get(client, url, result, 1)
    return result


async def main() -> None:
    parser = argparse.ArgumentParser(
        description="Benchmark the Brand Simulation Engine API."
    )
    parser.add_argument(
        "--url",
        default="http://127.0.0.1:8000",
        help="Base URL of the FastAPI backend (default: http://127.0.0.1:8000).",
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=15,
        help="Number of concurrent requests per endpoint (default: 15).",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=60.0,
        help="HTTP timeout in seconds (default: 60).",
    )
    parser.add_argument(
        "--user",
        default=DEFAULT_CLERK_USER_ID,
        help=f"Clerk user ID for dashboard results (default: {DEFAULT_CLERK_USER_ID}).",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("  Brand Simulation Engine — API Benchmark")
    print(f"  Target:      {args.url}")
    print(f"  Concurrency: {args.concurrency}")
    print(f"  Timeout:     {args.timeout}s")
    print("=" * 60)

    # 1. Health check
    health = await benchmark_health(args.url, args.timeout)
    if health.error_count > 0:
        print("\n⚠️  Health check failed — backend may be unreachable.")
        print("   Ensure the FastAPI server is running: uvicorn src.api.main:app")
        print(health.report())
        sys.exit(1)
    print(health.report())

    # 2. Async simulation endpoint (Celery enqueue)
    sim_result = await benchmark_simulate_async(
        args.url, args.concurrency, args.timeout
    )
    print(sim_result.report())

    # 3. Sync dashboard results endpoint (heavy computation)
    dash_result = await benchmark_dashboard_results(
        args.url, args.concurrency, args.timeout, args.user
    )
    print(dash_result.report())

    # Final summary
    print("\n" + "=" * 60)
    print("  FINAL SUMMARY")
    print("=" * 60)
    for r in [health, sim_result, dash_result]:
        print(
            f"  {r.endpoint:<55} "
            f"avg={r.avg_latency_ms:>7.1f}ms  "
            f"p95={r.p95_latency_ms:>7.1f}ms  "
            f"err={r.error_rate:.0%}"
        )
    print("=" * 60)

    total_errors = sum(r.error_count for r in [sim_result, dash_result])
    if total_errors > 0:
        print(f"\n⚠️  {total_errors} error(s) encountered. Check server logs.")
        sys.exit(1)
    else:
        print("\n✅ All benchmarks passed with zero errors.")


if __name__ == "__main__":
    asyncio.run(main())
