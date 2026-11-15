import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Pencil, Check, Crown, Trophy, WifiOff, UserX } from 'lucide-react';
import { StartVoteModal } from './StartVoteModal';
import type { PlayerData } from '../../types';

export const PlayerList: React.FC = () => {
  const { room, gameState, player: mySelf } = useGame();
  const [kickTarget, setKickTarget] = useState<PlayerData | null>(null);

  if (!room) return null;

  // Sort players by score descending
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-slate-800 text-sm">Leaderboard</span>
        </div>
        <span className="text-xs font-medium text-slate-500">
          {room.players.length} Players
        </span>
      </div>

      {/* Players List */}
      <div className="flex-1 p-2.5 overflow-y-auto space-y-1.5">
        {sortedPlayers.map((p, index) => {
          const isDrawer = gameState?.currentDrawerId === p.id;
          const isMe = p.id === mySelf?.id;
          const rank = index + 1;
          const canBeKicked = !p.isHost && !isMe && p.isConnected;

          return (
            <div
              key={p.id}
              className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                p.hasGuessedCorrectly
                  ? 'bg-emerald-50/70 border-emerald-300'
                  : isDrawer
                  ? 'bg-sky-50/70 border-sky-300'
                  : isMe
                  ? 'bg-brand-50/50 border-brand-200'
                  : 'bg-white border-slate-100 hover:border-slate-200'
              }`}
            >
              {/* Left: Rank & Avatar & Name */}
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Rank Badge */}
                <span
                  className={`w-5 text-center text-xs font-bold ${
                    rank === 1
                      ? 'text-amber-500'
                      : rank === 2
                      ? 'text-slate-400'
                      : rank === 3
                      ? 'text-amber-700'
                      : 'text-slate-400'
                  }`}
                >
                  #{rank}
                </span>

                {/* Avatar */}
                <div
                  className="relative w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0"
                  style={{ backgroundColor: p.avatarColor }}
                >
                  {p.name.charAt(0).toUpperCase()}
                  {p.isHost && (
                    <div
                      className="absolute -top-1 -right-1 bg-amber-400 text-white rounded-full p-0.5 shadow-sm"
                      title="Host"
                    >
                      <Crown className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>

                {/* Name & Status */}
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-semibold truncate ${
                        isMe ? 'text-brand-700' : 'text-slate-800'
                      }`}
                    >
                      {p.name} {isMe && '(You)'}
                    </span>
                    {!p.isConnected && (
                      <span title="Disconnected">
                        <WifiOff className="w-3 h-3 text-rose-400 shrink-0" />
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-medium text-slate-500">
                    {p.score} pts
                  </span>
                </div>
              </div>

              {/* Right: Drawer or Guessed badge + Kick button */}
              <div className="flex items-center gap-1.5 shrink-0">
                {isDrawer && (
                  <div
                    className="p-1 rounded-lg bg-sky-100 text-sky-700 flex items-center gap-1 text-[11px] font-medium px-2 shadow-xs"
                    title="Currently Drawing"
                  >
                    <Pencil className="w-3 h-3 animate-bounce-short" />
                    <span className="hidden sm:inline">Drawing</span>
                  </div>
                )}

                {p.hasGuessedCorrectly && (
                  <div
                    className="p-1 rounded-lg bg-emerald-100 text-emerald-700 flex items-center gap-1 text-[11px] font-medium px-2 shadow-xs"
                    title="Guessed Correctly"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span className="hidden sm:inline">Guessed</span>
                  </div>
                )}

                {/* Vote Kick Moderation Button */}
                {canBeKicked && (
                  <button
                    type="button"
                    onClick={() => setKickTarget(p)}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    title={`Vote to kick ${p.name}`}
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      <StartVoteModal
        target={kickTarget}
        onClose={() => setKickTarget(null)}
      />
    </div>
  );
};
