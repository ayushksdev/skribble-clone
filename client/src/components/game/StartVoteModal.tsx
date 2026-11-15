import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { PlayerData } from '../../types';
import { ShieldAlert, AlertTriangle, X } from 'lucide-react';

interface StartVoteModalProps {
  target: PlayerData | null;
  onClose: () => void;
}

const COMMON_REASONS = [
  'Inappropriate drawing / griefing',
  'Offensive language in chat',
  'AFK / Inactive',
  'Spamming',
  'Other',
];

export const StartVoteModal: React.FC<StartVoteModalProps> = ({ target, onClose }) => {
  const { startVoteKick } = useGame();
  const [selectedReason, setSelectedReason] = useState(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!target) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    const finalReason = selectedReason === 'Other' ? customReason.trim() : selectedReason;
    const res = await startVoteKick(target.id, finalReason);
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to start vote kick.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 to-amber-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="font-extrabold text-base">Initiate Vote Kick</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Target Preview */}
          <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold text-sm shadow-sm shrink-0"
              style={{ backgroundColor: target.avatarColor }}
            >
              {target.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                {target.name}
              </span>
              <span className="text-[11px] text-slate-500 block">
                {target.score} pts • {target.isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Starting a vote kick will trigger a 30-second democratic vote for all eligible players in the room. If more than 50% vote YES, the player will be removed.
          </p>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Reason for Vote Kick:
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              {COMMON_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {selectedReason === 'Other' && (
            <div>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Specify reason..."
                maxLength={60}
                required
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{isSubmitting ? 'Starting Vote...' : 'Start Vote Kick'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
