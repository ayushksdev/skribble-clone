import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { Send, CheckCircle2, AlertCircle, Info, Sparkles } from 'lucide-react';

export const ChatBox: React.FC = () => {
  const { chatMessages, sendChatMessage, isCurrentDrawer, player } = useGame();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    sendChatMessage(inputText);
    setInputText('');
  };

  const hasGuessed = player?.hasGuessedCorrectly;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 text-sm">Game Chat & Guesses</span>
        </div>
        {hasGuessed && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Word Guessed!
          </span>
        )}
      </div>

      {/* Messages List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-2 text-sm">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs italic text-center p-4">
            <Sparkles className="w-6 h-6 mb-2 text-slate-300" />
            Type your guess or say hello to other players!
          </div>
        ) : (
          chatMessages.map((msg) => {
            if (msg.type === 'correct_guess') {
              return (
                <div
                  key={msg.id}
                  className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium flex items-center gap-2 shadow-sm text-xs"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{msg.text}</span>
                </div>
              );
            }

            if (msg.type === 'close_guess') {
              return (
                <div
                  key={msg.id}
                  className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2 shadow-sm"
                >
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{msg.text}</span>
                </div>
              );
            }

            if (msg.type === 'system') {
              return (
                <div
                  key={msg.id}
                  className="py-1 px-2 text-center text-slate-500 text-xs flex items-center justify-center gap-1.5"
                >
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <span>{msg.text}</span>
                </div>
              );
            }

            const isMe = msg.senderId === player?.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span className="text-[11px] font-semibold text-slate-600">
                    {msg.senderName}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-2xl max-w-[85%] break-words shadow-sm text-sm ${
                    isMe
                      ? 'bg-brand-500 text-white rounded-tr-none'
                      : 'bg-slate-100 text-slate-800 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="p-3 bg-slate-50 border-t border-slate-200 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isCurrentDrawer
              ? 'You are drawing! Chatting allowed...'
              : hasGuessed
              ? 'You guessed it! Chat without spoiling...'
              : 'Type your guess here...'
          }
          maxLength={120}
          className="flex-1 px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all shadow-inner"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-xl shadow-sm transition-colors"
          title="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
