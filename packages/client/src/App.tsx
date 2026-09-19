import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  GameRoom,
  PlayerSymbol,
  C2SEvents,
  S2CEvents,
  HEALTH_CHECK_INTERVAL_MS,
} from '@anti-gravity/shared';
import { LandingView } from './components/LandingView';
import { HUD } from './components/HUD';
import { ClassicGrid } from './components/ClassicGrid';
import { GameOverModal } from './components/GameOverModal';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  `${window.location.protocol}//${window.location.hostname}:3001`;

export default function App() {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [myRole, setMyRole] = useState<PlayerSymbol | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Match State
  const [activeTurn, setActiveTurn] = useState<PlayerSymbol>('X');
  const [board, setBoard] = useState<Array<PlayerSymbol | null>>(Array(9).fill(null));
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [gameOverData, setGameOverData] = useState<{
    winner: PlayerSymbol | 'DRAW';
    winningLine: number[] | null;
    finalScore: { X: number; O: number };
  } | null>(null);

  const socketRef = useRef<Socket<S2CEvents, C2SEvents> | null>(null);

  // Periodic 15-second client health ping to keep Render backend warm
  useEffect(() => {
    const pingServerHealth = async () => {
      try {
        await fetch(`${SERVER_URL}/health`);
      } catch {
        // Silently ignore background ping errors
      }
    };

    // Initial ping
    pingServerHealth();
    const interval = setInterval(pingServerHealth, HEALTH_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // Initialize Socket Connection
  useEffect(() => {
    const s: Socket<S2CEvents, C2SEvents> = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
    });

    socketRef.current = s;

    s.on('connect', () => {
      // Auto-reconnect if session data exists
      const savedRoomId = sessionStorage.getItem('ag_room_id');
      const savedToken = sessionStorage.getItem('ag_reconnect_token');
      const savedName = localStorage.getItem('ag_display_name') || 'Player';

      if (savedRoomId && savedToken) {
        s.emit(
          'room:join',
          { roomId: savedRoomId, displayName: savedName, reconnectToken: savedToken },
          (res) => {
            if (!res.success) {
              sessionStorage.removeItem('ag_room_id');
              sessionStorage.removeItem('ag_reconnect_token');
            }
          }
        );
      }
    });

    s.on('match:initialized', ({ room: newRoom, yourRole }) => {
      setRoom(newRoom);
      setMyRole(yourRole);
      setActiveTurn(newRoom.activeTurn);
      setBoard(newRoom.board);
      setWinningLine(newRoom.winningLine);
      setGameOverData(null);
      setIsConnecting(false);
      setErrorMessage(null);

      sessionStorage.setItem('ag_room_id', newRoom.id);
    });

    s.on('board:updated', ({ board: newBoard, activeTurn: nextTurn }) => {
      setBoard(newBoard);
      setActiveTurn(nextTurn);
    });

    s.on('match:player_status', ({ symbol, connected }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        const updated = { ...prev };
        if (updated.players[symbol]) {
          updated.players[symbol]!.connected = connected;
        }
        return updated;
      });
    });

    s.on('match:game_over', ({ winner, winningLine: line, finalScore }) => {
      setGameOverData({ winner, winningLine: line, finalScore });
      setWinningLine(line);
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'ROUND_ENDED',
          winningLine: line,
          players: {
            ...prev.players,
            X: prev.players.X ? { ...prev.players.X, score: finalScore.X } : null,
            O: prev.players.O ? { ...prev.players.O, score: finalScore.O } : null,
          },
        };
      });
    });

    s.on('error:notice', ({ message }) => {
      setErrorMessage(message);
      setIsConnecting(false);
      setTimeout(() => setErrorMessage(null), 5000);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  // Room Creation Action
  const handleCreateRoom = useCallback(
    (displayName: string) => {
      if (!socketRef.current) return;
      setIsConnecting(true);
      setErrorMessage(null);

      socketRef.current.emit('room:create', { displayName }, (res) => {
        sessionStorage.setItem('ag_room_id', res.roomId);
        sessionStorage.setItem('ag_reconnect_token', res.token);
      });
    },
    []
  );

  // Room Join Action
  const handleJoinRoom = useCallback(
    (roomId: string, displayName: string) => {
      if (!socketRef.current) return;
      setIsConnecting(true);
      setErrorMessage(null);

      socketRef.current.emit('room:join', { roomId, displayName }, (res) => {
        if (!res.success) {
          setIsConnecting(false);
          setErrorMessage(res.error || 'Failed to join chamber');
        }
      });
    },
    []
  );

  // Make Move Action
  const handleMakeMove = useCallback(
    (cellIndex: number) => {
      if (!socketRef.current) return;
      socketRef.current.emit('game:make_move', { cellIndex });
    },
    []
  );

  // Rematch Request Action
  const handleRematch = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('match:rematch_request');
  }, []);

  // Leave Match Action
  const handleLeaveRoom = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('match:leave');
    }
    sessionStorage.removeItem('ag_room_id');
    sessionStorage.removeItem('ag_reconnect_token');
    setRoom(null);
    setMyRole(null);
    setBoard(Array(9).fill(null));
    setWinningLine(null);
    setGameOverData(null);
    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  // Render Landing View if not in a room
  if (!room) {
    return (
      <LandingView
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        isConnecting={isConnecting}
        errorMessage={errorMessage}
      />
    );
  }

  const isMyTurn = myRole === activeTurn && room.status === 'IN_PROGRESS';

  return (
    <div className="min-h-screen flex flex-col justify-between p-3 sm:p-5 select-none relative">
      {/* Heads Up Display (Scoreboard & Room Code) */}
      <HUD
        room={room}
        myRole={myRole}
        activeTurn={activeTurn}
        onLeaveRoom={handleLeaveRoom}
      />

      {/* Classic 3x3 Grid */}
      <main className="flex-1 flex items-center justify-center my-auto py-4">
        <ClassicGrid
          board={board}
          isMyTurn={isMyTurn}
          myRole={myRole}
          winningLine={winningLine}
          isGameOver={gameOverData !== null}
          onMakeMove={handleMakeMove}
        />
      </main>

      {/* Game Over / Rematch Modal */}
      {gameOverData && (
        <GameOverModal
          winner={gameOverData.winner}
          myRole={myRole}
          finalScore={gameOverData.finalScore}
          onRematch={handleRematch}
          onLeave={handleLeaveRoom}
        />
      )}
    </div>
  );
}
