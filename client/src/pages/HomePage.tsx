import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import {
  getStoredPlayerName,
  setStoredPlayerName,
} from '../utils/storage';
import {
  Pencil,
  Users,
  Sparkles,
  ArrowRight,
  Globe,
  Lock,
  Gamepad2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { socket } from '../socket/socket';
import type { PublicRoomInfo } from '../types';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { joinRoom, error, clearError } = useGame();

  const [name, setName] = useState(getStoredPlayerName());
  const [joinCode, setJoinCode] = useState('');
  const [nameError, setNameError] = useState('');
  const [showPublicRooms, setShowPublicRooms] = useState(false);
  const [publicRooms, setPublicRooms] = useState<PublicRoomInfo[]>([]);
  const [isLoadingPublic, setIsLoadingPublic] = useState(false);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleNameChange = (val: string) => {
    setName(val);
    setStoredPlayerName(val);
    if (val.trim()) setNameError('');
  };

  const handleCreateRoom = () => {
    if (!name.trim()) {
      setNameError('Please enter a player name first.');
      return;
    }
    navigate('/create');
  };

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('Please enter a player name first.');
      return;
    }
    if (!joinCode.trim()) return;

    const res = await joinRoom(joinCode.trim().toUpperCase(), name.trim());
    if (res.success) {
      navigate('/lobby');
    }
  };

  const handleOpenPublicRooms = () => {
    setShowPublicRooms(true);
    setIsLoadingPublic(true);
    socket.emit('get_public_rooms', (rooms: PublicRoomInfo[]) => {
      setPublicRooms(rooms || []);
      setIsLoadingPublic(false);
    });
  };

  const handleJoinPublic = async (code: string) => {
    if (!name.trim()) {
      setNameError('Please enter a player name first.');
      return;
    }
    setShowPublicRooms(false);
    const res = await joinRoom(code, name.trim());
    if (res.success) {
      navigate('/lobby');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Navigation */}
      <nav className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <Pencil className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-900">
            Skribbl<span className="text-brand-500">.io</span>
          </span>
        </div>

        <button
          type="button"
          onClick={handleOpenPublicRooms}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl shadow-xs transition-colors"
        >
          <Globe className="w-4 h-4 text-brand-500" />
          <span>Browse Public Rooms</span>
        </button>
      </nav>

      {/* Hero Section */}
      <main className="w-full max-w-4xl mx-auto px-6 py-8 flex-1 flex flex-col items-center justify-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold mb-6 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
          <span>Real-Time Multiplayer Drawing & Guessing Game</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight max-w-2xl leading-tight">
          Draw, Guess, and Compete with Friends in Real Time
        </h1>
        <p className="mt-4 text-slate-600 text-base sm:text-lg max-w-xl">
          Fast-paced multiplayer fun. Pick secret words, sketch your best artwork, and guess before the clock runs out!
        </p>

        {/* Error notification */}
        {(error || nameError) && (
          <div className="mt-6 w-full max-w-md p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
            {nameError || error}
          </div>
        )}

        {/* Player Name & Action Card */}
        <div className="mt-8 w-full max-w-md bg-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200">
          <div className="mb-5 text-left">
            <label
              htmlFor="playerName"
              className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2"
            >
              Choose Your Display Name
            </label>
            <input
              id="playerName"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. MasterArtist"
              maxLength={16}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all shadow-inner"
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={handleCreateRoom}
              className="w-full py-3.5 px-5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-2xl shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
            >
              <Pencil className="w-4 h-4" />
              <span>Create New Room</span>
            </button>

            <div className="relative my-2 flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Or join with code
              </span>
            </div>

            <form onSubmit={handleJoinWithCode} className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                maxLength={6}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-slate-800 font-mono font-bold tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase placeholder:font-sans placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!joinCode.trim()}
                className="px-5 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-sm rounded-2xl shadow-sm flex items-center justify-center shrink-0 transition-all"
              >
                <span>Join</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </form>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-16 w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Synchronized Canvas
            </h3>
            <p className="text-slate-600 text-sm">
              Lag-free vector strokes with normalized coordinates render smoothly across any screen size.
            </p>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Authoritative Timers & Hints
            </h3>
            <p className="text-slate-600 text-sm">
              Server-controlled rounds, progressive letter reveals, and anti-cheat validation.
            </p>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Fair Scoring Model
            </h3>
            <p className="text-slate-600 text-sm">
              Speed bonuses for fast guessers and reward points for creative drawers whose sketches get guessed.
            </p>
          </div>
        </div>

        {/* How to Play Section */}
        <div className="mt-16 w-full max-w-3xl bg-white p-8 rounded-3xl border border-slate-200 shadow-xs text-left">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-500" />
            How to Play
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 font-extrabold text-sm flex items-center justify-center">
                1
              </div>
              <h4 className="font-bold text-slate-800 text-sm">When It's Your Turn</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Choose 1 of 3 secret words. Use colors, brush sizes, and shapes to sketch it on the canvas.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 font-extrabold text-sm flex items-center justify-center">
                2
              </div>
              <h4 className="font-bold text-slate-800 text-sm">When You're Guessing</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Watch strokes appear in real-time. Type your guesses into the chat as fast as you can to score maximum points.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 font-extrabold text-sm flex items-center justify-center">
                3
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Win the Crown</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Compete across multiple rounds. The player with the highest total score at the end claims 1st place!
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Public Rooms Modal */}
      {showPublicRooms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-brand-500" />
                <h3 className="font-bold text-slate-900">Discover Public Rooms</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPublicRooms(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                Close
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {isLoadingPublic ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  Finding active rooms...
                </div>
              ) : publicRooms.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm flex flex-col items-center">
                  <Lock className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-700">No public rooms found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Create a room and check "Public Room" so other players can discover and join!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {publicRooms.map((r) => (
                    <div
                      key={r.code}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800 text-sm">
                            {r.code}
                          </span>
                          <span className="text-xs text-slate-500">
                            Host: {r.hostName}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {r.playerCount} / {r.maxPlayers} Players • Round {r.currentRound}/{r.totalRounds}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleJoinPublic(r.code)}
                        className="px-3.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                      >
                        Join
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-slate-400 border-t border-slate-200">
        Skribble • Real-Time Multiplayer Drawing & Guessing Game
      </footer>
    </div>
  );
};
