"""Redis caching layer for computationally heavy simulation outputs.

Caches Pareto-optimal frontiers, baseline MMM forecasts, and dashboard
simulation payloads so identical requests skip the full ABM → Markov →
Bayesian pipeline.

Key design decisions:
  - Deterministic cache keys via SHA-256 of sorted JSON parameters.
  - Default TTL of 1 hour (3 600 s) aligns with Celery result_expires.
  - Graceful degradation: all cache misses and errors fall through to the
    live computation path — Redis is never on the critical path.

Usage:
    from src.api.cache import SimulationCache
    cache = SimulationCache()                      # connects via REDIS_URL
    cache.set("simulate:results", params, result)  # store
    hit = cache.get("simulate:results", params)    # retrieve or None
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
from typing import Any

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

# Default TTL: 1 hour (matches Celery result_expires)
DEFAULT_TTL_SECONDS: int = 3_600


def _deterministic_key(namespace: str, params: dict[str, Any]) -> str:
    """Build a deterministic cache key from a namespace and parameters dict.

    Parameters are sorted by key and serialised to JSON before hashing
    so that logically identical requests always map to the same key
    regardless of dict insertion order.

    Returns:
        str: ``"bse:{namespace}:{sha256_hex[:16]"``
    """
    canonical = json.dumps(params, sort_keys=True, default=str)
    digest = hashlib.sha256(canonical.encode()).hexdigest()[:16]
    return f"bse:{namespace}:{digest}"


class SimulationCache:
    """Thin Redis caching wrapper for simulation results.

    All public methods are safe to call even when Redis is unreachable —
    errors are logged and the caller receives ``None`` (miss) so the
    live compute path runs instead.
    """

    def __init__(
        self,
        redis_url: str | None = None,
        default_ttl: int = DEFAULT_TTL_SECONDS,
    ) -> None:
        self._url = redis_url or str(os.getenv(
            "REDIS_URL", "redis://localhost:6379/0"
        ))
        self._ttl = default_ttl
        self._client: aioredis.Redis | None = None

    # ── Lazy connection ─────────────────────────────────────────────────
    def _get_client(self) -> aioredis.Redis:
        if self._client is None:
            self._client = aioredis.from_url(
                self._url,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
        return self._client

    # ── Public API ──────────────────────────────────────────────────────

    async def get(self, namespace: str, params: dict[str, Any]) -> dict[str, Any] | None:
        """Retrieve a cached result, or ``None`` on miss / error."""
        key = _deterministic_key(namespace, params)
        try:
            raw = await self._get_client().get(key)
            if raw is not None:
                logger.info("Cache HIT  %s", key)
                return json.loads(raw)
            logger.debug("Cache MISS %s", key)
            return None
        except Exception as exc:
            logger.warning("Redis GET failed for %s: %s", key, exc)
            return None

    async def set(
        self,
        namespace: str,
        params: dict[str, Any],
        result: dict[str, Any],
        ttl: int | None = None,
    ) -> None:
        """Store a result in the cache with an optional custom TTL."""
        key = _deterministic_key(namespace, params)
        ttl = ttl if ttl is not None else self._ttl
        try:
            payload = json.dumps(result, default=str)
            await self._get_client().setex(key, ttl, payload)
            logger.info("Cache SET  %s (TTL=%ds, size=%d bytes)", key, ttl, len(payload))
        except Exception as exc:
            logger.warning("Redis SET failed for %s: %s", key, exc)

    async def invalidate(self, namespace: str, params: dict[str, Any]) -> None:
        """Remove a specific entry from the cache."""
        key = _deterministic_key(namespace, params)
        try:
            await self._get_client().delete(key)
            logger.info("Cache DEL  %s", key)
        except Exception as exc:
            logger.warning("Redis DEL failed for %s: %s", key, exc)

    async def flush_namespace(self, namespace: str) -> int:
        """Delete all keys under a namespace prefix.  Returns count deleted."""
        pattern = f"bse:{namespace}:*"
        deleted = 0
        try:
            client = self._get_client()
            cursor: int = 0
            while True:
                cursor, keys = await client.scan(cursor, match=pattern, count=200)
                if keys:
                    deleted += await client.delete(*keys)
                if cursor == 0:
                    break
            logger.info("Cache FLUSH %s — %d keys deleted", pattern, deleted)
        except Exception as exc:
            logger.warning("Redis FLUSH failed for %s: %s", pattern, exc)
        return deleted


# ── Module-level singleton ──────────────────────────────────────────────
_cache_singleton: SimulationCache | None = None


def get_simulation_cache() -> SimulationCache:
    """Return a module-level ``SimulationCache`` singleton."""
    global _cache_singleton
    if _cache_singleton is None:
        _cache_singleton = SimulationCache()
    return _cache_singleton
