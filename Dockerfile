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
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY --from=builder /app/webapp ./webapp
COPY data ./data
CMD ["gunicorn", "--chdir", "webapp", "-b", "0.0.0.0:8000", "app:app"]
