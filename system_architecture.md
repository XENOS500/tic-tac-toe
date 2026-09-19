# System Architecture Document

## Project: Anti-Gravity 2-Player Real-Time Tic-Tac-Toe
- **Document Version:** 1.0.0
- **Scope:** Networking, Physics Pipeline, Deployment, and Component Topology

---

## 1. High-Level Architecture Overview

The system follows a **Client-Server, Authoritative Input/Lockstep-Snapshot Architecture**:

```
+-------------------------------------------------------------+
|                      Client 1 (Vercel CDN)                 |
|  [ React / Next.js ] -> [ Matter.js View ] -> [ Audio Engine ] |
+-------------------------------------------------------------+
                              ▲
                              │ WebSocket (Socket.io)
                              ▼
+-------------------------------------------------------------+
|               Authoritative Backend (Render VM)             |
|                                                             |
|  +---------------------+        +------------------------+  |
|  |   Room Coordinator  | <----> | Headless Matter.js /   |  |
|  |  (Connection, Auth) |        | Physics Engine Loop    |  |
|  +---------------------+        +------------------------+  |
|            │                                                |
|            ▼                                                |
|  +---------------------+                                    |
|  | In-Memory Match Map |                                    |
|  +---------------------+                                    |
+-------------------------------------------------------------+
                              ▲
                              │ WebSocket (Socket.io)
                              ▼
+-------------------------------------------------------------+
|                      Client 2 (Vercel CDN)                 |
|  [ React / Next.js ] -> [ Matter.js View ] -> [ Audio Engine ] |
+-------------------------------------------------------------+
```

---

## 2. Physics Execution Model: Authoritative Server vs Client Prediction

### 2.1 The Challenge
Physics simulations across different floating-point implementations (different browsers, JS engines) tend to diverge if calculated independently (floating-point non-determinism).

### 2.2 The Solution
1. **Server-Authoritative Headless Simulation:**
   - The Node.js server runs a headless instance of the 2D physics engine (`matter.js`) running at a fixed tick rate ($60\text{ Hz}$).
   - The server validates turn turns, spawns pieces, integrates gravity vectors, detects collisions, and checks win conditions.
2. **Snapshot Broadcasting:**
   - The server broadcasts world state snapshots to clients at a tick interval of $20\text{ Hz}$ ($50\text{ ms}$).
   - Snapshot contains: body IDs, positions $(x, y)$, rotations $\theta$, linear velocities $(v_x, v_y)$, and settlement flags.
3. **Client-Side Hermite/Linear Interpolation (LERP):**
   - The client renders one snapshot interval behind ($50\text{ ms}$) to smoothly interpolate piece positions without jitter.
   - Client displays immediate placement feedback via ghost particles, but physics position is authoritative.

---

## 3. Communication Protocol (WebSocket via Socket.io)

### 3.1 Connection Lifecycle
1. **Handshake:** Client initiates connection to `wss://api.antigravity-toe.com/socket.io/`.
2. **Room Registration:** Client emits `ROOM_CREATE` or `ROOM_JOIN { roomId }`.
3. **Player Assignment:** Server binds Socket ID to Player Role (`X` = Host, `O` = Guest).
4. **Game Loop:**
   - Input Event: `PLAYER_DROP_TOKEN { column: number, impulseVector: Vector2 }`
   - Broadcast Event: `WORLD_SNAPSHOT { bodies, turn, gravity, settlementMatrix }`
   - State Event: `GAME_OVER { winner: 'X' | 'O' | 'DRAW', winningLine: [...] }`

### 3.2 Network Resilience
- **Heartbeat:** Ping/pong interval at $5\text{ s}$ with $10\text{ s}$ timeout.
- **Graceful Reconnection:** Player sessions hold state for 15 seconds in memory. If the socket reconnects with matching `playerId` and `reconnectToken`, the session re-attaches without resetting the board.

---

## 4. Frontend Component & Rendering Hierarchy

```
App.tsx
├── LandingView
│   ├── CreateRoomButton
│   └── JoinRoomInput
└── ArenaView
    ├── ScoreboardHUD (Turn, Player Identities, Timer)
    ├── GravityCompass (Radial display of current vector g)
    ├── PhysicsCanvas (Three.js or Matter.js Render Context)
    │   ├── ArenaBoundaries (Static Bodies)
    │   ├── InteractiveGridCells (Sensor Bodies)
    │   └── ActiveTokens (Rigid Dynamic Bodies)
    └── MatchControls (Rematch, Leave, Surrender)
```

---

## 5. Deployment & Infrastructure Strategy

| Layer | Service | Rationale |
| :--- | :--- | :--- |
| **Frontend** | Vercel | Global CDN caching, edge routing, zero maintenance for static assets. |
| **Backend** | Render (Web Service) | Long-running container process capable of maintaining stateful WebSockets and Node.js event-loop intervals. |
| **Domain & DNS** | Cloudflare | SSL termination, DDoS protection, WebSockets proxying support (`WebSocket Upgrade`). |