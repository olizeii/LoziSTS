# 🎮 LAN-Party Challenge Tracker

| Teil       | Ordner       | Stack                                  |
|------------|--------------|----------------------------------------|
| Backend    | `backend/`   | Node.js, Express, Socket.io, SQLite3   |
| Dashboard  | `dashboard/` | React (Vite), Tailwind, canvas-confetti, HTML5 Audio |
| Mobile App | `mobile/`    | Expo SDK 58 (React Native), läuft in Expo Go |

## 🏆 Die Challenges

| Challenge | Ziel | Pro Tipp in der App |
|-----------|------|---------------------|
| 🧩 Rubik's Cube | 500 Cubes | +1 |
| 💪 Liegestütze | 1.000 | +5 |
| 🏃 Laufen | 50 km | +1 km |
| 🍺 Trichter | 10 | +1 |
| 🍻 Bier | 120 | +1 |
| 🎯 Darts | 10.001 → 0 (Team-Countdown) | jede Aufnahme im Dart-Tracker |

Ziele und Schritte stehen in `backend/src/challenges.js`.

## 🎯 Darts

- **Team-Countdown:** Alle geworfenen Punkte zählen von 10.001 runter, bis 0 erreicht ist (ohne Double-Out).
- **Frei werfen:** Aufnahme (1–3 Darts) eintragen, zählt sofort für die 10.001.
- **Spiele (X01):** 301 / 501 / 701 / 1001, Double-Out an/aus, 1–8 Spieler (solo, 1 gegen 1 oder mehr).
  Ein Handy kann für alle im Spiel zählen; laufende Spiele sieht jeder in der App und auf dem TV.
  Alle Punkte aus Spielen zählen ebenfalls für die 10.001.
- **Bust** (überworfen, Rest 1 oder Checkout ohne Doppel): Aufnahme zählt 0 – auch nicht für die 10.001
  (umschaltbar: `BUST_COUNTS_FOR_TEAM` in `backend/src/darts.js`).
- **Meine Würfe:** jede eigene Aufnahme mit allen Darts, dazu Ø (3 Darts), 180er, beste Aufnahme, bestes Checkout, Siege.
- Checkout-Tipps (z. B. 170 → T20 T20 BULL) und Bust-Vorschau direkt beim Eintippen.
- TV: eigene Effekte und Sounds für **180**, **Checkout** und **Bust**.

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
| `npm test`                 | Tests für Dart-Regeln, Spiele und Undo (eigene Temp-DB) |
| `npm run smoke`            | Test-Client: tickt jede Challenge + Darts und macht Undo |
| `npm run simulate`         | 10 Fake-Spieler ticken und spielen Darts (schreibt in die DB!) |
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
| `D`         | Dart-Aufnahme testen (nur lokal)                         |
| `Shift+D`   | 180-Overlay testen (nur lokal)                           |
| `C`         | Checkout-Overlay testen (nur lokal)                      |

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
- 5 Buttons mit festen Schritten: Rubik's Cube +1, Liegestütze +5, Laufen +1 km, Trichter +1, Bier +1
- Darts-Karte → Dart-Tracker: frei werfen, Spiele anlegen/mitzählen, „Meine Würfe“
- „Letzten Tick zurücknehmen“ für Vertipper (Darts haben ein eigenes Undo pro Aufnahme), „Name ändern“ oben links
- `npx expo start --web` startet eine Browser-Vorschau zum Testen ohne Handy (Bestätigungsdialoge funktionieren dort nicht)

**Eigene Sounds:** Dateien in `dashboard/public/sounds/` ersetzen (`tick`, `undo`, `milestone`, `complete`, `bust`, `oneEighty`, `checkout`).
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
| `tick`      | `{ name, challengeId }`              | Fester Schritt: rubiks +1, pushups +5, running +1, funnel +1, beer +1 |
| `undo`      | `{ name, challengeId? }`             | Nimmt den letzten eigenen Tick zurück (ohne Darts) |
| `state:get` | –                                    | Liefert `{ ok, state }`                        |
| `darts:turn` | `{ name, darts: [{segment, multiplier}], gameId?, player? }` | Aufnahme eintragen (frei oder im Spiel) |
| `darts:undo` | `{ name, gameId? }`                 | Letzte Aufnahme im Spiel bzw. letzte eigene freie Aufnahme zurücknehmen |
| `darts:createGame` | `{ name, players[], startScore, doubleOut }` | Neues X01-Spiel |
| `darts:abortGame` | `{ name, gameId }`             | Spiel abbrechen (Punkte bleiben in der 10.001) |
| `darts:game` | `{ gameId }`                        | Spielstand abrufen                             |
| `darts:history` | `{ name }`                       | Eigene Aufnahmen + Statistik                   |

Ein Dart: `segment` 0 (Miss), 1–20 oder 25 (Bull); `multiplier` 1–3 (Bull 1–2).

**Server → alle Clients**

| Event   | Payload                              |
|---------|--------------------------------------|
| `state` | Kompletter State (beim Verbinden, nach Reset, neuen/abgebrochenen Spielen) |
| `tick`  | `{ event, milestones[], state }` (auch für Dart-Aufnahmen, dann mit `event.dart`) |
| `undo`  | `{ event, state }`                   |
| `darts:game` | Spielstand nach jeder Änderung  |

`state` enthält `challenges` (inkl. `kind`, `total`, `percent`, `milestonesReached`), `leaderboards` pro Challenge,
`recentEvents` (für den Live-Ticker, neueste zuerst, mit fertigem `message`-Text), `darts`
(Countdown, Spieler-Statistiken, laufende und zuletzt beendete Spiele), `players` und `eventCount`.

## REST-API

- `GET  /api/health` · `GET /api/state` · `GET /api/challenges` · `GET /api/events?limit=500&offset=0`
- `POST /api/tick` `{ "name": "Max", "challengeId": "pushups" }`
- `POST /api/undo` `{ "name": "Max" }`
- `POST /api/admin/reset` (Header `x-admin-token`)
