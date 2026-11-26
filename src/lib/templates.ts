import type { Project } from '../types';
import { DEFAULT_FILTERS, makeFxLayer } from '../store/editorStore';
import { VALORANT_ASSETS } from './valorantAssets';

export interface ProjectTemplate {
  id: string;
  name: string;
  subtitle: string;
  accent: string;
  build: () => Project;
}

export const STARTER_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'paper-reel',
    name: 'Paper Animator Reel',
    subtitle: '9:16 Paper · Ransom Letters + Match Cut + Unfold',
    accent: '#FDE047',
    build: () => {
      const w = 1080;
      const h = 1920;
      const matchCut = makeFxLayer('match-cut', w, h, 0);
      matchCut.name = 'Newspaper Match Cut';
      matchCut.duration = 2.2;
      matchCut.blendMode = 'source-over';
      matchCut.transform.opacity = 1;
      matchCut.zIndex = 0;

      return {
        id: crypto.randomUUID(),
        name: 'Paper Animator Reel',
        settings: { width: w, height: h, fps: 30, backgroundColor: 'paper-crumpled' },
        layers: [
          matchCut,
          {
            id: crypto.randomUUID(),
            name: 'Ransom Headline',
            type: 'text',
            text: 'PAPER CUT',
            fontFamily: 'Impact',
            fontSize: 96,
            fontWeight: 'bold',
            textAlign: 'center',
            color: '#111827',
            paperTextStyle: 'ransom',
            motionFx: { type: 'stop-motion', intensity: 45, speed: 1 },
            startTime: 0,
            duration: 5,
            transform: { x: 90, y: 840, width: 900, height: 150, rotation: -2, scaleX: 1, scaleY: 1, opacity: 1 },
            filters: { ...DEFAULT_FILTERS },
            keyframes: [],
            locked: false,
            visible: true,
            zIndex: 2,
          },
          {
            id: crypto.randomUUID(),
            name: 'Newspaper Highlight',
            type: 'text',
            text: 'MAKE ANYTHING PAPER',
            fontFamily: 'Georgia',
            fontSize: 46,
            fontWeight: 'bold',
            textAlign: 'center',
            color: '#111827',
            textStroke: '#fde047',
            paperTextStyle: 'highlight',
            motionFx: { type: 'paper-pop', intensity: 50, speed: 1 },
            shadow: { enabled: true, color: '#000000', blur: 16, offsetX: 0, offsetY: 8 },
            startTime: 2.2,
            duration: 2.8,
            transform: { x: 140, y: 1080, width: 800, height: 120, rotation: 1, scaleX: 1, scaleY: 1, opacity: 1 },
            filters: { ...DEFAULT_FILTERS },
            keyframes: [],
            locked: false,
            visible: true,
            zIndex: 3,
          },
        ],
        audio: null,
        totalDuration: 5,
      };
    },
  },
  {
    id: 'valo-ace',
    name: 'Valorant Ace Reel',
    subtitle: '9:16 Vertical · Sparks + ACE + Shake',
    accent: '#FF4655',
    build: () => {
      const w = 1080;
      const h = 1920;
      const ace = VALORANT_ASSETS.find((a) => a.id === 'ace-banner')!.createLayer(w, h, 0.4);
      ace.duration = 4.6;
      ace.motionFx = { type: 'shake', intensity: 65, speed: 1.2 };
      ace.zIndex = 2;

      const badge = VALORANT_ASSETS.find((a) => a.id === '5k-badge')!.createLayer(w, h, 0.8);
      badge.duration = 4.2;
      badge.motionFx = { type: 'pulse', intensity: 60, speed: 1.4 };
      badge.zIndex = 3;

      const title = VALORANT_ASSETS.find((a) => a.id === 'val-title-text')!.createLayer(w, h, 0);
      title.duration = 5;
      title.motionFx = { type: 'glitch', intensity: 45, speed: 1 };
      title.zIndex = 4;

      const sparks = makeFxLayer('sparks', w, h, 0);
      sparks.duration = 5;
      sparks.zIndex = 1;

      const speed = makeFxLayer('speedlines', w, h, 0.4);
      speed.duration = 4.6;
      speed.transform.opacity = 0.45;
      speed.zIndex = 0;

      return {
        id: crypto.randomUUID(),
        name: 'Valorant Ace Reel',
        settings: { width: w, height: h, fps: 30, backgroundColor: '#0F1923' },
        layers: [speed, sparks, ace, badge, title],
        audio: null,
        totalDuration: 5,
      };
    },
  },
  {
    id: 'promo-reel',
    name: 'Creator Promo Card',
    subtitle: '16:9 HD · Floating Card + Confetti',
    accent: '#6366F1',
    build: () => {
      const w = 1280;
      const h = 720;
      const cardId = crypto.randomUUID();
      const titleId = crypto.randomUUID();
      const subId = crypto.randomUUID();
      const confetti = makeFxLayer('confetti', w, h, 0);
      confetti.duration = 6;
      confetti.zIndex = 3;

      return {
        id: crypto.randomUUID(),
        name: 'Creator Promo',
        settings: { width: w, height: h, fps: 30, backgroundColor: '#0f1024' },
        layers: [
          {
            id: cardId,
            name: 'Hero Card',
            type: 'shape',
            shapeType: 'rect',
            fill: '#1e1b4b',
            stroke: '#818cf8',
            strokeWidth: 4,
            cornerRadius: 24,
            shadow: { enabled: true, color: '#6366f1', blur: 35, offsetX: 0, offsetY: 12 },
            motionFx: { type: 'float', intensity: 40, speed: 1 },
            startTime: 0,
            duration: 6,
            transform: { x: 240, y: 150, width: 800, height: 420, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 },
            filters: { ...DEFAULT_FILTERS },
            keyframes: [],
            locked: false,
            visible: true,
            zIndex: 0,
          },
          {
            id: titleId,
            name: 'Headline',
            type: 'text',
            text: 'NEXT LEVEL EDITING',
            fontFamily: 'Impact',
            fontSize: 64,
            fontWeight: 'bold',
            textAlign: 'center',
            color: '#ffffff',
            shadow: { enabled: true, color: '#6366f1', blur: 18, offsetX: 0, offsetY: 0 },
            motionFx: { type: 'float', intensity: 40, speed: 1 },
            startTime: 0.2,
            duration: 5.8,
            transform: { x: 290, y: 270, width: 700, height: 80, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 },
            filters: { ...DEFAULT_FILTERS },
            keyframes: [
              {
                time: 0.2,
                transform: { x: 290, y: 310, width: 700, height: 80, rotation: 0, scaleX: 1, scaleY: 1, opacity: 0 },
                easing: 'ease-out',
              },
              {
                time: 0.9,
                transform: { x: 290, y: 270, width: 700, height: 80, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 },
                easing: 'ease-out',
              },
            ],
            locked: false,
            visible: true,
            zIndex: 1,
          },
          {
            id: subId,
            name: 'Subtitle',
            type: 'text',
            text: 'Drop your image or video to customize',
            fontFamily: 'Inter',
            fontSize: 26,
            fontWeight: 'normal',
            textAlign: 'center',
            color: '#a5b4fc',
            motionFx: { type: 'float', intensity: 40, speed: 1 },
            startTime: 0.5,
            duration: 5.5,
            transform: { x: 290, y: 370, width: 700, height: 40, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 },
            filters: { ...DEFAULT_FILTERS },
            keyframes: [],
            locked: false,
            visible: true,
            zIndex: 2,
          },
          confetti,
        ],
        audio: null,
        totalDuration: 6,
      };
    },
  },
  {
    id: 'kinetic-quote',
    name: 'Kinetic Story',
    subtitle: '1:1 Square · Dust FX + Bold Type',
    accent: '#10B981',
    build: () => {
      const w = 1080;
      const h = 1080;
      const snow = makeFxLayer('snow', w, h, 0);
      snow.duration = 5;
      snow.zIndex = 0;

      return {
        id: crypto.randomUUID(),
        name: 'Kinetic Story',
        settings: { width: w, height: h, fps: 30, backgroundColor: '#091513' },
        layers: [
          snow,
          {
            id: crypto.randomUUID(),
            name: 'Quote Text',
            type: 'text',
            text: 'CREATE\nWITHOUT\nLIMITS',
            fontFamily: 'Impact',
            fontSize: 108,
            fontWeight: 'bold',
            textAlign: 'center',
            color: '#ecfdf5',
            textStroke: '#10b981',
            textStrokeWidth: 3,
            shadow: { enabled: true, color: '#10b981', blur: 24, offsetX: 0, offsetY: 0 },
            motionFx: { type: 'pulse', intensity: 35, speed: 0.8 },
            startTime: 0,
            duration: 5,
            transform: { x: 140, y: 320, width: 800, height: 420, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 },
            filters: { ...DEFAULT_FILTERS },
            keyframes: [],
            locked: false,
            visible: true,
            zIndex: 1,
          },
        ],
        audio: null,
        totalDuration: 5,
      };
    },
  },
];
