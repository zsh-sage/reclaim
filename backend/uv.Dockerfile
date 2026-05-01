FROM python:3.13-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    python3-dev \
    pkg-config \
    libcairo2-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy project files
COPY pyproject.toml uv.lock ./

# Sync dependencies

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev

COPY . .

# Final sync to include project

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# Create a non-root user and set permissions

RUN adduser --system --group --home /home/appuser appuser && chown -R appuser:appuser /app

USER appuser


# Ensure the virtual environment is used

ENV PATH="/app/.venv/bin:$PATH"


EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
