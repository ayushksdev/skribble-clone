import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useNavigate } from 'react-router-dom';
import { Clock, Volume2, VolumeX, LogOut, Lightbulb, Pencil } from 'lucide-react';
import { soundEffects } from '../../utils/sound';

export const GameHeader: React.FC = () => {
  const { gameState, isCurrentDrawer, currentDrawerWord, leaveRoom } = useGame();
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(soundEffects.getIsMuted());

  const toggleSound = () => {
    const muted = soundEffects.toggleMute();
    setIsMuted(muted);
  };

  const handleExit = () => {
    if (window.confirm('Are you sure you want to leave the game?')) {
      leaveRoom();
      navigate('/');
    }
  };

  const timeLeft = gameState?.timeLeft ?? 0;
  const isUrgent = timeLeft <= 10 && gameState?.phase === 'DRAWING';

  return (
    <header className="bg-white rounded-2xl shadow-sm border border-slate-200 px-5 py-3 flex items-center justify-between gap-4">
      {/* Left: Round info */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Round
          </span>
          <span className="text-base font-extrabold text-slate-800">
            {gameState?.currentRound || 1} / {gameState?.totalRounds || 3}
          </span>
        </div>
      </div>

      {/* Center: Secret Word or Masked Word */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {isCurrentDrawer ? (
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-bold text-sky-600 uppercase tracking-widest flex items-center gap-1">
              <Pencil className="w-3 h-3" />
              Draw This
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-wider capitalize">
              {currentDrawerWord || 'Your Word'}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-mono font-bold tracking-[0.25em] text-slate-800 select-none">
                {gameState?.maskedWord || '_ _ _ _'}
              </span>
              {gameState?.hintsRevealed ? (
                <span className="inline-flex items-center text-amber-500 text-xs font-semibold" title="Hints revealed">
                  <Lightbulb className="w-3.5 h-3.5" />
                </span>
              ) : null}
            </div>
            {gameState?.wordLength ? (
              <span className="text-[11px] text-slate-400 font-medium">
                {gameState.wordLength} letters
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* Right: Timer & Settings */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Countdown Timer */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-sm transition-colors ${
            isUrgent
              ? 'bg-rose-50 text-rose-600 border border-rose-200 animate-pulse-fast'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          <Clock className={`w-4 h-4 ${isUrgent ? 'text-rose-500' : 'text-slate-500'}`} />
          <span>{timeLeft}s</span>
        </div>

        {/* Audio Mute */}
        <button
          type="button"
          onClick={toggleSound}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Exit Button */}
        <button
          type="button"
          onClick={handleExit}
          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
          title="Exit Game"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
