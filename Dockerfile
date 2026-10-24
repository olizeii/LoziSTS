# syntax=docker/dockerfile:1
# Backend (Express + Socket.io + SQLite) inkl. fertig gebautem TV-Dashboard und Browser-App in einem Image.

# ---------- 1) TV-Dashboard bauen ----------
FROM node:22-bookworm-slim AS dashboard
WORKDIR /app/dashboard
COPY dashboard/package.json dashboard/package-lock.json ./
RUN npm ci
COPY dashboard/ ./
ARG VITE_EVENT_TITLE="LAN-PARTY CHALLENGE"
ENV VITE_EVENT_TITLE=${VITE_EVENT_TITLE}
RUN npm run build

# ---------- 2) Browser-Version der App bauen (für iPhone & Co., läuft unter /app) ----------
FROM node:22-bookworm-slim AS webapp
WORKDIR /app/mobile
COPY mobile/package.json mobile/package-lock.json ./
RUN npm ci
COPY mobile/ ./
ENV CI=1 EXPO_NO_TELEMETRY=1
RUN npm run export:web

# ---------- 3) Backend-Abhängigkeiten (sqlite3 ist ein natives Modul) ----------
FROM node:22-bookworm-slim AS backend-deps
# Build-Tools nur als Fallback, falls für die Plattform kein fertiges sqlite3-Binary existiert
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# ---------- 4) Schlankes Laufzeit-Image ----------
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/data/lanparty.db \
    STATIC_DIR=/app/dashboard/dist \
    WEB_APP_DIR=/app/mobile-web
WORKDIR /app/backend

COPY --from=backend-deps /app/backend/node_modules ./node_modules
COPY backend/package.json ./
COPY backend/src ./src
COPY backend/scripts/reset-db.js ./scripts/reset-db.js
COPY --from=dashboard /app/dashboard/dist /app/dashboard/dist
COPY --from=webapp /app/mobile/dist-web /app/mobile-web

RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "src/server.js"]
