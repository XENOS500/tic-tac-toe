import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { PlayerSymbol } from '@anti-gravity/shared';
import { Trophy, RotateCcw, LogOut, ShieldAlert } from 'lucide-react';
import { sound } from '../services/sound';

interface GameOverModalProps {
  winner: PlayerSymbol | 'DRAW';
  myRole: PlayerSymbol | null;
  finalScore: { X: number; O: number };
  onRematch: () => void;
  onLeave: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  winner,
  myRole,
  finalScore,
  onRematch,
  onLeave,
}) => {
  const [rematchRequested, setRematchRequested] = useState(false);

  useEffect(() => {
    if (winner === myRole) {
      sound.playWin();
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00f2fe', '#05ffa1', '#f72585'],
      });
    } else {
      sound.playGameOver();
    }
  }, [winner, myRole]);

  const isWin = winner === myRole;
  const isDraw = winner === 'DRAW';

  const handleRematchClick = () => {
    setRematchRequested(true);
    onRematch();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-space-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-space-900 border border-space-700/80 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] text-center overflow-hidden">
        {/* Decorative Top Ambient Glow */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
            isWin ? 'bg-neon-green/30' : isDraw ? 'bg-amber-400/20' : 'bg-neon-magenta/20'
          }`}
        />

        {/* Victory Icon / Badge */}
        <div className="flex justify-center mb-4">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-lg ${
              isWin
                ? 'bg-neon-green/20 border-neon-green/50 text-neon-green shadow-neon-green/30'
                : isDraw
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-amber-500/30'
                : 'bg-neon-magenta/20 border-neon-magenta/50 text-neon-magenta shadow-neon-magenta/30'
            }`}
          >
            {isWin ? <Trophy className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
          </div>
        </div>

        {/* Title & Message */}
        <h2 className="font-['Orbitron'] font-black text-2xl tracking-wider text-slate-100 mb-1">
          {isWin ? 'VICTORY SECURED' : isDraw ? 'EQUILIBRIUM REACHED' : 'DEFEAT'}
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          {isWin
            ? 'Your tokens conquered the anti-gravity arena!'
            : isDraw
            ? 'Neither gravity nor player could break the balance.'
            : 'Your opponent claimed three-in-a-row.'}
        </p>

        {/* Scorecard Display */}
        <div className="flex items-center justify-center gap-6 bg-space-950/70 border border-space-800 rounded-xl py-3 px-6 mb-6">
          <div className="text-center">
            <div className="text-xs text-neon-cyan font-bold mb-0.5">PLAYER X</div>
            <div className="font-['Orbitron'] font-black text-2xl text-slate-100">{finalScore.X}</div>
          </div>
          <div className="font-['Orbitron'] text-slate-600 text-lg font-bold">:</div>
          <div className="text-center">
            <div className="text-xs text-neon-magenta font-bold mb-0.5">PLAYER O</div>
            <div className="font-['Orbitron'] font-black text-2xl text-slate-100">{finalScore.O}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleRematchClick}
            disabled={rematchRequested}
            className={`w-full py-3 px-4 rounded-xl font-['Orbitron'] font-bold text-sm tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
              rematchRequested
                ? 'bg-space-800 text-slate-400 border border-space-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-neon-blue to-neon-cyan text-space-950 hover:brightness-110 shadow-neon-cyan/25'
            }`}
          >
            <RotateCcw className={`w-4 h-4 ${rematchRequested ? 'animate-spin' : ''}`} />
            <span>{rematchRequested ? 'Waiting for opponent...' : 'REQUEST REMATCH'}</span>
          </button>

          <button
            onClick={onLeave}
            className="w-full py-2.5 px-4 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-space-800/60 font-semibold text-xs transition flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Return to Lobby</span>
          </button>
        </div>
      </div>
    </div>
  );
};
