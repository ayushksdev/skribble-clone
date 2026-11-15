import type { Stroke, Point } from '../types';

const REFERENCE_CANVAS_WIDTH = 800;

export function hexToRgba(hex: string): [number, number, number, number] {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num) || cleanHex.length !== 6) {
    return [0, 0, 0, 255];
  }
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return [r, g, b, 255];
}

export function floodFill(
  canvas: HTMLCanvasElement,
  startX: number,
  startY: number,
  fillColorHex: string,
  tolerance: number = 32
): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  const width = canvas.width;
  const height = canvas.height;

  const sx = Math.floor(startX);
  const sy = Math.floor(startY);

  if (sx < 0 || sx >= width || sy < 0 || sy >= height) {
    return false;
  }

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const [fillR, fillG, fillB, fillA] = hexToRgba(fillColorHex);

  const startIdx = (sy * width + sx) * 4;
  const targetR = data[startIdx];
  const targetG = data[startIdx + 1];
  const targetB = data[startIdx + 2];
  const targetA = data[startIdx + 3];

  // If clicked area already matches the fill color within tolerance, skip
  if (
    Math.abs(targetR - fillR) <= tolerance &&
    Math.abs(targetG - fillG) <= tolerance &&
    Math.abs(targetB - fillB) <= tolerance &&
    Math.abs(targetA - fillA) <= tolerance
  ) {
    return false;
  }

  const visited = new Uint8Array(width * height);
  const stack: number[] = [sx, sy];

  function matchesTarget(idx: number): boolean {
    return (
      Math.abs(data[idx] - targetR) <= tolerance &&
      Math.abs(data[idx + 1] - targetG) <= tolerance &&
      Math.abs(data[idx + 2] - targetB) <= tolerance &&
      Math.abs(data[idx + 3] - targetA) <= tolerance
    );
  }

  // Scanline Flood Fill
  while (stack.length > 0) {
    const y = stack.pop()!;
    let x = stack.pop()!;

    let pixelOffset = y * width + x;
    let idx = pixelOffset * 4;

    // Scan left to find the start of the horizontal span
    while (x >= 0 && !visited[pixelOffset] && matchesTarget(idx)) {
      x--;
      pixelOffset--;
      idx -= 4;
    }
    x++;
    pixelOffset++;
    idx += 4;

    let spanAbove = false;
    let spanBelow = false;

    // Fill the span to the right and search rows above and below
    while (x < width && !visited[pixelOffset] && matchesTarget(idx)) {
      visited[pixelOffset] = 1;
      data[idx] = fillR;
      data[idx + 1] = fillG;
      data[idx + 2] = fillB;
      data[idx + 3] = fillA;

      // Check pixel above
      if (y > 0) {
        const upOffset = pixelOffset - width;
        const upIdx = idx - width * 4;
        if (!visited[upOffset] && matchesTarget(upIdx)) {
          if (!spanAbove) {
            stack.push(x, y - 1);
            spanAbove = true;
          }
        } else {
          spanAbove = false;
        }
      }

      // Check pixel below
      if (y < height - 1) {
        const downOffset = pixelOffset + width;
        const downIdx = idx + width * 4;
        if (!visited[downOffset] && matchesTarget(downIdx)) {
          if (!spanBelow) {
            stack.push(x, y + 1);
            spanBelow = true;
          }
        } else {
          spanBelow = false;
        }
      }

      x++;
      pixelOffset++;
      idx += 4;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return true;
}

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
    if (stroke.tool === 'fill' && stroke.points.length > 0) {
      floodFill(
        canvas,
        stroke.points[0].x * canvas.width,
        stroke.points[0].y * canvas.height,
        stroke.color
      );
    } else {
      renderStroke(ctx, stroke, canvas.width, canvas.height);
    }
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
