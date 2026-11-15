import type { Stroke, Point } from '../types';

const REFERENCE_CANVAS_WIDTH = 800;

export function renderStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (!stroke.points || stroke.points.length === 0) return;

  ctx.save();

  const scale = canvasWidth / REFERENCE_CANVAS_WIDTH;
  const actualSize = Math.max(1, stroke.size * scale);

  ctx.lineWidth = actualSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (stroke.tool === 'eraser') {
    ctx.strokeStyle = '#FFFFFF';
  } else {
    ctx.strokeStyle = stroke.color;
  }

  const pts = stroke.points.map((p) => ({
    x: p.x * canvasWidth,
    y: p.y * canvasHeight,
  }));

  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, actualSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);

  if (pts.length === 2) {
    ctx.lineTo(pts[1].x, pts[1].y);
  } else {
    for (let i = 1; i < pts.length - 1; i++) {
      const midX = (pts[i].x + pts[i + 1].x) / 2;
      const midY = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  ctx.stroke();
  ctx.restore();
}

export function redrawAllStrokes(
  canvas: HTMLCanvasElement,
  strokes: Stroke[]
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const stroke of strokes) {
    renderStroke(ctx, stroke, canvas.width, canvas.height);
  }
}

export function getNormalizedCoords(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement
): Point {
  const rect = canvas.getBoundingClientRect();
  const rawX = clientX - rect.left;
  const rawY = clientY - rect.top;

  const x = Math.max(0, Math.min(1, rawX / rect.width));
  const y = Math.max(0, Math.min(1, rawY / rect.height));

  return { x, y };
}
