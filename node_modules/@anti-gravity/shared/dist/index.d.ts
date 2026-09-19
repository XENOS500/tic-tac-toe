/**
 * Classic Real-Time Multiplayer Tic-Tac-Toe Shared Contracts
 */
export type PlayerSymbol = 'X' | 'O';
export type MatchStatus = 'WAITING_FOR_PLAYER' | 'IN_PROGRESS' | 'ROUND_ENDED' | 'ABANDONED';
export interface Player {
    socketId: string;
    reconnectToken: string;
    symbol: PlayerSymbol;
    displayName: string;
    connected: boolean;
    score: number;
}
export interface GameRoom {
    id: string;
    createdAt: number;
    status: MatchStatus;
    players: {
        X: Player | null;
        O: Player | null;
    };
    activeTurn: PlayerSymbol;
    turnTimeoutTimestamp: number;
    board: Array<PlayerSymbol | null>;
    winningLine: number[] | null;
}
export interface C2SEvents {
    'room:create': (payload: {
        displayName: string;
    }, callback: (res: {
        roomId: string;
        token: string;
    }) => void) => void;
    'room:join': (payload: {
        roomId: string;
        displayName: string;
        reconnectToken?: string;
    }, callback: (res: {
        success: boolean;
        error?: string;
    }) => void) => void;
    'game:make_move': (payload: {
        cellIndex: number;
    }) => void;
    'match:rematch_request': () => void;
    'match:leave': () => void;
}
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
        lastMove?: {
            cellIndex: number;
            symbol: PlayerSymbol;
        };
    }) => void;
    'match:game_over': (payload: {
        winner: PlayerSymbol | 'DRAW';
        winningLine: number[] | null;
        finalScore: {
            X: number;
            O: number;
        };
    }) => void;
    'error:notice': (payload: {
        message: string;
    }) => void;
}
export declare const WINNING_COMBINATIONS: [number, number, number][];
export declare const TURN_TIMEOUT_SECONDS = 30;
export declare const RECONNECT_GRACE_WINDOW_MS = 15000;
export declare const HEALTH_CHECK_INTERVAL_MS = 15000;
//# sourceMappingURL=index.d.ts.map