# Mafia Overseas

Play Mafia online with friends, with live video and audio. No accounts: create a room, share the code or link, pick a name, play.

- 6-12 players per room. The host chooses the number of Mafia, Doctors and Detectives (default 2 / 1 / 1), the phase timers, and whether video is allowed.
- Rules follow `mafia_game_llm_instructions.md`. The server acts as the neutral host and moderator.
- Night: everyone is muted and dark except the Mafia, who get a private voice, video and text channel.
- Day: open mics and video tiles for all living players, public text chat, anonymous voting (totals only).
- Eliminated players spectate with every role revealed, muted, with a dead-only chat.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

Production:

```bash
npm run build
npm start            # PORT=3000 by default
```

### Health check

`GET /health` returns `200` with `{"status":"ok","uptimeSeconds":…,"rooms":…}` (also answers `HEAD`). It does not touch Next.js and exposes no player data. Use it as the health-check path on Render, Railway or Fly.

### Deploying (Render, Railway, Fly, a VPS)

One Node process serves the pages, the game and the video signaling, so deploy the whole app once to a host that keeps a server running (not Vercel). Build command `npm install && npm run build`, start command `npm start`, **one instance only** (rooms live in memory), health-check path `/health`.

### Playing with friends

Camera and microphone only work on HTTPS or `localhost`. To play with other people, expose your machine over HTTPS, for example:

```bash
cloudflared tunnel --url http://localhost:3000
```

Send everyone the `https://...trycloudflare.com/room/CODE` link (or the 5-letter code).

### Strict networks (TURN)

Video is peer-to-peer (WebRTC mesh) with Google STUN. Most home networks work. If some players cannot see or hear each other, add a TURN server (for example coturn) and set these before `npm run build`:

```
NEXT_PUBLIC_TURN_URL=turn:turn.example.com:3478,turns:turn.example.com:5349
NEXT_PUBLIC_TURN_USER=...
NEXT_PUBLIC_TURN_PASS=...
```

## How it works

| Piece | Where |
|---|---|
| Game rules / state machine (pure, no I/O) | `server/engine/` |
| Rooms, timers, chat, host controls | `server/rooms/` |
| What each player may see (secrets never leave the server) | `server/views/viewFor.js` |
| Who may send/receive media each phase | `server/media/policy.js` |
| Socket.IO handlers + WebRTC signaling relay | `server/socket/` |
| Next.js app + game UI | `app/`, `components/` |
| WebRTC mesh, mic/camera, speaking meter | `lib/webrtc/` |

The server is authoritative. Clients never receive the full game state, only their own `viewFor(player)`.

### Media policy

| Phase | Who sends to whom |
|---|---|
| Lobby, game over | everyone to everyone |
| Role reveal | nobody |
| Night | living Mafia to living Mafia only (the dead can listen in) |
| Day | living players to everyone; the dead only listen |

With **Allow video** off, no camera is requested and no video line is negotiated at all (audio only).

> The mesh is trust-based: each browser applies the server's policy to its own outgoing tracks. A modified client could ignore it. That is fine for friends; a media server (SFU) would be needed for real enforcement.

Mesh limits: every player connects to every other player (11 connections at 12 players), so video is capped at about 320x240 / 15 fps (256x192 / 12 fps above 8 players).

## Tests

```bash
npm test                              # engine, server, UI-logic (Vitest)
npm run build && npm run e2e          # real browsers + real WebRTC, full game
```

The e2e test needs Edge or Chrome. Set `BROWSER_PATH` if it is not in the default Windows location. It launches six browsers with fake cameras/mics, plays a whole game, and checks at every phase, from the live RTP packet counters, that audio and video flow exactly as the rules allow.
