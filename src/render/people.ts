import type { Bubble } from '../entities/Customer';
import type { Complaint } from '../game/types';
import { circle, rect, type Ctx } from './draw';

/** Speech/thought bubble with an icon, anchored above the head at (sx, sy). */
export function drawBubble(ctx: Ctx, sx: number, sy: number, b: Bubble): void {
  const alpha = Math.min(1, b.t * 2.5);
  ctx.save();
  ctx.globalAlpha = alpha;
  const x = Math.round(sx);
  const y = Math.round(sy - 34);
  const w = 15;
  const h = 13;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#2d3a2a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x - w / 2 + 0.5, y - h / 2 + 0.5, w, h, 3);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 2, y + h / 2);
  ctx.lineTo(x, y + h / 2 + 4);
  ctx.lineTo(x + 2, y + h / 2);
  ctx.fill();
  bubbleIcon(ctx, x, y, b.kind, b.complaint ?? null);
  ctx.restore();
}

function face(ctx: Ctx, x: number, y: number, color: string, mouth: 'smile' | 'flat' | 'frown'): void {
  circle(ctx, x, y, 4.5, color);
  rect(ctx, x - 2, y - 2, 1, 2, '#222');
  rect(ctx, x + 1, y - 2, 1, 2, '#222');
  if (mouth === 'smile') {
    rect(ctx, x - 2, y + 1, 1, 1, '#222');
    rect(ctx, x - 1, y + 2, 3, 1, '#222');
    rect(ctx, x + 2, y + 1, 1, 1, '#222');
  } else if (mouth === 'flat') rect(ctx, x - 2, y + 2, 4, 1, '#222');
  else {
    rect(ctx, x - 2, y + 3, 1, 1, '#222');
    rect(ctx, x - 1, y + 2, 3, 1, '#222');
    rect(ctx, x + 2, y + 3, 1, 1, '#222');
  }
}

function complaintGlyph(ctx: Ctx, x: number, y: number, c: Complaint): void {
  // Tiny corner glyph explaining a complaint.
  const gx = x + 5;
  const gy = y - 6;
  if (c === 'sugarLow' || c === 'sugarHigh') rect(ctx, gx - 2, gy - 2, 4, 4, '#fafafa');
  else if (c === 'teaWeak' || c === 'teaStrong') rect(ctx, gx - 2, gy - 2, 4, 4, '#8d5524');
  else if (c === 'iceLow' || c === 'iceHigh') rect(ctx, gx - 2, gy - 2, 4, 4, '#aee3f5');
  else if (c === 'pricey') rect(ctx, gx - 2, gy - 2, 4, 4, '#f1c40f');
  else rect(ctx, gx - 2, gy - 2, 4, 4, '#95a5a6');
  ctx.strokeStyle = '#333';
  ctx.strokeRect(gx - 2.5, gy - 2.5, 5, 5);
  const up = c === 'sugarHigh' || c === 'teaStrong' || c === 'iceHigh';
  ctx.fillStyle = up ? '#c0392b' : '#2471a3';
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (c !== 'pricey' && c !== 'slow') ctx.fillText(up ? '+' : '-', gx + 5, gy);
}

function bubbleIcon(ctx: Ctx, x: number, y: number, kind: Bubble['kind'], complaint: Complaint | null): void {
  switch (kind) {
    case 'happy':
      face(ctx, x, y, '#7bd36b', 'smile');
      break;
    case 'neutral':
      face(ctx, x, y, '#f4d35e', 'flat');
      if (complaint) complaintGlyph(ctx, x, y, complaint);
      break;
    case 'unhappy':
      face(ctx, x, y, '#ef6f5e', 'frown');
      if (complaint) complaintGlyph(ctx, x, y, complaint);
      break;
    case 'price':
      ctx.fillStyle = '#c0392b';
      ctx.font = 'bold 8px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Rp', x, y + 0.5);
      rect(ctx, x - 6, y, 12, 1, '#c0392b');
      break;
    case 'wait':
      rect(ctx, x - 3, y - 5, 7, 1, '#6d4c41');
      rect(ctx, x - 3, y + 4, 7, 1, '#6d4c41');
      ctx.fillStyle = '#e0b04a';
      ctx.beginPath();
      ctx.moveTo(x - 2, y - 4);
      ctx.lineTo(x + 3, y - 4);
      ctx.lineTo(x + 0.5, y);
      ctx.lineTo(x + 3, y + 4);
      ctx.lineTo(x - 2, y + 4);
      ctx.lineTo(x + 0.5, y);
      ctx.fill();
      break;
    case 'empty':
      rect(ctx, x - 3, y - 4, 6, 8, '#d6eaf8');
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 5, y - 5);
      ctx.lineTo(x + 5, y + 5);
      ctx.moveTo(x + 5, y - 5);
      ctx.lineTo(x - 5, y + 5);
      ctx.stroke();
      break;
    case 'crowded':
      for (const dx of [-4, 0, 4]) {
        rect(ctx, x + dx - 1, y - 3, 3, 3, '#7f8c8d');
        rect(ctx, x + dx - 1.5, y, 4, 4, '#95a5a6');
      }
      rect(ctx, x + 5, y - 6, 1, 3, '#c0392b');
      break;
    case 'thirsty':
      rect(ctx, x - 3, y - 4, 6, 8, '#e8f4f8');
      rect(ctx, x - 3, y - 1, 6, 5, '#b5651d');
      rect(ctx, x - 2, y - 3, 1, 1, '#ffffff');
      rect(ctx, x + 1, y - 6, 1, 3, '#e74c3c');
      break;
  }
}
