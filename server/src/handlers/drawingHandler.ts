import { Server, Socket } from 'socket.io';
import { roomService } from '../services/roomService.js';
import {
  DrawStartPayload,
  DrawMovePayload,
  DrawEndPayload,
  DrawFillPayload,
  Stroke,
  Point,
} from '../types/index.js';

// Active in-progress strokes on server by strokeId
const activeStrokes = new Map<string, Stroke>();

function clampNormalizedPoint(p: Point): Point {
  return {
    x: Math.max(0, Math.min(1, Number(p?.x ?? 0))),
    y: Math.max(0, Math.min(1, Number(p?.y ?? 0))),
  };
}

export function registerDrawingHandlers(io: Server, socket: Socket) {
  // Draw Start
  socket.on('draw_start', (data: DrawStartPayload) => {
    const session = roomService.getPlayerSession(socket.id);
    if (!session || !session.room.game) return;

    const { room, player } = session;
    const game = room.game;
    if (!game) return;

    // Verify player is drawer and game is in DRAWING phase
    if (game.phase !== 'DRAWING' || player.id !== game.currentDrawerId) {
      return;
    }

    if (!data?.strokeId || !data.point) return;

    const clampedPoint = clampNormalizedPoint(data.point);
    const newStroke: Stroke = {
      id: data.strokeId,
      tool: data.tool === 'eraser' ? 'eraser' : 'brush',
      color: typeof data.color === 'string' ? data.color : '#000000',
      size: Math.max(1, Math.min(60, Number(data.size) || 5)),
      points: [clampedPoint],
    };

    activeStrokes.set(data.strokeId, newStroke);

    // Broadcast to other players in room
    socket.to(`room:${room.code}`).emit('draw_start', {
      ...data,
      point: clampedPoint,
    });
  });

  // Draw Move (batched points)
  socket.on('draw_move', (data: DrawMovePayload) => {
    const session = roomService.getPlayerSession(socket.id);
    if (!session || !session.room.game) return;

    const { room, player } = session;
    const game = room.game;
    if (!game) return;

    if (game.phase !== 'DRAWING' || player.id !== game.currentDrawerId) {
      return;
    }

    if (!data?.strokeId || !Array.isArray(data.points) || data.points.length === 0) {
      return;
    }

    // Limit batch size to prevent flood
    const validPoints = data.points.slice(0, 50).map(clampNormalizedPoint);

    const activeStroke = activeStrokes.get(data.strokeId);
    if (activeStroke) {
      activeStroke.points.push(...validPoints);
    }

    socket.to(`room:${room.code}`).emit('draw_move', {
      strokeId: data.strokeId,
      points: validPoints,
    });
  });

  // Draw End
  socket.on('draw_end', (data: DrawEndPayload) => {
    const session = roomService.getPlayerSession(socket.id);
    if (!session || !session.room.game) return;

    const { room, player } = session;
    const game = room.game;
    if (!game) return;

    if (game.phase !== 'DRAWING' || player.id !== game.currentDrawerId) {
      return;
    }

    if (data?.strokeId) {
      const completedStroke = activeStrokes.get(data.strokeId);
      if (completedStroke) {
        game.addStroke(completedStroke);
        activeStrokes.delete(data.strokeId);
      }
    }

    socket.to(`room:${room.code}`).emit('draw_end', data);
  });

  // Draw Fill (Paint Bucket Flood Fill)
  socket.on('draw_fill', (data: DrawFillPayload) => {
    const session = roomService.getPlayerSession(socket.id);
    if (!session || !session.room.game) return;

    const { room, player } = session;
    const game = room.game;
    if (!game) return;

    // Strict validation: must be drawer and in DRAWING phase
    if (game.phase !== 'DRAWING' || player.id !== game.currentDrawerId) {
      return;
    }

    if (!data?.strokeId || !data.point) return;

    const clampedPoint = clampNormalizedPoint(data.point);
    const fillStroke: Stroke = {
      id: data.strokeId,
      tool: 'fill',
      color: typeof data.color === 'string' ? data.color : '#000000',
      size: 0,
      points: [clampedPoint],
    };

    // Store in authoritative stroke history
    game.addStroke(fillStroke);

    // Broadcast fill event to all other clients in room
    socket.to(`room:${room.code}`).emit('draw_fill', {
      strokeId: data.strokeId,
      tool: 'fill',
      color: fillStroke.color,
      point: clampedPoint,
    });
  });

  // Canvas Clear
  socket.on('canvas_clear', () => {
    const session = roomService.getPlayerSession(socket.id);
    if (!session || !session.room.game) return;

    const { room, player } = session;
    const game = room.game;
    if (!game) return;

    if (game.phase !== 'DRAWING' || player.id !== game.currentDrawerId) {
      return;
    }

    game.clearCanvas();
    activeStrokes.clear();

    io.to(`room:${room.code}`).emit('canvas_clear');
  });

  // Draw Undo
  socket.on('draw_undo', () => {
    const session = roomService.getPlayerSession(socket.id);
    if (!session || !session.room.game) return;

    const { room, player } = session;
    const game = room.game;
    if (!game) return;

    if (game.phase !== 'DRAWING' || player.id !== game.currentDrawerId) {
      return;
    }

    game.undoStroke();

    // Broadcast updated full canvas state
    io.to(`room:${room.code}`).emit('canvas_state', game.strokes);
  });
}
