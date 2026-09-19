"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomManager = exports.io = exports.server = exports.app = void 0;
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const socket_io_1 = require("socket.io");
const shared_1 = require("@anti-gravity/shared");
const RoomManager_1 = require("./room/RoomManager");
const app = (0, express_1.default)();
exports.app = app;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const roomManager = new RoomManager_1.RoomManager();
exports.roomManager = roomManager;
/**
 * Health Check Route
 * Used by Render, uptime monitors (UptimeRobot, cron-job.org), and internal monitor
 */
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        uptimeSeconds: Math.floor(process.uptime()),
        activeRooms: roomManager.getAllRooms().size,
        timestamp: Date.now(),
        service: 'realtime-tictactoe-server',
    });
});
const server = http_1.default.createServer(app);
exports.server = server;
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
    pingInterval: 5000,
    pingTimeout: 10000,
});
exports.io = io;
io.on('connection', (socket) => {
    // Create Room
    socket.on('room:create', ({ displayName }, callback) => {
        try {
            const { room, reconnectToken } = roomManager.createRoom(socket.id, displayName);
            socket.join(room.id);
            callback({ roomId: room.id, token: reconnectToken });
            socket.emit('match:initialized', {
                room,
                yourRole: 'X',
            });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to create chamber';
            socket.emit('error:notice', { message: msg });
        }
    });
    // Join Room
    socket.on('room:join', ({ roomId, displayName, reconnectToken }, callback) => {
        try {
            const result = roomManager.joinRoom(roomId, socket.id, displayName, reconnectToken);
            if (!result.success || !result.room) {
                callback({ success: false, error: result.error || 'Failed to join chamber' });
                return;
            }
            socket.join(result.room.id);
            callback({ success: true });
            // Notify joining player
            socket.emit('match:initialized', {
                room: result.room,
                yourRole: result.role || 'O',
            });
            if (result.reconnected) {
                socket.to(result.room.id).emit('match:player_status', {
                    symbol: result.role || 'O',
                    connected: true,
                });
            }
            else {
                // Both players are in; notify host that match started
                socket.to(result.room.id).emit('match:initialized', {
                    room: result.room,
                    yourRole: 'X',
                });
            }
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Error joining chamber';
            callback({ success: false, error: msg });
        }
    });
    // Handle Make Move on cell 0-8
    socket.on('game:make_move', ({ cellIndex }) => {
        const result = roomManager.makeMove(socket.id, cellIndex);
        if (!result.success || !result.room) {
            socket.emit('error:notice', { message: result.error || 'Invalid move' });
            return;
        }
        const { room } = result;
        // Broadcast updated board to all peers in the room
        io.to(room.id).emit('board:updated', {
            board: room.board,
            activeTurn: room.activeTurn,
            lastMove: result.lastMove,
        });
        // If game ended, broadcast game over
        if (result.gameOver && result.winner && result.finalScore) {
            io.to(room.id).emit('match:game_over', {
                winner: result.winner,
                winningLine: result.winningLine || null,
                finalScore: result.finalScore,
            });
        }
    });
    // Rematch Request
    socket.on('match:rematch_request', () => {
        const result = roomManager.requestRematch(socket.id);
        if (result.agreed && result.room) {
            const room = result.room;
            if (room.players.X) {
                io.to(room.players.X.socketId).emit('match:initialized', {
                    room,
                    yourRole: 'X',
                });
            }
            if (room.players.O) {
                io.to(room.players.O.socketId).emit('match:initialized', {
                    room,
                    yourRole: 'O',
                });
            }
            io.to(room.id).emit('board:updated', {
                board: room.board,
                activeTurn: room.activeTurn,
            });
        }
    });
    // Leave Match
    socket.on('match:leave', () => {
        const { room, player } = roomManager.leaveRoom(socket.id);
        if (room && player) {
            socket.to(room.id).emit('match:player_status', {
                symbol: player.symbol,
                connected: false,
            });
            socket.to(room.id).emit('error:notice', {
                message: `${player.displayName} has left the match.`,
            });
        }
    });
    // Disconnect with 15-second grace window
    socket.on('disconnect', () => {
        roomManager.handleDisconnect(socket.id, (room, player) => {
            socket.to(room.id).emit('match:player_status', {
                symbol: player.symbol,
                connected: false,
            });
        }, (room, player) => {
            // Grace expired -> Match abandoned
            io.to(room.id).emit('match:game_over', {
                winner: player.symbol === 'X' ? 'O' : 'X',
                winningLine: null,
                finalScore: {
                    X: room.players.X?.score || 0,
                    O: room.players.O?.score || 0,
                },
            });
            io.to(room.id).emit('error:notice', {
                message: `${player.displayName} disconnected. Chamber abandoned.`,
            });
        });
    });
});
/**
 * 15-Second Health Monitor & Sleep Prevention Task
 * Keeps the process active and self-pings if deployed to platforms like Render
 */
let checkCount = 0;
setInterval(async () => {
    checkCount++;
    const activeRooms = roomManager.getAllRooms().size;
    if (checkCount % 4 === 0) {
        console.log(`[Health Monitor - 15s] Heartbeat OK | Active Chambers: ${activeRooms} | Uptime: ${Math.floor(process.uptime())}s`);
    }
    // Self-ping Render external URL to keep free-tier containers from idling
    const externalUrl = process.env.RENDER_EXTERNAL_URL || process.env.SELF_PING_URL;
    if (externalUrl) {
        try {
            const pingEndpoint = `${externalUrl.replace(/\/$/, '')}/health`;
            await fetch(pingEndpoint);
        }
        catch {
            // Ignore network errors on self-ping
        }
    }
}, shared_1.HEALTH_CHECK_INTERVAL_MS);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, () => {
        console.log(`Real-Time Tic-Tac-Toe Server listening on port ${PORT}`);
        console.log(`Health endpoint available at http://localhost:${PORT}/health`);
    });
}
