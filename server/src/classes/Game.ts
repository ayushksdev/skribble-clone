import { GamePhase, PublicGameState, RoomSettings, Stroke } from '../types/index.js';
import { Player } from './Player.js';
import { wordService } from '../services/wordService.js';

export interface RoundResult {
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
  winner: Player;
  finalLeaderboard: Player[];
}

export class Game {
  public phase: GamePhase = 'LOBBY';
  public currentRound: number = 0;
  public totalRounds: number;
  public settings: RoomSettings;

  public currentDrawerIndex: number = -1;
  public drawerQueue: string[] = []; // player IDs scheduled for drawing in current round
  public currentDrawerId: string | null = null;
  public currentWord: string | null = null;
  public wordChoices: string[] = [];

  public timeLeft: number = 0;
  public timerInterval: NodeJS.Timeout | null = null;

  public correctGuessesCount: number = 0;
  public correctGuessOrder: string[] = []; // player IDs in order of guess
  public strokes: Stroke[] = [];

  public hintsRevealed: number = 0;
  public revealedIndices: Set<number> = new Set();
  public usedWords: Set<string> = new Set();

  private onTickCallback?: (timeLeft: number) => void;
  private onPhaseChangeCallback?: (phase: GamePhase) => void;
  private onRoundEndCallback?: (result: RoundResult) => void;
  private onGameOverCallback?: (result: GameOverResult) => void;

  constructor(settings: RoomSettings) {
    this.settings = settings;
    this.totalRounds = settings.rounds;
  }

  public setCallbacks(callbacks: {
    onTick: (timeLeft: number) => void;
    onPhaseChange: (phase: GamePhase) => void;
    onRoundEnd: (result: RoundResult) => void;
    onGameOver: (result: GameOverResult) => void;
  }): void {
    this.onTickCallback = callbacks.onTick;
    this.onPhaseChangeCallback = callbacks.onPhaseChange;
    this.onRoundEndCallback = callbacks.onRoundEnd;
    this.onGameOverCallback = callbacks.onGameOver;
  }

  public startGame(players: Player[]): boolean {
    if (players.length < 2) return false;

    this.currentRound = 1;
    this.usedWords.clear();
    players.forEach((p) => p.resetGame());
    this.initRoundDrawers(players);
    this.startNextTurn(players);
    return true;
  }

  private initRoundDrawers(players: Player[]): void {
    // Only connected players can draw
    const eligible = players.filter((p) => p.isConnected).map((p) => p.id);
    this.drawerQueue = eligible;
    this.currentDrawerIndex = -1;
  }

  public startNextTurn(players: Player[]): void {
    this.clearTimer();
    this.strokes = [];
    this.correctGuessesCount = 0;
    this.correctGuessOrder = [];
    this.hintsRevealed = 0;
    this.revealedIndices.clear();
    this.currentWord = null;

    players.forEach((p) => p.resetRound());

    // Advance to next drawer in queue
    this.currentDrawerIndex++;

    if (this.currentDrawerIndex >= this.drawerQueue.length) {
      // Completed all turns for current round
      if (this.currentRound < this.totalRounds) {
        this.currentRound++;
        this.initRoundDrawers(players);
        this.currentDrawerIndex = 0;
      } else {
        // Game Over!
        this.endGame(players);
        return;
      }
    }

    const drawerId = this.drawerQueue[this.currentDrawerIndex];
    const drawer = players.find((p) => p.id === drawerId && p.isConnected);

    // If scheduled drawer disconnected, move to next
    if (!drawer) {
      if (this.currentDrawerIndex < this.drawerQueue.length - 1) {
        this.startNextTurn(players);
      } else if (this.currentRound < this.totalRounds) {
        this.currentRound++;
        this.initRoundDrawers(players);
        this.startNextTurn(players);
      } else {
        this.endGame(players);
      }
      return;
    }

    this.currentDrawerId = drawer.id;
    this.phase = 'WORD_SELECTION';
    this.wordChoices = wordService.getRandomWords(
      this.settings.wordChoices,
      Array.from(this.usedWords)
    );

    // Drawer has 15 seconds to select a word, otherwise auto-select
    this.timeLeft = 15;
    this.onPhaseChangeCallback?.(this.phase);

    this.startTimer(
      () => {
        // Auto-select first word if drawer timed out
        if (this.phase === 'WORD_SELECTION') {
          const autoWord = this.wordChoices[0] || 'apple';
          this.selectWord(autoWord, players);
        }
      }
    );
  }

  public selectWord(word: string, players: Player[]): boolean {
    if (this.phase !== 'WORD_SELECTION') return false;

    this.clearTimer();
    this.currentWord = word;
    this.usedWords.add(word.toLowerCase());
    this.phase = 'DRAWING';
    this.timeLeft = this.settings.drawTime;

    this.onPhaseChangeCallback?.(this.phase);

    // Start drawing timer
    this.startTimer(() => {
      this.endTurn(players, 'timer');
    });

    return true;
  }

  private startTimer(onComplete: () => void): void {
    this.clearTimer();
    this.timerInterval = setInterval(() => {
      this.timeLeft--;

      if (this.phase === 'DRAWING' && this.settings.hintsCount > 0 && this.currentWord) {
        this.checkHintProgress();
      }

      this.onTickCallback?.(this.timeLeft);

      if (this.timeLeft <= 0) {
        this.clearTimer();
        onComplete();
      }
    }, 1000);
  }

  private checkHintProgress(): void {
    if (!this.currentWord || this.settings.hintsCount <= 0) return;

    const totalDrawTime = this.settings.drawTime;
    const elapsed = totalDrawTime - this.timeLeft;
    // Calculate how many hints should be revealed at current time
    // E.g. hints count = 2 -> hint 1 at 40% time, hint 2 at 70% time
    const maxHints = this.settings.hintsCount;
    for (let i = 1; i <= maxHints; i++) {
      const threshold = Math.floor((totalDrawTime * (i * 0.35 + 0.15)));
      if (elapsed >= threshold && this.hintsRevealed < i) {
        this.hintsRevealed = i;
        this.revealedIndices = wordService.getRevealedIndices(
          this.currentWord,
          this.hintsRevealed,
          this.settings.hintsCount
        );
      }
    }
  }

  public handleGuess(player: Player, guess: string, players: Player[]): {
    isCorrect: boolean;
    isClose: boolean;
    pointsAwarded?: number;
  } {
    if (this.phase !== 'DRAWING' || !this.currentWord) {
      return { isCorrect: false, isClose: false };
    }

    // Drawer cannot guess
    if (player.id === this.currentDrawerId) {
      return { isCorrect: false, isClose: false };
    }

    // Player already guessed correctly this round
    if (player.hasGuessedCorrectly) {
      return { isCorrect: false, isClose: false };
    }

    const normalizedGuess = guess.trim().toLowerCase();
    const normalizedWord = this.currentWord.trim().toLowerCase();

    if (normalizedGuess === normalizedWord) {
      // Correct Guess!
      player.hasGuessedCorrectly = true;
      this.correctGuessesCount++;
      this.correctGuessOrder.push(player.id);

      // Scoring formula:
      // 1st: 100, 2nd: 80, 3rd: 60, rest: 40
      // Time bonus: up to 20 bonus points if guessed quickly
      const basePoints =
        this.correctGuessesCount === 1
          ? 100
          : this.correctGuessesCount === 2
          ? 80
          : this.correctGuessesCount === 3
          ? 60
          : 40;

      const timeBonus = Math.floor((this.timeLeft / Math.max(1, this.settings.drawTime)) * 20);
      const points = basePoints + timeBonus;

      player.addScore(points);

      // Check if all eligible guessers have guessed
      const eligibleGuessers = players.filter(
        (p) => p.isConnected && p.id !== this.currentDrawerId
      );

      const allGuessed = eligibleGuessers.every((p) => p.hasGuessedCorrectly);

      if (allGuessed) {
        // End turn immediately with slight delay so players see the last guess
        setTimeout(() => {
          if (this.phase === 'DRAWING') {
            this.endTurn(players, 'all_guessed');
          }
        }, 1200);
      }

      return { isCorrect: true, isClose: false, pointsAwarded: points };
    }

    // Check for close guess
    const isClose = wordService.isCloseGuess(normalizedGuess, normalizedWord);
    return { isCorrect: false, isClose };
  }

  public endTurn(players: Player[], reason: 'timer' | 'all_guessed' | 'drawer_left'): void {
    this.clearTimer();
    this.phase = 'ROUND_END';

    // Award drawer bonus: 25 points per successful guess + 25 base if at least one guessed
    if (this.currentDrawerId && this.correctGuessesCount > 0) {
      const drawer = players.find((p) => p.id === this.currentDrawerId);
      if (drawer) {
        const drawerBonus = 25 + this.correctGuessesCount * 25;
        drawer.addScore(drawerBonus);
      }
    }

    const roundScores = players.map((p) => ({
      playerId: p.id,
      playerName: p.name,
      roundScore: p.roundScore,
      totalScore: p.score,
      guessedCorrectly: p.hasGuessedCorrectly,
    }));

    const result: RoundResult = {
      word: this.currentWord || '',
      scores: roundScores,
      reason,
    };

    this.onRoundEndCallback?.(result);

    // Show round end screen for 5 seconds, then advance
    this.timeLeft = 5;
    this.startTimer(() => {
      this.startNextTurn(players);
    });
  }

  public handlePlayerDisconnect(disconnectedId: string, players: Player[]): void {
    if (disconnectedId === this.currentDrawerId && this.phase === 'DRAWING') {
      // Drawer left during drawing! End turn early
      this.endTurn(players, 'drawer_left');
    } else {
      // If a guesser left, check if all remaining eligible guessers have guessed
      if (this.phase === 'DRAWING') {
        const eligibleGuessers = players.filter(
          (p) => p.isConnected && p.id !== this.currentDrawerId
        );
        if (eligibleGuessers.length > 0 && eligibleGuessers.every((p) => p.hasGuessedCorrectly)) {
          this.endTurn(players, 'all_guessed');
        }
      }
    }
  }

  private endGame(players: Player[]): void {
    this.clearTimer();
    this.phase = 'GAME_OVER';

    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0] || players[0];

    this.onGameOverCallback?.({
      winner,
      finalLeaderboard: sortedPlayers,
    });
  }

  public clearTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // Authoritative Canvas State
  public addStroke(stroke: Stroke): void {
    this.strokes.push(stroke);
  }

  public undoStroke(): Stroke | null {
    if (this.strokes.length > 0) {
      return this.strokes.pop() || null;
    }
    return null;
  }

  public clearCanvas(): void {
    this.strokes = [];
  }

  public getPublicGameState(players: Player[]): PublicGameState {
    const drawer = players.find((p) => p.id === this.currentDrawerId);
    let masked = '';

    if (this.phase === 'ROUND_END' || this.phase === 'GAME_OVER') {
      masked = this.currentWord || '';
    } else if (this.currentWord) {
      masked = wordService.getMaskedWord(this.currentWord, this.revealedIndices);
    }

    return {
      phase: this.phase,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      currentDrawerId: this.currentDrawerId,
      currentDrawerName: drawer ? drawer.name : null,
      maskedWord: masked,
      wordLength: this.currentWord ? this.currentWord.length : 0,
      hintsRevealed: this.hintsRevealed,
      totalHints: this.settings.hintsCount,
      timeLeft: this.timeLeft,
      turnNumber: this.currentDrawerIndex + 1,
      totalTurns: this.drawerQueue.length,
      revealedWord: (this.phase === 'ROUND_END' || this.phase === 'GAME_OVER') ? (this.currentWord || undefined) : undefined,
    };
  }
}
