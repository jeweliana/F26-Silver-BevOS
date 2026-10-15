FROM python:3.13-slim AS base

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH=/opt/venv/bin:$PATH

WORKDIR /app

COPY backend/pyproject.toml backend/uv.lock backend/README.md ./
COPY backend/src ./src

ARG DEV_DEPS=true
RUN if [ "$DEV_DEPS" = "true" ]; then \
        uv sync --frozen; \
    else \
        uv sync --frozen --no-dev; \
    fi

COPY backend/ ./

EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]