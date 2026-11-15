import React from 'react';
import { useGame } from '../../context/GameContext';
import { Sparkles, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

export const RoundEndModal: React.FC = () => {
  const { roundEndResult, gameState } = useGame();

  if (!roundEndResult || gameState?.phase !== 'ROUND_END') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6" />
            <h3 className="font-bold text-lg">Round Finished!</h3>
          </div>
          <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>Next in {gameState.timeLeft}s</span>
          </div>
        </div>

        {/* Word Reveal */}
        <div className="p-6 text-center">
          <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-1">
            The secret word was
          </p>
          <div className="text-3xl font-extrabold text-brand-600 capitalize mb-4 tracking-wide">
            {roundEndResult.word}
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 mb-6">
            {roundEndResult.reason === 'all_guessed' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>All players guessed correctly!</span>
              </>
            ) : roundEndResult.reason === 'drawer_left' ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Drawer disconnected</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Time expired!</span>
              </>
            )}
          </div>

          {/* Scores breakdown */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 max-h-48 overflow-y-auto space-y-2">
            {roundEndResult.scores
              .sort((a, b) => b.roundScore - a.roundScore)
              .map((s) => (
                <div
                  key={s.playerId}
                  className="flex items-center justify-between px-3 py-1.5 bg-white rounded-xl text-xs font-medium border border-slate-100 shadow-2xs"
                >
                  <span className="text-slate-700 truncate max-w-[150px]">
                    {s.playerName}
                  </span>
                  <div className="flex items-center gap-2">
                    {s.roundScore > 0 && (
                      <span className="text-emerald-600 font-bold">
                        +{s.roundScore}
                      </span>
                    )}
                    <span className="text-slate-500">{s.totalScore} pts</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
