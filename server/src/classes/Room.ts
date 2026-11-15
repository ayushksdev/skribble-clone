import { RoomData, RoomSettings, PublicRoomInfo, PublicGameState } from '../types/index.js';
import { Player } from './Player.js';
import { Game } from './Game.js';

export class Room {
  public id: string;
  public code: string;
  public hostId: string;
  public players: Map<string, Player> = new Map();
  public settings: RoomSettings;
  public game: Game | null = null;
  public createdAt: number = Date.now();
  public lastActivityAt: number = Date.now();

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
  } {
    this.touch();
    const player = this.players.get(playerId);
    if (!player) {
      return { wasHost: false, isEmpty: this.players.size === 0 };
    }

    const wasHost = player.isHost;
    this.players.delete(playerId);

    let newHostId: string | undefined;

    if (this.players.size > 0 && wasHost) {
      // Reassign host to the first connected player
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
