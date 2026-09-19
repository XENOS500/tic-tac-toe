/**
 * Classic Real-Time Multiplayer Tic-Tac-Toe Shared Contracts
 */

export type PlayerSymbol = 'X' | 'O';

export type MatchStatus =
  | 'WAITING_FOR_PLAYER'
  | 'IN_PROGRESS'
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
  id: string; // 6-character room code (e.g. "ag-48x2")
  createdAt: number;
  status: MatchStatus;
  players: {
    X: Player | null;
    O: Player | null;
  };
  activeTurn: PlayerSymbol;
  turnTimeoutTimestamp: number;
  board: Array<PlayerSymbol | null>; // 9 cells (0 to 8)
  winningLine: number[] | null; // e.g. [0, 1, 2]
}

// Client to Server Events (C2S)
export interface C2SEvents {
  'room:create': (
    payload: { displayName: string },
    callback: (res: { roomId: string; token: string }) => void
  ) => void;

  'room:join': (
    payload: { roomId: string; displayName: string; reconnectToken?: string },
    callback: (res: { success: boolean; error?: string }) => void
  ) => void;

  'game:make_move': (payload: { cellIndex: number }) => void;

  'match:rematch_request': () => void;

  'match:leave': () => void;
}

// Server to Client Events (S2C)
export interface S2CEvents {
  'match:initialized': (payload: {
    room: GameRoom;
    yourRole: PlayerSymbol;
  }) => void;

  'match:player_status': (payload: {
    symbol: PlayerSymbol;
    connected: boolean;
  }) => void;

  'board:updated': (payload: {
    board: Array<PlayerSymbol | null>;
    activeTurn: PlayerSymbol;
    lastMove?: { cellIndex: number; symbol: PlayerSymbol };
  }) => void;

  'match:game_over': (payload: {
    winner: PlayerSymbol | 'DRAW';
    winningLine: number[] | null;
    finalScore: { X: number; O: number };
  }) => void;

  'error:notice': (payload: { message: string }) => void;
}

export const WINNING_COMBINATIONS: [number, number, number][] = [
  [0, 1, 2], // Row 0
  [3, 4, 5], // Row 1
  [6, 7, 8], // Row 2
  [0, 3, 6], // Col 0
  [1, 4, 7], // Col 1
  [2, 5, 8], // Col 2
  [0, 4, 8], // Diag 1
  [2, 4, 6], // Diag 2
];

export const TURN_TIMEOUT_SECONDS = 30;
export const RECONNECT_GRACE_WINDOW_MS = 15000;
export const HEALTH_CHECK_INTERVAL_MS = 15000; // 15 seconds keep-alive monitor
