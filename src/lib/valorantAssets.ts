import type { Layer } from '../types';
import { DEFAULT_FILTERS } from '../store/editorStore';

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface ValorantAssetItem {
  id: string;
  label: string;
  category: 'banner' | 'crosshair' | 'hud' | 'text';
  color: string;
  createLayer: (cw: number, ch: number, startTime: number) => Layer;
}

function makeGraphicLayer(
  name: string,
  svg: string,
  w: number,
  h: number,
  x: number,
  y: number,
  startTime: number,
  duration = 3
): Layer {
  return {
    id: crypto.randomUUID(),
    name,
    type: 'image',
    src: svgToDataUrl(svg),
    cornerRadius: 0,
    shadow: { enabled: true, color: '#ff4655', blur: 16, offsetX: 0, offsetY: 0 },
    blendMode: 'source-over',
    startTime,
    duration,
    transform: {
      x,
      y,
      width: w,
      height: h,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
    },
    filters: { ...DEFAULT_FILTERS },
    keyframes: [],
    locked: false,
    visible: true,
    zIndex: 0,
  };
}

function makeBannerSvg(title: string, subtitle: string, accent = '#FF4655') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="180" viewBox="0 0 700 180">
    <polygon points="30,20 670,20 645,160 5,160" fill="#0F1923" fill-opacity="0.92" stroke="${accent}" stroke-width="4"/>
    <polygon points="30,20 670,20 664,34 24,34" fill="${accent}"/>
    <rect x="44" y="54" width="8" height="84" fill="${accent}"/>
    <text x="360" y="102" text-anchor="middle" font-family="Impact, Arial Black, sans-serif" font-size="64" letter-spacing="8" fill="#ECE8E1">${title}</text>
    <text x="360" y="138" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="bold" letter-spacing="6" fill="${accent}">${subtitle}</text>
  </svg>`;
}

function makeCrosshairSvg(color: string, style: 'classic' | 'dot') {
  if (style === 'dot') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="7" fill="${color}" stroke="#000000" stroke-width="2"/>
      <circle cx="60" cy="60" r="20" fill="none" stroke="${color}" stroke-width="2" stroke-opacity="0.6"/>
    </svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <rect x="57" y="18" width="6" height="24" fill="${color}" stroke="#000" stroke-width="1.5"/>
    <rect x="57" y="78" width="6" height="24" fill="${color}" stroke="#000" stroke-width="1.5"/>
    <rect x="18" y="57" width="24" height="6" fill="${color}" stroke="#000" stroke-width="1.5"/>
    <rect x="78" y="57" width="24" height="6" fill="${color}" stroke="#000" stroke-width="1.5"/>
    <circle cx="60" cy="60" r="3" fill="${color}"/>
  </svg>`;
}

function makeKillBadgeSvg(kills: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260" viewBox="0 0 260 260">
    <polygon points="130,14 240,76 240,184 130,246 20,184 20,76" fill="#0F1923" fill-opacity="0.92" stroke="#FF4655" stroke-width="6"/>
    <polygon points="130,30 224,84 224,176 130,230 36,176 36,84" fill="none" stroke="#F5C451" stroke-width="2" stroke-opacity="0.7"/>
    <text x="130" y="148" text-anchor="middle" font-family="Impact, Arial Black, sans-serif" font-size="88" fill="#FF4655">${kills}</text>
    <text x="130" y="188" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="bold" letter-spacing="4" fill="#ECE8E1">ELIMINATIONS</text>
  </svg>`;
}

function makeSpikeSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="90" viewBox="0 0 380 90">
    <rect x="4" y="4" width="372" height="82" rx="6" fill="#0F1923" fill-opacity="0.9" stroke="#FF4655" stroke-width="3"/>
    <circle cx="46" cy="45" r="22" fill="#FF4655" fill-opacity="0.2" stroke="#FF4655" stroke-width="3"/>
    <polygon points="46,28 56,45 46,62 36,45" fill="#FF4655"/>
    <text x="86" y="42" font-family="Impact, Arial Black, sans-serif" font-size="26" letter-spacing="3" fill="#FF4655">SPIKE PLANTED</text>
    <text x="86" y="66" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="bold" letter-spacing="2" fill="#ECE8E1">DEFUSE OR DETONATE</text>
  </svg>`;
}

export const VALORANT_ASSETS: ValorantAssetItem[] = [
  {
    id: 'ace-banner',
    label: 'ACE Banner',
    category: 'banner',
    color: '#FF4655',
    createLayer: (cw, ch, t) => {
      const w = Math.round(cw * 0.55);
      const h = Math.round(w * (180 / 700));
      return makeGraphicLayer('ACE Banner', makeBannerSvg('ACE', 'TEAM ELIMINATED', '#FF4655'), w, h, Math.round((cw - w) / 2), Math.round(ch * 0.14), t, 3);
    },
  },
  {
    id: 'clutch-banner',
    label: 'CLUTCH Banner',
    category: 'banner',
    color: '#F5C451',
    createLayer: (cw, ch, t) => {
      const w = Math.round(cw * 0.55);
      const h = Math.round(w * (180 / 700));
      return makeGraphicLayer('CLUTCH Banner', makeBannerSvg('CLUTCH', '1V5 VICTORY', '#F5C451'), w, h, Math.round((cw - w) / 2), Math.round(ch * 0.14), t, 3);
    },
  },
  {
    id: 'flawless-banner',
    label: 'FLAWLESS',
    category: 'banner',
    color: '#38BDF8',
    createLayer: (cw, ch, t) => {
      const w = Math.round(cw * 0.55);
      const h = Math.round(w * (180 / 700));
      return makeGraphicLayer('FLAWLESS Banner', makeBannerSvg('FLAWLESS', 'ROUND WON', '#38BDF8'), w, h, Math.round((cw - w) / 2), Math.round(ch * 0.14), t, 3);
    },
  },
  {
    id: '5k-badge',
    label: '5K Badge',
    category: 'hud',
    color: '#FF4655',
    createLayer: (cw, ch, t) => {
      const s = Math.round(Math.min(cw, ch) * 0.28);
      return makeGraphicLayer('5K Kill Badge', makeKillBadgeSvg('5K'), s, s, Math.round((cw - s) / 2), Math.round((ch - s) / 2), t, 2.5);
    },
  },
  {
    id: 'spike-hud',
    label: 'Spike HUD',
    category: 'hud',
    color: '#FF4655',
    createLayer: (cw, ch, t) => {
      const w = Math.round(cw * 0.34);
      const h = Math.round(w * (90 / 380));
      return makeGraphicLayer('Spike Planted HUD', makeSpikeSvg(), w, h, Math.round((cw - w) / 2), Math.round(ch * 0.08), t, 4);
    },
  },
  {
    id: 'crosshair-cyan',
    label: 'Crosshair Cyan',
    category: 'crosshair',
    color: '#00FFFF',
    createLayer: (cw, ch, t) => {
      const s = 90;
      return makeGraphicLayer('Crosshair (Cyan)', makeCrosshairSvg('#00FFFF', 'classic'), s, s, Math.round((cw - s) / 2), Math.round((ch - s) / 2), t, 5);
    },
  },
  {
    id: 'crosshair-red',
    label: 'Crosshair Red',
    category: 'crosshair',
    color: '#FF4655',
    createLayer: (cw, ch, t) => {
      const s = 90;
      return makeGraphicLayer('Crosshair (Red)', makeCrosshairSvg('#FF4655', 'dot'), s, s, Math.round((cw - s) / 2), Math.round((ch - s) / 2), t, 5);
    },
  },
  {
    id: 'val-title-text',
    label: 'Valorant Title',
    category: 'text',
    color: '#FF4655',
    createLayer: (cw, ch, t) => {
      const w = Math.round(cw * 0.7);
      return {
        id: crypto.randomUUID(),
        name: 'Valorant Title',
        type: 'text',
        text: 'RADIANT MONTAGE',
        fontFamily: 'Impact',
        fontSize: 76,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#ECE8E1',
        textStroke: '#FF4655',
        textStrokeWidth: 4,
        shadow: { enabled: true, color: '#FF4655', blur: 20, offsetX: 0, offsetY: 0 },
        blendMode: 'source-over',
        startTime: t,
        duration: 4,
        transform: {
          x: Math.round((cw - w) / 2),
          y: Math.round(ch * 0.72),
          width: w,
          height: 92,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
        },
        filters: { ...DEFAULT_FILTERS },
        keyframes: [],
        locked: false,
        visible: true,
        zIndex: 0,
      };
    },
  },
];
