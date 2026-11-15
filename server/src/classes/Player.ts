import { PlayerData } from '../types/index.js';

const AVATAR_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#14B8A6', // Teal
];

export class Player {
  public id: string;
  public name: string;
  public socketId: string;
  public score: number = 0;
  public roundScore: number = 0;
  public isHost: boolean = false;
  public isReady: boolean = false;
  public isConnected: boolean = true;
  public hasGuessedCorrectly: boolean = false;
  public avatarColor: string;

  constructor(id: string, name: string, socketId: string, isHost: boolean = false) {
    this.id = id;
    this.name = name.trim();
    this.socketId = socketId;
    this.isHost = isHost;
    // Auto-ready host
    this.isReady = isHost;
    // Pick color predictably or randomly
    const colorIndex = Math.abs(id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % AVATAR_COLORS.length;
    this.avatarColor = AVATAR_COLORS[colorIndex];
  }

  public resetRound(): void {
    this.roundScore = 0;
    this.hasGuessedCorrectly = false;
  }

  public resetGame(): void {
    this.score = 0;
    this.roundScore = 0;
    this.hasGuessedCorrectly = false;
    this.isReady = this.isHost;
  }

  public addScore(points: number): void {
    this.score += points;
    this.roundScore += points;
  }

  public setReady(ready: boolean): void {
    this.isReady = ready;
  }

  public setConnected(connected: boolean, newSocketId?: string): void {
    this.isConnected = connected;
    if (newSocketId) {
      this.socketId = newSocketId;
    }
  }

  public toJSON(): PlayerData {
    return {
      id: this.id,
      name: this.name,
      socketId: this.socketId,
      score: this.score,
      roundScore: this.roundScore,
      isHost: this.isHost,
      isReady: this.isReady,
      isConnected: this.isConnected,
      hasGuessedCorrectly: this.hasGuessedCorrectly,
      avatarColor: this.avatarColor,
    };
  }
}
