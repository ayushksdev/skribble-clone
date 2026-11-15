import { Server, Socket } from 'socket.io';
import { roomService } from '../services/roomService.js';
import { sanitizePlayerName } from '../utils/sanitize.js';
import { ApiResponse, RoomData, RoomSettings, PublicRoomInfo } from '../types/index.js';

export function registerRoomHandlers(io: Server, socket: Socket) {
  // Create Room
  socket.on(
    'create_room',
    (
      data: { playerName: string; settings?: Partial<RoomSettings>; playerId?: string },
      callback?: (response: ApiResponse<RoomData>) => void
    ) => {
      try {
        const cleanName = sanitizePlayerName(data?.playerName);
        if (!cleanName) {
          callback?.({ success: false, error: 'Valid player name is required.' });
          return;
        }

        const { room, player } = roomService.createRoom(
          cleanName,
          socket.id,
          data.settings,
          data.playerId
        );

        // Join Socket.IO room channel
        socket.join(`room:${room.code}`);

        callback?.({
          success: true,
          data: room.toJSON(),
        });
      } catch (error) {
        console.error('Error creating room:', error);
        callback?.({ success: false, error: 'Failed to create room.' });
      }
    }
  );

  // Join Room
  socket.on(
    'join_room',
    (
      data: { roomCode: string; playerName: string; playerId?: string },
      callback?: (response: ApiResponse<RoomData>) => void
    ) => {
      try {
        if (!data?.roomCode) {
          callback?.({ success: false, error: 'Room code is required.' });
          return;
        }

        const cleanName = sanitizePlayerName(data.playerName);
        if (!cleanName) {
          callback?.({ success: false, error: 'Valid player name is required.' });
          return;
        }

        const result = roomService.joinRoom(
          data.roomCode,
          cleanName,
          socket.id,
          data.playerId
        );

        if (!result.success || !result.room || !result.player) {
          callback?.({ success: false, error: result.error || 'Failed to join room.' });
          return;
        }

        const { room, player } = result;

        // Join Socket.IO room channel
        socket.join(`room:${room.code}`);

        // Notify existing players
        socket.to(`room:${room.code}`).emit('player_joined', player.toJSON());

        // Broadcast updated room state
        io.to(`room:${room.code}`).emit('room_updated', room.toJSON());

        // Send system chat notification
        io.to(`room:${room.code}`).emit('chat_message', {
          id: `sys-${Date.now()}-${Math.random()}`,
          senderName: 'System',
          text: `${player.name} joined the room.`,
          type: 'system',
          timestamp: Date.now(),
        });

        // Send canvas history if game is currently in DRAWING phase
        if (room.game && room.game.phase === 'DRAWING') {
          socket.emit('canvas_state', room.game.strokes);
        }

        callback?.({
          success: true,
          data: room.toJSON(),
        });
      } catch (error) {
        console.error('Error joining room:', error);
        callback?.({ success: false, error: 'Failed to join room.' });
      }
    }
  );

  // Player Ready Toggle
  socket.on('player_ready', (ready: boolean) => {
    const session = roomService.getPlayerSession(socket.id);
    if (!session) return;

    const { room, player } = session;
    player.setReady(Boolean(ready));

    io.to(`room:${room.code}`).emit('room_updated', room.toJSON());
  });

  // Update Settings (Host Only)
  socket.on('update_settings', (settings: Partial<RoomSettings>) => {
    const session = roomService.getPlayerSession(socket.id);
    if (!session) return;

    const { room, player } = session;
    if (!player.isHost) return;

    room.updateSettings(settings);
    io.to(`room:${room.code}`).emit('room_updated', room.toJSON());
  });

  // Leave Room
  socket.on('leave_room', () => {
    handlePlayerExit(io, socket, true);
  });

  // Get Public Rooms
  socket.on('get_public_rooms', (callback?: (rooms: PublicRoomInfo[]) => void) => {
    const rooms = roomService.getPublicRooms();
    callback?.(rooms);
  });
}

export function handlePlayerExit(io: Server, socket: Socket, isManualLeave: boolean = false) {
  const result = isManualLeave
    ? roomService.leaveRoom(socket.id)
    : roomService.handleDisconnect(socket.id);

  if (!result.room || !result.player) return;

  const { room, player, newHostId, roomDeleted } = result;

  socket.leave(`room:${room.code}`);

  if (roomDeleted) {
    return;
  }

  // Check if active vote was targeting this player
  if (room.activeVote && room.activeVote.targetId === player.id) {
    room.cancelVote('Target player disconnected');
    io.to(`room:${room.code}`).emit('vote_kick_cancelled', {
      reason: `Vote cancelled because ${player.name} left the room.`,
    });
  }

  // Broadcast player left
  io.to(`room:${room.code}`).emit('player_left', player.id, newHostId);
  io.to(`room:${room.code}`).emit('room_updated', room.toJSON());

  // System notification
  io.to(`room:${room.code}`).emit('chat_message', {
    id: `sys-${Date.now()}-${Math.random()}`,
    senderName: 'System',
    text: `${player.name} left the game.`,
    type: 'system',
    timestamp: Date.now(),
  });
}
