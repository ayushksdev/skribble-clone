import { Server, Socket } from 'socket.io';
import { roomService } from '../services/roomService.js';
import { ApiResponse, VoteKickData, VoteKickResult } from '../types/index.js';

export function registerVoteHandlers(io: Server, socket: Socket) {
  // Start Vote Kick
  socket.on(
    'vote_kick_start',
    (
      data: { targetId: string; reason?: string },
      callback?: (res: ApiResponse<VoteKickData>) => void
    ) => {
      const session = roomService.getPlayerSession(socket.id);
      if (!session) {
        callback?.({ success: false, error: 'Not in a room.' });
        return;
      }

      const { room, player } = session;
      const targetId = data?.targetId;

      if (!targetId) {
        callback?.({ success: false, error: 'Target player ID is required.' });
        return;
      }

      const startRes = room.startVoteKick(player.id, targetId, data?.reason);

      if (!startRes.success) {
        callback?.({ success: false, error: startRes.error });
        return;
      }

      // If immediately resolved (e.g. 1 required vote)
      if (startRes.isImmediatelyResolved && startRes.result) {
        handleVoteResult(io, room, startRes.result);
        callback?.({ success: true, data: startRes.voteData });
        return;
      }

      const voteData = startRes.voteData!;

      // Setup 30-second server countdown
      if (room.activeVote) {
        room.activeVote.timerInterval = setInterval(() => {
          if (!room.activeVote) return;

          room.activeVote.timeLeft--;

          if (room.activeVote.timeLeft <= 0) {
            // Timer expired: vote fails
            const result = room.resolveVote(false);
            handleVoteResult(io, room, result);
          } else {
            // Broadcast live countdown and progress update
            io.to(`room:${room.code}`).emit('vote_kick_update', room.getPublicVoteData()!);
          }
        }, 1000);
      }

      // Broadcast vote kick started to all players in the room
      io.to(`room:${room.code}`).emit('vote_kick_started', voteData);

      // System chat notice
      io.to(`room:${room.code}`).emit('chat_message', {
        id: `vote-${Date.now()}`,
        senderName: 'System',
        text: `${player.name} started a vote to kick ${voteData.targetName}.`,
        type: 'system',
        timestamp: Date.now(),
      });

      callback?.({ success: true, data: voteData });
    }
  );

  // Cast Vote (YES or NO)
  socket.on(
    'vote_kick_cast',
    (data: { vote: boolean }, callback?: (res: ApiResponse) => void) => {
      const session = roomService.getPlayerSession(socket.id);
      if (!session) {
        callback?.({ success: false, error: 'Not in a room.' });
        return;
      }

      const { room, player } = session;
      const castRes = room.castVote(player.id, Boolean(data?.vote));

      if (!castRes.success) {
        callback?.({ success: false, error: castRes.error });
        return;
      }

      callback?.({ success: true });

      if (castRes.isResolved && castRes.result) {
        handleVoteResult(io, room, castRes.result);
      } else if (castRes.voteData) {
        io.to(`room:${room.code}`).emit('vote_kick_update', castRes.voteData);
      }
    }
  );
}

export function handleVoteResult(
  io: Server,
  room: ReturnType<typeof roomService.getRoomByCode> & object,
  result: VoteKickResult
) {
  // Broadcast final result to room
  io.to(`room:${room.code}`).emit('vote_kick_result', result);

  if (result.passed) {
    // 1. System notification
    io.to(`room:${room.code}`).emit('chat_message', {
      id: `sys-${Date.now()}`,
      senderName: 'System',
      text: `${result.targetName} was removed from the room by community vote.`,
      type: 'system',
      timestamp: Date.now(),
    });

    // 2. Notify target socket directly
    const targetPlayer = room.getPlayer(result.targetId);
    if (targetPlayer && targetPlayer.socketId) {
      const targetSocket = io.sockets.sockets.get(targetPlayer.socketId);
      if (targetSocket) {
        targetSocket.emit('kicked_from_room', {
          message: 'You have been removed from the room by community vote.',
        });
        targetSocket.leave(`room:${room.code}`);
      }
    }

    // 3. Remove target from room
    room.removePlayer(result.targetId);

    // 4. Broadcast updated room state
    io.to(`room:${room.code}`).emit('room_updated', room.toJSON());
  } else {
    // Vote failed notice
    io.to(`room:${room.code}`).emit('chat_message', {
      id: `sys-${Date.now()}`,
      senderName: 'System',
      text: `Vote failed. ${result.targetName} remains in the room.`,
      type: 'system',
      timestamp: Date.now(),
    });

    io.to(`room:${room.code}`).emit('room_updated', room.toJSON());
  }
}
