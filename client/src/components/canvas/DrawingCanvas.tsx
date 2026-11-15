import React, { useRef, useEffect, useState, useCallback } from 'react';
import { socket } from '../../socket/socket';
import type {
  Stroke,
  Point,
  DrawTool,
  DrawStartPayload,
  DrawMovePayload,
  DrawFillPayload,
} from '../../types';
import {
  renderStroke,
  redrawAllStrokes,
  getNormalizedCoords,
  floodFill,
} from '../../utils/canvas';
import {
  Paintbrush,
  Eraser,
  PaintBucket,
  RotateCcw,
  Trash2,
} from 'lucide-react';

interface DrawingCanvasProps {
  isDrawer: boolean;
}

const PALETTE_COLORS = [
  '#000000', // Black
  '#4B5563', // Dark Gray
  '#9CA3AF', // Gray
  '#FFFFFF', // White
  '#DC2626', // Red
  '#EA580C', // Orange
  '#D97706', // Amber
  '#EAB308', // Yellow
  '#16A34A', // Green
  '#0D9488', // Teal
  '#0284C7', // Sky Blue
  '#2563EB', // Blue
  '#7C3AED', // Violet
  '#DB2777', // Pink
  '#92400E', // Brown
  '#78350F', // Dark Brown
];

const BRUSH_SIZES = [
  { size: 3, label: 'Thin' },
  { size: 7, label: 'Medium' },
  { size: 14, label: 'Thick' },
  { size: 28, label: 'Heavy' },
];

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ isDrawer }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [tool, setTool] = useState<DrawTool>('brush');
  const [color, setColor] = useState<string>('#000000');
  const [size, setSize] = useState<number>(7);

  // Authoritative strokes in memory
  const strokesRef = useRef<Stroke[]>([]);
  const isDrawingRef = useRef<boolean>(false);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const pendingPointsRef = useRef<Point[]>([]);
  const batchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resize canvas according to container
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);

    if (width > 0 && height > 0) {
      canvas.width = width;
      canvas.height = height;
      redrawAllStrokes(canvas, strokesRef.current);
    }
  }, []);

  useEffect(() => {
    handleResize();
    const observer = new ResizeObserver(() => {
      handleResize();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [handleResize]);

  // Socket drawing event listeners
  useEffect(() => {
    const canvas = canvasRef.current;

    function onDrawStart(data: DrawStartPayload) {
      if (isDrawer) return; // drawer already draws locally
      const newStroke: Stroke = {
        id: data.strokeId,
        tool: data.tool,
        color: data.color,
        size: data.size,
        points: [data.point],
      };
      strokesRef.current.push(newStroke);

      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderStroke(ctx, newStroke, canvas.width, canvas.height);
        }
      }
    }

    function onDrawMove(data: DrawMovePayload) {
      if (isDrawer) return;
      const stroke = strokesRef.current.find((s) => s.id === data.strokeId);
      if (stroke) {
        stroke.points.push(...data.points);
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            renderStroke(ctx, stroke, canvas.width, canvas.height);
          }
        }
      }
    }

    function onDrawEnd() {
      // Stroke finalized
    }

    function onDrawFill(data: DrawFillPayload) {
      if (isDrawer) return;
      const fillStroke: Stroke = {
        id: data.strokeId,
        tool: 'fill',
        color: data.color,
        size: 0,
        points: [data.point],
      };
      strokesRef.current.push(fillStroke);

      if (canvas) {
        floodFill(
          canvas,
          data.point.x * canvas.width,
          data.point.y * canvas.height,
          data.color
        );
      }
    }

    function onCanvasClear() {
      strokesRef.current = [];
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    }

    function onCanvasState(strokes: Stroke[]) {
      strokesRef.current = strokes || [];
      if (canvas) {
        redrawAllStrokes(canvas, strokesRef.current);
      }
    }

    socket.on('draw_start', onDrawStart);
    socket.on('draw_move', onDrawMove);
    socket.on('draw_end', onDrawEnd);
    socket.on('draw_fill', onDrawFill);
    socket.on('canvas_clear', onCanvasClear);
    socket.on('canvas_state', onCanvasState);

    return () => {
      socket.off('draw_start', onDrawStart);
      socket.off('draw_move', onDrawMove);
      socket.off('draw_end', onDrawEnd);
      socket.off('draw_fill', onDrawFill);
      socket.off('canvas_clear', onCanvasClear);
      socket.off('canvas_state', onCanvasState);
    };
  }, [isDrawer]);

  // Dispatch batched movement points every 25ms to keep network super smooth
  useEffect(() => {
    if (!isDrawer) return;

    batchIntervalRef.current = setInterval(() => {
      if (pendingPointsRef.current.length > 0 && currentStrokeRef.current) {
        const pts = [...pendingPointsRef.current];
        pendingPointsRef.current = [];
        socket.emit('draw_move', {
          strokeId: currentStrokeRef.current.id,
          points: pts,
        });
      }
    }, 25);

    return () => {
      if (batchIntervalRef.current) {
        clearInterval(batchIntervalRef.current);
      }
    };
  }, [isDrawer]);

  // Pointer event handlers for drawing & filling
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const normPoint = getNormalizedCoords(e.clientX, e.clientY, canvas);

    // If using the Fill Bucket Tool: perform instantaneous flood fill
    if (tool === 'fill') {
      const pixelX = normPoint.x * canvas.width;
      const pixelY = normPoint.y * canvas.height;

      const filled = floodFill(canvas, pixelX, pixelY, color);
      if (filled) {
        const strokeId = `fill_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const fillStroke: Stroke = {
          id: strokeId,
          tool: 'fill',
          color,
          size: 0,
          points: [normPoint],
        };

        strokesRef.current.push(fillStroke);

        socket.emit('draw_fill', {
          strokeId,
          tool: 'fill',
          color,
          point: normPoint,
        });
      }
      return;
    }

    // Brush or Eraser tools
    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;

    const strokeId = `str_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newStroke: Stroke = {
      id: strokeId,
      tool,
      color,
      size,
      points: [normPoint],
    };

    currentStrokeRef.current = newStroke;
    strokesRef.current.push(newStroke);
    pendingPointsRef.current = [];

    // Local render
    const ctx = canvas.getContext('2d');
    if (ctx) {
      renderStroke(ctx, newStroke, canvas.width, canvas.height);
    }

    // Emit to server
    socket.emit('draw_start', {
      strokeId,
      tool,
      color,
      size,
      point: normPoint,
    });
  };

  const drawMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer || !isDrawingRef.current || !currentStrokeRef.current || tool === 'fill') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const normPoint = getNormalizedCoords(e.clientX, e.clientY, canvas);
    currentStrokeRef.current.points.push(normPoint);
    pendingPointsRef.current.push(normPoint);

    // Local render
    const ctx = canvas.getContext('2d');
    if (ctx) {
      renderStroke(ctx, currentStrokeRef.current, canvas.width, canvas.height);
    }
  };

  const endDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer || !isDrawingRef.current || tool === 'fill') return;
    const canvas = canvasRef.current;
    if (canvas && e.pointerId) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    }

    isDrawingRef.current = false;

    if (currentStrokeRef.current) {
      if (pendingPointsRef.current.length > 0) {
        socket.emit('draw_move', {
          strokeId: currentStrokeRef.current.id,
          points: pendingPointsRef.current,
        });
        pendingPointsRef.current = [];
      }

      socket.emit('draw_end', {
        strokeId: currentStrokeRef.current.id,
      });

      currentStrokeRef.current = null;
    }
  };

  const handleClear = () => {
    if (!isDrawer) return;
    strokesRef.current = [];
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    socket.emit('canvas_clear');
  };

  const handleUndo = () => {
    if (!isDrawer) return;
    strokesRef.current.pop();
    const canvas = canvasRef.current;
    if (canvas) {
      redrawAllStrokes(canvas, strokesRef.current);
    }
    socket.emit('draw_undo');
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Canvas Area */}
      <div
        ref={containerRef}
        className={`relative flex-1 bg-white min-h-[320px] w-full overflow-hidden ${tool === 'fill' ? 'cursor-cell' : 'cursor-crosshair'
          }`}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={drawMove}
          onPointerUp={endDrawing}
          onPointerCancel={endDrawing}
          className={`block w-full h-full ${!isDrawer ? 'cursor-default pointer-events-none' : ''
            }`}
        />

        {!isDrawer && (
          <div className="absolute top-3 left-3 bg-slate-900/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium pointer-events-none tracking-wide">
            Spectating Drawer
          </div>
        )}
      </div>

      {/* Drawing Toolbar (Bottom) */}
      {isDrawer && (
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Tools & Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTool('brush')}
              className={`p-2 rounded-xl transition-colors ${tool === 'brush'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              title="Paintbrush"
            >
              <Paintbrush className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setTool('eraser')}
              className={`p-2 rounded-xl transition-colors ${tool === 'eraser'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              title="Eraser"
            >
              <Eraser className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setTool('fill')}
              className={`p-2 rounded-xl transition-colors ${tool === 'fill'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              title="Fill Area (Paint Bucket)"
            >
              <PaintBucket className="w-5 h-5" />
            </button>

            <div className="h-6 w-px bg-slate-200 mx-1" />

            <button
              type="button"
              onClick={handleUndo}
              className="p-2 bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shadow-sm"
              title="Undo last stroke"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="p-2 bg-white text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-xl transition-colors shadow-sm"
              title="Clear Canvas"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          {/* Brush Sizes */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            {BRUSH_SIZES.map((b) => (
              <button
                key={b.size}
                type="button"
                onClick={() => setSize(b.size)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${size === b.size ? 'bg-slate-100' : 'hover:bg-slate-50'
                  }`}
                title={b.label}
              >
                <div
                  className="rounded-full bg-slate-800"
                  style={{
                    width: Math.max(3, Math.min(18, b.size)),
                    height: Math.max(3, Math.min(18, b.size)),
                  }}
                />
              </button>
            ))}
          </div>

          {/* Color Palette */}
          <div className="flex items-center flex-wrap gap-1 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            {PALETTE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setColor(c);
                  if (tool === 'eraser') setTool('brush');
                }}
                className={`w-6 h-6 rounded-lg border transition-transform ${
                  color === c && tool !== 'eraser'
                    ? 'scale-110 ring-2 ring-brand-500 ring-offset-1 border-slate-400'
                    : 'border-slate-200 hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
