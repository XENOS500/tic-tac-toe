import React, { useCallback } from 'react';
import { PlayerSymbol } from '@anti-gravity/shared';
import { sound } from '../services/sound';

interface ClassicGridProps {
  board: Array<PlayerSymbol | null>;
  isMyTurn: boolean;
  myRole: PlayerSymbol | null;
  winningLine: number[] | null;
  isGameOver: boolean;
  onMakeMove: (cellIndex: number) => void;
}

export const ClassicGrid: React.FC<ClassicGridProps> = ({
  board,
  isMyTurn,
  myRole,
  winningLine,
  isGameOver,
  onMakeMove,
}) => {
  const handleCellClick = useCallback(
    (index: number) => {
      if (!isMyTurn || isGameOver || board[index] !== null) return;
      sound.playMove();
      onMakeMove(index);
    },
    [isMyTurn, isGameOver, board, onMakeMove]
  );

  return (
    <div className="relative w-full max-w-[420px] aspect-square mx-auto p-3">
      {/* Outer ambient glow */}
      <div className="absolute inset-0 bg-neon-cyan/10 blur-3xl rounded-3xl pointer-events-none -z-10" />

      {/* 3x3 Grid Container */}
      <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-3 p-3 bg-space-900/90 border border-space-800 rounded-2xl shadow-2xl backdrop-blur-xl">
        {board.map((cell, index) => {
          const isWinningCell = winningLine && winningLine.includes(index);
          const isOccupied = cell !== null;
          const canClick = isMyTurn && !isGameOver && !isOccupied;

          return (
            <button
              key={index}
              disabled={!canClick}
              onClick={() => handleCellClick(index)}
              className={`group relative flex items-center justify-center rounded-xl border transition-all duration-200 select-none ${
                isWinningCell
                  ? 'bg-neon-green/20 border-neon-green shadow-[0_0_20px_rgba(5,255,161,0.5)] scale-[1.02]'
                  : isOccupied
                  ? cell === 'X'
                    ? 'bg-space-950/80 border-neon-cyan/40'
                    : 'bg-space-950/80 border-neon-magenta/40'
                  : canClick
                  ? 'bg-space-950/60 border-space-800 hover:border-neon-cyan/60 hover:bg-space-850 hover:shadow-[0_0_15px_rgba(0,242,254,0.15)] cursor-pointer'
                  : 'bg-space-950/40 border-space-850 cursor-not-allowed opacity-80'
              }`}
            >
              {/* Claimed Token X or O */}
              {cell === 'X' && (
                <span className="font-['Orbitron'] font-black text-5xl sm:text-6xl text-neon-cyan drop-shadow-[0_0_15px_rgba(0,242,254,0.7)] animate-in zoom-in-50 duration-150">
                  X
                </span>
              )}

              {cell === 'O' && (
                <span className="font-['Orbitron'] font-black text-5xl sm:text-6xl text-neon-magenta drop-shadow-[0_0_15px_rgba(247,37,133,0.7)] animate-in zoom-in-50 duration-150">
                  O
                </span>
              )}

              {/* Hover Ghost Preview on Empty Cell */}
              {!isOccupied && canClick && (
                <span className="opacity-0 group-hover:opacity-30 font-['Orbitron'] font-black text-4xl sm:text-5xl transition-opacity duration-150 pointer-events-none text-slate-300">
                  {myRole}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
