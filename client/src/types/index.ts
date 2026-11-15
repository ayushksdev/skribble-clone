export type GamePhase = 'LOBBY' | 'WORD_SELECTION' | 'DRAWING' | 'ROUND_END' | 'GAME_OVER';

export interface RoomSettings {
  maxPlayers: number;
  rounds: number;
  drawTime: number;
  wordChoices: number;
  hintsCount: number;
  isPublic: boolean;
}

export interface PlayerData {
  id: string;
  name: string;
  socketId: string;
  score: number;
  roundScore: number;
  isHost: boolean;
  isReady: boolean;
  isConnected: boolean;
  hasGuessedCorrectly: boolean;
  avatarColor: string;
}

export interface Point {
  x: number;
  y: number;
}

export type DrawTool = 'brush' | 'eraser';

export interface Stroke {
  id: string;
  tool: DrawTool;
  color: string;
  size: number;
  points: Point[];
}

export interface DrawStartPayload {
  strokeId: string;
  tool: DrawTool;
  color: string;
  size: number;
  point: Point;
}

export interface DrawMovePayload {
  strokeId: string;
  points: Point[];
}

export interface DrawEndPayload {
  strokeId: string;
}

export interface PublicGameState {
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  currentDrawerId: string | null;
  currentDrawerName: string | null;
  maskedWord: string;
  wordLength: number;
  hintsRevealed: number;
  totalHints: number;
  timeLeft: number;
  turnNumber: number;
  totalTurns: number;
  revealedWord?: string;
  roundEndReason?: 'timer' | 'all_guessed' | 'drawer_left';
}

export interface RoomData {
  id: string;
  code: string;
  hostId: string;
  players: PlayerData[];
  settings: RoomSettings;
  gameState: PublicGameState;
  isGameActive: boolean;
}

export interface PublicRoomInfo {
  code: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  currentRound: number;
  totalRounds: number;
  isGameActive: boolean;
}

export type ChatMessageType = 'chat' | 'system' | 'correct_guess' | 'close_guess';

export interface ChatMessage {
  id: string;
  senderId?: string;
  senderName: string;
  text: string;
  type: ChatMessageType;
  timestamp: number;
  isPrivate?: boolean;
}

export interface RoundEndResult {
  word: string;
  scores: {
    playerId: string;
    playerName: string;
    roundScore: number;
    totalScore: number;
    guessedCorrectly: boolean;
  }[];
  reason: 'timer' | 'all_guessed' | 'drawer_left';
}

export interface GameOverResult {
  winner: PlayerData;
  finalLeaderboard: PlayerData[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
