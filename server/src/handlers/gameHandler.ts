import { Server, Socket } from 'socket.io';
import { roomService } from '../services/roomService.js';
import { Game } from '../classes/Game.js';
import { ApiResponse } from '../types/index.js';

export function registerGameHandlers(io: Server, socket: Socket) {
  // Start Game (Host only)
  socket.on('start_game', (callback?: (res: ApiResponse) => void) => {
    const session = roomService.getPlayerSession(socket.id);
    if (!session) {
      callback?.({ success: false, error: 'Not in a room.' });
      return;
    }

    const { room, player } = session;

    const canStart = room.canStartGame(player.id);
    if (!canStart.canStart) {
      callback?.({ success: false, error: canStart.reason });
      socket.emit('room_error', { message: canStart.reason || 'Cannot start game.' });
      return;
    }

    const game = room.createGame();
    setupGameCallbacks(io, room.code, game, room);

    const started = game.startGame(room.getPlayersList());
    if (!started) {
      callback?.({ success: false, error: 'Failed to start game.' });
      return;
    }

    callback?.({ success: true });
  });

  // Select Word (Drawer only)
  socket.on('select_word', (word: string, callback?: (res: ApiResponse) => void) => {
    const session = roomService.getPlayerSession(socket.id);
    if (!session || !session.room.game) {
      callback?.({ success: false, error: 'No active game.' });
      return;
    }

    const { room, player } = session;
    const game = room.game;
    if (!game) {
      callback?.({ success: false, error: 'No active game.' });
      return;
    }

    if (player.id !== game.currentDrawerId) {
      callback?.({ success: false, error: 'Only the current drawer can choose a word.' });
      return;
    }

    if (!game.wordChoices.includes(word)) {
      callback?.({ success: false, error: 'Invalid word choice.' });
      return;
    }

    const success = game.selectWord(word, room.getPlayersList());
    if (success) {
      callback?.({ success: true });
    } else {
      callback?.({ success: false, error: 'Could not select word at this time.' });
    }
  });

  // Play Again (Host only or return to lobby)
  socket.on('play_again', (callback?: (res: ApiResponse) => void) => {
    const session = roomService.getPlayerSession(socket.id);
    if (!session) return;

    const { room, player } = session;
    if (!player.isHost) {
      callback?.({ success: false, error: 'Only host can restart the game.' });
      return;
    }

    room.destroyGame();
    // Reset player scores and ready states
    room.getPlayersList().forEach((p) => {
      p.resetGame();
    });

    io.to(`room:${room.code}`).emit('room_updated', room.toJSON());
    callback?.({ success: true });
  });
}

export function setupGameCallbacks(
  io: Server,
  roomCode: string,
  game: Game,
  room: ReturnType<typeof roomService.getRoomByCode> & object
) {
  let prevHintsRevealed = 0;

  game.setCallbacks({
    onTick: (timeLeft: number) => {
      io.to(`room:${roomCode}`).emit('round_timer', timeLeft);

      // If hints updated during drawing, broadcast updated game state to non-drawers
      if (game.hintsRevealed > prevHintsRevealed) {
        prevHintsRevealed = game.hintsRevealed;
        broadcastMaskedState(io, roomCode, game, room);
      }
    },

    onPhaseChange: (phase) => {
      prevHintsRevealed = 0;

      // Broadcast game state to everyone
      broadcastMaskedState(io, roomCode, game, room);

      // If WORD_SELECTION phase, deliver word choices ONLY to the drawer
      if (phase === 'WORD_SELECTION' && game.currentDrawerId) {
        const drawer = room.getPlayer(game.currentDrawerId);
        if (drawer && drawer.socketId) {
          io.to(drawer.socketId).emit('word_choices', game.wordChoices);
        }
      }

      // If DRAWING phase, drawer gets the chosen word explicitly
      if (phase === 'DRAWING' && game.currentDrawerId && game.currentWord) {
        const drawer = room.getPlayer(game.currentDrawerId);
        if (drawer && drawer.socketId) {
          io.to(drawer.socketId).emit('current_drawer_word', game.currentWord);
        }
      }
    },

    onRoundEnd: (result) => {
      io.to(`room:${roomCode}`).emit('round_end', result);
      io.to(`room:${roomCode}`).emit('room_updated', room.toJSON());
    },

    onGameOver: (result) => {
      io.to(`room:${roomCode}`).emit('game_over', {
        winner: result.winner.toJSON(),
        finalLeaderboard: result.finalLeaderboard.map((p) => p.toJSON()),
      });
      io.to(`room:${roomCode}`).emit('room_updated', room.toJSON());
    },
  });
}

function broadcastMaskedState(
  io: Server,
  roomCode: string,
  game: Game,
  room: ReturnType<typeof roomService.getRoomByCode> & object
) {
  const publicState = game.getPublicGameState(room.getPlayersList());
  io.to(`room:${roomCode}`).emit('game_state', publicState);
  io.to(`room:${roomCode}`).emit('room_updated', room.toJSON());
}
