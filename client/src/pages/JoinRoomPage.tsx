import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { getStoredPlayerName, setStoredPlayerName } from '../utils/storage';
import { ArrowLeft, ArrowRight, KeyRound } from 'lucide-react';

export const JoinRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = useParams();
  const { joinRoom, error, clearError } = useGame();

  const initialCode = (params.code || searchParams.get('code') || '').toUpperCase();
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState(getStoredPlayerName());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    clearError();
    setIsSubmitting(true);
    setStoredPlayerName(name.trim());

    const res = await joinRoom(code.trim().toUpperCase(), name.trim());
    setIsSubmitting(false);

    if (res.success) {
      navigate('/lobby');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-6">
      <div className="w-full max-w-md mx-auto">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-6 text-white flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">Join Room</h2>
              <p className="text-white/70 text-xs mt-1">
                Enter your name and the 6-character room code
              </p>
            </div>
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <KeyRound className="w-6 h-6 stroke-[2.5]" />
            </div>
          </div>

          {error && (
            <div className="m-6 mb-0 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <div>
              <label
                htmlFor="joinName"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
              >
                Your Display Name
              </label>
              <input
                id="joinName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. MasterGuesser"
                maxLength={16}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all shadow-inner"
              />
            </div>

            <div>
              <label
                htmlFor="joinCodeInput"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
              >
                Room Code
              </label>
              <input
                id="joinCodeInput"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="6-LETTER CODE"
                maxLength={6}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-slate-800 font-mono font-bold tracking-widest text-center text-lg focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase placeholder:font-sans placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !code.trim()}
              className="w-full py-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 transition-all mt-4"
            >
              <span>{isSubmitting ? 'Joining Room...' : 'Enter Game Lobby'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
