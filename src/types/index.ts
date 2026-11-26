// ─── Core Data Types (Pure 2D + Procedural FX + Audio) ──────────────────────

export type LayerType = 'image' | 'text' | 'shape' | 'video' | 'fx';

export type EasingType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce';

export type BlendMode = 'source-over' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten';

export type MotionFxType =
  | 'none'
  | 'shake'
  | 'float'
  | 'pulse'
  | 'glitch'
  | 'flash'
  | 'stop-motion'
  | 'paper-unfold'
  | 'paper-pop';

export type ParticleFxType = 'sparks' | 'speedlines' | 'confetti' | 'snow' | 'match-cut';

export type PaperTextStyle = 'normal' | 'ransom' | 'highlight';

export interface PaperCutoutStyle {
  enabled: boolean;
  borderWidth: number;
  borderColor: string;
  roughness: number; // 1..20
}

export interface MotionFX {
  type: MotionFxType;
  intensity: number; // 0..100
  speed: number;     // 0.2..3
}

export interface Transform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;     // degrees
  scaleX: number;       // 1 or -1 for flip
  scaleY: number;       // 1 or -1 for flip
  opacity: number;      // 0..1
}

export interface ImageFilters {
  brightness: number;   // -100 to 100
  contrast: number;     // -100 to 100
  saturation: number;   // -100 to 100
  hue: number;          // 0-360
  blur: number;         // 0-20
  grayscale: boolean;
  sepia: boolean;
}

export interface LayerShadow {
  enabled: boolean;
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface KeyFrame {
  time: number;         // seconds
  transform: Transform;
  easing: EasingType;
}

export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  src?: string;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  textStroke?: string;
  textStrokeWidth?: number;
  paperTextStyle?: PaperTextStyle;
  paperCutout?: PaperCutoutStyle;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  shapeType?: 'rect' | 'ellipse' | 'arrow';
  fxType?: ParticleFxType;
  fxColor?: string;
  cornerRadius?: number;
  shadow?: LayerShadow;
  blendMode?: BlendMode;
  motionFx?: MotionFX;
  flipX?: boolean;
  flipY?: boolean;
  anchorX?: number;     // 0..1 normalized pivot X (default 0.5 = center)
  anchorY?: number;     // 0..1 normalized pivot Y (default 0.5 = center)
  trimStart?: number;   // seconds offset into source video
  volume?: number;      // 0..1 for video layers
  startTime: number;
  duration: number;
  transform: Transform;
  filters: ImageFilters;
  keyframes: KeyFrame[];
  locked: boolean;
  visible: boolean;
  zIndex: number;
}

export interface AudioTrack {
  id: string;
  name: string;
  src: string;          // data URL or object URL
  duration: number;
  volume: number;       // 0..1
  peaks: number[];      // normalized 0..1 waveform bars
  beats: number[];      // detected beat timestamps in seconds
}

export interface ProjectSettings {
  width: number;
  height: number;
  fps: number;
  backgroundColor: string;
}

export interface Project {
  id: string;
  name: string;
  settings: ProjectSettings;
  layers: Layer[];
  audio?: AudioTrack | null;
  totalDuration: number;
}

export interface EditorState {
  project: Project;
  selectedLayerId: string | null;
  currentTime: number;
  isPlaying: boolean;
  autoKeyframe: boolean;
  zoom: number;
  canvasZoom: number;
  snapToGrid: boolean;
  tool: 'select' | 'text' | 'rect' | 'ellipse' | 'arrow';
}
