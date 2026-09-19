import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as ClientSocket, Socket } from 'socket.io-client';
import { server } from '../server';
import { C2SEvents, S2CEvents } from '@anti-gravity/shared';

describe('Classic Multiplayer & Health Monitor E2E Integration', () => {
  const PORT = 3098;
  let client1: Socket<S2CEvents, C2SEvents>;
  let client2: Socket<S2CEvents, C2SEvents>;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server.listen(PORT, () => resolve());
    });
  });

  afterAll(async () => {
    if (client1) client1.disconnect();
    if (client2) client2.disconnect();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('responds with 200 OK and health stats on /health route', async () => {
    const res = await fetch(`http://localhost:${PORT}/health`);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(json.timestamp).toBeDefined();
    expect(json.service).toBe('realtime-tictactoe-server');
  });

  it('orchestrates a full 2-player real-time match over WebSockets', async () => {
    // 1. Connect Client 1
    client1 = ClientSocket(`http://localhost:${PORT}`, {
      transports: ['websocket'],
      forceNew: true,
    });

    await new Promise<void>((resolve) => {
      client1.on('connect', () => resolve());
    });

    // 2. Client 1 creates room
    let roomId = '';
    await new Promise<void>((resolve) => {
      client1.emit('room:create', { displayName: 'Player 1' }, (res) => {
        roomId = res.roomId;
        resolve();
      });
    });

    expect(roomId).toBeDefined();
    expect(roomId.length).toBe(6);

    // 3. Connect Client 2 and join room
    client2 = ClientSocket(`http://localhost:${PORT}`, {
      transports: ['websocket'],
      forceNew: true,
    });

    await new Promise<void>((resolve) => {
      client2.on('connect', () => resolve());
    });

    let joinSuccess = false;
    await new Promise<void>((resolve) => {
      client2.emit('room:join', { roomId, displayName: 'Player 2' }, (res) => {
        joinSuccess = res.success;
        resolve();
      });
    });

    expect(joinSuccess).toBe(true);

    // 4. Client 1 makes move on cell 0
    const moveUpdatePromise = new Promise<{ board: any[]; activeTurn: string }>((resolve) => {
      client2.once('board:updated', (payload) => resolve(payload));
    });

    client1.emit('game:make_move', { cellIndex: 0 });

    const update1 = await moveUpdatePromise;
    expect(update1.board[0]).toBe('X');
    expect(update1.activeTurn).toBe('O');

    // 5. Client 2 makes move on cell 4
    const moveUpdatePromise2 = new Promise<{ board: any[]; activeTurn: string }>((resolve) => {
      client1.once('board:updated', (payload) => resolve(payload));
    });

    client2.emit('game:make_move', { cellIndex: 4 });

    const update2 = await moveUpdatePromise2;
    expect(update2.board[4]).toBe('O');
    expect(update2.activeTurn).toBe('X');
  });
});
