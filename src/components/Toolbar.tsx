import React, { useRef, useState } from 'react';
import {
  ImagePlus,
  MousePointer2,
  Type,
  Square,
  Circle,
  ArrowRight,
  Magnet,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crosshair,
  Sparkles,
  Music,
  X,
} from 'lucide-react';
import { useEditorStore, makeImageLayer, makeVideoLayer, makeTextLayer, makeShapeLayer, makeFxLayer } from '../store/editorStore';
import { analyzeAudioFile } from '../lib/audioBeats';
import { VALORANT_ASSETS } from '../lib/valorantAssets';
import type { ParticleFxType } from '../types';

export function Toolbar() {
  const {
    tool,
    canvasZoom,
    project,
    currentTime,
    setTool,
    setCanvasZoom,
    addLayer,
    toggleSnap,
    snapToGrid,
  } = useEditorStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const [showValoPack, setShowValoPack] = useState(false);
  const [showFxPack, setShowFxPack] = useState(false);

  const handleAudioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const track = await analyzeAudioFile(file);
      useEditorStore.getState().setAudio(track);
    } catch {
      alert('Could not decode audio file.');
    }
    e.target.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { width: cw, height: ch } = project.settings;
    const start = Math.round(currentTime * 10) / 10;

    Array.from(e.target.files || []).forEach((file) => {
      if (file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        const vid = document.createElement('video');
        vid.preload = 'metadata';
        vid.onloadedmetadata = () => {
          addLayer(
            makeVideoLayer(
              url,
              file.name.replace(/\.[^.]+$/, ''),
              vid.videoWidth || cw,
              vid.videoHeight || ch,
              vid.duration || 5,
              cw,
              ch,
              start
            )
          );
        };
        vid.src = url;
        return;
      }

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const src = ev.target!.result as string;
          const img = new window.Image();
          img.onload = () => {
            addLayer(
              makeImageLayer(
                src,
                file.name.replace(/\.[^.]+$/, ''),
                img.naturalWidth,
                img.naturalHeight,
                cw,
                ch,
                start
              )
            );
          };
          img.src = src;
        };
        reader.readAsDataURL(file);
      }
    });
    e.target.value = '';
  };

  const tools: { id: typeof tool; icon: React.ReactNode; title: string }[] = [
    { id: 'select', title: 'Select (V)', icon: <MousePointer2 className="w-4 h-4" /> },
    { id: 'text', title: 'Add Text (T)', icon: <Type className="w-4 h-4" /> },
    { id: 'rect', title: 'Add Rectangle', icon: <Square className="w-4 h-4" /> },
    { id: 'ellipse', title: 'Add Circle / Ellipse', icon: <Circle className="w-4 h-4" /> },
    { id: 'arrow', title: 'Add Arrow', icon: <ArrowRight className="w-4 h-4" /> },
  ];

  const handleToolClick = (t: typeof tool) => {
    const { width: cw, height: ch } = project.settings;
    const start = Math.round(currentTime * 10) / 10;
    if (t === 'text') {
      addLayer(makeTextLayer('Double-click to edit', cw, ch, start));
      setTool('select');
    } else if (t === 'rect') {
      addLayer(makeShapeLayer('rect', cw, ch, start));
      setTool('select');
    } else if (t === 'ellipse') {
      addLayer(makeShapeLayer('ellipse', cw, ch, start));
      setTool('select');
    } else if (t === 'arrow') {
      addLayer(makeShapeLayer('arrow', cw, ch, start));
      setTool('select');
    } else {
      setTool(t);
    }
  };

  const handleFitZoom = () => {
    window.dispatchEvent(new CustomEvent('videoreels:fit-canvas'));
  };

  return (
    <div className="relative flex flex-col items-center gap-1.5 w-13 bg-[#111124] border-r border-white/10 py-3 flex-shrink-0 select-none">
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={audioRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleAudioChange}
      />

      {/* Upload Image / Video */}
      <button
        className="flex flex-col items-center justify-center w-9 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors cursor-pointer"
        onClick={() => fileRef.current?.click()}
        title="Upload Image or Video Clip"
      >
        <ImagePlus className="w-4 h-4" />
      </button>

      {/* Upload Music / Audio */}
      <button
        className="flex flex-col items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors cursor-pointer"
        onClick={() => audioRef.current?.click()}
        title="Add Music Track (Auto Beat Detection)"
      >
        <Music className="w-4 h-4" />
      </button>

      {/* Valorant Studio Pack */}
      <button
        className={`flex flex-col items-center justify-center w-9 h-9 rounded-lg transition-colors cursor-pointer ${
          showValoPack
            ? 'bg-[#FF4655] text-white shadow-md shadow-[#FF4655]/30'
            : 'bg-[#FF4655]/15 text-[#FF4655] hover:bg-[#FF4655]/30 border border-[#FF4655]/30'
        }`}
        onClick={() => {
          setShowValoPack(!showValoPack);
          setShowFxPack(false);
        }}
        title="Valorant Overlays & HUD Pack"
      >
        <Crosshair className="w-4 h-4" />
      </button>

      {/* Particle FX Overlays */}
      <button
        className={`flex flex-col items-center justify-center w-9 h-9 rounded-lg transition-colors cursor-pointer ${
          showFxPack
            ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30'
            : 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30'
        }`}
        onClick={() => {
          setShowFxPack(!showFxPack);
          setShowValoPack(false);
        }}
        title="Particle FX Overlays (Sparks, Speed Lines, Confetti)"
      >
        <Sparkles className="w-4 h-4" />
      </button>

      <div className="w-7 h-px bg-white/10 my-0.5" />

      {tools.map((t) => (
        <button
          key={t.id}
          className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors cursor-pointer ${
            tool === t.id
              ? 'bg-indigo-600/80 text-white ring-1 ring-indigo-400/50'
              : 'text-white/55 hover:text-white hover:bg-white/10'
          }`}
          onClick={() => handleToolClick(t.id)}
          title={t.title}
        >
          {t.icon}
        </button>
      ))}

      <div className="w-7 h-px bg-white/10 my-0.5" />

      <button
        className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors cursor-pointer ${
          snapToGrid
            ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/40'
            : 'text-white/40 hover:text-white hover:bg-white/10'
        }`}
        onClick={toggleSnap}
        title="Snap to Center"
      >
        <Magnet className="w-4 h-4" />
      </button>

      <div className="flex-1" />

      <button
        className="flex items-center justify-center w-9 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
        onClick={() => setCanvasZoom(Math.min(3, Math.round((canvasZoom + 0.1) * 10) / 10))}
        title="Zoom In"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      <button
        className="flex items-center justify-center w-9 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
        onClick={handleFitZoom}
        title="Fit Canvas to View"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
      <button
        className="flex items-center justify-center w-9 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
        onClick={() => setCanvasZoom(Math.max(0.15, Math.round((canvasZoom - 0.1) * 10) / 10))}
        title="Zoom Out"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      <span className="text-[10px] text-white/40 font-mono">{Math.round(canvasZoom * 100)}%</span>

      {/* Floating Valorant Assets Drawer */}
      {showValoPack && (
        <div className="absolute left-14 top-2 z-40 w-60 bg-[#0F1923] border border-[#FF4655]/50 rounded-xl shadow-2xl p-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-1.5">
              <Crosshair className="w-4 h-4 text-[#FF4655]" />
              <span className="text-xs font-bold tracking-wider text-white uppercase">Valorant Studio</span>
            </div>
            <button onClick={() => setShowValoPack(false)} className="text-white/40 hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-white/50">Click to add overlay at current playhead:</p>
          <div className="grid grid-cols-2 gap-1.5">
            {VALORANT_ASSETS.map((asset) => (
              <button
                key={asset.id}
                onClick={() => {
                  const { width: cw, height: ch } = project.settings;
                  addLayer(asset.createLayer(cw, ch, Math.round(currentTime * 10) / 10));
                }}
                className="flex items-center gap-1.5 px-2 py-2 rounded-lg bg-white/5 hover:bg-[#FF4655]/20 border border-white/10 hover:border-[#FF4655]/60 text-left transition-colors cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: asset.color }} />
                <span className="text-[11px] font-medium text-white/90 truncate">{asset.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Floating Particle FX Drawer */}
      {showFxPack && (
        <div className="absolute left-14 top-20 z-40 w-56 bg-[#13132b] border border-amber-500/40 rounded-xl shadow-2xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold tracking-wider text-white uppercase">Particle FX</span>
            </div>
            <button onClick={() => setShowFxPack(false)} className="text-white/40 hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {(
              [
                ['sparks', 'Ember Sparks', '#FF4655'],
                ['speedlines', 'Anime Speed Lines', '#FFFFFF'],
                ['confetti', 'Party Confetti', '#F5C451'],
                ['snow', 'Atmospheric Dust', '#94A3B8'],
                ['match-cut', 'Paper Text Match Cut', '#FDE047'],
              ] as [ParticleFxType, string, string][]
            ).map(([fx, label, col]) => (
              <button
                key={fx}
                onClick={() => {
                  const { width: cw, height: ch } = project.settings;
                  addLayer(makeFxLayer(fx, cw, ch, Math.round(currentTime * 10) / 10));
                }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-400/50 text-left transition-colors cursor-pointer"
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: col }} />
                <span className="text-xs font-medium text-white/90">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
