import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoomManager } from '../RoomManager';

describe('Classic Tic-Tac-Toe RoomManager', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  it('creates a room with an initial host player as X', () => {
    const { room, reconnectToken } = roomManager.createRoom('socket-1', 'Alice');
    expect(room.id).toBeDefined();
    expect(room.id.length).toBe(6);
    expect(room.status).toBe('WAITING_FOR_PLAYER');
    expect(room.players.X?.displayName).toBe('Alice');
    expect(room.players.X?.symbol).toBe('X');
    expect(room.players.O).toBeNull();
    expect(room.board).toEqual(Array(9).fill(null));
    expect(reconnectToken).toBeDefined();
  });

  it('allows guest to join as O and transitions status to IN_PROGRESS', () => {
    const { room } = roomManager.createRoom('socket-1', 'Alice');
    const joinResult = roomManager.joinRoom(room.id, 'socket-2', 'Bob');

    expect(joinResult.success).toBe(true);
    expect(joinResult.role).toBe('O');
    expect(room.status).toBe('IN_PROGRESS');
    expect(room.players.O?.displayName).toBe('Bob');
    expect(room.activeTurn).toBe('X');
  });

  it('handles valid moves and enforces turn alternation', () => {
    const { room } = roomManager.createRoom('socket-1', 'Alice');
    roomManager.joinRoom(room.id, 'socket-2', 'Bob');

    // Alice makes move on cell 0
    const move1 = roomManager.makeMove('socket-1', 0);
    expect(move1.success).toBe(true);
    expect(room.board[0]).toBe('X');
    expect(room.activeTurn).toBe('O');

    // Alice tries to move again out of turn -> fails
    const move2 = roomManager.makeMove('socket-1', 1);
    expect(move2.success).toBe(false);
    expect(move2.error).toContain('turn');

    // Bob tries to claim already occupied cell 0 -> fails
    const move3 = roomManager.makeMove('socket-2', 0);
    expect(move3.success).toBe(false);
    expect(move3.error).toContain('occupied');

    // Bob moves on cell 4 -> success
    const move4 = roomManager.makeMove('socket-2', 4);
    expect(move4.success).toBe(true);
    expect(room.board[4]).toBe('O');
    expect(room.activeTurn).toBe('X');
  });

  it('detects horizontal 3-in-a-row victory', () => {
    const { room } = roomManager.createRoom('socket-1', 'Alice');
    roomManager.joinRoom(room.id, 'socket-2', 'Bob');

    // Alice: 0, Bob: 3, Alice: 1, Bob: 4, Alice: 2 (Row 0 win)
    roomManager.makeMove('socket-1', 0); // X
    roomManager.makeMove('socket-2', 3); // O
    roomManager.makeMove('socket-1', 1); // X
    roomManager.makeMove('socket-2', 4); // O
    const winMove = roomManager.makeMove('socket-1', 2); // X

    expect(winMove.success).toBe(true);
    expect(winMove.gameOver).toBe(true);
    expect(winMove.winner).toBe('X');
    expect(winMove.winningLine).toEqual([0, 1, 2]);
    expect(room.players.X?.score).toBe(1);
    expect(room.status).toBe('ROUND_ENDED');
  });

  it('detects diagonal 3-in-a-row victory', () => {
    const { room } = roomManager.createRoom('socket-1', 'Alice');
    roomManager.joinRoom(room.id, 'socket-2', 'Bob');

    // Alice: 0, Bob: 1, Alice: 4, Bob: 2, Alice: 8 (Diag 0, 4, 8)
    roomManager.makeMove('socket-1', 0);
    roomManager.makeMove('socket-2', 1);
    roomManager.makeMove('socket-1', 4);
    roomManager.makeMove('socket-2', 2);
    const winMove = roomManager.makeMove('socket-1', 8);

    expect(winMove.gameOver).toBe(true);
    expect(winMove.winner).toBe('X');
    expect(winMove.winningLine).toEqual([0, 4, 8]);
  });

  it('detects a draw when all cells are filled without a 3-in-a-row', () => {
    const { room } = roomManager.createRoom('socket-1', 'Alice');
    roomManager.joinRoom(room.id, 'socket-2', 'Bob');

    // Board configuration for draw:
    // X O X
    // X X O
    // O X O
    const moves = [
      { p: 'socket-1', c: 0 }, // X
      { p: 'socket-2', c: 1 }, // O
      { p: 'socket-1', c: 2 }, // X
      { p: 'socket-2', c: 5 }, // O
      { p: 'socket-1', c: 3 }, // X
      { p: 'socket-2', c: 6 }, // O
      { p: 'socket-1', c: 4 }, // X
      { p: 'socket-2', c: 8 }, // O
      { p: 'socket-1', c: 7 }, // X
    ];

    let lastResult: any;
    for (const m of moves) {
      lastResult = roomManager.makeMove(m.p, m.c);
    }

    expect(lastResult.gameOver).toBe(true);
    expect(lastResult.winner).toBe('DRAW');
    expect(lastResult.winningLine).toBeNull();
  });

  it('handles disconnection grace period and reconnection with token', () => {
    const { room, reconnectToken } = roomManager.createRoom('socket-1', 'Alice');
    roomManager.joinRoom(room.id, 'socket-2', 'Bob');

    const onGrace = vi.fn();
    const onExpired = vi.fn();

    // Alice disconnects
    roomManager.handleDisconnect('socket-1', onGrace, onExpired);
    expect(room.players.X?.connected).toBe(false);
    expect(onGrace).toHaveBeenCalledTimes(1);

    // Alice reconnects
    const recon = roomManager.joinRoom(room.id, 'socket-1-new', 'Alice', reconnectToken);
    expect(recon.success).toBe(true);
    expect(recon.reconnected).toBe(true);
    expect(room.players.X?.connected).toBe(true);
    expect(room.players.X?.socketId).toBe('socket-1-new');
  });
});
