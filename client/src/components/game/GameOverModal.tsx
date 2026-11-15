import React from 'react';
import { useGame } from '../../context/GameContext';
import { useNavigate } from 'react-router-dom';
import { Trophy, RotateCcw, Home, Crown, Medal } from 'lucide-react';

export const GameOverModal: React.FC = () => {
  const { gameOverResult, gameState, isHost, playAgain, leaveRoom } = useGame();
  const navigate = useNavigate();

  if (!gameOverResult || gameState?.phase !== 'GAME_OVER') return null;

  const topPlayers = gameOverResult.finalLeaderboard.slice(0, 3);
  const first = topPlayers[0];
  const second = topPlayers[1];
  const third = topPlayers[2];

  const handleLeave = () => {
    leaveRoom();
    navigate('/');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 px-6 py-6 text-white text-center">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center mb-2 shadow-inner">
            <Trophy className="w-8 h-8 text-yellow-200" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">Game Over!</h2>
          <p className="text-yellow-100 text-xs mt-1">
            Congratulations to {first?.name || 'the winner'}!
          </p>
        </div>

        {/* Podium Area */}
        <div className="p-6">
          <div className="flex items-end justify-center gap-3 pt-6 pb-4">
            {/* 2nd Place */}
            {second && (
              <div className="flex flex-col items-center flex-1">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md mb-2 border-2 border-slate-300"
                  style={{ backgroundColor: second.avatarColor }}
                >
                  {second.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-slate-800 truncate max-w-[80px]">
                  {second.name}
                </span>
                <span className="text-[11px] text-slate-500 font-semibold mb-2">
                  {second.score} pts
                </span>
                <div className="w-full h-20 bg-slate-200 rounded-t-2xl flex flex-col items-center justify-center text-slate-600 font-extrabold text-lg shadow-inner">
                  <Medal className="w-5 h-5 text-slate-400 mb-1" />
                  2nd
                </div>
              </div>
            )}

            {/* 1st Place */}
            {first && (
              <div className="flex flex-col items-center flex-1 -mt-4">
                <div className="relative">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-amber-500">
                    <Crown className="w-6 h-6 fill-amber-400 stroke-amber-600" />
                  </div>
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white font-extrabold text-lg shadow-lg mb-2 border-4 border-amber-300"
                    style={{ backgroundColor: first.avatarColor }}
                  >
                    {first.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <span className="text-sm font-extrabold text-slate-900 truncate max-w-[100px]">
                  {first.name}
                </span>
                <span className="text-xs text-amber-600 font-bold mb-2">
                  {first.score} pts
                </span>
                <div className="w-full h-28 bg-gradient-to-t from-amber-400 to-amber-300 rounded-t-2xl flex flex-col items-center justify-center text-amber-900 font-extrabold text-xl shadow-md">
                  <Trophy className="w-6 h-6 text-amber-700 mb-1" />
                  1st
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {third && (
              <div className="flex flex-col items-center flex-1">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md mb-2 border-2 border-amber-600/30"
                  style={{ backgroundColor: third.avatarColor }}
                >
                  {third.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-slate-800 truncate max-w-[80px]">
                  {third.name}
                </span>
                <span className="text-[11px] text-slate-500 font-semibold mb-2">
                  {third.score} pts
                </span>
                <div className="w-full h-16 bg-amber-100 rounded-t-2xl flex flex-col items-center justify-center text-amber-800 font-extrabold text-lg shadow-inner">
                  <Medal className="w-5 h-5 text-amber-700 mb-1" />
                  3rd
                </div>
              </div>
            )}
          </div>

          {/* Full Standings List */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 max-h-40 overflow-y-auto space-y-1.5 mt-2">
            {gameOverResult.finalLeaderboard.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-3 py-1.5 bg-white rounded-xl text-xs border border-slate-100"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-400 w-4">#{idx + 1}</span>
                  <span className="font-semibold text-slate-700 truncate max-w-[150px]">
                    {p.name}
                  </span>
                </div>
                <span className="font-bold text-slate-600">{p.score} pts</span>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-6">
            {isHost ? (
              <button
                type="button"
                onClick={playAgain}
                className="flex-1 py-3 px-4 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Play Again
              </button>
            ) : (
              <div className="flex-1 text-center py-2 text-xs text-slate-500 italic">
                Waiting for host to start another match...
              </div>
            )}

            <button
              type="button"
              onClick={handleLeave}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all border border-slate-200"
            >
              <Home className="w-4 h-4" />
              Exit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
