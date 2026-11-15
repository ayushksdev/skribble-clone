import React from 'react';
import { useGame } from '../../context/GameContext';
import { Palette, Clock, Sparkles } from 'lucide-react';

export const WordSelectionModal: React.FC = () => {
  const { gameState, isCurrentDrawer, wordChoices, selectWord } = useGame();

  if (gameState?.phase !== 'WORD_SELECTION') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-500 to-indigo-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Palette className="w-6 h-6" />
            <h3 className="font-bold text-lg">
              {isCurrentDrawer ? 'Choose Your Word' : 'Waiting for Drawer'}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>{gameState.timeLeft}s</span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {isCurrentDrawer ? (
            <div>
              <p className="text-slate-600 text-sm mb-5 text-center">
                Select one of the words below to draw for the other players:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {wordChoices.map((word) => (
                  <button
                    key={word}
                    type="button"
                    onClick={() => selectWord(word)}
                    className="p-4 rounded-2xl border-2 border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 hover:shadow-md transition-all text-center group flex flex-col items-center justify-center min-h-[90px]"
                  >
                    <span className="text-base font-bold text-slate-800 group-hover:text-brand-600 capitalize">
                      {word}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1">
                      {word.length} letters
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 animate-pulse">
                <Sparkles className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-800 text-lg mb-1">
                {gameState.currentDrawerName || 'Drawer'} is choosing a word...
              </h4>
              <p className="text-slate-500 text-sm">
                Get ready to guess as soon as the drawing starts!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
