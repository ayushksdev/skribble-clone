import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { ChatBox } from '../components/chat/ChatBox';
import { StartVoteModal } from '../components/game/StartVoteModal';
import type { PlayerData } from '../types';
import {
  Copy,
  Check,
  Crown,
  Play,
  Users,
  Clock,
  Repeat,
  HelpCircle,
  LogOut,
  AlertCircle,
  UserX,
} from 'lucide-react';

export const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    room,
    player,
    isHost,
    toggleReady,
    startGame,
    leaveRoom,
    error,
    clearError,
  } = useGame();

  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [kickTarget, setKickTarget] = useState<PlayerData | null>(null);

  useEffect(() => {
    if (room && room.isGameActive && room.gameState.phase !== 'LOBBY') {
      navigate('/game');
    }
  }, [room, navigate]);

  useEffect(() => {
    if (!room) {
      navigate('/');
    }
  }, [room, navigate]);

  if (!room || !player) return null;

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/join?code=${room.code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = async () => {
    clearError();
    setIsStarting(true);
    const res = await startGame();
    setIsStarting(false);
    if (res.success) {
      navigate('/game');
    }
  };

  const handleLeave = () => {
    leaveRoom();
    navigate('/');
  };

  const connectedPlayers = room.players.filter((p: PlayerData) => p.isConnected);
  const allReady = connectedPlayers.every((p: PlayerData) => p.isReady);
  const hasMinPlayers = connectedPlayers.length >= 2;
  const canStart = isHost && hasMinPlayers && allReady;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 flex flex-col justify-between">
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                Room Code
              </span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-mono font-black text-slate-900 tracking-wider">
                  {room.code}
                </span>
                <button
                  type="button"
                  onClick={copyInviteLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
                  title="Copy Invite Link"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Settings Badges */}
          <div className="flex items-center flex-wrap gap-2 text-xs font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <Users className="w-3.5 h-3.5 text-brand-500" />
              {room.players.length}/{room.settings.maxPlayers} Max
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <Repeat className="w-3.5 h-3.5 text-brand-500" />
              {room.settings.rounds} Rounds
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-brand-500" />
              {room.settings.drawTime}s Draw Time
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <HelpCircle className="w-3.5 h-3.5 text-brand-500" />
              {room.settings.hintsCount} Hints
            </span>
          </div>

          {/* Leave Button */}
          <button
            type="button"
            onClick={handleLeave}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave</span>
          </button>
        </header>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Content Grid: Players on Left, Chat on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[480px]">
          {/* Left 2 Cols: Players Grid & Start Controls */}
          <div className="lg:col-span-2 flex flex-col justify-between bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand-500" />
                  Players in Room ({room.players.length})
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  Min 2 players required
                </span>
              </div>

              {/* Players Roster */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {room.players.map((p: PlayerData) => {
                  const isMe = p.id === player.id;
                  const canBeKicked = !p.isHost && !isMe && p.isConnected;

                  return (
                    <div
                      key={p.id}
                      className={`group p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                        isMe
                          ? 'bg-brand-50/40 border-brand-200'
                          : 'bg-slate-50/60 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        <div
                          className="relative w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold text-sm shadow-sm shrink-0"
                          style={{ backgroundColor: p.avatarColor }}
                        >
                          {p.name.charAt(0).toUpperCase()}
                          {p.isHost && (
                            <div
                              className="absolute -top-1 -right-1 bg-amber-400 text-white rounded-full p-0.5 shadow-sm"
                              title="Room Host"
                            >
                              <Crown className="w-3 h-3" />
                            </div>
                          )}
                        </div>

                        {/* Name */}
                        <div className="truncate">
                          <span className="text-xs font-bold text-slate-800 block truncate">
                            {p.name} {isMe && '(You)'}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {p.isHost ? 'Host' : p.isReady ? 'Ready' : 'Not ready'}
                          </span>
                        </div>
                      </div>

                      {/* Ready Badge & Moderation Action */}
                      <div className="flex items-center gap-2">
                        {canBeKicked && (
                          <button
                            type="button"
                            onClick={() => setKickTarget(p)}
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title={`Vote to kick ${p.name}`}
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        )}

                        {p.isReady ? (
                          <div
                            className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"
                            title="Ready"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div
                            className="w-6 h-6 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center text-[10px] font-bold shrink-0"
                            title="Not Ready"
                          >
                            ...
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              {!isHost && (
                <button
                  type="button"
                  onClick={() => toggleReady(!player.isReady)}
                  className={`py-3.5 px-6 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 shadow-xs ${
                    player.isReady
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                      : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20'
                  }`}
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{player.isReady ? "You're Ready!" : 'Click to Ready Up'}</span>
                </button>
              )}

              {isHost ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
                  <button
                    type="button"
                    onClick={handleStartGame}
                    disabled={!canStart || isStarting}
                    className="w-full sm:w-auto py-3.5 px-8 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:hover:bg-brand-500 text-white font-extrabold text-sm rounded-2xl shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>{isStarting ? 'Starting...' : 'Start Game'}</span>
                  </button>

                  <div className="text-xs text-slate-500">
                    {!hasMinPlayers
                      ? 'Requires at least 2 players to start.'
                      : !allReady
                      ? 'Waiting for all players to click Ready.'
                      : 'All players ready! Click Start Game when ready.'}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic">
                  Waiting for the host to start the game...
                </div>
              )}
            </div>
          </div>

          {/* Right Col: Lobby Chat */}
          <div className="h-[480px]">
            <ChatBox />
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <StartVoteModal
        target={kickTarget}
        onClose={() => setKickTarget(null)}
      />
    </div>
  );
};
