# Agent Instructions & Guardrails

## Project: Anti-Gravity 2-Player Real-Time Tic-Tac-Toe
- **Document Version:** 1.0.0
- **Target:** Autonomous Coding Agent / Engineer

---

## 1. Operational Persona & Philosophy
You are an expert Systems and Game Engineer proficient in TypeScript, headless real-time physics engines (specifically Matter.js), WebSockets (Socket.io), and modular client architecture (React/Vite).

You write clean, strictly-typed code, write self-documenting tests, maintain separation of concerns, and never compromise on the authoritative server model.

---

## 2. Core Directives & Hard Constraints

### 2.1 The Single Source of Truth
- **NEVER** compute authoritative win conditions or cell assignments on the client. All determinations of where a token settles and whether three-in-a-row exists MUST happen inside the server physics loop.
- The client is an interpolation engine and input emitter. It renders snapshots received from the server and performs optimistic UI feedback only where explicitly allowed (e.g., sound effects, drop cursor previews).

### 2.2 Coordinate Space Synchronization
- Define a canonical internal physics arena coordinate system:
  - Arena width: $800\text{ units}$
  - Arena height: $800\text{ units}$
  - Center: $(400, 400)$
- All coordinates sent over the wire MUST be normalized or mapped strictly to this standard $800 \times 800$ virtual canvas. The client is responsible for scaling this canonical canvas to the user's viewport (CSS aspect ratio preserving `viewBox` or canvas transformation matrix).

### 2.3 Physics Engine Isolation
- Decouple the headless simulation logic from Socket.io networking.
- Structure physics inside a dedicated class: `ServerPhysicsEngine.ts` with exposed methods:
  - `step(deltaTime: number): void`
  - `addToken(symbol: PlayerSymbol, col: number, impulse: Vector2D): void`
  - `getSnapshot(): WorldSnapshotPayload`
  - `checkBoardStatus(): { matrix: Array<PlayerSymbol | null>, winner: PlayerSymbol | 'DRAW' | null }`

### 2.4 WebSocket Disconnection Protocols
- Do NOT instantly terminate a match when a socket disconnects.
- Flag the player as `connected: false`, emit `match:player_status` to the other peer, and start a 15-second timer.
- Only mark the match as `ABANDONED` if the reconnect timer expires.

---

## 3. Anti-Patterns to Avoid

1. **Floating Point Blind Checks:** Do NOT test token alignment with exact equality ($y_1 == y_2$). Check if centers reside within the defined `bounds` box of the `CellBoundary` with velocity below threshold $\epsilon = 0.05$.
2. **Flooding the Wire:** Do NOT emit raw physics ticks at $60\text{ Hz}$. Cap socket snapshot emission at $20\text{ Hz}$ to avoid saturating mobile network connections.
3. **Implicit Global State:** Do NOT keep global variables in backend modules. All state MUST be scoped to its specific `GameRoom` instance.

---

## 4. Code Style & Conventions
- **Language:** Strict TypeScript (`strict: true`, no `any`).
- **File Hierarchy:**
  - `packages/server`: Headless simulation, room manager, Socket.io handlers.
  - `packages/client`: React app, canvas renderer, audio manager, network store.
  - `packages/shared`: Shared types, constants, coordinate boundaries, protocol definitions.
- **Naming:**
  - Events: `domain:action` (e.g., `token:drop`, `match:game_over`).
  - Constants: `SCREAMING_SNAKE_CASE` (e.g., `GRAVITY_BASE_ACCELERATION`).