"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const socket_io_client_1 = require("socket.io-client");
const server_1 = require("../server");
(0, vitest_1.describe)('Classic Multiplayer & Health Monitor E2E Integration', () => {
    const PORT = 3098;
    let client1;
    let client2;
    (0, vitest_1.beforeAll)(async () => {
        await new Promise((resolve) => {
            server_1.server.listen(PORT, () => resolve());
        });
    });
    (0, vitest_1.afterAll)(async () => {
        if (client1)
            client1.disconnect();
        if (client2)
            client2.disconnect();
        await new Promise((resolve) => {
            server_1.server.close(() => resolve());
        });
    });
    (0, vitest_1.it)('responds with 200 OK and health stats on /health route', async () => {
        const res = await fetch(`http://localhost:${PORT}/health`);
        (0, vitest_1.expect)(res.status).toBe(200);
        const json = await res.json();
        (0, vitest_1.expect)(json.status).toBe('ok');
        (0, vitest_1.expect)(json.uptimeSeconds).toBeGreaterThanOrEqual(0);
        (0, vitest_1.expect)(json.timestamp).toBeDefined();
        (0, vitest_1.expect)(json.service).toBe('realtime-tictactoe-server');
    });
    (0, vitest_1.it)('orchestrates a full 2-player real-time match over WebSockets', async () => {
        // 1. Connect Client 1
        client1 = (0, socket_io_client_1.io)(`http://localhost:${PORT}`, {
            transports: ['websocket'],
            forceNew: true,
        });
        await new Promise((resolve) => {
            client1.on('connect', () => resolve());
        });
        // 2. Client 1 creates room
        let roomId = '';
        await new Promise((resolve) => {
            client1.emit('room:create', { displayName: 'Player 1' }, (res) => {
                roomId = res.roomId;
                resolve();
            });
        });
        (0, vitest_1.expect)(roomId).toBeDefined();
        (0, vitest_1.expect)(roomId.length).toBe(6);
        // 3. Connect Client 2 and join room
        client2 = (0, socket_io_client_1.io)(`http://localhost:${PORT}`, {
            transports: ['websocket'],
            forceNew: true,
        });
        await new Promise((resolve) => {
            client2.on('connect', () => resolve());
        });
        let joinSuccess = false;
        await new Promise((resolve) => {
            client2.emit('room:join', { roomId, displayName: 'Player 2' }, (res) => {
                joinSuccess = res.success;
                resolve();
            });
        });
        (0, vitest_1.expect)(joinSuccess).toBe(true);
        // 4. Client 1 makes move on cell 0
        const moveUpdatePromise = new Promise((resolve) => {
            client2.once('board:updated', (payload) => resolve(payload));
        });
        client1.emit('game:make_move', { cellIndex: 0 });
        const update1 = await moveUpdatePromise;
        (0, vitest_1.expect)(update1.board[0]).toBe('X');
        (0, vitest_1.expect)(update1.activeTurn).toBe('O');
        // 5. Client 2 makes move on cell 4
        const moveUpdatePromise2 = new Promise((resolve) => {
            client1.once('board:updated', (payload) => resolve(payload));
        });
        client2.emit('game:make_move', { cellIndex: 4 });
        const update2 = await moveUpdatePromise2;
        (0, vitest_1.expect)(update2.board[4]).toBe('O');
        (0, vitest_1.expect)(update2.activeTurn).toBe('X');
    });
});
