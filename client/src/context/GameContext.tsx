import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { socket } from '../socket/socket';
import type {
  RoomData,
  PlayerData,
  PublicGameState,
  ChatMessage,
  RoundEndResult,
  GameOverResult,
  RoomSettings,
  ApiResponse,
  VoteKickData,
  VoteKickResult,
} from '../types';
import {
  setStoredPlayerName,
  getStoredPlayerId,
  setStoredRoomCode,
} from '../utils/storage';
import { soundEffects } from '../utils/sound';
import confetti from 'canvas-confetti';

interface GameContextType {
  room: RoomData | null;
  player: PlayerData | null;
  gameState: PublicGameState | null;
  wordChoices: string[];
  currentDrawerWord: string | null;
  chatMessages: ChatMessage[];
  roundEndResult: RoundEndResult | null;
  gameOverResult: GameOverResult | null;
  activeVote: VoteKickData | null;
  voteResult: VoteKickResult | null;
  hasVoted: boolean;
  isConnected: boolean;
  error: string | null;
  isHost: boolean;
  isCurrentDrawer: boolean;
  createRoom: (name: string, settings?: Partial<RoomSettings>) => Promise<{ success: boolean; error?: string }>;
  joinRoom: (code: string, name: string) => Promise<{ success: boolean; error?: string }>;
  leaveRoom: () => void;
  toggleReady: (ready: boolean) => void;
  startGame: () => Promise<{ success: boolean; error?: string }>;
  selectWord: (word: string) => void;
  sendChatMessage: (message: string) => void;
  playAgain: () => void;
  startVoteKick: (targetId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  castVote: (vote: boolean) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [room, setRoom] = useState<RoomData | null>(null);
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [gameState, setGameState] = useState<PublicGameState | null>(null);
  const [wordChoices, setWordChoices] = useState<string[]>([]);
  const [currentDrawerWord, setCurrentDrawerWord] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [roundEndResult, setRoundEndResult] = useState<RoundEndResult | null>(null);
  const [gameOverResult, setGameOverResult] = useState<GameOverResult | null>(null);
  const [activeVote, setActiveVote] = useState<VoteKickData | null>(null);
  const [voteResult, setVoteResult] = useState<VoteKickResult | null>(null);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(socket.connected);
  const [error, setError] = useState<string | null>(null);

  const playerId = getStoredPlayerId();

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onRoomUpdated(updatedRoom: RoomData) {
      setRoom(updatedRoom);
      setGameState(updatedRoom.gameState);

      if (updatedRoom.activeVote) {
        setActiveVote(updatedRoom.activeVote);
      }

      const me = updatedRoom.players.find((p) => p.id === playerId);
      if (me) {
        setPlayer(me);
      }
    }

    function onGameState(state: PublicGameState) {
      setGameState(state);
      if (state.phase !== 'WORD_SELECTION') {
        setWordChoices([]);
      }
      if (state.phase !== 'DRAWING') {
        setCurrentDrawerWord(null);
      }
      if (state.phase === 'DRAWING') {
        setRoundEndResult(null);
      }
    }

    function onWordChoices(choices: string[]) {
      setWordChoices(choices);
      soundEffects.playTurnStart();
    }

    function onCurrentDrawerWord(word: string) {
      setCurrentDrawerWord(word);
    }

    function onRoundTimer(timeLeft: number) {
      setGameState((prev) => (prev ? { ...prev, timeLeft } : null));
      if (timeLeft <= 5 && timeLeft > 0) {
        soundEffects.playTick();
      }
    }

    function onRoundEnd(result: RoundEndResult) {
      setRoundEndResult(result);
      setWordChoices([]);
      setCurrentDrawerWord(null);
    }

    function onGameOver(result: GameOverResult) {
      setGameOverResult(result);
      setRoundEndResult(null);
      soundEffects.playGameOver();

      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {
        // Fallback
      }
    }

    function onChatMessage(msg: ChatMessage) {
      setChatMessages((prev) => [...prev.slice(-100), msg]);
    }

    function onGuessResult(data: { isCorrect: boolean }) {
      if (data.isCorrect) {
        soundEffects.playCorrect();
      }
    }

    function onRoomError(err: { message: string }) {
      setError(err.message);
    }

    // Vote Kick Listeners
    function onVoteKickStarted(data: VoteKickData) {
      setActiveVote(data);
      setVoteResult(null);
      setHasVoted(data.initiatorId === playerId);
    }

    function onVoteKickUpdate(data: VoteKickData) {
      setActiveVote(data);
    }

    function onVoteKickResult(result: VoteKickResult) {
      setVoteResult(result);
      setTimeout(() => {
        setActiveVote(null);
        setVoteResult(null);
        setHasVoted(false);
      }, 4000);
    }

    function onVoteKickCancelled() {
      setActiveVote(null);
      setVoteResult(null);
      setHasVoted(false);
    }

    function onKickedFromRoom(data: { message: string }) {
      alert(data.message || 'You have been removed from the room by community vote.');
      setRoom(null);
      setPlayer(null);
      setGameState(null);
      setActiveVote(null);
      setStoredRoomCode('');
      window.location.href = '/';
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room_updated', onRoomUpdated);
    socket.on('game_state', onGameState);
    socket.on('word_choices', onWordChoices);
    socket.on('current_drawer_word', onCurrentDrawerWord);
    socket.on('round_timer', onRoundTimer);
    socket.on('round_end', onRoundEnd);
    socket.on('game_over', onGameOver);
    socket.on('chat_message', onChatMessage);
    socket.on('guess_result', onGuessResult);
    socket.on('room_error', onRoomError);

    socket.on('vote_kick_started', onVoteKickStarted);
    socket.on('vote_kick_update', onVoteKickUpdate);
    socket.on('vote_kick_result', onVoteKickResult);
    socket.on('vote_kick_cancelled', onVoteKickCancelled);
    socket.on('kicked_from_room', onKickedFromRoom);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room_updated', onRoomUpdated);
      socket.off('game_state', onGameState);
      socket.off('word_choices', onWordChoices);
      socket.off('current_drawer_word', onCurrentDrawerWord);
      socket.off('round_timer', onRoundTimer);
      socket.off('round_end', onRoundEnd);
      socket.off('game_over', onGameOver);
      socket.off('chat_message', onChatMessage);
      socket.off('guess_result', onGuessResult);
      socket.off('room_error', onRoomError);

      socket.off('vote_kick_started', onVoteKickStarted);
      socket.off('vote_kick_update', onVoteKickUpdate);
      socket.off('vote_kick_result', onVoteKickResult);
      socket.off('vote_kick_cancelled', onVoteKickCancelled);
      socket.off('kicked_from_room', onKickedFromRoom);
    };
  }, [playerId]);

  const createRoom = useCallback(
    (name: string, settings?: Partial<RoomSettings>): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        setStoredPlayerName(name);
        socket.emit(
          'create_room',
          { playerName: name, settings, playerId },
          (response: ApiResponse<RoomData>) => {
            if (response.success && response.data) {
              setRoom(response.data);
              setGameState(response.data.gameState);
              setStoredRoomCode(response.data.code);
              const me = response.data.players.find((p) => p.id === playerId);
              if (me) setPlayer(me);
              setChatMessages([]);
              setRoundEndResult(null);
              setGameOverResult(null);
              setActiveVote(null);
              resolve({ success: true });
            } else {
              setError(response.error || 'Failed to create room');
              resolve({ success: false, error: response.error });
            }
          }
        );
      });
    },
    [playerId]
  );

  const joinRoom = useCallback(
    (code: string, name: string): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        setStoredPlayerName(name);
        socket.emit(
          'join_room',
          { roomCode: code.toUpperCase().trim(), playerName: name, playerId },
          (response: ApiResponse<RoomData>) => {
            if (response.success && response.data) {
              setRoom(response.data);
              setGameState(response.data.gameState);
              setStoredRoomCode(response.data.code);
              const me = response.data.players.find((p) => p.id === playerId);
              if (me) setPlayer(me);
              setChatMessages([]);
              setRoundEndResult(null);
              setGameOverResult(null);
              setActiveVote(response.data.activeVote || null);
              resolve({ success: true });
            } else {
              setError(response.error || 'Failed to join room');
              resolve({ success: false, error: response.error });
            }
          }
        );
      });
    },
    [playerId]
  );

  const leaveRoom = useCallback(() => {
    socket.emit('leave_room');
    setRoom(null);
    setPlayer(null);
    setGameState(null);
    setWordChoices([]);
    setCurrentDrawerWord(null);
    setChatMessages([]);
    setRoundEndResult(null);
    setGameOverResult(null);
    setActiveVote(null);
    setStoredRoomCode('');
  }, []);

  const toggleReady = useCallback((ready: boolean) => {
    socket.emit('player_ready', ready);
  }, []);

  const startGame = useCallback((): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      socket.emit('start_game', (res: ApiResponse) => {
        if (res?.success) {
          resolve({ success: true });
        } else {
          setError(res?.error || 'Failed to start game.');
          resolve({ success: false, error: res?.error });
        }
      });
    });
  }, []);

  const selectWord = useCallback((word: string) => {
    socket.emit('select_word', word, () => {
      setWordChoices([]);
    });
  }, []);

  const sendChatMessage = useCallback((message: string) => {
    if (!message.trim()) return;
    socket.emit('chat_message', { message });
  }, []);

  const playAgain = useCallback(() => {
    socket.emit('play_again', (res: ApiResponse) => {
      if (res?.success) {
        setGameOverResult(null);
        setRoundEndResult(null);
      }
    });
  }, []);

  const startVoteKick = useCallback(
    (targetId: string, reason?: string): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        socket.emit('vote_kick_start', { targetId, reason }, (res: ApiResponse<VoteKickData>) => {
          if (res?.success) {
            setHasVoted(true);
            resolve({ success: true });
          } else {
            setError(res?.error || 'Failed to start vote kick.');
            resolve({ success: false, error: res?.error });
          }
        });
      });
    },
    []
  );

  const castVote = useCallback(
    (vote: boolean): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        socket.emit('vote_kick_cast', { vote }, (res: ApiResponse) => {
          if (res?.success) {
            setHasVoted(true);
            resolve({ success: true });
          } else {
            setError(res?.error || 'Failed to cast vote.');
            resolve({ success: false, error: res?.error });
          }
        });
      });
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const isHost = player?.isHost ?? false;
  const isCurrentDrawer = gameState?.currentDrawerId === player?.id;

  return (
    <GameContext.Provider
      value={{
        room,
        player,
        gameState,
        wordChoices,
        currentDrawerWord,
        chatMessages,
        roundEndResult,
        gameOverResult,
        activeVote,
        voteResult,
        hasVoted,
        isConnected,
        error,
        isHost,
        isCurrentDrawer,
        createRoom,
        joinRoom,
        leaveRoom,
        toggleReady,
        startGame,
        selectWord,
        sendChatMessage,
        playAgain,
        startVoteKick,
        castVote,
        clearError,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export function useGame(): GameContextType {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
