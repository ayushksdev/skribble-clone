import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import {
  ShieldAlert,
  Clock,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

export const VoteKickPanel: React.FC = () => {
  const {
    activeVote,
    voteResult,
    hasVoted,
    player,
    castVote,
  } = useGame();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // If there's a recent vote result, show it
  if (voteResult) {
    return (
      <div className="fixed top-4 right-4 z-50 w-full max-w-sm animate-fadeIn">
        <div
          className={`p-4 rounded-2xl shadow-xl border backdrop-blur-md ${
            voteResult.passed
              ? 'bg-emerald-50/95 border-emerald-300 text-emerald-900'
              : 'bg-slate-900/95 border-slate-700 text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            {voteResult.passed ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
            )}
            <div>
              <h4 className="font-extrabold text-sm">
                {voteResult.passed ? 'Vote Kick Passed' : 'Vote Kick Failed'}
              </h4>
              <p className="text-xs opacity-90 mt-0.5">
                {voteResult.passed
                  ? `${voteResult.targetName} was removed from the room.`
                  : `${voteResult.targetName} remains in the room (${voteResult.yesVotes} Yes, ${voteResult.noVotes} No).`}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!activeVote || !player) return null;

  const isTarget = player.id === activeVote.targetId;
  const isHost = player.isHost;

  const handleVote = async (yes: boolean) => {
    setIsSubmitting(true);
    await castVote(yes);
    setIsSubmitting(false);
  };

  const progressPercent = Math.min(
    100,
    Math.round((activeVote.yesVotes / activeVote.requiredVotes) * 100)
  );

  return (
    <div className="fixed top-4 right-4 z-50 w-full max-w-sm animate-fadeIn">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            <span className="font-extrabold text-sm">Vote Kick Active</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>{activeVote.timeLeft}s</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-500 font-medium">Target Player:</span>
              <span className="font-bold text-slate-900 text-sm">{activeVote.targetName}</span>
            </div>
            <div className="flex items-baseline justify-between text-xs mt-1">
              <span className="text-slate-500 font-medium">Initiated by:</span>
              <span className="font-semibold text-slate-700">{activeVote.initiatorName}</span>
            </div>
            {activeVote.reason && (
              <div className="mt-1.5 text-xs bg-slate-50 p-2 rounded-xl border border-slate-100 text-slate-600 italic">
                "{activeVote.reason}"
              </div>
            )}
          </div>

          {/* Progress / Tally */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span className="text-emerald-700">
                YES: {activeVote.yesVotes} / {activeVote.requiredVotes} needed
              </span>
              <span className="text-slate-500">
                NO: {activeVote.noVotes}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Voting Action Buttons or Ineligibility Notice */}
          {isTarget ? (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>A vote kick is active against you. You cannot vote.</span>
            </div>
          ) : isHost ? (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs text-center font-medium">
              Protected moderator: Host does not vote.
            </div>
          ) : hasVoted ? (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Your vote has been recorded.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleVote(true)}
                disabled={isSubmitting}
                className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Yes, Kick</span>
              </button>

              <button
                type="button"
                onClick={() => handleVote(false)}
                disabled={isSubmitting}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 transition-all"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                <span>No, Keep</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
