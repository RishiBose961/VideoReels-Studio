import { create } from 'zustand';
import type { EditorState, Layer, Project, Transform, ImageFilters, KeyFrame, EasingType, ProjectSettings, AudioTrack, ParticleFxType } from '../types';
import { getBaseTransformAtTime } from '../lib/animation';

export const DEFAULT_FILTERS: ImageFilters = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  blur: 0,
  grayscale: false,
  sepia: false,
};

const DEFAULT_PROJECT: Project = {
  id: crypto.randomUUID(),
  name: 'Untitled Reel',
  settings: { width: 1280, height: 720, fps: 30, backgroundColor: '#111122' },
  layers: [],
  totalDuration: 10,
};

const MAX_HISTORY = 40;

interface EditorStore extends EditorState {
  past: Project[];
  future: Project[];

  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  setProject: (p: Project) => void;
  setProjectName: (name: string) => void;
  setTotalDuration: (d: number) => void;
  setBackgroundColor: (color: string) => void;
  updateSettings: (patch: Partial<ProjectSettings>) => void;
  setAudio: (audio: AudioTrack | null) => void;

  addLayer: (layer: Layer) => void;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, patch: Partial<Layer>, skipHistory?: boolean) => void;
  updateTransform: (id: string, patch: Partial<Transform>, skipHistory?: boolean) => void;
  updateFilters: (id: string, patch: Partial<ImageFilters>) => void;
  reorderLayers: (layers: Layer[]) => void;
  duplicateLayer: (id: string) => void;
  splitLayerAtTime: (id: string, time: number) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;

  addKeyframe: (layerId: string, kf: KeyFrame) => void;
  updateKeyframeEasing: (layerId: string, time: number, easing: EasingType) => void;
  moveKeyframe: (layerId: string, oldTime: number, newTime: number) => void;
  removeKeyframe: (layerId: string, time: number) => void;

  selectLayer: (id: string | null) => void;
  setCurrentTime: (t: number) => void;
  setIsPlaying: (v: boolean) => void;
  setAutoKeyframe: (v: boolean) => void;

  setZoom: (z: number) => void;
  setCanvasZoom: (z: number) => void;
  setTool: (t: EditorState['tool']) => void;
  toggleSnap: () => void;
}

function cloneProject(p: Project): Project {
  return JSON.parse(JSON.stringify(p));
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  project: DEFAULT_PROJECT,
  selectedLayerId: null,
  currentTime: 0,
  isPlaying: false,
  autoKeyframe: true,
  zoom: 80,
  canvasZoom: 0.65,
  snapToGrid: true,
  tool: 'select',
  past: [],
  future: [],

  pushHistory: () => {
    const { project, past } = get();
    set({
      past: [...past.slice(-(MAX_HISTORY - 1)), cloneProject(project)],
      future: [],
    });
  },

  undo: () => {
    const { past, future, project } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    set({
      project: prev,
      past: past.slice(0, -1),
      future: [cloneProject(project), ...future.slice(0, MAX_HISTORY - 1)],
    });
  },

  redo: () => {
    const { past, future, project } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      project: next,
      past: [...past, cloneProject(project)],
      future: future.slice(1),
    });
  },

  setProject: (p) => set({ project: p, past: [], future: [], selectedLayerId: null, currentTime: 0 }),
  setProjectName: (name) => set((s) => ({ project: { ...s.project, name } })),
  setTotalDuration: (d) =>
    set((s) => ({ project: { ...s.project, totalDuration: Math.max(1, Math.min(300, d)) } })),
  setBackgroundColor: (color) =>
    set((s) => ({ project: { ...s.project, settings: { ...s.project.settings, backgroundColor: color } } })),
  updateSettings: (patch) => {
    get().pushHistory();
    set((s) => ({ project: { ...s.project, settings: { ...s.project.settings, ...patch } } }));
  },
  setAudio: (audio) => {
    get().pushHistory();
    set((s) => ({ project: { ...s.project, audio } }));
  },

  addLayer: (layer) => {
    get().pushHistory();
    const maxZ = get().project.layers.reduce((m, l) => Math.max(m, l.zIndex), -1);
    const withZ = { ...layer, zIndex: maxZ + 1 };
    set((s) => ({
      project: { ...s.project, layers: [...s.project.layers, withZ] },
      selectedLayerId: withZ.id,
    }));
  },

  removeLayer: (id) => {
    get().pushHistory();
    set((s) => ({
      project: { ...s.project, layers: s.project.layers.filter((l) => l.id !== id) },
      selectedLayerId: s.selectedLayerId === id ? null : s.selectedLayerId,
    }));
  },

  updateLayer: (id, patch, skipHistory = false) => {
    if (!skipHistory) get().pushHistory();
    set((s) => ({
      project: {
        ...s.project,
        layers: s.project.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      },
    }));
  },

  updateTransform: (id, patch, skipHistory = false) => {
    if (!skipHistory) get().pushHistory();
    const { currentTime, autoKeyframe } = get();
    set((s) => ({
      project: {
        ...s.project,
        layers: s.project.layers.map((l) => {
          if (l.id !== id) return l;
          if (l.keyframes.length > 0 && autoKeyframe) {
            const currentTf = getBaseTransformAtTime(l, currentTime);
            const updatedTf = { ...currentTf, ...patch };
            const tRounded = Math.round(currentTime * 100) / 100;
            const existingIdx = l.keyframes.findIndex((k) => Math.abs(k.time - tRounded) < 0.05);
            let nextKfs: KeyFrame[];
            if (existingIdx >= 0) {
              nextKfs = l.keyframes.map((k, idx) =>
                idx === existingIdx ? { ...k, transform: updatedTf } : k
              );
            } else {
              nextKfs = [
                ...l.keyframes,
                { time: tRounded, transform: updatedTf, easing: 'ease-in-out' as EasingType },
              ].sort((a, b) => a.time - b.time);
            }
            return { ...l, transform: updatedTf, keyframes: nextKfs };
          }
          return { ...l, transform: { ...l.transform, ...patch } };
        }),
      },
    }));
  },

  updateFilters: (id, patch) =>
    set((s) => ({
      project: {
        ...s.project,
        layers: s.project.layers.map((l) =>
          l.id === id ? { ...l, filters: { ...l.filters, ...patch } } : l
        ),
      },
    })),

  reorderLayers: (layers) => set((s) => ({ project: { ...s.project, layers } })),

  duplicateLayer: (id) => {
    const layer = get().project.layers.find((l) => l.id === id);
    if (!layer) return;
    get().pushHistory();
    const maxZ = get().project.layers.reduce((m, l) => Math.max(m, l.zIndex), -1);
    const newLayer: Layer = {
      ...cloneProject({ id: '', name: '', settings: DEFAULT_PROJECT.settings, layers: [layer], totalDuration: 1 }).layers[0],
      id: crypto.randomUUID(),
      name: layer.name + ' Copy',
      zIndex: maxZ + 1,
      transform: { ...layer.transform, x: layer.transform.x + 24, y: layer.transform.y + 24 },
    };
    set((s) => ({
      project: { ...s.project, layers: [...s.project.layers, newLayer] },
      selectedLayerId: newLayer.id,
    }));
  },

  splitLayerAtTime: (id, time) => {
    const layer = get().project.layers.find((l) => l.id === id);
    if (!layer) return;
    if (time <= layer.startTime + 0.05 || time >= layer.startTime + layer.duration - 0.05) return;
    get().pushHistory();

    const leftDur = Math.round((time - layer.startTime) * 100) / 100;
    const rightDur = Math.round((layer.duration - leftDur) * 100) / 100;

    const rightLayer: Layer = {
      ...layer,
      id: crypto.randomUUID(),
      name: layer.name.endsWith(' (cut)') ? layer.name : `${layer.name} (cut)`,
      startTime: Math.round(time * 100) / 100,
      duration: rightDur,
      trimStart: (layer.trimStart ?? 0) + leftDur,
      zIndex: layer.zIndex,
      transform: getBaseTransformAtTime(layer, time),
      filters: { ...layer.filters },
      keyframes: layer.keyframes
        .filter((kf) => kf.time >= time)
        .map((kf) => ({ ...kf, transform: { ...kf.transform } })),
    };

    set((s) => {
      const nextLayers: Layer[] = [];
      for (const l of s.project.layers) {
        if (l.id === id) {
          nextLayers.push({ ...l, duration: leftDur, keyframes: l.keyframes.filter((kf) => kf.time <= time) });
          nextLayers.push(rightLayer);
        } else {
          nextLayers.push(l);
        }
      }
      return {
        project: {
          ...s.project,
          layers: nextLayers,
        },
        selectedLayerId: rightLayer.id,
      };
    });
  },

  bringForward: (id) => {
    const layers = [...get().project.layers].sort((a, b) => a.zIndex - b.zIndex);
    const idx = layers.findIndex((l) => l.id === id);
    if (idx < 0 || idx === layers.length - 1) return;
    get().pushHistory();
    const tmp = layers[idx];
    layers[idx] = layers[idx + 1];
    layers[idx + 1] = tmp;
    layers.forEach((l, i) => { l.zIndex = i; });
    set((s) => ({ project: { ...s.project, layers } }));
  },

  sendBackward: (id) => {
    const layers = [...get().project.layers].sort((a, b) => a.zIndex - b.zIndex);
    const idx = layers.findIndex((l) => l.id === id);
    if (idx <= 0) return;
    get().pushHistory();
    const tmp = layers[idx];
    layers[idx] = layers[idx - 1];
    layers[idx - 1] = tmp;
    layers.forEach((l, i) => { l.zIndex = i; });
    set((s) => ({ project: { ...s.project, layers } }));
  },

  addKeyframe: (layerId, kf) => {
    get().pushHistory();
    const tRounded = Math.round(kf.time * 100) / 100;
    set((s) => ({
      project: {
        ...s.project,
        layers: s.project.layers.map((l) => {
          if (l.id !== layerId) return l;
          const existing = l.keyframes.filter((k) => Math.abs(k.time - tRounded) >= 0.05);
          return { ...l, keyframes: [...existing, { ...kf, time: tRounded }].sort((a, b) => a.time - b.time) };
        }),
      },
    }));
  },

  updateKeyframeEasing: (layerId, time, easing) => {
    get().pushHistory();
    set((s) => ({
      project: {
        ...s.project,
        layers: s.project.layers.map((l) =>
          l.id === layerId
            ? {
                ...l,
                keyframes: l.keyframes.map((k) => (k.time === time ? { ...k, easing } : k)),
              }
            : l
        ),
      },
    }));
  },

  moveKeyframe: (layerId, oldTime, newTime) => {
    const tRounded = Math.round(Math.max(0, newTime) * 100) / 100;
    set((s) => ({
      project: {
        ...s.project,
        layers: s.project.layers.map((l) => {
          if (l.id !== layerId) return l;
          return {
            ...l,
            keyframes: l.keyframes
              .map((k) => (k.time === oldTime ? { ...k, time: tRounded } : k))
              .sort((a, b) => a.time - b.time),
          };
        }),
      },
    }));
  },

  removeKeyframe: (layerId, time) => {
    get().pushHistory();
    set((s) => ({
      project: {
        ...s.project,
        layers: s.project.layers.map((l) =>
          l.id === layerId ? { ...l, keyframes: l.keyframes.filter((k) => k.time !== time) } : l
        ),
      },
    }));
  },

  selectLayer: (id) => set({ selectedLayerId: id }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setAutoKeyframe: (v) => set({ autoKeyframe: v }),
  setZoom: (z) => set({ zoom: z }),
  setCanvasZoom: (z) => set({ canvasZoom: z }),
  setTool: (t) => set({ tool: t }),
  toggleSnap: () => set((s) => ({ snapToGrid: !s.snapToGrid })),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function makeImageLayer(
  src: string,
  name: string,
  naturalWidth = 400,
  naturalHeight = 300,
  canvasWidth = 1280,
  canvasHeight = 720,
  startTime = 0
): Layer {
  const maxDim = Math.min(canvasWidth, canvasHeight) * 0.6;
  const ratio = naturalWidth > 0 && naturalHeight > 0 ? naturalWidth / naturalHeight : 4 / 3;
  let width = naturalWidth;
  let height = naturalHeight;
  if (width > maxDim || height > maxDim) {
    if (ratio >= 1) {
      width = maxDim;
      height = Math.round(maxDim / ratio);
    } else {
      height = maxDim;
      width = Math.round(maxDim * ratio);
    }
  }
  return {
    id: crypto.randomUUID(),
    name,
    type: 'image',
    src,
    cornerRadius: 0,
    shadow: { enabled: false, color: '#000000', blur: 15, offsetX: 0, offsetY: 6 },
    blendMode: 'source-over',
    startTime,
    duration: 5,
    transform: {
      x: Math.round((canvasWidth - width) / 2),
      y: Math.round((canvasHeight - height) / 2),
      width,
      height,
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

export function makeVideoLayer(
  src: string,
  name: string,
  naturalWidth = 1280,
  naturalHeight = 720,
  duration = 5,
  canvasWidth = 1280,
  canvasHeight = 720,
  startTime = 0
): Layer {
  const ratio = naturalWidth > 0 && naturalHeight > 0 ? naturalWidth / naturalHeight : 16 / 9;
  let width = canvasWidth;
  let height = Math.round(canvasWidth / ratio);
  if (height > canvasHeight) {
    height = canvasHeight;
    width = Math.round(canvasHeight * ratio);
  }
  return {
    id: crypto.randomUUID(),
    name,
    type: 'video',
    src,
    trimStart: 0,
    volume: 1,
    cornerRadius: 0,
    shadow: { enabled: false, color: '#000000', blur: 15, offsetX: 0, offsetY: 6 },
    blendMode: 'source-over',
    startTime,
    duration: Math.max(0.5, Math.round(duration * 100) / 100),
    transform: {
      x: Math.round((canvasWidth - width) / 2),
      y: Math.round((canvasHeight - height) / 2),
      width,
      height,
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

export function makeFxLayer(
  fxType: ParticleFxType,
  canvasWidth = 1280,
  canvasHeight = 720,
  startTime = 0
): Layer {
  const labels: Record<ParticleFxType, string> = {
    sparks: 'Ember Sparks FX',
    speedlines: 'Anime Speed Lines',
    confetti: 'Celebration Confetti',
    snow: 'Atmospheric Dust',
    'match-cut': 'Paper Text Match Cut',
  };
  const colors: Record<ParticleFxType, string> = {
    sparks: '#FF4655',
    speedlines: '#FFFFFF',
    confetti: '#F5C451',
    snow: '#E2E8F0',
    'match-cut': '#FDE047',
  };
  return {
    id: crypto.randomUUID(),
    name: labels[fxType],
    type: 'fx',
    fxType,
    fxColor: colors[fxType],
    blendMode: 'screen',
    startTime,
    duration: 5,
    transform: {
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 0.9,
    },
    filters: { ...DEFAULT_FILTERS },
    keyframes: [],
    locked: false,
    visible: true,
    zIndex: 0,
  };
}

export function makeTextLayer(
  text: string,
  canvasWidth = 1280,
  canvasHeight = 720,
  startTime = 0
): Layer {
  const width = Math.min(500, canvasWidth * 0.7);
  return {
    id: crypto.randomUUID(),
    name: 'Text',
    type: 'text',
    text,
    fontFamily: 'Inter',
    fontSize: 56,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#ffffff',
    textStroke: '#000000',
    textStrokeWidth: 0,
    shadow: { enabled: false, color: '#000000', blur: 12, offsetX: 0, offsetY: 4 },
    blendMode: 'source-over',
    startTime,
    duration: 5,
    transform: {
      x: Math.round((canvasWidth - width) / 2),
      y: Math.round(canvasHeight / 2 - 36),
      width,
      height: 72,
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

export function makeShapeLayer(
  shapeType: 'rect' | 'ellipse' | 'arrow',
  canvasWidth = 1280,
  canvasHeight = 720,
  startTime = 0
): Layer {
  const width = 220;
  const height = shapeType === 'arrow' ? 40 : 160;
  return {
    id: crypto.randomUUID(),
    name: `${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)}`,
    type: 'shape',
    shapeType,
    fill: '#6366f1',
    stroke: '#a5b4fc',
    strokeWidth: 3,
    cornerRadius: 8,
    shadow: { enabled: false, color: '#000000', blur: 15, offsetX: 0, offsetY: 6 },
    blendMode: 'source-over',
    startTime,
    duration: 5,
    transform: {
      x: Math.round((canvasWidth - width) / 2),
      y: Math.round((canvasHeight - height) / 2),
      width,
      height,
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
