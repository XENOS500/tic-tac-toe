import { nanoid } from 'nanoid';
import {
  GameRoom,
  Player,
  PlayerSymbol,
  WINNING_COMBINATIONS,
  TURN_TIMEOUT_SECONDS,
  RECONNECT_GRACE_WINDOW_MS,
} from '@anti-gravity/shared';

export interface RoomSession {
  room: GameRoom;
  rematchVotes: Set<PlayerSymbol>;
  reconnectTimers: Map<string, NodeJS.Timeout>; // key: reconnectToken
}

export class RoomManager {
  private rooms: Map<string, RoomSession> = new Map();
  private socketToRoom: Map<string, string> = new Map();
  private tokenToPlayer: Map<string, { roomId: string; symbol: PlayerSymbol }> = new Map();

  /**
   * Generates a 6-character room code (e.g. "AG48X2")
   */
  private generateRoomId(): string {
    return nanoid(6).toUpperCase();
  }

  /**
   * Creates a new game room with host player as 'X'
   */
  public createRoom(
    hostSocketId: string,
    displayName: string
  ): { room: GameRoom; reconnectToken: string } {
    const roomId = this.generateRoomId();
    const reconnectToken = nanoid(24);

    const hostPlayer: Player = {
      socketId: hostSocketId,
      reconnectToken,
      symbol: 'X',
      displayName: displayName.trim() || 'Player X',
      connected: true,
      score: 0,
    };

    const room: GameRoom = {
      id: roomId,
      createdAt: Date.now(),
      status: 'WAITING_FOR_PLAYER',
      players: {
        X: hostPlayer,
        O: null,
      },
      activeTurn: 'X',
      turnTimeoutTimestamp: 0,
      board: Array(9).fill(null),
      winningLine: null,
    };

    const session: RoomSession = {
      room,
      rematchVotes: new Set(),
      reconnectTimers: new Map(),
    };

    this.rooms.set(roomId, session);
    this.socketToRoom.set(hostSocketId, roomId);
    this.tokenToPlayer.set(reconnectToken, { roomId, symbol: 'X' });

    return { room, reconnectToken };
  }

  /**
   * Joins an existing room or reconnects a previous session
   */
  public joinRoom(
    roomId: string,
    socketId: string,
    displayName: string,
    reconnectToken?: string
  ): {
    success: boolean;
    room?: GameRoom;
    reconnectToken?: string;
    role?: PlayerSymbol;
    reconnected?: boolean;
    error?: string;
  } {
    const cleanRoomId = roomId.trim().toUpperCase();
    const session = this.rooms.get(cleanRoomId);
    if (!session) {
      return { success: false, error: 'Chamber not found' };
    }

    const { room } = session;

    // Check reconnection first
    if (reconnectToken) {
      const mapping = this.tokenToPlayer.get(reconnectToken);
      if (mapping && mapping.roomId === room.id) {
        const player = room.players[mapping.symbol];
        if (player) {
          // Clear active grace timer
          const timer = session.reconnectTimers.get(reconnectToken);
          if (timer) {
            clearTimeout(timer);
            session.reconnectTimers.delete(reconnectToken);
          }

          // Re-bind socket ID
          this.socketToRoom.delete(player.socketId);
          player.socketId = socketId;
          player.connected = true;
          this.socketToRoom.set(socketId, room.id);

          return {
            success: true,
            room,
            reconnectToken,
            role: mapping.symbol,
            reconnected: true,
          };
        }
      }
    }

    // New player joining as 'O'
    if (room.players.O !== null && room.players.O.connected) {
      return { success: false, error: 'Chamber is already full' };
    }

    const newReconnectToken = nanoid(24);
    const guestPlayer: Player = {
      socketId,
      reconnectToken: newReconnectToken,
      symbol: 'O',
      displayName: displayName.trim() || 'Player O',
      connected: true,
      score: 0,
    };

    room.players.O = guestPlayer;
    room.status = 'IN_PROGRESS';
    room.activeTurn = 'X';
    room.turnTimeoutTimestamp = Date.now() + TURN_TIMEOUT_SECONDS * 1000;

    this.socketToRoom.set(socketId, room.id);
    this.tokenToPlayer.set(newReconnectToken, { roomId: room.id, symbol: 'O' });

    return {
      success: true,
      room,
      reconnectToken: newReconnectToken,
      role: 'O',
      reconnected: false,
    };
  }

  /**
   * Executes a move on cell 0-8 for the active player
   */
  public makeMove(
    socketId: string,
    cellIndex: number
  ): {
    success: boolean;
    error?: string;
    room?: GameRoom;
    gameOver?: boolean;
    winner?: PlayerSymbol | 'DRAW';
    winningLine?: number[] | null;
    finalScore?: { X: number; O: number };
    lastMove?: { cellIndex: number; symbol: PlayerSymbol };
  } {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return { success: false, error: 'Not in a chamber' };

    const session = this.rooms.get(roomId);
    if (!session) return { success: false, error: 'Chamber session not found' };

    const { room } = session;

    if (room.status !== 'IN_PROGRESS') {
      return { success: false, error: 'Match is not in progress' };
    }

    const player =
      room.players.X?.socketId === socketId
        ? room.players.X
        : room.players.O?.socketId === socketId
        ? room.players.O
        : null;

    if (!player) return { success: false, error: 'Player identity not found' };
    if (room.activeTurn !== player.symbol) return { success: false, error: 'Not your turn' };
    if (cellIndex < 0 || cellIndex > 8 || !Number.isInteger(cellIndex)) {
      return { success: false, error: 'Invalid cell index' };
    }
    if (room.board[cellIndex] !== null) {
      return { success: false, error: 'Cell is already occupied' };
    }

    // Apply move
    room.board[cellIndex] = player.symbol;

    // Check for Win
    for (const combo of WINNING_COMBINATIONS) {
      const [a, b, c] = combo;
      if (
        room.board[a] === player.symbol &&
        room.board[b] === player.symbol &&
        room.board[c] === player.symbol
      ) {
        room.status = 'ROUND_ENDED';
        room.winningLine = [a, b, c];
        player.score++;

        const finalScore = {
          X: room.players.X?.score || 0,
          O: room.players.O?.score || 0,
        };

        return {
          success: true,
          gameOver: true,
          winner: player.symbol,
          winningLine: [a, b, c],
          finalScore,
          room,
          lastMove: { cellIndex, symbol: player.symbol },
        };
      }
    }

    // Check for Draw (all 9 cells filled)
    const isDraw = room.board.every((cell) => cell !== null);
    if (isDraw) {
      room.status = 'ROUND_ENDED';
      room.winningLine = null;

      const finalScore = {
        X: room.players.X?.score || 0,
        O: room.players.O?.score || 0,
      };

      return {
        success: true,
        gameOver: true,
        winner: 'DRAW',
        winningLine: null,
        finalScore,
        room,
        lastMove: { cellIndex, symbol: player.symbol },
      };
    }

    // Switch Turn
    room.activeTurn = room.activeTurn === 'X' ? 'O' : 'X';
    room.turnTimeoutTimestamp = Date.now() + TURN_TIMEOUT_SECONDS * 1000;

    return {
      success: true,
      gameOver: false,
      room,
      lastMove: { cellIndex, symbol: player.symbol },
    };
  }

  /**
   * Rematch handshake
   */
  public requestRematch(socketId: string): {
    agreed: boolean;
    room?: GameRoom;
    role?: PlayerSymbol;
  } {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return { agreed: false };

    const session = this.rooms.get(roomId);
    if (!session) return { agreed: false };

    const { room } = session;
    const playerSymbol: PlayerSymbol | null =
      room.players.X?.socketId === socketId
        ? 'X'
        : room.players.O?.socketId === socketId
        ? 'O'
        : null;

    if (!playerSymbol) return { agreed: false };

    session.rematchVotes.add(playerSymbol);

    if (session.rematchVotes.size >= 2) {
      // Both agreed -> Reset board for new round
      room.board = Array(9).fill(null);
      room.winningLine = null;
      room.status = 'IN_PROGRESS';
      room.activeTurn = 'X';
      room.turnTimeoutTimestamp = Date.now() + TURN_TIMEOUT_SECONDS * 1000;
      session.rematchVotes.clear();

      return { agreed: true, room, role: playerSymbol };
    }

    return { agreed: false, room, role: playerSymbol };
  }

  /**
   * Handle socket disconnection with 15-second grace window
   */
  public handleDisconnect(
    socketId: string,
    onGraceStarted: (room: GameRoom, player: Player) => void,
    onExpired: (room: GameRoom, player: Player) => void
  ): void {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return;

    const session = this.rooms.get(roomId);
    if (!session) return;

    const { room } = session;
    const player =
      room.players.X?.socketId === socketId
        ? room.players.X
        : room.players.O?.socketId === socketId
        ? room.players.O
        : null;

    if (!player) return;

    player.connected = false;
    this.socketToRoom.delete(socketId);

    onGraceStarted(room, player);

    // 15-second grace window
    const timer = setTimeout(() => {
      session.reconnectTimers.delete(player.reconnectToken);
      if (!player.connected) {
        room.status = 'ABANDONED';
        onExpired(room, player);
      }
    }, RECONNECT_GRACE_WINDOW_MS);

    session.reconnectTimers.set(player.reconnectToken, timer);
  }

  /**
   * Leave chamber explicitly
   */
  public leaveRoom(socketId: string): { room?: GameRoom; player?: Player } {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return {};

    const session = this.rooms.get(roomId);
    if (!session) return {};

    const { room } = session;
    const player =
      room.players.X?.socketId === socketId
        ? room.players.X
        : room.players.O?.socketId === socketId
        ? room.players.O
        : null;

    if (!player) return {};

    room.status = 'ABANDONED';
    this.socketToRoom.delete(socketId);
    this.tokenToPlayer.delete(player.reconnectToken);

    return { room, player };
  }

  public getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId.toUpperCase())?.room;
  }

  public getAllRooms(): Map<string, RoomSession> {
    return this.rooms;
  }
}
