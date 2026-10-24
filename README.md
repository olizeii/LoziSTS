# 🎮 LAN-Party Challenge Tracker

| Teil       | Ordner       | Stack                                  |
|------------|--------------|----------------------------------------|
| Backend    | `backend/`   | Node.js, Express, Socket.io, SQLite3   |
| Dashboard  | `dashboard/` | React (Vite), Tailwind, canvas-confetti, HTML5 Audio |
| Mobile App | `mobile/`    | Expo SDK 58 (React Native), läuft in Expo Go |

## 🐳 Auf dem Server starten (Docker)

Voraussetzung auf dem Server: Docker mit Compose-Plugin (`docker compose version`).

```bash
git clone https://github.com/olizeii/LoziSTS.git
cd LoziSTS
cp .env.example .env        # SERVER_IP, ADMIN_TOKEN usw. anpassen
docker compose up -d --build
```

| Dienst | Container        | Adresse                       | Zweck                                  |
|--------|------------------|-------------------------------|----------------------------------------|
| `app`  | `lan-party-app`  | `http://10.0.0.210:3000`      | Backend + TV-Dashboard (Fernseher öffnet diese Seite) |
| `expo` | `lan-party-expo` | `exp://10.0.0.210:8081`       | App-Code für Expo Go (kein Laptop nötig) |

**Handys verbinden:** Expo Go öffnen → „Enter URL manually“ → `exp://10.0.0.210:8081`.
Der erste Start dauert etwas (Metro baut das Bundle), danach ist es schnell.

**Ohne Internet auf der Party:** in `docker-compose.yml` beim Dienst `expo` die Zeile `EXPO_OFFLINE: "1"` einkommentieren.

**Firewall auf dem Server:** Ports `3000` und `8081` (TCP) müssen aus dem LAN erreichbar sein, z. B. mit `ufw`:
`sudo ufw allow 3000/tcp && sudo ufw allow 8081/tcp`

### Nützliche Befehle

| Befehl | Zweck |
|--------|-------|
| `docker compose ps` | Status + Healthcheck |
| `docker compose logs -f app` | Live-Log (jeder Tick) |
| `docker compose logs -f expo` | Expo-Log (Bundling, Fehler der App) |
| `docker compose restart` | Neustart |
| `docker compose down` | Stoppen (Daten bleiben erhalten) |
| `git pull && docker compose up -d --build` | Update einspielen |
| `docker compose cp app:/data/lanparty.db ./backup-lanparty.db` | Datenbank-Backup ziehen |
| `curl -X POST -H "x-admin-token: DEIN_TOKEN" http://10.0.0.210:3000/api/admin/reset` | Alle Ticks löschen (vor der Party) |

Die SQLite-Datenbank liegt im Docker-Volume `lan-party-tracker_lanparty-data` und überlebt Neustarts und Updates.
**Achtung:** `docker compose down -v` löscht das Volume und damit alle Daten.

## Backend lokal starten (Entwicklung)

```bash
cd backend
npm install
npm start
```

Server läuft auf `http://0.0.0.0:3000` (im LAN: `http://10.0.0.210:3000`).

| Befehl                     | Zweck                                              |
|----------------------------|----------------------------------------------------|
| `npm start`                | Server starten                                     |
| `npm run dev`              | Server mit Auto-Reload bei Code-Änderungen         |
| `npm run smoke`            | Test-Client: tickt jede Challenge und macht Undo   |
| `npm run simulate`         | 10 Fake-Spieler ticken zufällig (schreibt in die DB!) |
| `npm run reset -- --yes`   | Alle Ticks löschen (Server vorher stoppen)         |

## TV-Dashboard

```bash
cd dashboard
npm install
npm run build
```

Danach liefert das Backend das Dashboard unter `/` aus (Backend nach dem Build neu starten):
`http://localhost:3000` bzw. auf dem Server `http://10.0.0.210:3000`.

Für die Entwicklung mit Hot-Reload: `npm run dev` → `http://localhost:5173`
(leitet `/api` und `/socket.io` an `DEV_BACKEND_URL` weiter, Standard `http://localhost:3000`, siehe `.env.example`).

**Bedienung am TV**

| Taste       | Funktion                                                 |
|-------------|----------------------------------------------------------|
| Enter/Klick | Start-Screen (einmal nötig, damit der Browser Sound erlaubt) |
| `F`         | Vollbild an/aus                                          |
| `M`         | Ton an/aus                                               |
| `T`         | Tick-Effekt testen (nur lokal, nichts wird gespeichert)  |
| `Shift+T`   | Meilenstein-Overlay testen (nur lokal)                   |

`?autostart` an der URL überspringt den Start-Screen (z. B. für Chrome im Kiosk-Modus mit
`--autoplay-policy=no-user-gesture-required`).

## Mobile App (Expo Go)

Voraussetzung: Node.js **≥ 22.13** (Expo SDK 58) und die App „Expo Go“ auf den Handys.

```bash
cd mobile
npm install
npx expo start
```

QR-Code mit der Handy-Kamera (iOS) bzw. in Expo Go (Android) scannen. Handy und Rechner müssen im selben WLAN sein.
Unter iOS beim ersten Start „Lokales Netzwerk“ erlauben.

Die Server-Adresse steht in `mobile/.env` (Vorlage: `.env.example`):

```
EXPO_PUBLIC_SERVER_IP=10.0.0.210
EXPO_PUBLIC_SERVER_PORT=3000
```

Nach einer Änderung die App in Expo Go neu laden (Handy schütteln → Reload).

- Erster Start: Namen eingeben (wird lokal per AsyncStorage gespeichert)
- 4 Buttons mit festen Schritten: Rubik's Cube +1, Liegestütze +5, Laufen +1 km, Trichter +1
- „Letzten Tick zurücknehmen“ für Vertipper, „Name ändern“ oben links
- `npx expo start --web` startet eine Browser-Vorschau zum Testen ohne Handy (Bestätigungsdialoge funktionieren dort nicht)

**Eigene Sounds:** Dateien in `dashboard/public/sounds/` ersetzen (`tick`, `undo`, `milestone`, `complete`).
Für `.mp3` die Pfade in `dashboard/src/lib/sound.js` anpassen. Die Standard-Sounds erzeugt `npm run sounds` neu.

### Umgebungsvariablen (optional)

| Variable      | Standard                     | Bedeutung                                   |
|---------------|------------------------------|---------------------------------------------|
| `PORT`        | `3000`                       | HTTP/WebSocket-Port                         |
| `DB_PATH`     | `backend/data/lanparty.db`   | SQLite-Datei                                |
| `STATIC_DIR`  | `dashboard/dist`             | Dashboard-Build, der unter `/` ausgeliefert wird |
| `ADMIN_TOKEN` | leer (Reset deaktiviert)     | Token für `POST /api/admin/reset`           |

## Socket.io-Protokoll

**Client → Server** (alle mit Ack-Callback `{ ok, error? , ... }`)

| Event       | Payload                              | Wirkung                                        |
|-------------|--------------------------------------|------------------------------------------------|
| `tick`      | `{ name, challengeId }`              | Fester Schritt: rubiks +1, pushups +5, running +1, funnel +1 |
| `undo`      | `{ name, challengeId? }`             | Nimmt den letzten eigenen Tick zurück          |
| `state:get` | –                                    | Liefert `{ ok, state }`                        |

**Server → alle Clients**

| Event   | Payload                              |
|---------|--------------------------------------|
| `state` | Kompletter State (beim Verbinden und nach Reset) |
| `tick`  | `{ event, milestones[], state }`     |
| `undo`  | `{ event, state }`                   |

`state` enthält `challenges` (inkl. `total`, `percent`, `milestonesReached`), `leaderboards` pro Challenge,
`recentEvents` (für den Live-Ticker, neueste zuerst, mit fertigem `message`-Text), `players` und `eventCount`.

## REST-API

- `GET  /api/health` · `GET /api/state` · `GET /api/challenges` · `GET /api/events?limit=500&offset=0`
- `POST /api/tick` `{ "name": "Max", "challengeId": "pushups" }`
- `POST /api/undo` `{ "name": "Max" }`
- `POST /api/admin/reset` (Header `x-admin-token`)
