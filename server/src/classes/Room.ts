import {
  RoomData,
  RoomSettings,
  PublicRoomInfo,
  PublicGameState,
  VoteKickData,
  VoteKickResult,
} from '../types/index.js';
import { Player } from './Player.js';
import { Game } from './Game.js';

export interface InternalVoteKick {
  targetId: string;
  targetName: string;
  initiatorId: string;
  initiatorName: string;
  reason?: string;
  yesVotes: Set<string>;
  noVotes: Set<string>;
  totalEligibleVoters: number;
  requiredVotes: number;
  timeLeft: number;
  timerInterval: NodeJS.Timeout | null;
  createdAt: number;
}

export class Room {
  public id: string;
  public code: string;
  public hostId: string;
  public players: Map<string, Player> = new Map();
  public settings: RoomSettings;
  public game: Game | null = null;
  public createdAt: number = Date.now();
  public lastActivityAt: number = Date.now();

  // Moderation: Vote Kick State
  public activeVote: InternalVoteKick | null = null;
  public voteCooldowns: Map<string, number> = new Map(); // targetId -> cooldown end timestamp
  public kickedPlayerIds: Set<string> = new Set(); // blacklisted IDs for this room

  constructor(
    id: string,
    code: string,
    hostPlayer: Player,
    settings?: Partial<RoomSettings>
  ) {
    this.id = id;
    this.code = code.toUpperCase();
    this.hostId = hostPlayer.id;

    this.settings = {
      maxPlayers: Math.min(20, Math.max(2, settings?.maxPlayers ?? 8)),
      rounds: Math.min(10, Math.max(2, settings?.rounds ?? 3)),
      drawTime: Math.min(240, Math.max(15, settings?.drawTime ?? 80)),
      wordChoices: Math.min(5, Math.max(1, settings?.wordChoices ?? 3)),
      hintsCount: Math.min(5, Math.max(0, settings?.hintsCount ?? 2)),
      isPublic: Boolean(settings?.isPublic ?? false),
    };

    hostPlayer.isHost = true;
    hostPlayer.isReady = true;
    this.players.set(hostPlayer.id, hostPlayer);
  }

  public touch(): void {
    this.lastActivityAt = Date.now();
  }

  public addPlayer(player: Player): { success: boolean; error?: string } {
    this.touch();

    // Check if player was previously kicked from this room
    if (this.kickedPlayerIds.has(player.id)) {
      return { success: false, error: 'You have been removed from this room by community vote.' };
    }

    if (this.players.size >= this.settings.maxPlayers) {
      return { success: false, error: 'Room is already full.' };
    }

    // Check duplicate name in room
    const nameLower = player.name.toLowerCase();
    const existingPlayer = Array.from(this.players.values()).find(
      (p) => p.name.toLowerCase() === nameLower && p.isConnected
    );

    if (existingPlayer) {
      return { success: false, error: 'A player with this name is already in the room.' };
    }

    this.players.set(player.id, player);
    return { success: true };
  }

  public removePlayer(playerId: string): {
    wasHost: boolean;
    newHostId?: string;
    isEmpty: boolean;
    voteCancelled?: boolean;
  } {
    this.touch();
    const player = this.players.get(playerId);
    if (!player) {
      return { wasHost: false, isEmpty: this.players.size === 0 };
    }

    const wasHost = player.isHost;
    this.players.delete(playerId);

    let voteCancelled = false;
    if (this.activeVote && this.activeVote.targetId === playerId) {
      this.cancelVote('Target player disconnected');
      voteCancelled = true;
    }

    let newHostId: string | undefined;

    if (this.players.size > 0 && wasHost) {
      const remaining = Array.from(this.players.values());
      const nextHost = remaining.find((p) => p.isConnected) || remaining[0];
      if (nextHost) {
        nextHost.isHost = true;
        nextHost.isReady = true;
        this.hostId = nextHost.id;
        newHostId = nextHost.id;
      }
    }

    if (this.game) {
      this.game.handlePlayerDisconnect(playerId, this.getPlayersList());
    }

    return {
      wasHost,
      newHostId,
      isEmpty: this.players.size === 0,
      voteCancelled,
    };
  }

  public getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  public getPlayerBySocketId(socketId: string): Player | undefined {
    return Array.from(this.players.values()).find((p) => p.socketId === socketId);
  }

  public getPlayersList(): Player[] {
    return Array.from(this.players.values());
  }

  public getConnectedPlayers(): Player[] {
    return Array.from(this.players.values()).filter((p) => p.isConnected);
  }

  public updateSettings(newSettings: Partial<RoomSettings>): void {
    this.touch();
    if (newSettings.maxPlayers !== undefined) {
      this.settings.maxPlayers = Math.min(20, Math.max(2, newSettings.maxPlayers));
    }
    if (newSettings.rounds !== undefined) {
      this.settings.rounds = Math.min(10, Math.max(2, newSettings.rounds));
    }
    if (newSettings.drawTime !== undefined) {
      this.settings.drawTime = Math.min(240, Math.max(15, newSettings.drawTime));
    }
    if (newSettings.wordChoices !== undefined) {
      this.settings.wordChoices = Math.min(5, Math.max(1, newSettings.wordChoices));
    }
    if (newSettings.hintsCount !== undefined) {
      this.settings.hintsCount = Math.min(5, Math.max(0, newSettings.hintsCount));
    }
    if (newSettings.isPublic !== undefined) {
      this.settings.isPublic = Boolean(newSettings.isPublic);
    }

    if (this.game) {
      this.game.settings = this.settings;
    }
  }

  public canStartGame(requesterId: string): { canStart: boolean; reason?: string } {
    if (requesterId !== this.hostId) {
      return { canStart: false, reason: 'Only the room host can start the game.' };
    }

    const connected = this.getConnectedPlayers();
    if (connected.length < 2) {
      return { canStart: false, reason: 'At least 2 connected players are required to start.' };
    }

    const notReady = connected.filter((p) => !p.isReady);
    if (notReady.length > 0) {
      const names = notReady.map((p) => p.name).join(', ');
      return { canStart: false, reason: `Waiting for all players to be ready: ${names}` };
    }

    return { canStart: true };
  }

  public createGame(): Game {
    this.touch();
    this.destroyGame();
    this.game = new Game(this.settings);
    return this.game;
  }

  public destroyGame(): void {
    if (this.game) {
      this.game.clearTimer();
      this.game = null;
    }
    this.cleanupVote();
  }

  // --- Vote Kick System ---

  public startVoteKick(
    initiatorId: string,
    targetId: string,
    reason?: string
  ): { success: boolean; error?: string; voteData?: VoteKickData; isImmediatelyResolved?: boolean; result?: VoteKickResult } {
    this.touch();

    if (this.activeVote) {
      return { success: false, error: 'A vote kick is already in progress.' };
    }

    if (initiatorId === targetId) {
      return { success: false, error: 'You cannot initiate a vote to kick yourself.' };
    }

    const initiator = this.players.get(initiatorId);
    const target = this.players.get(targetId);

    if (!initiator || !target || !target.isConnected) {
      return { success: false, error: 'Target player not found or not connected.' };
    }

    if (target.isHost) {
      return { success: false, error: 'The room host cannot be kicked.' };
    }

    // Cooldown check (60s cooldown per target)
    const cooldownEnd = this.voteCooldowns.get(targetId);
    if (cooldownEnd && Date.now() < cooldownEnd) {
      const remainingSecs = Math.ceil((cooldownEnd - Date.now()) / 1000);
      return { success: false, error: `Please wait ${remainingSecs}s before initiating another vote against ${target.name}.` };
    }

    // Eligible voters: connected players except target and host (protected moderator)
    const connected = this.getConnectedPlayers();
    const eligible = connected.filter((p) => p.id !== targetId && !p.isHost);

    // Require at least 2 eligible voters to initiate a community vote
    if (eligible.length < 2) {
      return { success: false, error: 'At least 3 players (including target) are required to hold a vote kick.' };
    }

    // Threshold: majority (> 50%) of eligible voters
    // e.g. 3 eligible voters -> floor(3/2) + 1 = 2 required
    // e.g. 4 eligible voters -> floor(4/2) + 1 = 3 required
    const requiredVotes = Math.floor(eligible.length / 2) + 1;

    this.activeVote = {
      targetId,
      targetName: target.name,
      initiatorId,
      initiatorName: initiator.name,
      reason: reason?.trim() ? reason.trim().slice(0, 80) : undefined,
      yesVotes: new Set<string>([initiatorId]), // Initiator auto-votes YES
      noVotes: new Set<string>(),
      totalEligibleVoters: eligible.length,
      requiredVotes,
      timeLeft: 30,
      timerInterval: null,
      createdAt: Date.now(),
    };

    // Check if initiator's single vote already met threshold (e.g. if required was 1)
    if (this.activeVote.yesVotes.size >= this.activeVote.requiredVotes) {
      const res = this.resolveVote(true);
      return { success: true, isImmediatelyResolved: true, result: res };
    }

    return { success: true, voteData: this.getPublicVoteData()! };
  }

  public castVote(
    voterId: string,
    voteYes: boolean
  ): {
    success: boolean;
    error?: string;
    isResolved: boolean;
    result?: VoteKickResult;
    voteData?: VoteKickData;
  } {
    this.touch();

    if (!this.activeVote) {
      return { success: false, error: 'No active vote in progress.', isResolved: false };
    }

    const voter = this.players.get(voterId);
    if (!voter || !voter.isConnected) {
      return { success: false, error: 'Voter not connected.', isResolved: false };
    }

    if (voterId === this.activeVote.targetId) {
      return { success: false, error: 'Target player cannot vote on their own kick.', isResolved: false };
    }

    if (voter.isHost) {
      return { success: false, error: 'Host is a protected moderator and does not vote.', isResolved: false };
    }

    if (this.activeVote.yesVotes.has(voterId) || this.activeVote.noVotes.has(voterId)) {
      return { success: false, error: 'You have already voted.', isResolved: false };
    }

    if (voteYes) {
      this.activeVote.yesVotes.add(voterId);
    } else {
      this.activeVote.noVotes.add(voterId);
    }

    // Check if YES threshold reached
    if (this.activeVote.yesVotes.size >= this.activeVote.requiredVotes) {
      const res = this.resolveVote(true);
      return { success: true, isResolved: true, result: res };
    }

    // Check if mathematically impossible for YES to win
    const maxPossibleYes = this.activeVote.totalEligibleVoters - this.activeVote.noVotes.size;
    if (maxPossibleYes < this.activeVote.requiredVotes) {
      const res = this.resolveVote(false);
      return { success: true, isResolved: true, result: res };
    }

    return {
      success: true,
      isResolved: false,
      voteData: this.getPublicVoteData()!,
    };
  }

  public resolveVote(passed: boolean): VoteKickResult {
    this.cleanupVote();

    const targetId = this.activeVote?.targetId || '';
    const targetName = this.activeVote?.targetName || '';
    const yesCount = this.activeVote?.yesVotes.size || 0;
    const noCount = this.activeVote?.noVotes.size || 0;
    const reason = this.activeVote?.reason;

    this.activeVote = null;

    if (passed) {
      this.kickedPlayerIds.add(targetId);
    } else {
      // 60-second cooldown on failed vote
      this.voteCooldowns.set(targetId, Date.now() + 60000);
    }

    return {
      targetId,
      targetName,
      passed,
      yesVotes: yesCount,
      noVotes: noCount,
      reason,
    };
  }

  public cancelVote(reason: string = 'Vote cancelled'): { targetId: string; targetName: string; reason: string } | null {
    if (!this.activeVote) return null;
    this.cleanupVote();

    const targetId = this.activeVote.targetId;
    const targetName = this.activeVote.targetName;
    this.activeVote = null;

    return { targetId, targetName, reason };
  }

  public cleanupVote(): void {
    if (this.activeVote?.timerInterval) {
      clearInterval(this.activeVote.timerInterval);
      this.activeVote.timerInterval = null;
    }
  }

  public getPublicVoteData(): VoteKickData | null {
    if (!this.activeVote) return null;
    return {
      targetId: this.activeVote.targetId,
      targetName: this.activeVote.targetName,
      initiatorId: this.activeVote.initiatorId,
      initiatorName: this.activeVote.initiatorName,
      reason: this.activeVote.reason,
      yesVotes: this.activeVote.yesVotes.size,
      noVotes: this.activeVote.noVotes.size,
      requiredVotes: this.activeVote.requiredVotes,
      totalEligible: this.activeVote.totalEligibleVoters,
      timeLeft: this.activeVote.timeLeft,
    };
  }

  public toJSON(): RoomData {
    const defaultGameState: PublicGameState = {
      phase: 'LOBBY',
      currentRound: 0,
      totalRounds: this.settings.rounds,
      currentDrawerId: null,
      currentDrawerName: null,
      maskedWord: '',
      wordLength: 0,
      hintsRevealed: 0,
      totalHints: this.settings.hintsCount,
      timeLeft: 0,
      turnNumber: 0,
      totalTurns: 0,
    };

    return {
      id: this.id,
      code: this.code,
      hostId: this.hostId,
      players: Array.from(this.players.values()).map((p) => p.toJSON()),
      settings: this.settings,
      gameState: this.game ? this.game.getPublicGameState(this.getPlayersList()) : defaultGameState,
      isGameActive: this.game !== null && this.game.phase !== 'LOBBY' && this.game.phase !== 'GAME_OVER',
      activeVote: this.getPublicVoteData(),
    };
  }

  public toPublicInfo(): PublicRoomInfo {
    const host = this.players.get(this.hostId);
    return {
      code: this.code,
      hostName: host ? host.name : 'Unknown',
      playerCount: this.players.size,
      maxPlayers: this.settings.maxPlayers,
      currentRound: this.game ? this.game.currentRound : 0,
      totalRounds: this.settings.rounds,
      isGameActive: this.game !== null && this.game.phase !== 'LOBBY' && this.game.phase !== 'GAME_OVER',
    };
  }
}
