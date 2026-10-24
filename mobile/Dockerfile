# syntax=docker/dockerfile:1
# Expo-Dev-Server (Metro) für Expo Go – läuft auf dem Server, damit kein Laptop nötig ist.
# Die Handys laden den App-Code von hier: exp://<SERVER_IP>:8081
FROM node:22-bookworm-slim
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# CI=1: kein interaktives Terminal, kein Datei-Watcher nötig
ENV CI=1 \
    EXPO_NO_TELEMETRY=1
EXPOSE 8081

CMD ["npx", "expo", "start", "--lan", "--port", "8081"]
