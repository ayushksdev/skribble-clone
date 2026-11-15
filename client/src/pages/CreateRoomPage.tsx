import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { getStoredPlayerName } from '../utils/storage';
import {
  Pencil,
  ArrowLeft,
  Users,
  Repeat,
  Clock,
  HelpCircle,
  Globe,
  Lock,
  Sparkles,
} from 'lucide-react';

export const CreateRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const { createRoom, error, clearError } = useGame();

  const playerName = getStoredPlayerName() || 'Host';

  const [maxPlayers, setMaxPlayers] = useState<number>(8);
  const [rounds, setRounds] = useState<number>(3);
  const [drawTime, setDrawTime] = useState<number>(80);
  const [wordChoices, setWordChoices] = useState<number>(3);
  const [hintsCount, setHintsCount] = useState<number>(2);
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);

    const res = await createRoom(playerName, {
      maxPlayers,
      rounds,
      drawTime,
      wordChoices,
      hintsCount,
      isPublic,
    });

    setIsSubmitting(false);
    if (res.success) {
      navigate('/lobby');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-6">
      <div className="w-full max-w-xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-brand-500 to-indigo-600 px-8 py-6 text-white flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">Create Room</h2>
              <p className="text-white/80 text-xs mt-1">
                Configure match settings for you and your friends
              </p>
            </div>
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <Pencil className="w-6 h-6 stroke-[2.5]" />
            </div>
          </div>

          {error && (
            <div className="m-6 mb-0 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-brand-500" />
                  Max Players
                </label>
                <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg">
                  {maxPlayers} Players
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={20}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="w-full accent-brand-500 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-semibold">
                <span>2</span>
                <span>8</span>
                <span>20</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Repeat className="w-4 h-4 text-brand-500" />
                  Rounds
                </label>
                <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg">
                  {rounds} Rounds
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={10}
                value={rounds}
                onChange={(e) => setRounds(Number(e.target.value))}
                className="w-full accent-brand-500 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-semibold">
                <span>2</span>
                <span>5</span>
                <span>10</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-brand-500" />
                  Drawing Time (Seconds)
                </label>
                <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg">
                  {drawTime}s
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[30, 60, 80, 120].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDrawTime(t)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      drawTime === t
                        ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {t}s
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                  Word Choices
                </label>
                <select
                  value={wordChoices}
                  onChange={(e) => setWordChoices(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value={1}>1 Word (No choice)</option>
                  <option value={2}>2 Words</option>
                  <option value={3}>3 Words (Recommended)</option>
                  <option value={4}>4 Words</option>
                  <option value={5}>5 Words</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-brand-500" />
                  Hints Count
                </label>
                <select
                  value={hintsCount}
                  onChange={(e) => setHintsCount(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value={0}>0 (Hardcore)</option>
                  <option value={1}>1 Hint</option>
                  <option value={2}>2 Hints (Standard)</option>
                  <option value={3}>3 Hints</option>
                  <option value={4}>4 Hints</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isPublic ? 'bg-sky-100 text-sky-600' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isPublic ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {isPublic ? 'Public Room' : 'Private Room'}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {isPublic
                        ? 'Visible in public room listings for anyone to join'
                        : 'Only accessible via room code or invite link'}
                    </span>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-5 h-5 accent-brand-500 rounded cursor-pointer"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 transition-all"
            >
              <Pencil className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating Room...' : 'Create Room & Enter Lobby'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
