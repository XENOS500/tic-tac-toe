import React, { useState, useEffect } from 'react';
import { Play, LogIn, Sparkles, Volume2, VolumeX, Swords, Users, Zap } from 'lucide-react';
import { sound } from '../services/sound';

interface LandingViewProps {
  onCreateRoom: (displayName: string) => void;
  onJoinRoom: (roomId: string, displayName: string) => void;
  isConnecting: boolean;
  errorMessage: string | null;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onCreateRoom,
  onJoinRoom,
  isConnecting,
  errorMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem('ag_display_name') || 'Player-' + Math.floor(100 + Math.random() * 900)
  );
  const [roomCode, setRoomCode] = useState('');
  const [isMuted, setIsMuted] = useState(sound.isMuted);

  // Auto-detect room code from URL query ?room=XYZ
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryRoom = params.get('room');
    if (queryRoom) {
      setRoomCode(queryRoom.trim().toUpperCase());
      setActiveTab('join');
    }
  }, []);

  const handleNameChange = (val: string) => {
    setDisplayName(val);
    localStorage.setItem('ag_display_name', val);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || isConnecting) return;
    onCreateRoom(displayName.trim());
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !roomCode.trim() || isConnecting) return;
    onJoinRoom(roomCode.trim().toUpperCase(), displayName.trim());
  };

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Sound Toggle Floating Button */}
      <button
        onClick={handleToggleMute}
        className="absolute top-4 right-4 p-2 rounded-xl bg-space-900/80 hover:bg-space-800 text-slate-300 hover:text-white border border-space-700 transition shadow-lg"
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-neon-cyan" />}
      </button>

      {/* Background Decorative Circles */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-space-800/40 pointer-events-none -z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-neon-cyan/5 pointer-events-none -z-10" />

      {/* Header Logo */}
      <div className="text-center mb-8 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-xs font-semibold uppercase tracking-widest mb-2 shadow-[0_0_15px_rgba(0,242,254,0.2)]">
          <Sparkles className="w-3.5 h-3.5" /> Real-Time 2-Player Online Duel
        </div>
        <h1 className="font-['Orbitron'] font-black text-4xl sm:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-white to-neon-magenta tracking-tight">
          TIC-TAC-TOE
        </h1>
        <p className="text-slate-400 font-semibold tracking-wider text-sm sm:text-base">
          Instant 1v1 Multiplayer with Synchronized Turns & Live Reconnection
        </p>
      </div>

      {/* Main Form Container */}
      <div className="w-full max-w-md bg-space-900/90 border border-space-800 rounded-2xl p-6 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.6)]">
        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/50 text-red-300 text-xs text-center font-medium">
            {errorMessage}
          </div>
        )}

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-space-950 rounded-xl mb-6 border border-space-800">
          <button
            onClick={() => setActiveTab('create')}
            className={`py-2 px-4 rounded-lg font-['Orbitron'] text-xs font-bold tracking-wider transition ${
              activeTab === 'create'
                ? 'bg-neon-cyan text-space-950 shadow-[0_0_15px_rgba(0,242,254,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            CREATE ROOM
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`py-2 px-4 rounded-lg font-['Orbitron'] text-xs font-bold tracking-wider transition ${
              activeTab === 'join'
                ? 'bg-neon-magenta text-white shadow-[0_0_15px_rgba(247,37,133,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            JOIN ROOM
          </button>
        </div>

        {/* Display Name Field */}
        <div className="space-y-1.5 mb-5">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            PLAYER CALLSIGN
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Enter your name"
            maxLength={18}
            className="w-full bg-space-950 border border-space-700 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-neon-cyan transition text-sm font-semibold"
          />
        </div>

        {/* Tab Content: Create */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <button
              type="submit"
              disabled={isConnecting || !displayName.trim()}
              className="w-full py-3 px-4 rounded-xl font-['Orbitron'] font-extrabold text-sm tracking-wider bg-gradient-to-r from-neon-blue to-neon-cyan text-space-950 hover:brightness-110 shadow-lg shadow-neon-cyan/20 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isConnecting ? 'CREATING ROOM...' : 'CREATE NEW ROOM'}</span>
            </button>
          </form>
        )}

        {/* Tab Content: Join */}
        {activeTab === 'join' && (
          <form onSubmit={handleJoinSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                ROOM CODE (6-CHAR)
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="e.g. AG48X2"
                maxLength={8}
                className="w-full bg-space-950 border border-space-700 rounded-xl px-4 py-2.5 text-neon-magenta placeholder-slate-500 font-['Orbitron'] font-bold tracking-widest text-center focus:outline-none focus:border-neon-magenta transition text-base uppercase"
              />
            </div>

            <button
              type="submit"
              disabled={isConnecting || !displayName.trim() || !roomCode.trim()}
              className="w-full py-3 px-4 rounded-xl font-['Orbitron'] font-extrabold text-sm tracking-wider bg-gradient-to-r from-neon-magenta to-neon-purple text-white hover:brightness-110 shadow-lg shadow-neon-magenta/20 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn className="w-4 h-4" />
              <span>{isConnecting ? 'JOINING...' : 'JOIN ROOM'}</span>
            </button>
          </form>
        )}
      </div>

      {/* Feature Highlights */}
      <div className="w-full max-w-2xl mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3.5 rounded-xl bg-space-900/60 border border-space-800/80 backdrop-blur">
          <div className="flex items-center gap-2 font-bold text-neon-cyan mb-1 font-['Orbitron']">
            <Zap className="w-4 h-4" /> Sub-50ms Sync
          </div>
          <p className="text-slate-400 leading-relaxed">
            Real-time WebSocket events ensure instantaneous board synchronization across any browser.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-space-900/60 border border-space-800/80 backdrop-blur">
          <div className="flex items-center gap-2 font-bold text-neon-green mb-1 font-['Orbitron']">
            <Users className="w-4 h-4" /> 1-Click Invites
          </div>
          <p className="text-slate-400 leading-relaxed">
            Copy a direct link or 6-character room code to instantly challenge friends on mobile or desktop.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-space-900/60 border border-space-800/80 backdrop-blur">
          <div className="flex items-center gap-2 font-bold text-neon-magenta mb-1 font-['Orbitron']">
            <Swords className="w-4 h-4" /> Rematch & Reconnect
          </div>
          <p className="text-slate-400 leading-relaxed">
            Seamless round rematches and a 15-second grace window in case of network drops or page reloads.
          </p>
        </div>
      </div>
    </div>
  );
};
