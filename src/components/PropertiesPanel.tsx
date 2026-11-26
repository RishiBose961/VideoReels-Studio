import {
  Copy,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Plus,
  X,
  FlipHorizontal2,
  FlipVertical2,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { getTransformAtTime } from '../lib/animation';
import type { BlendMode, EasingType, MotionFxType, PaperTextStyle, ParticleFxType } from '../types';

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between">
        <span className="text-[11px] text-white/50">{label}</span>
        <span className="text-[11px] text-white/75 font-mono">{value.toFixed(step < 1 ? 2 : 0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 accent-indigo-500 cursor-pointer"
      />
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-white/45 w-11 flex-shrink-0">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
      />
    </div>
  );
}

export function PropertiesPanel() {
  const {
    project,
    selectedLayerId,
    currentTime,
    updateLayer,
    updateTransform,
    updateFilters,
    duplicateLayer,
    removeLayer,
    bringForward,
    sendBackward,
    addKeyframe,
    updateKeyframeEasing,
    removeKeyframe,
    setCurrentTime,
  } = useEditorStore();

  const layer = project.layers.find((l) => l.id === selectedLayerId);

  if (!layer) {
    return (
      <div className="w-72 bg-[#111124] border-l border-white/10 p-4 flex flex-col gap-3 flex-shrink-0 select-none">
        <h3 className="text-[11px] font-semibold text-white/45 uppercase tracking-wider">Properties</h3>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 gap-2">
          <p className="text-xs text-white/30">
            Select a layer on the canvas or timeline to edit its 2D styles, filters, and animations.
          </p>
        </div>
      </div>
    );
  }

  const tf = getTransformAtTime(layer, currentTime);
  const { width: cw, height: ch } = project.settings;

  const applyAnimationPreset = (
    preset: 'fade-in' | 'fade-out' | 'slide-left' | 'slide-up' | 'pop-bounce' | 'ken-burns' | 'pulse' | 'spin'
  ) => {
    const start = layer.startTime;
    const end = layer.startTime + Math.min(1, layer.duration);
    const fadeEnd = layer.startTime + layer.duration;
    const mid = start + layer.duration / 2;
    const base = { ...tf };

    if (preset === 'fade-in') {
      addKeyframe(layer.id, { time: start, transform: { ...base, opacity: 0 }, easing: 'ease-out' });
      addKeyframe(layer.id, { time: end, transform: { ...base, opacity: 1 }, easing: 'ease-out' });
    } else if (preset === 'fade-out') {
      const outStart = Math.max(start, fadeEnd - 1);
      addKeyframe(layer.id, { time: outStart, transform: { ...base, opacity: 1 }, easing: 'ease-in' });
      addKeyframe(layer.id, { time: fadeEnd, transform: { ...base, opacity: 0 }, easing: 'ease-in' });
    } else if (preset === 'slide-left') {
      addKeyframe(layer.id, { time: start, transform: { ...base, x: -base.width, opacity: 0 }, easing: 'ease-out' });
      addKeyframe(layer.id, { time: end, transform: { ...base, opacity: 1 }, easing: 'ease-out' });
    } else if (preset === 'slide-up') {
      addKeyframe(layer.id, { time: start, transform: { ...base, y: ch + 20, opacity: 0 }, easing: 'ease-out' });
      addKeyframe(layer.id, { time: end, transform: { ...base, opacity: 1 }, easing: 'ease-out' });
    } else if (preset === 'pop-bounce') {
      addKeyframe(layer.id, {
        time: start,
        transform: {
          ...base,
          x: base.x + base.width * 0.45,
          y: base.y + base.height * 0.45,
          width: base.width * 0.1,
          height: base.height * 0.1,
          opacity: 0,
        },
        easing: 'bounce',
      });
      addKeyframe(layer.id, { time: end, transform: { ...base, opacity: 1 }, easing: 'bounce' });
    } else if (preset === 'ken-burns') {
      addKeyframe(layer.id, { time: start, transform: { ...base }, easing: 'linear' });
      addKeyframe(layer.id, {
        time: fadeEnd,
        transform: {
          ...base,
          x: base.x - base.width * 0.08,
          y: base.y - base.height * 0.08,
          width: base.width * 1.16,
          height: base.height * 1.16,
        },
        easing: 'linear',
      });
    } else if (preset === 'pulse') {
      addKeyframe(layer.id, { time: start, transform: { ...base }, easing: 'ease-in-out' });
      addKeyframe(layer.id, {
        time: mid,
        transform: {
          ...base,
          x: base.x - base.width * 0.06,
          y: base.y - base.height * 0.06,
          width: base.width * 1.12,
          height: base.height * 1.12,
        },
        easing: 'ease-in-out',
      });
      addKeyframe(layer.id, { time: fadeEnd, transform: { ...base }, easing: 'ease-in-out' });
    } else if (preset === 'spin') {
      addKeyframe(layer.id, { time: start, transform: { ...base, rotation: 0 }, easing: 'ease-in-out' });
      addKeyframe(layer.id, { time: fadeEnd, transform: { ...base, rotation: 360 }, easing: 'ease-in-out' });
    }
  };

  const shadow = layer.shadow ?? { enabled: false, color: '#000000', blur: 12, offsetX: 0, offsetY: 4 };

  return (
    <div className="w-72 bg-[#111124] border-l border-white/10 flex flex-col overflow-y-auto flex-shrink-0 select-none">
      {/* Header */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-white/10 bg-[#14142b]">
        <span className="text-xs font-semibold text-white truncate flex-1">{layer.name}</span>
        <button
          className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 cursor-pointer"
          onClick={() => updateLayer(layer.id, { visible: !layer.visible })}
          title={layer.visible ? 'Hide' : 'Show'}
        >
          {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-white/25" />}
        </button>
        <button
          className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 cursor-pointer"
          onClick={() => updateLayer(layer.id, { locked: !layer.locked })}
          title={layer.locked ? 'Unlock' : 'Lock'}
        >
          {layer.locked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
        </button>
        <button
          className="p-1 rounded text-white/40 hover:text-indigo-300 hover:bg-white/10 cursor-pointer"
          onClick={() => duplicateLayer(layer.id)}
          title="Duplicate"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          className="p-1 rounded text-white/40 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
          onClick={() => removeLayer(layer.id)}
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-4 p-3">
        {/* Name & Layer Order */}
        <div className="flex flex-col gap-2">
          <input
            value={layer.name}
            onChange={(e) => updateLayer(layer.id, { name: e.target.value }, true)}
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => bringForward(layer.id)}
              className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-white/70 cursor-pointer"
            >
              <ArrowUp className="w-3 h-3" /> Forward
            </button>
            <button
              onClick={() => sendBackward(layer.id)}
              className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-white/70 cursor-pointer"
            >
              <ArrowDown className="w-3 h-3" /> Backward
            </button>
          </div>
        </div>

        {/* Timing */}
        <div>
          <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider block mb-1.5">Timing</label>
          <div className="grid grid-cols-2 gap-2">
            <NumberInput
              label="Start"
              value={Math.round(layer.startTime * 100) / 100}
              min={0}
              step={0.1}
              onChange={(v) => updateLayer(layer.id, { startTime: Math.max(0, v) })}
            />
            <NumberInput
              label="Dur"
              value={Math.round(layer.duration * 100) / 100}
              min={0.1}
              step={0.1}
              onChange={(v) => updateLayer(layer.id, { duration: Math.max(0.1, v) })}
            />
          </div>
        </div>

        {/* Transform & Align */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Transform & Align</label>
            {(layer.type === 'image' || layer.type === 'video') && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateLayer(layer.id, { flipX: !layer.flipX })}
                  className={`p-1 rounded cursor-pointer ${
                    layer.flipX ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/50 hover:text-white'
                  }`}
                  title="Flip Horizontal"
                >
                  <FlipHorizontal2 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => updateLayer(layer.id, { flipY: !layer.flipY })}
                  className={`p-1 rounded cursor-pointer ${
                    layer.flipY ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/50 hover:text-white'
                  }`}
                  title="Flip Vertical"
                >
                  <FlipVertical2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Align Row */}
          <div className="grid grid-cols-6 gap-1 mb-2">
            <button
              onClick={() => updateTransform(layer.id, { x: 0 })}
              className="py-1 rounded bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/60 cursor-pointer"
              title="Align Left"
            >
              <AlignLeft className="w-3 h-3" />
            </button>
            <button
              onClick={() => updateTransform(layer.id, { x: Math.round((cw - tf.width) / 2) })}
              className="py-1 rounded bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/60 cursor-pointer"
              title="Center Horizontally"
            >
              <AlignCenter className="w-3 h-3" />
            </button>
            <button
              onClick={() => updateTransform(layer.id, { x: Math.round(cw - tf.width) })}
              className="py-1 rounded bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/60 cursor-pointer"
              title="Align Right"
            >
              <AlignRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => updateTransform(layer.id, { y: 0 })}
              className="py-1 rounded bg-white/5 hover:bg-white/15 text-[10px] text-white/60 cursor-pointer"
              title="Align Top"
            >
              Top
            </button>
            <button
              onClick={() => updateTransform(layer.id, { y: Math.round((ch - tf.height) / 2) })}
              className="py-1 rounded bg-white/5 hover:bg-white/15 text-[10px] text-white/60 cursor-pointer"
              title="Center Vertically"
            >
              Mid
            </button>
            <button
              onClick={() => updateTransform(layer.id, { y: Math.round(ch - tf.height) })}
              className="py-1 rounded bg-white/5 hover:bg-white/15 text-[10px] text-white/60 cursor-pointer"
              title="Align Bottom"
            >
              Bot
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <NumberInput label="X" value={Math.round(tf.x)} onChange={(v) => updateTransform(layer.id, { x: v })} />
              <NumberInput label="Y" value={Math.round(tf.y)} onChange={(v) => updateTransform(layer.id, { y: v })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberInput label="W" value={Math.round(tf.width)} min={1} onChange={(v) => updateTransform(layer.id, { width: Math.max(1, v) })} />
              <NumberInput label="H" value={Math.round(tf.height)} min={1} onChange={(v) => updateTransform(layer.id, { height: Math.max(1, v) })} />
            </div>
            <Slider
              label="Rotation"
              value={tf.rotation}
              min={-360}
              max={360}
              onChange={(v) => updateTransform(layer.id, { rotation: v }, true)}
            />
            <Slider
              label="Opacity"
              value={tf.opacity}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateTransform(layer.id, { opacity: v }, true)}
            />

            {/* Rotation Anchor / Pivot Point */}
            <div className="bg-white/[0.03] rounded-lg p-2 border border-white/5 flex flex-col gap-2 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-yellow-300/90 font-medium">Anchor Point (Pivot)</span>
                <span className="text-[10px] text-white/45 font-mono">
                  {Math.round((layer.anchorX ?? 0.5) * 100)}%, {Math.round((layer.anchorY ?? 0.5) * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                {/* 3x3 Anchor Grid */}
                <div className="grid grid-cols-3 gap-1 p-1 bg-black/30 rounded-md border border-white/10">
                  {[0, 0.5, 1].map((ay) =>
                    [0, 0.5, 1].map((ax) => {
                      const active =
                        Math.abs((layer.anchorX ?? 0.5) - ax) < 0.05 &&
                        Math.abs((layer.anchorY ?? 0.5) - ay) < 0.05;
                      return (
                        <button
                          key={`${ax}-${ay}`}
                          onClick={() => updateLayer(layer.id, { anchorX: ax, anchorY: ay })}
                          className={`w-4 h-4 rounded-[3px] transition-colors cursor-pointer ${
                            active
                              ? 'bg-yellow-400 ring-1 ring-yellow-200'
                              : 'bg-white/15 hover:bg-white/35'
                          }`}
                          title={`Pivot ${ax * 100}%, ${ay * 100}%`}
                        />
                      );
                    })
                  )}
                </div>
                {/* Fine X/Y Sliders */}
                <div className="flex-1 flex flex-col gap-1.5">
                  <Slider
                    label="Pivot X"
                    value={Math.round((layer.anchorX ?? 0.5) * 100)}
                    min={0}
                    max={100}
                    onChange={(v) => updateLayer(layer.id, { anchorX: v / 100 }, true)}
                  />
                  <Slider
                    label="Pivot Y"
                    value={Math.round((layer.anchorY ?? 0.5) * 100)}
                    min={0}
                    max={100}
                    onChange={(v) => updateLayer(layer.id, { anchorY: v / 100 }, true)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Procedural Motion FX */}
        <div className="border-t border-white/10 pt-3">
          <label className="text-[10px] font-semibold text-amber-300/80 uppercase tracking-wider flex items-center gap-1 mb-2">
            <Sparkles className="w-3 h-3" /> Live Motion FX
          </label>
          <div className="grid grid-cols-3 gap-1 mb-2">
            {(
              [
                ['none', 'None'],
                ['stop-motion', 'Stop-Motion'],
                ['paper-unfold', 'Paper Unfold'],
                ['paper-pop', 'Paper Pop'],
                ['shake', 'Shake'],
                ['float', 'Float'],
                ['pulse', 'Pulse'],
                ['glitch', 'Glitch'],
                ['flash', 'Flash'],
              ] as [MotionFxType, string][]
            ).map(([fx, label]) => {
              const active = (layer.motionFx?.type || 'none') === fx;
              return (
                <button
                  key={fx}
                  onClick={() =>
                    updateLayer(layer.id, {
                      motionFx: {
                        type: fx,
                        intensity: layer.motionFx?.intensity ?? 55,
                        speed: layer.motionFx?.speed ?? 1,
                      },
                    })
                  }
                  className={`py-1 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                    active
                      ? 'bg-amber-500/25 border-amber-400/60 text-amber-200'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {layer.motionFx && layer.motionFx.type !== 'none' && (
            <div className="flex flex-col gap-2">
              <Slider
                label="Intensity"
                value={layer.motionFx.intensity}
                min={5}
                max={100}
                onChange={(v) =>
                  updateLayer(layer.id, { motionFx: { ...layer.motionFx!, intensity: v } }, true)
                }
              />
              <Slider
                label="Speed"
                value={layer.motionFx.speed}
                min={0.2}
                max={3}
                step={0.1}
                onChange={(v) =>
                  updateLayer(layer.id, { motionFx: { ...layer.motionFx!, speed: v } }, true)
                }
              />
            </div>
          )}
        </div>

        {/* Particle FX-specific */}
        {layer.type === 'fx' && (
          <div className="border-t border-white/10 pt-3 flex flex-col gap-2">
            <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Particle FX</label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/45 w-11">Type</span>
              <select
                value={layer.fxType || 'sparks'}
                onChange={(e) => updateLayer(layer.id, { fxType: e.target.value as ParticleFxType })}
                className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none"
              >
                <option value="sparks">Ember Sparks</option>
                <option value="speedlines">Anime Speed Lines</option>
                <option value="confetti">Party Confetti</option>
                <option value="snow">Atmospheric Dust</option>
                <option value="match-cut">Text Match Cut</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/45 w-11">Color</span>
              <input
                type="color"
                value={layer.fxColor || '#FF4655'}
                onChange={(e) => updateLayer(layer.id, { fxColor: e.target.value }, true)}
                className="flex-1 h-7 rounded cursor-pointer bg-transparent border border-white/10"
              />
            </div>
          </div>
        )}

        {/* 2D Animation Presets & Keyframes */}
        <div className="border-t border-white/10 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-yellow-400" /> 2D Animation
            </span>
            <button
              onClick={() =>
                addKeyframe(layer.id, {
                  time: currentTime,
                  transform: { ...tf },
                  easing: 'ease-in-out',
                })
              }
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-yellow-500/20 hover:bg-yellow-500/35 text-yellow-300 text-[10px] font-medium cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add KF
            </button>
          </div>

          <div className="flex flex-wrap gap-1 mb-2.5">
            {(
              [
                ['fade-in', 'Fade In'],
                ['fade-out', 'Fade Out'],
                ['slide-left', 'Slide Left'],
                ['slide-up', 'Slide Up'],
                ['pop-bounce', 'Pop Bounce'],
                ['ken-burns', 'Ken Burns'],
                ['pulse', 'Pulse'],
                ['spin', 'Spin 360'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => applyAnimationPreset(key)}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-indigo-500/30 border border-white/10 text-[10px] text-white/75 hover:text-white transition-colors cursor-pointer"
              >
                {label}
              </button>
            ))}
          </div>

          {layer.keyframes.length > 0 ? (
            <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
              {layer.keyframes.map((kf) => (
                <div
                  key={kf.time}
                  className="flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] rounded px-2 py-1 text-[11px]"
                >
                  <button
                    onClick={() => setCurrentTime(kf.time)}
                    className="text-yellow-300 font-mono hover:underline cursor-pointer"
                  >
                    ◆ {kf.time.toFixed(2)}s
                  </button>
                  <select
                    value={kf.easing}
                    onChange={(e) => updateKeyframeEasing(layer.id, kf.time, e.target.value as EasingType)}
                    className="flex-1 bg-transparent text-white/65 text-[10px] focus:outline-none cursor-pointer"
                  >
                    <option value="linear">Linear</option>
                    <option value="ease-in">Ease In</option>
                    <option value="ease-out">Ease Out</option>
                    <option value="ease-in-out">Ease In-Out</option>
                    <option value="bounce">Bounce</option>
                  </select>
                  <button
                    onClick={() => removeKeyframe(layer.id, kf.time)}
                    className="text-white/30 hover:text-red-400 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-white/25">Click a preset or Add KF to animate</p>
          )}
        </div>

        {/* Effects: Blend Mode, Corner Radius, Shadow */}
        <div className="border-t border-white/10 pt-3 flex flex-col gap-2.5">
          <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Effects & Style</label>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/45 w-14">Blend</span>
            <select
              value={layer.blendMode || 'source-over'}
              onChange={(e) => updateLayer(layer.id, { blendMode: e.target.value as BlendMode })}
              className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none"
            >
              <option value="source-over">Normal</option>
              <option value="multiply">Multiply</option>
              <option value="screen">Screen</option>
              <option value="overlay">Overlay</option>
              <option value="darken">Darken</option>
              <option value="lighten">Lighten</option>
            </select>
          </div>

          {(layer.type === 'image' || layer.type === 'video' || (layer.type === 'shape' && layer.shapeType === 'rect')) && (
            <Slider
              label="Corner Radius"
              value={layer.cornerRadius ?? 0}
              min={0}
              max={150}
              onChange={(v) => updateLayer(layer.id, { cornerRadius: v }, true)}
            />
          )}

          {/* Paper Cut-Out Torn Edge (for Images) */}
          {layer.type === 'image' && (
            <div className="flex flex-col gap-2 bg-[#f3efe6]/5 rounded-lg p-2 border border-amber-200/15">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs text-amber-100 font-medium">Paper Cut-Out Edge</span>
                <input
                  type="checkbox"
                  checked={!!layer.paperCutout?.enabled}
                  onChange={(e) =>
                    updateLayer(layer.id, {
                      paperCutout: {
                        enabled: e.target.checked,
                        borderWidth: layer.paperCutout?.borderWidth ?? 14,
                        borderColor: layer.paperCutout?.borderColor ?? '#f7f4eb',
                        roughness: layer.paperCutout?.roughness ?? 10,
                      },
                    })
                  }
                  className="accent-amber-400"
                />
              </label>
              {layer.paperCutout?.enabled && (
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-white/45 w-11">Paper</span>
                    <input
                      type="color"
                      value={layer.paperCutout.borderColor}
                      onChange={(e) =>
                        updateLayer(
                          layer.id,
                          { paperCutout: { ...layer.paperCutout!, borderColor: e.target.value } },
                          true
                        )
                      }
                      className="flex-1 h-6 rounded cursor-pointer bg-transparent border border-white/10"
                    />
                  </div>
                  <Slider
                    label="Border Size"
                    value={layer.paperCutout.borderWidth}
                    min={4}
                    max={40}
                    onChange={(v) =>
                      updateLayer(
                        layer.id,
                        { paperCutout: { ...layer.paperCutout!, borderWidth: v } },
                        true
                      )
                    }
                  />
                  <Slider
                    label="Tear Roughness"
                    value={layer.paperCutout.roughness}
                    min={2}
                    max={20}
                    onChange={(v) =>
                      updateLayer(
                        layer.id,
                        { paperCutout: { ...layer.paperCutout!, roughness: v } },
                        true
                      )
                    }
                  />
                </div>
              )}
            </div>
          )}

          {/* Drop Shadow */}
          <div className="flex flex-col gap-2 bg-white/[0.03] rounded-lg p-2 border border-white/5">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-white/75 font-medium">Drop Shadow</span>
              <input
                type="checkbox"
                checked={shadow.enabled}
                onChange={(e) => updateLayer(layer.id, { shadow: { ...shadow, enabled: e.target.checked } })}
                className="accent-indigo-500"
              />
            </label>
            {shadow.enabled && (
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-white/45 w-11">Color</span>
                  <input
                    type="color"
                    value={shadow.color}
                    onChange={(e) => updateLayer(layer.id, { shadow: { ...shadow, color: e.target.value } }, true)}
                    className="flex-1 h-6 rounded cursor-pointer bg-transparent border border-white/10"
                  />
                </div>
                <Slider
                  label="Blur"
                  value={shadow.blur}
                  min={0}
                  max={50}
                  onChange={(v) => updateLayer(layer.id, { shadow: { ...shadow, blur: v } }, true)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <NumberInput
                    label="Off X"
                    value={shadow.offsetX}
                    onChange={(v) => updateLayer(layer.id, { shadow: { ...shadow, offsetX: v } }, true)}
                  />
                  <NumberInput
                    label="Off Y"
                    value={shadow.offsetY}
                    onChange={(v) => updateLayer(layer.id, { shadow: { ...shadow, offsetY: v } }, true)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Text-specific */}
        {layer.type === 'text' && (
          <div className="border-t border-white/10 pt-3">
            <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider block mb-1.5">Text</label>
            <div className="flex flex-col gap-2">
              <textarea
                value={layer.text}
                onChange={(e) => updateLayer(layer.id, { text: e.target.value }, true)}
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white resize-none focus:outline-none focus:border-indigo-500"
                rows={2}
              />
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/45 w-11">Paper</span>
                <select
                  value={layer.paperTextStyle || 'normal'}
                  onChange={(e) => updateLayer(layer.id, { paperTextStyle: e.target.value as PaperTextStyle })}
                  className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none"
                >
                  <option value="normal">Normal Text</option>
                  <option value="ransom">Magazine / Ransom Cutout</option>
                  <option value="highlight">Newspaper Highlight</option>
                </select>
              </div>
              <NumberInput
                label="Size"
                value={layer.fontSize || 48}
                min={6}
                max={300}
                onChange={(v) => updateLayer(layer.id, { fontSize: v })}
              />
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/45 w-11">Color</span>
                <input
                  type="color"
                  value={layer.color || '#ffffff'}
                  onChange={(e) => updateLayer(layer.id, { color: e.target.value }, true)}
                  className="flex-1 h-7 rounded cursor-pointer bg-transparent border border-white/10"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/45 w-11">Outline</span>
                <input
                  type="color"
                  value={layer.textStroke || '#000000'}
                  onChange={(e) => updateLayer(layer.id, { textStroke: e.target.value }, true)}
                  className="w-9 h-7 rounded cursor-pointer bg-transparent border border-white/10"
                />
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={layer.textStrokeWidth ?? 0}
                  onChange={(e) => updateLayer(layer.id, { textStrokeWidth: Number(e.target.value) })}
                  className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none"
                  title="Outline width"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/45 w-11">Font</span>
                <select
                  value={layer.fontFamily || 'Inter'}
                  onChange={(e) => updateLayer(layer.id, { fontFamily: e.target.value })}
                  className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none"
                >
                  {['Inter', 'Arial', 'Georgia', 'Courier New', 'Trebuchet MS', 'Impact'].map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-white/45 w-11">Align</span>
                {(['left', 'center', 'right'] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => updateLayer(layer.id, { textAlign: a })}
                    className={`flex-1 py-1 rounded text-[10px] capitalize cursor-pointer ${
                      (layer.textAlign || 'center') === a
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Shape-specific */}
        {layer.type === 'shape' && (
          <div className="border-t border-white/10 pt-3">
            <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider block mb-1.5">Shape</label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/45 w-11">Fill</span>
                <input
                  type="color"
                  value={layer.fill || '#6366f1'}
                  onChange={(e) => updateLayer(layer.id, { fill: e.target.value }, true)}
                  className="flex-1 h-7 rounded cursor-pointer bg-transparent border border-white/10"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/45 w-11">Stroke</span>
                <input
                  type="color"
                  value={layer.stroke || '#a5b4fc'}
                  onChange={(e) => updateLayer(layer.id, { stroke: e.target.value }, true)}
                  className="flex-1 h-7 rounded cursor-pointer bg-transparent border border-white/10"
                />
              </div>
              <NumberInput
                label="Border"
                value={layer.strokeWidth ?? 2}
                min={0}
                max={30}
                onChange={(v) => updateLayer(layer.id, { strokeWidth: v })}
              />
            </div>
          </div>
        )}

        {/* Image / Video filters */}
        {(layer.type === 'image' || layer.type === 'video') && (
          <div className="border-t border-white/10 pt-3">
            {layer.type === 'video' && (
              <div className="mb-3">
                <Slider
                  label="Video Volume"
                  value={layer.volume ?? 1}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => updateLayer(layer.id, { volume: v }, true)}
                />
              </div>
            )}
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Image Filters</label>
              <button
                className="text-[10px] text-white/40 hover:text-white/80 cursor-pointer"
                onClick={() =>
                  updateFilters(layer.id, {
                    brightness: 0,
                    contrast: 0,
                    saturation: 0,
                    hue: 0,
                    blur: 0,
                    grayscale: false,
                    sepia: false,
                  })
                }
              >
                ↺ Reset
              </button>
            </div>
            <div className="flex flex-col gap-2.5">
              <Slider
                label="Brightness"
                value={layer.filters.brightness}
                min={-100}
                max={100}
                onChange={(v) => updateFilters(layer.id, { brightness: v })}
              />
              <Slider
                label="Contrast"
                value={layer.filters.contrast}
                min={-100}
                max={100}
                onChange={(v) => updateFilters(layer.id, { contrast: v })}
              />
              <Slider
                label="Saturation"
                value={layer.filters.saturation}
                min={-100}
                max={100}
                onChange={(v) => updateFilters(layer.id, { saturation: v })}
              />
              <Slider
                label="Hue"
                value={layer.filters.hue}
                min={0}
                max={360}
                onChange={(v) => updateFilters(layer.id, { hue: v })}
              />
              <Slider
                label="Blur"
                value={layer.filters.blur}
                min={0}
                max={20}
                onChange={(v) => updateFilters(layer.id, { blur: v })}
              />
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={layer.filters.grayscale}
                    onChange={(e) => updateFilters(layer.id, { grayscale: e.target.checked })}
                    className="accent-indigo-500"
                  />
                  <span className="text-xs text-white/65">Grayscale</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={layer.filters.sepia}
                    onChange={(e) => updateFilters(layer.id, { sepia: e.target.checked })}
                    className="accent-indigo-500"
                  />
                  <span className="text-xs text-white/65">Sepia</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
