import { Room } from '../classes/Room.js';
import { Player } from '../classes/Player.js';
import { generateRoomCode } from '../utils/codeGenerator.js';
import { RoomSettings, PublicRoomInfo } from '../types/index.js';
import crypto from 'crypto';

export class RoomService {
  private rooms: Map<string, Room> = new Map(); // Keyed by room code (upper case)
  private socketToPlayer: Map<string, { roomCode: string; playerId: string }> = new Map();

  constructor() {
    // Run cleanup for stale rooms every 5 minutes
    setInterval(() => {
      this.cleanupStaleRooms();
    }, 5 * 60 * 1000);
  }

  public createRoom(
    playerName: string,
    socketId: string,
    settings?: Partial<RoomSettings>,
    existingPlayerId?: string
  ): { room: Room; player: Player } {
    let code: string;
    do {
      code = generateRoomCode();
    } while (this.rooms.has(code));

    const roomId = crypto.randomUUID();
    const playerId = existingPlayerId || crypto.randomUUID();
    const hostPlayer = new Player(playerId, playerName, socketId, true);

    const room = new Room(roomId, code, hostPlayer, settings);
    this.rooms.set(code, room);
    this.socketToPlayer.set(socketId, { roomCode: code, playerId });

    return { room, player: hostPlayer };
  }

  public getRoomByCode(code: string): Room | undefined {
    return this.rooms.get(code.trim().toUpperCase());
  }

  public getPlayerSession(socketId: string): { room: Room; player: Player } | undefined {
    const session = this.socketToPlayer.get(socketId);
    if (!session) return undefined;

    const room = this.rooms.get(session.roomCode);
    if (!room) {
      this.socketToPlayer.delete(socketId);
      return undefined;
    }

    const player = room.getPlayer(session.playerId);
    if (!player) {
      this.socketToPlayer.delete(socketId);
      return undefined;
    }

    return { room, player };
  }

  public joinRoom(
    code: string,
    playerName: string,
    socketId: string,
    existingPlayerId?: string
  ): { success: boolean; room?: Room; player?: Player; error?: string } {
    const room = this.getRoomByCode(code);
    if (!room) {
      return { success: false, error: 'Room does not exist.' };
    }

    // Check if player is reconnecting with an existing playerId
    if (existingPlayerId && room.getPlayer(existingPlayerId)) {
      const existingPlayer = room.getPlayer(existingPlayerId)!;
      existingPlayer.setConnected(true, socketId);
      this.socketToPlayer.set(socketId, { roomCode: room.code, playerId: existingPlayer.id });
      return { success: true, room, player: existingPlayer };
    }

    const playerId = existingPlayerId || crypto.randomUUID();
    const player = new Player(playerId, playerName, socketId, false);

    const addResult = room.addPlayer(player);
    if (!addResult.success) {
      return { success: false, error: addResult.error };
    }

    this.socketToPlayer.set(socketId, { roomCode: room.code, playerId: player.id });
    return { success: true, room, player };
  }

  public handleDisconnect(socketId: string): {
    room?: Room;
    player?: Player;
    wasHost: boolean;
    newHostId?: string;
    roomDeleted: boolean;
  } {
    const session = this.socketToPlayer.get(socketId);
    if (!session) {
      return { wasHost: false, roomDeleted: false };
    }

    this.socketToPlayer.delete(socketId);
    const room = this.rooms.get(session.roomCode);
    if (!room) {
      return { wasHost: false, roomDeleted: false };
    }

    const player = room.getPlayer(session.playerId);
    if (!player) {
      return { wasHost: false, roomDeleted: false };
    }

    // Set player as disconnected
    player.setConnected(false);

    // If room is in lobby and player disconnected, or if all players are disconnected
    const allDisconnected = room.getPlayersList().every((p) => !p.isConnected);

    if (allDisconnected) {
      room.destroyGame();
      this.rooms.delete(room.code);
      return { room, player, wasHost: player.isHost, roomDeleted: true };
    }

    // If host disconnected, reassign host
    let newHostId: string | undefined;
    if (player.isHost) {
      const remainingConnected = room.getConnectedPlayers();
      if (remainingConnected.length > 0) {
        player.isHost = false;
        remainingConnected[0].isHost = true;
        remainingConnected[0].isReady = true;
        room.hostId = remainingConnected[0].id;
        newHostId = remainingConnected[0].id;
      }
    }

    if (room.game) {
      room.game.handlePlayerDisconnect(player.id, room.getPlayersList());
    }

    return {
      room,
      player,
      wasHost: player.isHost,
      newHostId,
      roomDeleted: false,
    };
  }

  public leaveRoom(socketId: string): {
    room?: Room;
    player?: Player;
    wasHost: boolean;
    newHostId?: string;
    roomDeleted: boolean;
  } {
    const session = this.socketToPlayer.get(socketId);
    if (!session) {
      return { wasHost: false, roomDeleted: false };
    }

    this.socketToPlayer.delete(socketId);
    const room = this.rooms.get(session.roomCode);
    if (!room) {
      return { wasHost: false, roomDeleted: false };
    }

    const player = room.getPlayer(session.playerId);
    const result = room.removePlayer(session.playerId);

    if (result.isEmpty) {
      room.destroyGame();
      this.rooms.delete(room.code);
      return { room, player, wasHost: result.wasHost, roomDeleted: true };
    }

    return {
      room,
      player,
      wasHost: result.wasHost,
      newHostId: result.newHostId,
      roomDeleted: false,
    };
  }

  public getPublicRooms(): PublicRoomInfo[] {
    const publicRooms: PublicRoomInfo[] = [];
    for (const room of this.rooms.values()) {
      if (room.settings.isPublic && room.players.size < room.settings.maxPlayers) {
        publicRooms.push(room.toPublicInfo());
      }
    }
    return publicRooms;
  }

  private cleanupStaleRooms(): void {
    const now = Date.now();
    const STALE_TIMEOUT = 60 * 60 * 1000; // 1 hour inactivity

    for (const [code, room] of this.rooms.entries()) {
      if (now - room.lastActivityAt > STALE_TIMEOUT || room.players.size === 0) {
        room.destroyGame();
        this.rooms.delete(code);
      }
    }
  }
}

export const roomService = new RoomService();
