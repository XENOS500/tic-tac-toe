# Data Model & Schema Specifications

## Project: Anti-Gravity 2-Player Real-Time Tic-Tac-Toe
- **Document Version:** 1.0.0
- **Type Definitions:** Strict TypeScript schemas for client and server.

---

## 1. Domain Entities & Type Definitions

### 1.1 Vector & Spatial Primitives
```typescript
export interface Vector2D {
  x: number;
  y: number;
}

export interface GravityField {
  x: number;
  y: number;
  scale: number;
  shiftIntervalTurns: number;
  turnsUntilShift: number;
}
```

### 1.2 Physical Token Entities
```typescript
export type PlayerSymbol = 'X' | 'O';

export interface PhysicalToken {
  id: string; // Unique entity UUID
  owner: PlayerSymbol;
  position: Vector2D;
  velocity: Vector2D;
  angle: number;
  angularVelocity: number;
  mass: number;
  isSettled: boolean;
  settledCellIndex: number | null; // 0-8 representing the 3x3 grid, or null if floating
}
```

### 1.3 Grid Cell & Settlement Status
```typescript
export interface CellBoundary {
  index: number; // 0 to 8
  row: number;   // 0, 1, 2
  col: number;   // 0, 1, 2
  center: Vector2D;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  claimedBy: PlayerSymbol | null;
}
```

### 1.4 Game Session & Room State
```typescript
export type MatchStatus = 
  | 'WAITING_FOR_PLAYER'
  | 'IN_PROGRESS'
  | 'SETTLING'
  | 'ROUND_ENDED'
  | 'ABANDONED';

export interface Player {
  socketId: string;
  reconnectToken: string;
  symbol: PlayerSymbol;
  displayName: string;
  connected: boolean;
  score: number;
}

export interface GameRoom {
  id: string; // Short code e.g., "ag-48x2"
  createdAt: number;
  status: MatchStatus;
  players: {
    X: Player | null;
    O: Player | null;
  };
  activeTurn: PlayerSymbol;
  turnTimeoutTimestamp: number;
  gravity: GravityField;
  cells: CellBoundary[];
  tokens: PhysicalToken[];
  winningCombination: number[] | null; // e.g., [0, 1, 2]
}
```

---

## 2. WebSocket Protocol Schema

### 2.1 Client-to-Server Events (`C2S`)

```typescript
export interface C2SEvents {
  'room:create': (payload: { displayName: string }, callback: (res: { roomId: string; token: string }) => void) => void;
  
  'room:join': (payload: { roomId: string; displayName: string; reconnectToken?: string }, callback: (res: { success: boolean; error?: string }) => void) => void;
  
  'token:drop': (payload: { column: number; dropImpulse?: Vector2D }) => void;
  
  'match:rematch_request': () => void;
  
  'match:leave': () => void;
}
```

### 2.2 Server-to-Client Events (`S2C`)

```typescript
export interface WorldSnapshotPayload {
  timestamp: number;
  tokens: Array<{
    id: string;
    owner: PlayerSymbol;
    x: number;
    y: number;
    angle: number;
    vx: number;
    vy: number;
    settled: boolean;
    cellIndex: number | null;
  }>;
  gridClaimedState: Array<PlayerSymbol | null>; // Length 9
  gravity: Vector2D;
}

export interface S2CEvents {
  'match:initialized': (payload: { 
    room: GameRoom; 
    yourRole: PlayerSymbol; 
  }) => void;

  'match:player_status': (payload: { 
    symbol: PlayerSymbol; 
    connected: boolean 
  }) => void;

  'physics:snapshot': (snapshot: WorldSnapshotPayload) => void;

  'turn:changed': (payload: { 
    activeTurn: PlayerSymbol; 
    turnDeadline: number;
    turnsUntilGravityShift: number;
  }) => void;

  'gravity:shifted': (payload: { 
    newVector: Vector2D; 
    intensity: number 
  }) => void;

  'match:game_over': (payload: { 
    winner: PlayerSymbol | 'DRAW'; 
    winningLine: number[] | null; 
    finalScore: { X: number; O: number };
  }) => void;

  'error:notice': (payload: { message: string }) => void;
}
```

---

## 3. In-Memory State Storage Structure

```typescript
// Active runtime storage on authoritative server node
export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();
  private socketToRoom: Map<string, string> = new Map();
  private tokenToPlayer: Map<string, { roomId: string; role: PlayerSymbol }> = new Map();
  
  // Method contracts
  public createRoom(hostSocketId: string, displayName: string): { roomId: string; reconnectToken: string };
  public joinRoom(roomId: string, guestSocketId: string, displayName: string): boolean;
  public getRoom(roomId: string): GameRoom | undefined;
  public handleDisconnect(socketId: string): void;
  public purgeExpiredRooms(ttlMs: number): void;
}
```