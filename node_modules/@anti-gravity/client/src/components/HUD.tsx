import React, { useState } from 'react';
import { GameRoom, PlayerSymbol } from '@anti-gravity/shared';
import {
  Volume2,
  VolumeX,
  Copy,
  Check,
  LogOut,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { sound } from '../services/sound';

interface HUDProps {
  room: GameRoom;
  myRole: PlayerSymbol | null;
  activeTurn: PlayerSymbol;
  onLeaveRoom: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  room,
  myRole,
  activeTurn,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);
  const [isMuted, setIsMuted] = useState(sound.isMuted);

  const handleCopyLink = () => {
    const url = `${window.location.origin}?room=${room.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleMute = () => {
    const state = sound.toggleMute();
    setIsMuted(state);
  };

  const isMyTurn = myRole === activeTurn;
  const isWaiting = room.status === 'WAITING_FOR_PLAYER';

  const playerX = room.players.X;
  const playerO = room.players.O;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-2 space-y-3">
      {/* Top Utility Bar */}
      <div className="flex items-center justify-between bg-space-900/90 border border-space-800 rounded-xl px-4 py-2.5 backdrop-blur shadow-lg">
        {/* Room Code & Invite Link */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs tracking-widest text-slate-400 font-semibold uppercase">ROOM:</span>
            <span className="font-['Orbitron'] font-bold text-neon-cyan tracking-wider text-sm px-2 py-0.5 bg-neon-cyan/10 border border-neon-cyan/30 rounded">
              {room.id}
            </span>
          </div>

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1 text-xs px-2.5 py-1 bg-space-800 hover:bg-space-700 text-slate-200 hover:text-white rounded border border-space-700 transition"
            title="Copy invite link to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-neon-green" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Link!' : 'Invite Friend'}</span>
          </button>
        </div>

        {/* Audio and Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleMute}
            className="p-1.5 rounded-lg bg-space-800 hover:bg-space-700 text-slate-300 hover:text-white border border-space-700 transition"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-neon-cyan" />}
          </button>

          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-1 text-xs px-2.5 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-300 rounded border border-red-800/40 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave</span>
          </button>
        </div>
      </div>

      {/* Scoreboard & Turn Display */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
        {/* Player X Card */}
        <div
          className={`flex items-center justify-between p-3 rounded-xl border backdrop-blur transition-all ${
            activeTurn === 'X' && !isWaiting
              ? 'bg-neon-cyan/10 border-neon-cyan shadow-[0_0_15px_rgba(0,242,254,0.25)]'
              : 'bg-space-900/80 border-space-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neon-cyan/20 border border-neon-cyan/50 flex items-center justify-center font-['Orbitron'] font-black text-xl text-neon-cyan shadow-sm">
              X
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-slate-100 truncate max-w-[100px]">
                  {playerX?.displayName || 'Waiting...'}
                </span>
                {myRole === 'X' && (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.2 bg-neon-cyan/20 text-neon-cyan rounded">
                    YOU
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                {playerX?.connected ? (
                  <span className="flex items-center gap-1 text-neon-green">
                    <Wifi className="w-3 h-3" /> Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400 animate-pulse">
                    <WifiOff className="w-3 h-3" /> Reconnecting
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="font-['Orbitron'] text-2xl font-black text-slate-100 pr-1">
            {playerX?.score ?? 0}
          </div>
        </div>

        {/* Center: Turn Status */}
        <div className="flex flex-col items-center justify-center bg-space-900/90 border border-space-800 rounded-xl p-3 backdrop-blur">
          {isWaiting ? (
            <div className="text-center animate-pulse">
              <span className="text-xs uppercase tracking-widest text-amber-400 font-bold block">
                WAITING FOR OPPONENT
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">Share room code {room.id}</p>
            </div>
          ) : (
            <div className="text-center">
              <span className="text-[10px] uppercase tracking-widest text-slate-400 block mb-0.5">
                CURRENT TURN
              </span>
              <span
                className={`font-['Orbitron'] font-extrabold text-sm sm:text-base tracking-wider ${
                  isMyTurn
                    ? 'text-neon-green animate-pulse'
                    : activeTurn === 'X'
                    ? 'text-neon-cyan'
                    : 'text-neon-magenta'
                }`}
              >
                {isMyTurn
                  ? 'YOUR TURN'
                  : `${activeTurn === 'X' ? playerX?.displayName : playerO?.displayName}'S TURN`}
              </span>
            </div>
          )}
        </div>

        {/* Player O Card */}
        <div
          className={`flex items-center justify-between p-3 rounded-xl border backdrop-blur transition-all ${
            activeTurn === 'O' && !isWaiting
              ? 'bg-neon-magenta/10 border-neon-magenta shadow-[0_0_15px_rgba(247,37,133,0.25)]'
              : 'bg-space-900/80 border-space-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neon-magenta/20 border border-neon-magenta/50 flex items-center justify-center font-['Orbitron'] font-black text-xl text-neon-magenta shadow-sm">
              O
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-slate-100 truncate max-w-[100px]">
                  {playerO?.displayName || (isWaiting ? 'Open Slot' : 'Player O')}
                </span>
                {myRole === 'O' && (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.2 bg-neon-magenta/20 text-neon-magenta rounded">
                    YOU
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                {playerO ? (
                  playerO.connected ? (
                    <span className="flex items-center gap-1 text-neon-green">
                      <Wifi className="w-3 h-3" /> Online
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-400 animate-pulse">
                      <WifiOff className="w-3 h-3" /> Reconnecting
                    </span>
                  )
                ) : (
                  <span className="text-slate-500">Waiting for peer</span>
                )}
              </div>
            </div>
          </div>
          <div className="font-['Orbitron'] text-2xl font-black text-slate-100 pr-1">
            {playerO?.score ?? 0}
          </div>
        </div>
      </div>
    </div>
  );
};
