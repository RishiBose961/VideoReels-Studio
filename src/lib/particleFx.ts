import type { ParticleFxType } from '../types';

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

export function drawParticleFxToCanvas(
  canvas: HTMLCanvasElement,
  fxType: ParticleFxType,
  color: string,
  width: number,
  height: number,
  time: number
) {
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, width, height);

  if (fxType === 'sparks') {
    const count = 48;
    for (let i = 0; i < count; i++) {
      const speed = 90 + hash(i * 3) * 160;
      const startX = hash(i * 7) * width;
      const life = ((time * (0.4 + hash(i * 11) * 0.5) + hash(i * 13)) % 1);
      const y = height - life * (height + 80);
      const x = startX + Math.sin(time * 3 + i) * 35;
      const size = 2 + hash(i * 17) * 5;
      const alpha = Math.sin(life * Math.PI);

      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = i % 3 === 0 ? '#F5C451' : color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      void speed;
    }
  } else if (fxType === 'speedlines') {
    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.hypot(cx, cy);
    const count = 56;
    const stepTime = Math.floor(time * 24);
    ctx.save();
    ctx.strokeStyle = color;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + hash(i + stepTime * 0.13) * 0.08;
      const inner = maxR * (0.42 + hash(i * 5 + stepTime) * 0.25);
      const outer = maxR * 1.05;
      ctx.globalAlpha = 0.25 + hash(i * 9 + stepTime) * 0.55;
      ctx.lineWidth = 1.5 + hash(i * 11 + stepTime) * 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      ctx.stroke();
    }
    ctx.restore();
  } else if (fxType === 'confetti') {
    const palette = ['#FF4655', '#F5C451', '#38BDF8', '#22C55E', '#A855F7', color];
    const count = 65;
    for (let i = 0; i < count; i++) {
      const life = (time * (0.25 + hash(i * 5) * 0.35) + hash(i * 13)) % 1;
      const x = hash(i * 7) * width + Math.sin(time * 2.5 + i) * 40;
      const y = -20 + life * (height + 40);
      const rot = time * (3 + hash(i * 19) * 4) + i;
      const w = 8 + hash(i * 3) * 8;
      const h = 5 + hash(i * 11) * 5;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = palette[i % palette.length];
      ctx.globalAlpha = 0.9;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }
  } else if (fxType === 'match-cut') {
    // Fast-cutting dictionary / newspaper pages (Paper Animator Text Match Cut!)
    const pageIndex = Math.floor(time * 10);
    const bgColors = ['#f3efe6', '#e8e2d2', '#ede7d5', '#f7f4eb', '#e2dcc8'];
    ctx.fillStyle = bgColors[pageIndex % bgColors.length];
    ctx.fillRect(0, 0, width, height);

    const cols = Math.max(2, Math.floor(width / 260));
    const colW = (width - 80) / cols;
    const words = ['PAPER', 'CREATE', 'FRAME', 'CUTOUT', 'MOTION', 'REEL', 'DESIGN', 'STORY', 'FLASH'];
    ctx.font = 'bold 18px Georgia, serif';
    for (let c = 0; c < cols; c++) {
      const cx = 40 + c * colW;
      for (let y = 40; y < height - 40; y += 26) {
        const wIdx = Math.floor(hash(pageIndex * 31 + c * 17 + y) * words.length);
        ctx.fillStyle = `rgba(25,22,18,${0.18 + hash(pageIndex + y) * 0.28})`;
        ctx.fillText(words[wIdx], cx, y);
        ctx.fillRect(cx + 85, y - 10, colW - 110, 7);
      }
    }
    // Center highlight box
    const boxW = Math.min(width * 0.72, 560);
    const boxH = 96;
    ctx.fillStyle = color || '#fde047';
    ctx.globalAlpha = 0.85;
    ctx.fillRect((width - boxW) / 2, (height - boxH) / 2, boxW, boxH);
  } else if (fxType === 'snow') {
    const count = 70;
    ctx.save();
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const life = (time * (0.12 + hash(i * 3) * 0.18) + hash(i * 11)) % 1;
      const x = (hash(i * 7) * width + Math.sin(time * 1.4 + i) * 30 + width) % width;
      const y = life * height;
      const r = 1.5 + hash(i * 17) * 3.5;
      ctx.globalAlpha = 0.3 + hash(i * 23) * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
