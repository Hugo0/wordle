# Stage 1: Build frontend assets
FROM node:22-slim AS builder
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Stage 2: Production image
FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --no-dev --no-install-project
COPY --from=builder /app/webapp ./webapp
CMD ["uv", "run", "gunicorn", "--chdir", "webapp", "-b", "0.0.0.0:8000", "app:app"]
