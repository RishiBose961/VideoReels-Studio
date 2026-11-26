import type { ImageFilters, Layer, PaperCutoutStyle } from '../types';

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

export const PAPER_BACKDROPS = [
  { id: 'paper-crumpled', label: 'Crumpled Paper' },
  { id: 'paper-kraft', label: 'Kraft Cardboard' },
  { id: 'paper-newsprint', label: 'Newsprint' },
  { id: 'paper-grid', label: 'Grid Notebook' },
  { id: '#00FF00', label: 'Green Screen' },
] as const;

export function isPaperBackdrop(bg: string): boolean {
  return bg.startsWith('paper-');
}

export function drawPaperBackdrop(
  canvas: HTMLCanvasElement,
  backdropId: string,
  width: number,
  height: number
) {
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, width, height);

  if (backdropId === 'paper-kraft') {
    ctx.fillStyle = '#c49a6c';
    ctx.fillRect(0, 0, width, height);
    // Paper fibers
    for (let i = 0; i < 900; i++) {
      const x = hash(i * 3) * width;
      const y = hash(i * 7) * height;
      const len = 4 + hash(i * 11) * 18;
      const ang = hash(i * 13) * Math.PI * 2;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(90,60,30,0.14)' : 'rgba(255,235,205,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      ctx.stroke();
    }
  } else if (backdropId === 'paper-newsprint') {
    ctx.fillStyle = '#e8e2d2';
    ctx.fillRect(0, 0, width, height);
    // Faint newspaper columns & text lines
    const cols = Math.max(3, Math.floor(width / 260));
    const colW = (width - 80) / cols;
    ctx.fillStyle = 'rgba(40,38,34,0.08)';
    for (let c = 0; c < cols; c++) {
      const cx = 40 + c * colW;
      for (let y = 50; y < height - 50; y += 16) {
        const lw = (colW - 24) * (0.65 + hash(c * 100 + y) * 0.35);
        ctx.fillRect(cx, y, lw, 6);
      }
    }
    // Subtle grain
    for (let i = 0; i < 600; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)';
      ctx.fillRect(hash(i * 5) * width, hash(i * 9) * height, 2, 2);
    }
  } else if (backdropId === 'paper-grid') {
    ctx.fillStyle = '#f5f5f0';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(59,130,246,0.16)';
    ctx.lineWidth = 1;
    const step = 36;
    for (let x = 0; x <= width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  } else {
    // paper-crumpled
    ctx.fillStyle = '#f3efe6';
    ctx.fillRect(0, 0, width, height);
    // Diagonal crease lines
    for (let i = 0; i < 36; i++) {
      const x1 = hash(i * 3) * width;
      const y1 = hash(i * 5) * height;
      const x2 = x1 + (hash(i * 7) - 0.5) * width * 0.8;
      const y2 = y1 + (hash(i * 11) - 0.5) * height * 0.8;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1 + hash(i * 13) * 2.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
}

function buildFilterString(f: ImageFilters): string {
  const parts: string[] = [];
  if (f.brightness !== 0) parts.push(`brightness(${100 + f.brightness}%)`);
  if (f.contrast !== 0) parts.push(`contrast(${100 + f.contrast}%)`);
  if (f.saturation !== 0) parts.push(`saturate(${100 + f.saturation}%)`);
  if (f.hue !== 0) parts.push(`hue-rotate(${f.hue}deg)`);
  if (f.blur > 0) parts.push(`blur(${f.blur}px)`);
  if (f.grayscale) parts.push('grayscale(100%)');
  if (f.sepia) parts.push('sepia(100%)');
  return parts.length > 0 ? parts.join(' ') : 'none';
}

function buildTornPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  roughness: number,
  seed = 1
) {
  const step = Math.max(8, 22 - roughness);
  ctx.beginPath();
  let idx = 0;
  // Top edge
  for (let px = x; px <= x + w; px += step) {
    const jitter = (hash(seed + idx++ * 3.1) - 0.5) * roughness;
    if (px === x) ctx.moveTo(px, y + jitter);
    else ctx.lineTo(px, y + jitter);
  }
  // Right edge
  for (let py = y; py <= y + h; py += step) {
    const jitter = (hash(seed + idx++ * 5.7) - 0.5) * roughness;
    ctx.lineTo(x + w + jitter, py);
  }
  // Bottom edge
  for (let px = x + w; px >= x; px -= step) {
    const jitter = (hash(seed + idx++ * 7.3) - 0.5) * roughness;
    ctx.lineTo(px, y + h + jitter);
  }
  // Left edge
  for (let py = y + h; py >= y; py -= step) {
    const jitter = (hash(seed + idx++ * 9.1) - 0.5) * roughness;
    ctx.lineTo(x + jitter, py);
  }
  ctx.closePath();
}

export function drawPaperCutoutImage(
  canvas: HTMLCanvasElement,
  source: HTMLImageElement | HTMLVideoElement,
  width: number,
  height: number,
  cutout: PaperCutoutStyle,
  filters: ImageFilters,
  flipX = false,
  flipY = false
) {
  const w = Math.max(32, Math.round(width));
  const h = Math.max(32, Math.round(height));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  const bw = Math.max(4, cutout.borderWidth ?? 14);
  const rough = Math.max(2, cutout.roughness ?? 10);

  // Outer torn paper backing
  ctx.save();
  buildTornPath(ctx, bw * 0.4, bw * 0.4, w - bw * 0.8, h - bw * 0.8, rough, 11);
  ctx.fillStyle = cutout.borderColor || '#f7f4eb';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Inner clipped photo with subtle torn edge
  ctx.save();
  buildTornPath(ctx, bw, bw, Math.max(8, w - bw * 2), Math.max(8, h - bw * 2), rough * 0.45, 29);
  ctx.clip();
  ctx.filter = buildFilterString(filters);
  ctx.translate(flipX ? w : 0, flipY ? h : 0);
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  ctx.drawImage(source, bw, bw, Math.max(8, w - bw * 2), Math.max(8, h - bw * 2));
  ctx.restore();

  // Subtle paper crease sheen across cutout
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.25);
  ctx.lineTo(w, h * 0.72);
  ctx.stroke();
  ctx.restore();
}

const RANSOM_SWATCHES = ['#ECE8E1', '#111827', '#FF4655', '#FDE047', '#E0F2FE', '#FEF3C7'];
const RANSOM_TEXT_COLORS = ['#111827', '#FFFFFF', '#FFFFFF', '#111827', '#0F172A', '#78350F'];
const RANSOM_FONTS = ['Impact', 'Georgia', 'Arial Black', 'Courier New', 'Trebuchet MS'];

export function drawPaperText(
  canvas: HTMLCanvasElement,
  layer: Layer,
  width: number,
  height: number,
  time: number
) {
  const dpr = 2;
  const w = Math.max(64, Math.round(width));
  const h = Math.max(32, Math.round(height));
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const text = layer.text || 'PAPER';
  const fontSize = layer.fontSize || 52;
  const style = layer.paperTextStyle || 'ransom';

  if (style === 'highlight') {
    const padX = 18;
    const padY = 10;
    const localT = Math.max(0, time - layer.startTime);
    const swipe = Math.min(1, localT / 0.45);

    // Newspaper clipping card
    ctx.save();
    ctx.fillStyle = '#efe9da';
    ctx.fillRect(4, 4, w - 8, h - 8);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // Animated yellow/crimson marker swipe behind text
    ctx.fillStyle = layer.textStroke || '#fde047';
    ctx.fillRect(padX, h * 0.22, Math.max(0, (w - padX * 2) * swipe), h * 0.56);

    ctx.font = `bold ${fontSize}px ${layer.fontFamily || 'Georgia'}`;
    ctx.fillStyle = layer.color === '#ffffff' ? '#111827' : layer.color || '#111827';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2, w - padX * 2);
    ctx.restore();
    void padY;
    return;
  }

  // Ransom / Magazine Letter Cutouts
  const step = Math.floor(Math.max(0, time - layer.startTime) * 6);
  const chars = text.split('');
  const cellW = Math.min(fontSize * 0.92, (w - 20) / Math.max(1, chars.length));
  const totalW = chars.length * cellW;
  let curX = (w - totalW) / 2 + cellW / 2;
  const cy = h / 2;

  chars.forEach((ch, idx) => {
    if (ch === ' ') {
      curX += cellW * 0.65;
      return;
    }
    const seed = idx * 17 + (layer.motionFx?.type === 'stop-motion' ? step * 3 : 0);
    const swatchIdx = Math.floor(hash(idx * 13) * RANSOM_SWATCHES.length);
    const fontIdx = Math.floor(hash(idx * 29) * RANSOM_FONTS.length);
    const rot = (hash(seed * 7) - 0.5) * 0.26;
    const dy = (hash(seed * 11) - 0.5) * 10;
    const boxW = cellW * 0.9;
    const boxH = fontSize * 1.18;

    ctx.save();
    ctx.translate(curX, cy + dy);
    ctx.rotate(rot);

    // Paper cutout tile
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = RANSOM_SWATCHES[swatchIdx];
    ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);

    // Letter
    ctx.shadowColor = 'transparent';
    ctx.font = `bold ${Math.round(fontSize * 0.86)}px ${RANSOM_FONTS[fontIdx]}`;
    ctx.fillStyle = RANSOM_TEXT_COLORS[swatchIdx];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, 0, 2);
    ctx.restore();

    curX += cellW;
  });
}
