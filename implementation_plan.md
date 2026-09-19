# Implementation Plan & Roadmap

## Project: Anti-Gravity 2-Player Real-Time Tic-Tac-Toe
- **Document Version:** 1.0.0
- **Status:** Phases 1–5 Implemented & Verified

---

## Phase 1: Shared Definitions & Project Scaffolding
**Objective:** Initialize monorepo workspace, shared data contracts, and build pipelines.

- [x] Task 1.1: Initialize monorepo (npm workspaces) with `/packages/shared`, `/packages/server`, and `/packages/client`.
- [x] Task 1.2: Port TypeScript contracts from `data_model.md` into `/packages/shared/src/index.ts`.
- [x] Task 1.3: Configure shared build scripts, ESLint, Prettier, and TypeScript compilation targets.

*Verification:* Monorepo builds clean with zero errors across all workspaces.

---

## Phase 2: Authoritative Physics Engine Core (Server)
**Objective:** Build headless Matter.js simulation loop running inside Node.js.

- [x] Task 2.1: Implement `ServerPhysicsEngine.ts` in `/packages/server`.
- [x] Task 2.2: Build static arena boundaries and define 3x3 sensor regions with boundary checks.
- [x] Task 2.3: Configure dynamic gravity vectors with inversion features ($g_y = -1$ upward default).
- [x] Task 2.4: Implement token placement physics (`X` with heavy square body, `O` with bouncy circular body).
- [x] Task 2.5: Implement settlement detection algorithm (token inside cell boundary, velocity below threshold for $> 600\text{ ms}$).
- [x] Task 2.6: Write unit tests verifying settlement detection and three-in-a-row resolution.

*Verification:* Automated tests pass simulating token drop and detecting a horizontal and vertical 3-in-a-row win in headless mode.

---

## Phase 3: Real-Time Networking Layer (Server & Sockets)
**Objective:** Connect physics world to real-time multiplayer lifecycle.

- [x] Task 3.1: Implement `RoomManager.ts` to manage concurrent room lifecycles, player roles, and short codes.
- [x] Task 3.2: Implement Socket.io server wrapping the room manager and binding physics engine instances.
- [x] Task 3.3: Build fixed-step tick loop ($60\text{ Hz}$ physics integration, $20\text{ Hz}$ client snapshot broadcast).
- [x] Task 3.4: Implement player reconnect buffer (15-second grace window).
- [x] Task 3.5: Add CORS handling and security validation on input events.

*Verification:* Two WebSocket clients connect, exchange room invites, take turns dropping tokens, and receive synchronized snapshots in automated E2E tests.

---

## Phase 4: Client Development & Physics Rendering
**Objective:** Create responsive visual client with smooth snapshot interpolation.

- [x] Task 4.1: Set up React + Vite client with Tailwind CSS in `/packages/client`.
- [x] Task 4.2: Implement Canvas rendering layer tuned to the $800 \times 800$ canonical coordinate space.
- [x] Task 4.3: Build snapshot interpolation buffer (LERP) to eliminate network stutter between $20\text{ Hz}$ updates.
- [x] Task 4.4: Build HUD (turn indicator, gravity vector arrow, player indicators, copy-to-clipboard invite button).
- [x] Task 4.5: Add Web Audio API procedural sound synthesizer (token bounce, gravity flip whoosh, win chime).

*Verification:* Both frontend and backend compile and build without errors; client interpolates snapshots seamlessly.

---

## Phase 5: Polish, Gravity Events, & Deployment
**Objective:** Finalize anti-gravity gameplay modifiers and deploy readiness.

- [x] Task 5.1: Implement the "Gravity Fluctuation" mechanic (every 3 turns, gravity angle rotates by $90^\circ$ or inverts).
- [x] Task 5.2: Add visual cue particles for anti-gravity dust floating in the direction of the gravity vector.
- [x] Task 5.3: Add game-over overlay with celebration confetti, draw dialog, and rematch agreement protocol.
- [x] Task 5.4: Ready for backend deployment to **Render** with persistent WebSockets enabled (`npm run start --workspace=@anti-gravity/server`).
- [x] Task 5.5: Ready for Vite/React frontend deployment to **Vercel** with environment variable support (`VITE_SERVER_URL`).
- [x] Task 5.6: Verified E2E local multiplayer flow with zero compilation errors.

*Verification:* All 13 automated tests pass, zero type errors, production build verified.