import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  Play,
  Pause,
  Square,
  Scissors,
  Diamond,
  Eye,
  EyeOff,
  Trash2,
  GripVertical,
  SplitSquareHorizontal,
  Music,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { getTransformAtTime } from '../lib/animation';
import type { Layer } from '../types';

const TRACK_HEIGHT = 38;
const HEADER_W = 190;

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return `${m}:${String(sec).padStart(2, '0')}.${ms}`;
}

function LayerTrack({
  layer,
  zoom,
  totalDuration,
  isSelected,
  onClick,
  trackIndex,
  totalTracks,
  isCutMode,
}: {
  layer: Layer;
  zoom: number;
  totalDuration: number;
  isSelected: boolean;
  onClick: () => void;
  trackIndex: number;
  totalTracks: number;
  isCutMode: boolean;
}) {
  const {
    updateLayer,
    removeLayer,
    currentTime,
    reorderLayers,
    splitLayerAtTime,
    moveKeyframe,
    setCurrentTime,
    pushHistory,
  } = useEditorStore();
  const isVisible = currentTime >= layer.startTime && currentTime <= layer.startTime + layer.duration;

  const onClipMouseDown = (e: React.MouseEvent) => {
    if (isCutMode || e.button !== 0) return;
    e.stopPropagation();
    onClick();
    pushHistory();
    const startX = e.clientX;
    const origStart = layer.startTime;

    const onMove = (mv: MouseEvent) => {
      const dx = mv.clientX - startX;
      const newStart = Math.max(0, Math.min(origStart + dx / zoom, totalDuration - layer.duration));
      updateLayer(layer.id, { startTime: Math.round(newStart * 100) / 100 }, true);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onRightEdgeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    pushHistory();
    const startX = e.clientX;
    const startDur = layer.duration;
    const onMove = (mv: MouseEvent) => {
      const dx = mv.clientX - startX;
      const newDur = Math.max(0.1, startDur + dx / zoom);
      const clamped = Math.min(newDur, totalDuration - layer.startTime);
      updateLayer(layer.id, { duration: Math.round(clamped * 100) / 100 }, true);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onLeftEdgeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    pushHistory();
    const startX = e.clientX;
    const startStart = layer.startTime;
    const startDur = layer.duration;
    const onMove = (mv: MouseEvent) => {
      const dx = mv.clientX - startX;
      const newStart = Math.max(0, Math.min(startStart + dx / zoom, startStart + startDur - 0.1));
      const newDur = Math.max(0.1, startDur - (newStart - startStart));
      updateLayer(
        layer.id,
        {
          startTime: Math.round(newStart * 100) / 100,
          duration: Math.round(newDur * 100) / 100,
        },
        true
      );
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onReorderMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    pushHistory();
    const startY = e.clientY;
    const startIdx = trackIndex;
    let currentIdx = startIdx;

    const onMove = (mv: MouseEvent) => {
      const dy = mv.clientY - startY;
      const delta = Math.round(dy / TRACK_HEIGHT);
      const newIdx = Math.max(0, Math.min(startIdx + delta, totalTracks - 1));
      if (newIdx !== currentIdx) {
        currentIdx = newIdx;
        const layers = [...useEditorStore.getState().project.layers].sort((a, b) => b.zIndex - a.zIndex);
        const from = layers.findIndex((l) => l.id === layer.id);
        if (from === -1) return;
        const moved = layers.splice(from, 1)[0];
        layers.splice(newIdx, 0, moved);
        layers.forEach((l, i) => {
          l.zIndex = layers.length - 1 - i;
        });
        reorderLayers(layers);
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onKeyframeMouseDown = (e: React.MouseEvent, kfTime: number) => {
    e.stopPropagation();
    onClick();
    setCurrentTime(kfTime);
    pushHistory();
    const startX = e.clientX;
    let lastTime = kfTime;

    const onMove = (mv: MouseEvent) => {
      const dx = mv.clientX - startX;
      const nextTime = Math.max(0, Math.min(totalDuration, kfTime + dx / zoom));
      const rounded = Math.round(nextTime * 100) / 100;
      if (rounded !== lastTime) {
        moveKeyframe(layer.id, lastTime, rounded);
        lastTime = rounded;
        setCurrentTime(rounded);
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const stripLeft = layer.startTime * zoom;
  const stripWidth = Math.max(layer.duration * zoom, 10);

  const typeColor =
    layer.type === 'fx'
      ? isSelected
        ? 'bg-amber-500/85 ring-1 ring-amber-300'
        : 'bg-amber-600/65 hover:bg-amber-500/80'
      : layer.type === 'video'
      ? isSelected
        ? 'bg-[#FF4655]/85 ring-1 ring-rose-300'
        : 'bg-[#FF4655]/65 hover:bg-[#FF4655]/80'
      : layer.type === 'image'
      ? isSelected
        ? 'bg-indigo-500/85 ring-1 ring-indigo-300'
        : 'bg-indigo-700/75 hover:bg-indigo-600/85'
      : layer.type === 'text'
      ? isSelected
        ? 'bg-emerald-500/85 ring-1 ring-emerald-300'
        : 'bg-emerald-700/75 hover:bg-emerald-600/85'
      : isSelected
      ? 'bg-violet-500/85 ring-1 ring-violet-300'
      : 'bg-violet-700/75 hover:bg-violet-600/85';

  return (
    <div
      className={`relative flex items-center border-b border-white/5 select-none group ${
        isSelected ? 'bg-indigo-950/50' : 'bg-transparent hover:bg-white/[0.025]'
      }`}
      style={{ height: TRACK_HEIGHT, minWidth: totalDuration * zoom + HEADER_W + 40 }}
      onClick={onClick}
    >
      <div
        className="sticky left-0 z-10 flex items-center gap-1.5 px-2 bg-[#121226] border-r border-white/10 flex-shrink-0"
        style={{ width: HEADER_W, height: TRACK_HEIGHT }}
      >
        <div
          className="cursor-ns-resize text-white/25 hover:text-white/70 flex-shrink-0"
          onMouseDown={onReorderMouseDown}
          title="Drag up/down to reorder layer"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isVisible ? 'bg-emerald-400' : 'bg-white/20'}`} />
        <span className="text-[11px] text-white/85 truncate flex-1 font-medium leading-none">{layer.name}</span>
        <button
          className="p-0.5 rounded hover:bg-white/10 text-white/35 hover:text-white/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            updateLayer(layer.id, { visible: !layer.visible });
          }}
          title={layer.visible ? 'Hide' : 'Show'}
        >
          {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        </button>
        <button
          className="p-0.5 rounded hover:bg-red-500/20 text-white/35 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            removeLayer(layer.id);
          }}
          title="Delete layer"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <div className="relative flex-1 h-full">
        <div
          className={`absolute top-1.5 bottom-1.5 rounded flex items-center overflow-hidden select-none transition-colors ${
            isCutMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
          } ${typeColor}`}
          style={{ left: stripLeft, width: stripWidth }}
          onMouseDown={isCutMode ? undefined : onClipMouseDown}
          onClick={
            isCutMode
              ? (e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const t = layer.startTime + x / zoom;
                  splitLayerAtTime(layer.id, t);
                }
              : undefined
          }
        >
          {!isCutMode && (
            <div
              className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/25 z-10"
              onMouseDown={onLeftEdgeMouseDown}
            />
          )}
          <span className="text-[10px] text-white/90 font-medium truncate px-2.5 pointer-events-none">
            {layer.name}
          </span>
          {!isCutMode && (
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/25 z-10"
              onMouseDown={onRightEdgeMouseDown}
            />
          )}
        </div>

        {layer.keyframes.map((kf) => (
          <div
            key={kf.time}
            onMouseDown={(e) => onKeyframeMouseDown(e, kf.time)}
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-yellow-400 hover:bg-yellow-200 border border-yellow-900 shadow cursor-ew-resize z-20"
            style={{ left: kf.time * zoom - 6 }}
            title={`Keyframe @ ${formatTime(kf.time)} (drag to move)`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Timeline ─────────────────────────────────────────────────────────────

export function Timeline() {
  const {
    project,
    currentTime,
    zoom,
    isPlaying,
    autoKeyframe,
    selectedLayerId,
    selectLayer,
    setCurrentTime,
    setIsPlaying,
    setAutoKeyframe,
    setZoom,
    addKeyframe,
    splitLayerAtTime,
    setAudio,
  } = useEditorStore();
  const { layers, totalDuration, audio } = project;
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // Sync Audio track playback with timeline
  useEffect(() => {
    if (!audio?.src) {
      if (audioElRef.current) {
        audioElRef.current.pause();
        audioElRef.current = null;
      }
      return;
    }
    const el = new Audio(audio.src);
    el.volume = audio.volume ?? 0.85;
    audioElRef.current = el;
    return () => {
      el.pause();
      el.src = '';
    };
  }, [audio?.src]);

  useEffect(() => {
    const el = audioElRef.current;
    if (!el || !audio) return;
    el.volume = audio.volume ?? 0.85;
    if (isPlaying) {
      if (Math.abs(el.currentTime - currentTime) > 0.25) {
        el.currentTime = Math.min(currentTime, audio.duration);
      }
      if (el.paused && currentTime < audio.duration) {
        el.play().catch(() => {});
      }
    } else {
      if (!el.paused) el.pause();
      el.currentTime = Math.min(currentTime, audio.duration);
    }
  }, [isPlaying, currentTime, audio?.volume, audio?.duration]);

  const rafRef = useRef<number | null>(null);
  const startWallRef = useRef<number>(0);
  const startPlayheadRef = useRef<number>(0);
  const rulerRef = useRef<HTMLDivElement>(null);
  const [isCutMode, setIsCutMode] = useState(false);
  const [timelineHeight, setTimelineHeight] = useState(230);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    startWallRef.current = performance.now();
    startPlayheadRef.current = currentTime;

    const tick = (now: number) => {
      const elapsed = (now - startWallRef.current) / 1000;
      const next = startPlayheadRef.current + elapsed;
      if (next >= totalDuration) {
        setCurrentTime(0);
        setIsPlaying(false);
        return;
      }
      setCurrentTime(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, totalDuration]);

  const onResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = timelineHeight;
    const onMove = (mv: MouseEvent) => {
      const next = Math.max(150, Math.min(520, startH + (startY - mv.clientY)));
      setTimelineHeight(next);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const getTimeFromClientX = useCallback(
    (clientX: number) => {
      if (!rulerRef.current) return 0;
      const rect = rulerRef.current.getBoundingClientRect();
      const x = clientX - rect.left - HEADER_W;
      return Math.max(0, Math.min(x / zoom, totalDuration));
    },
    [zoom, totalDuration]
  );

  const onRulerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setIsPlaying(false);
      setCurrentTime(getTimeFromClientX(e.clientX));

      const onMove = (mv: MouseEvent) => {
        setCurrentTime(getTimeFromClientX(mv.clientX));
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [getTimeFromClientX, setCurrentTime, setIsPlaying]
  );

  const step = zoom >= 120 ? 1 : zoom >= 60 ? 2 : zoom >= 30 ? 5 : 10;
  const ticks: number[] = [];
  for (let i = 0; i <= totalDuration; i += step) ticks.push(i);

  const playheadX = currentTime * zoom;
  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  const addKfForSelected = () => {
    if (!selectedLayerId) return;
    const layer = layers.find((l) => l.id === selectedLayerId);
    if (!layer) return;
    addKeyframe(selectedLayerId, {
      time: currentTime,
      transform: getTransformAtTime(layer, currentTime),
      easing: 'ease-in-out',
    });
  };

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);
  const canSplitAtPlayhead =
    !!selectedLayer &&
    currentTime > selectedLayer.startTime + 0.05 &&
    currentTime < selectedLayer.startTime + selectedLayer.duration - 0.05;

  return (
    <div
      className="flex flex-col bg-[#0d0d1e] border-t border-white/10 flex-shrink-0 relative"
      style={{ height: timelineHeight, userSelect: 'none' }}
    >
      <div
        onMouseDown={onResizeStart}
        className="h-1.5 w-full cursor-ns-resize hover:bg-indigo-500/40 transition-colors absolute -top-0.5 left-0 z-30"
        title="Drag to resize timeline"
      />

      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/10 bg-[#121226] flex-shrink-0">
        <button
          className="flex items-center justify-center w-7 h-7 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
          onClick={() => {
            if (currentTime >= totalDuration) setCurrentTime(0);
            setIsPlaying(!isPlaying);
          }}
          title="Play / Pause (Space)"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
        </button>

        <button
          className="flex items-center justify-center w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          onClick={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          title="Stop & Rewind"
        >
          <Square className="w-3 h-3 fill-current" />
        </button>

        <span className="text-xs font-mono text-indigo-300 w-16 tabular-nums ml-1">{formatTime(currentTime)}</span>
        <span className="text-white/25 text-xs">/</span>
        <span className="text-xs font-mono text-white/45 tabular-nums">{formatTime(totalDuration)}</span>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <button
          className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/30 disabled:opacity-30 transition-colors cursor-pointer"
          onClick={addKfForSelected}
          disabled={!selectedLayerId}
          title="Add Keyframe at Playhead"
        >
          <Diamond className="w-3 h-3 fill-current" /> Add KF
        </button>

        <button
          className={`px-2 py-1 rounded text-[11px] transition-colors cursor-pointer ${
            autoKeyframe ? 'bg-yellow-500/25 text-yellow-200 ring-1 ring-yellow-400/40' : 'bg-white/5 text-white/45 hover:bg-white/10'
          }`}
          onClick={() => setAutoKeyframe(!autoKeyframe)}
          title="Automatically update/insert keyframes when moving animated layers"
        >
          Auto KF
        </button>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <button
          className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-white/10 text-white/80 hover:bg-white/20 disabled:opacity-30 transition-colors cursor-pointer"
          onClick={() => selectedLayerId && splitLayerAtTime(selectedLayerId, currentTime)}
          disabled={!canSplitAtPlayhead}
          title="Split selected clip at Playhead"
        >
          <SplitSquareHorizontal className="w-3.5 h-3.5" /> Split
        </button>

        <button
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
            isCutMode ? 'bg-orange-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
          onClick={() => setIsCutMode(!isCutMode)}
          title="Cut Tool — click anywhere on a clip to split it"
        >
          <Scissors className="w-3.5 h-3.5" /> Cut
        </button>

        {isCutMode && <span className="text-[11px] text-orange-300 animate-pulse">Click any clip to split</span>}

        <div className="flex-1" />

        <span className="text-[11px] text-white/35">Zoom</span>
        <input
          type="range"
          min={20}
          max={300}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-24 accent-indigo-500"
        />
      </div>

      <div className="flex-1 overflow-auto relative">
        <div style={{ minWidth: totalDuration * zoom + HEADER_W + 60, position: 'relative' }}>
          <div
            ref={rulerRef}
            className="sticky top-0 z-20 flex bg-[#0b0b19] border-b border-white/10 cursor-col-resize"
            style={{ height: 24 }}
            onMouseDown={onRulerMouseDown}
          >
            <div className="flex-shrink-0 bg-[#121226] border-r border-white/10 flex items-center px-2" style={{ width: HEADER_W }}>
              <span className="text-[10px] font-semibold text-white/35 uppercase tracking-wider">Layers ({layers.length})</span>
            </div>
            <div className="relative flex-1">
              {ticks.map((t) => (
                <div key={t} className="absolute top-0 bottom-0 flex flex-col" style={{ left: t * zoom }}>
                  <div className="w-px bg-white/25" style={{ height: t % (step * 2) === 0 ? 8 : 4 }} />
                  {t % (step * 2) === 0 && (
                    <span className="text-[9px] text-white/40 font-mono ml-1 mt-0.5 leading-none">{formatTime(t)}</span>
                  )}
                </div>
              ))}
              <div className="absolute top-0 bottom-0 w-0.5 bg-indigo-400 z-30 pointer-events-none" style={{ left: playheadX }}>
                <div className="w-3 h-3 bg-indigo-400 rotate-45 absolute -top-1 -left-1.5" />
              </div>
            </div>
          </div>

          <div className="relative">
            {/* Audio Track with Waveform & Beat Markers */}
            {audio && (
              <div
                className="relative flex items-center border-b border-emerald-500/20 bg-emerald-950/20"
                style={{ height: 38, minWidth: totalDuration * zoom + HEADER_W + 40 }}
              >
                <div
                  className="sticky left-0 z-10 flex items-center gap-1.5 px-2 bg-[#0f1f1c] border-r border-white/10 flex-shrink-0"
                  style={{ width: HEADER_W, height: 38 }}
                >
                  <Music className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="text-[11px] text-emerald-200 truncate flex-1 font-medium">{audio.name}</span>
                  <span className="text-[9px] text-emerald-400/70 font-mono">{audio.beats.length}B</span>
                  <button
                    onClick={() => setAudio(null)}
                    className="p-0.5 rounded hover:bg-red-500/20 text-white/35 hover:text-red-400 cursor-pointer"
                    title="Remove Audio"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="relative flex-1 h-full overflow-hidden">
                  {/* Waveform bars */}
                  <div
                    className="absolute top-1 bottom-1 left-0 flex items-center gap-[1px] bg-emerald-500/15 rounded overflow-hidden px-0.5"
                    style={{ width: Math.min(audio.duration, totalDuration) * zoom }}
                  >
                    {audio.peaks.map((pk, idx) => (
                      <div
                        key={idx}
                        className="flex-1 bg-emerald-400/70 rounded-full min-w-[1px]"
                        style={{ height: `${Math.max(12, pk * 90)}%` }}
                      />
                    ))}
                  </div>
                  {/* Beat Markers */}
                  {audio.beats
                    .filter((b) => b <= totalDuration)
                    .map((b, idx) => (
                      <div
                        key={idx}
                        onClick={() => setCurrentTime(b)}
                        className="absolute top-0 bottom-0 w-0.5 bg-pink-400/80 hover:bg-pink-300 cursor-pointer z-10"
                        style={{ left: b * zoom }}
                        title={`Beat @ ${formatTime(b)} (click to snap playhead)`}
                      />
                    ))}
                </div>
              </div>
            )}

            {sortedLayers.map((layer, idx) => (
              <LayerTrack
                key={layer.id}
                layer={layer}
                zoom={zoom}
                totalDuration={totalDuration}
                isSelected={layer.id === selectedLayerId}
                onClick={() => selectLayer(layer.id)}
                trackIndex={idx}
                totalTracks={sortedLayers.length}
                isCutMode={isCutMode}
              />
            ))}

            {layers.length === 0 && (
              <div className="flex items-center justify-center h-20 text-white/25 text-xs">
                No layers yet — upload an image or add text/shapes from the left toolbar
              </div>
            )}

            <div
              className="absolute top-0 bottom-0 w-0.5 bg-indigo-400/70 pointer-events-none z-20"
              style={{ left: HEADER_W + playheadX }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
