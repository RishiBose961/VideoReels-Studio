import type { EasingType, Layer, Transform } from '../types';

export function applyEasing(t: number, easing: EasingType): number {
  let c = Math.max(0, Math.min(1, t));
  switch (easing) {
    case 'ease-in':
      return c * c * c;
    case 'ease-out':
      return 1 - Math.pow(1 - c, 3);
    case 'ease-in-out':
      return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
    case 'bounce': {
      const n1 = 7.5625;
      const d1 = 2.75;
      if (c < 1 / d1) return n1 * c * c;
      if (c < 2 / d1) return n1 * (c -= 1.5 / d1) * c + 0.75;
      if (c < 2.5 / d1) return n1 * (c -= 2.25 / d1) * c + 0.9375;
      return n1 * (c -= 2.625 / d1) * c + 0.984375;
    }
    case 'linear':
    default:
      return c;
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function getBaseTransformAtTime(layer: Layer, time: number): Transform {
  const kfs = layer.keyframes;
  if (!kfs || kfs.length === 0) return layer.transform;

  const sorted = [...kfs].sort((a, b) => a.time - b.time);
  if (sorted.length === 1 || time <= sorted[0].time) {
    return { ...layer.transform, ...sorted[0].transform };
  }
  if (time >= sorted[sorted.length - 1].time) {
    return { ...layer.transform, ...sorted[sorted.length - 1].transform };
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const k0 = sorted[i];
    const k1 = sorted[i + 1];
    if (time >= k0.time && time <= k1.time) {
      const span = k1.time - k0.time;
      const rawT = span > 0 ? (time - k0.time) / span : 0;
      const t = applyEasing(rawT, k1.easing || k0.easing || 'linear');
      const a = k0.transform;
      const b = k1.transform;
      return {
        x: lerp(a.x, b.x, t),
        y: lerp(a.y, b.y, t),
        width: lerp(a.width, b.width, t),
        height: lerp(a.height, b.height, t),
        rotation: lerp(a.rotation, b.rotation, t),
        scaleX: lerp(a.scaleX, b.scaleX, t),
        scaleY: lerp(a.scaleY, b.scaleY, t),
        opacity: lerp(a.opacity, b.opacity, t),
      };
    }
  }

  return layer.transform;
}

export function getTransformAtTime(layer: Layer, time: number): Transform {
  const tf = getBaseTransformAtTime(layer, time);
  const fx = layer.motionFx;
  if (!fx || fx.type === 'none') return tf;

  const localT = Math.max(0, time - layer.startTime);
  const amp = (fx.intensity ?? 50) / 50; // 1.0 at default 50
  const spd = fx.speed ?? 1;

  if (fx.type === 'shake') {
    const decay = Math.exp(-localT * 1.4);
    const dx = Math.sin(localT * 48 * spd) * 14 * amp * decay;
    const dy = Math.cos(localT * 39 * spd) * 14 * amp * decay;
    const dr = Math.sin(localT * 31 * spd) * 3 * amp * decay;
    return { ...tf, x: tf.x + dx, y: tf.y + dy, rotation: tf.rotation + dr };
  }

  if (fx.type === 'float') {
    const dy = Math.sin(localT * 2.5 * spd) * 14 * amp;
    const dr = Math.cos(localT * 1.8 * spd) * 2 * amp;
    return { ...tf, y: tf.y + dy, rotation: tf.rotation + dr };
  }

  if (fx.type === 'pulse') {
    const s = 1 + Math.sin(localT * 5 * spd) * 0.08 * amp;
    const nw = tf.width * s;
    const nh = tf.height * s;
    return {
      ...tf,
      x: tf.x - (nw - tf.width) / 2,
      y: tf.y - (nh - tf.height) / 2,
      width: nw,
      height: nh,
    };
  }

  if (fx.type === 'glitch') {
    // Deterministic pseudo-random jitter bursts
    const step = Math.floor(localT * 18 * spd);
    const hash = Math.sin(step * 127.1) * 43758.5453;
    const frac = hash - Math.floor(hash);
    if (frac > 0.68) {
      const dx = (frac - 0.84) * 90 * amp;
      const op = frac > 0.9 ? tf.opacity * 0.5 : tf.opacity;
      return { ...tf, x: tf.x + dx, opacity: op };
    }
    return tf;
  }

  if (fx.type === 'flash') {
    const pulse = Math.abs(Math.sin(localT * 6 * spd));
    return { ...tf, opacity: Math.max(0.1, tf.opacity * (0.35 + 0.65 * pulse)) };
  }

  if (fx.type === 'stop-motion') {
    // Stepped 8-12 FPS tactile paper wiggle
    const fps = Math.max(4, Math.round(8 * spd));
    const step = Math.floor(localT * fps);
    const h1 = Math.sin(step * 12.9898) * 43758.5453;
    const h2 = Math.sin(step * 78.233) * 43758.5453;
    const h3 = Math.sin(step * 39.425) * 43758.5453;
    const rx = (h1 - Math.floor(h1) - 0.5) * 10 * amp;
    const ry = (h2 - Math.floor(h2) - 0.5) * 10 * amp;
    const rr = (h3 - Math.floor(h3) - 0.5) * 6 * amp;
    return { ...tf, x: tf.x + rx, y: tf.y + ry, rotation: tf.rotation + rr };
  }

  if (fx.type === 'paper-unfold') {
    // Unfold from crumpled center over first 0.7s + subtle stop-motion settle
    const dur = Math.max(0.25, 0.7 / spd);
    const p = Math.min(1, localT / dur);
    const ease = 1 - Math.pow(1 - p, 3);
    const scaleW = 0.15 + 0.85 * ease;
    const scaleH = 0.08 + 0.92 * Math.min(1, ease * 1.15);
    const nw = tf.width * scaleW;
    const nh = tf.height * scaleH;
    const tilt = (1 - ease) * -18 * amp;
    return {
      ...tf,
      x: tf.x + (tf.width - nw) / 2,
      y: tf.y + (tf.height - nh) / 2,
      width: nw,
      height: nh,
      rotation: tf.rotation + tilt,
      opacity: tf.opacity * Math.min(1, p * 3),
    };
  }

  if (fx.type === 'paper-pop') {
    // Sticker pop-up with bounce overshoot + subtle paper wiggle
    const dur = Math.max(0.2, 0.45 / spd);
    const p = Math.min(1, localT / dur);
    const s = p < 1 ? applyEasing(p, 'bounce') * 1.04 : 1;
    const step = Math.floor(localT * 8);
    const wob = (Math.sin(step * 17.3) * 1.5) * amp;
    const nw = tf.width * Math.max(0.05, s);
    const nh = tf.height * Math.max(0.05, s);
    return {
      ...tf,
      x: tf.x + (tf.width - nw) / 2,
      y: tf.y + (tf.height - nh) / 2,
      width: nw,
      height: nh,
      rotation: tf.rotation + wob,
    };
  }

  return tf;
}
