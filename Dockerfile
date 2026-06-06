# Stage 1: Builder
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create venv and install dependencies
WORKDIR /app
COPY requirements.txt .
RUN python -m venv /app/venv && \
    /app/venv/bin/pip install --no-cache-dir --upgrade pip && \
    /app/venv/bin/pip install --no-cache-dir -r requirements.txt

# Stage 2: Production
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/venv/bin:$PATH" \
    PYTHONPATH="/app" \
    # Fix matplotlib cache dir for non-root user (no writable home)
    MPLCONFIGDIR="/tmp/matplotlib" \
    # Prevent fonttools/matplotlib from scanning system fonts on startup
    MPLBACKEND="Agg" \
    # Railway injects PORT; default to 8000 for local Docker
    PORT=8000

# Create non-root user WITH a writable home directory
RUN addgroup --system appgroup && \
    adduser --system --group --home /home/appuser appuser

WORKDIR /app

# Pre-create matplotlib cache directory
RUN mkdir -p /tmp/matplotlib && chown appuser:appgroup /tmp/matplotlib

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder --chown=appuser:appgroup /app/venv /app/venv

# Copy application code
COPY --chown=appuser:appgroup src/ ./src/
COPY --chown=appuser:appgroup alembic.ini ./

USER appuser

EXPOSE ${PORT}

# Railway sets $PORT dynamically. Use shell form so $PORT is expanded at runtime.
# Single worker (--workers 1) to avoid OOM on Railway's 512MB–1GB containers.
# PyMC/SHAP/Mesa are memory-heavy; multiple workers would each duplicate them.
CMD uvicorn src.api.main:app --host 0.0.0.0 --port $PORT --workers 1 --timeout-keep-alive 30
