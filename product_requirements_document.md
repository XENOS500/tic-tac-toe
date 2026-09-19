# Product Requirements Document (PRD)

## Project: Anti-Gravity 2-Player Real-Time Tic-Tac-Toe
- **Document Version:** 1.0.0
- **Status:** Approved for Implementation

---

## 1. Executive Summary & Vision
Standard Tic-Tac-Toe is a solved game that frequently ends in repetitive draws. **Anti-Gravity Tic-Tac-Toe** transforms classic 3x3 play into a dynamic, physics-driven tactical duel. 

Tokens (X and O) are physical bodies with mass, restitution (bounciness), and buoyancy. The play arena features inverted, fluctuating, or zero-gravity states, directional gravity shifts, and micro-concussions triggered by placement impacts. The objective remains achieving three-in-a-row, but players must contend with shifting alignments, falling/floating pieces, and spatial destabilization.

---

## 2. Target Audience & Personas
1. **Casual Web Gamers:** Looking for immediate, browser-based 1v1 action without account registration.
2. **Competitive Party Players:** Seeking novel twists on familiar mechanics where physics disruption creates emergent tactics.

---

## 3. Core Mechanics & Game Rules

### 3.1 The Grid & Physics Arena
- **Grid Layout:** 3x3 cells, framed by rigid boundary barriers (hollow slots or open boundaries with retaining force fields).
- **Physical Properties:**
  - Cells are volumetric boundaries rather than static index slots.
  - Pieces are rigid bodies: **X** has higher mass and angular drag; **O** is spherical/toroidal with higher elasticity and lower friction.
- **Gravity States:**
  - **Inverted Gravity ($g < 0$):** Standard baseline where pieces float upward into slots rather than resting at the bottom.
  - **Gravity Shift Events:** Every $N$ turns (or via random anomalies), the gravity vector $\vec{g} = (g_x, g_y)$ rotates $90^\circ$ or reverses, redistributing unsecured pieces.
  - **Micro-Impulse Placement:** Dropping a piece exerts an impulse force ($J$) on neighboring cells, potentially dislodging pieces not firmly locked.

### 3.2 Win Condition & Cell "Settlement"
- A cell is only claimed when a piece's linear velocity $\|\vec{v}\| < \epsilon$ and angular velocity $\|\omega\| < \epsilon$ for $> 600\text{ ms}$ while inside a cell boundary zone.
- Traditional 3-in-a-row (horizontal, vertical, diagonal) wins the game.
- If a gravity shift knocks a previously aligned line out of place before settlement, the win is not awarded.

---

## 4. Feature Requirements

### 4.1 Matchmaking & Room Management
- **Instant Match Creation:** Generate a short, collision-resistant room code (e.g., `nanoid(6)`).
- **Join via Link/Code:** Peer can join by entering the 6-character room code or clicking an invite link (`?room=<id>`).
- **Spectator Mode (Optional/P2):** Read-only connections when room capacity ($N=2$) is saturated.

### 4.2 Real-Time Networking
- Sub-50ms latency synchronization for authoritative physics state updates or input replay.
- Automatic disconnection detection with a 15-second grace window for reconnects.
- Instant round reset and rematch protocol.

### 4.3 Client Experience & Audio-Visual
- **Visuals:** Canvas-based rendering (Pixi.js, Three.js, or Matter.js canvas) with retro-futuristic particle effects and anti-gravity dust motes indicating current gravity direction.
- **HUD:** Active gravity vector indicator, turn indicator, connection status ping, and rematch overlay.
- **Audio (Synthesized / Web Audio API):** Mechanical clanks on collision, gravity shift whoosh, win fanfare.

---

## 5. Non-Functional Requirements
- **Performance:** 60 FPS continuous rendering on standard modern mobile and desktop browsers.
- **Latency Tolerance:** Smooth interpolation even under network jitter up to $150\text{ ms}$.
- **Security & Integrity:** Move validation (turn order, input boundaries) must be verified server-side to prevent malicious clients from arbitrarily spawning pieces.

---

## 6. Success Metrics
- **Mean Time to First Game:** Under 10 seconds from landing on the root page.
- **Draw Rate Reduction:** Draws should occur in less than 15% of total completed matches (vs. ~90% in skilled standard Tic-Tac-Toe).
- **Connection Reliability:** $< 1\%$ dropouts due to unhandled WebSocket disconnects.