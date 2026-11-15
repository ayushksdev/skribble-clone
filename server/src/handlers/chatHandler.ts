import { Server, Socket } from 'socket.io';
import { roomService } from '../services/roomService.js';
import { sanitizeText } from '../utils/sanitize.js';
import { ChatMessage } from '../types/index.js';

export function registerChatHandlers(io: Server, socket: Socket) {
  socket.on('chat_message', (data: { message: string }) => {
    const session = roomService.getPlayerSession(socket.id);
    if (!session) return;

    const { room, player } = session;
    const rawText = data?.message;
    if (!rawText || typeof rawText !== 'string') return;

    const cleanText = sanitizeText(rawText, 150);
    if (!cleanText) return;

    const game = room.game;

    // Check if a game is active in DRAWING phase
    if (game && game.phase === 'DRAWING' && game.currentWord) {
      const normalizedWord = game.currentWord.trim().toLowerCase();
      const normalizedText = cleanText.trim().toLowerCase();

      // Case 1: Drawer types message
      if (player.id === game.currentDrawerId) {
        // Prevent drawer from giving away the exact word in chat
        if (normalizedText.includes(normalizedWord)) {
          socket.emit('chat_message', {
            id: `warn-${Date.now()}`,
            senderName: 'System',
            text: 'You cannot write the secret word in chat!',
            type: 'system',
            timestamp: Date.now(),
            isPrivate: true,
          } as ChatMessage);
          return;
        }

        // Normal chat from drawer
        broadcastChat(io, room.code, {
          id: `msg-${Date.now()}-${Math.random()}`,
          senderId: player.id,
          senderName: player.name,
          text: cleanText,
          type: 'chat',
          timestamp: Date.now(),
        });
        return;
      }

      // Case 2: Player has already guessed correctly this round
      if (player.hasGuessedCorrectly) {
        // Prevent them from spoiling the answer for others
        if (normalizedText.includes(normalizedWord)) {
          socket.emit('chat_message', {
            id: `warn-${Date.now()}`,
            senderName: 'System',
            text: 'You already guessed the word! Shh, do not spoil it.',
            type: 'system',
            timestamp: Date.now(),
            isPrivate: true,
          } as ChatMessage);
          return;
        }

        // Their messages can be seen by everyone
        broadcastChat(io, room.code, {
          id: `msg-${Date.now()}-${Math.random()}`,
          senderId: player.id,
          senderName: player.name,
          text: cleanText,
          type: 'chat',
          timestamp: Date.now(),
        });
        return;
      }

      // Case 3: Player is guessing
      const guessResult = game.handleGuess(player, cleanText, room.getPlayersList());

      if (guessResult.isCorrect) {
        // Correct Guess!
        // DO NOT show the word in chat!
        const correctMsg: ChatMessage = {
          id: `correct-${Date.now()}-${Math.random()}`,
          senderId: player.id,
          senderName: 'System',
          text: `${player.name} guessed the word! (+${guessResult.pointsAwarded || 0} pts)`,
          type: 'correct_guess',
          timestamp: Date.now(),
        };

        io.to(`room:${room.code}`).emit('chat_message', correctMsg);
        io.to(`room:${room.code}`).emit('room_updated', room.toJSON());

        // Emit specific event to the player who guessed
        socket.emit('guess_result', {
          playerId: player.id,
          playerName: player.name,
          isCorrect: true,
          pointsAwarded: guessResult.pointsAwarded,
        });

        return;
      }

      if (guessResult.isClose) {
        // Send a private hint to the player that they're close!
        socket.emit('chat_message', {
          id: `close-${Date.now()}`,
          senderName: 'System',
          text: `"${cleanText}" is very close!`,
          type: 'close_guess',
          timestamp: Date.now(),
          isPrivate: true,
        } as ChatMessage);
      }
    }

    // Standard chat message
    broadcastChat(io, room.code, {
      id: `msg-${Date.now()}-${Math.random()}`,
      senderId: player.id,
      senderName: player.name,
      text: cleanText,
      type: 'chat',
      timestamp: Date.now(),
    });
  });
}

function broadcastChat(io: Server, roomCode: string, msg: ChatMessage) {
  io.to(`room:${roomCode}`).emit('chat_message', msg);
}
