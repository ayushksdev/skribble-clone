import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { GameHeader } from '../components/game/GameHeader';
import { PlayerList } from '../components/game/PlayerList';
import { DrawingCanvas } from '../components/canvas/DrawingCanvas';
import { ChatBox } from '../components/chat/ChatBox';
import { WordSelectionModal } from '../components/game/WordSelectionModal';
import { RoundEndModal } from '../components/game/RoundEndModal';
import { GameOverModal } from '../components/game/GameOverModal';
import { Paintbrush, MessageSquare, Trophy } from 'lucide-react';

export const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const { room, gameState, isCurrentDrawer } = useGame();

  const [mobileTab, setMobileTab] = useState<'canvas' | 'chat' | 'players'>('canvas');

  useEffect(() => {
    if (!room) {
      navigate('/');
    }
  }, [room, navigate]);

  useEffect(() => {
    if (gameState?.phase === 'LOBBY') {
      navigate('/lobby');
    }
  }, [gameState?.phase, navigate]);

  if (!room) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-2 sm:p-4 md:p-6 overflow-hidden">
      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col gap-3 sm:gap-4">
        {/* Top Header */}
        <GameHeader />

        {/* Mobile View Switcher Tabs (Hidden on Large Screens) */}
        <div className="flex lg:hidden bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => setMobileTab('canvas')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors ${
              mobileTab === 'canvas'
                ? 'bg-brand-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>Canvas</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('chat')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors ${
              mobileTab === 'chat'
                ? 'bg-brand-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat / Guess</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('players')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors ${
              mobileTab === 'players'
                ? 'bg-brand-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Scores</span>
          </button>
        </div>

        {/* Desktop 3-Column Split / Mobile Tab View */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 min-h-[500px]">
          {/* Left Column: Players Roster & Leaderboard */}
          <div
            className={`lg:col-span-3 h-full min-h-[350px] ${
              mobileTab === 'players' ? 'block' : 'hidden lg:block'
            }`}
          >
            <PlayerList />
          </div>

          {/* Center Column: Interactive Canvas */}
          <div
            className={`lg:col-span-6 h-full min-h-[420px] ${
              mobileTab === 'canvas' ? 'block' : 'hidden lg:block'
            }`}
          >
            <DrawingCanvas isDrawer={isCurrentDrawer} />
          </div>

          {/* Right Column: Chat & Guesses */}
          <div
            className={`lg:col-span-3 h-full min-h-[350px] ${
              mobileTab === 'chat' ? 'block' : 'hidden lg:block'
            }`}
          >
            <ChatBox />
          </div>
        </div>
      </div>

      {/* Floating Modals */}
      <WordSelectionModal />
      <RoundEndModal />
      <GameOverModal />
    </div>
  );
};
