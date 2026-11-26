import { useState, useRef, useEffect } from 'react';
import { Undo2, Redo2, Download, FolderOpen, Save, Film, X, Power } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { exportProject, isMp4Supported, type ExportFormat } from '../lib/exportVideo';
import { PAPER_BACKDROPS, isPaperBackdrop } from '../lib/paperRenderer';

const PRESETS = [
  { label: '16:9 HD (1280×720)', w: 1280, h: 720 },
  { label: '9:16 Reels (1080×1920)', w: 1080, h: 1920 },
  { label: '1:1 Square (1080×1080)', w: 1080, h: 1080 },
  { label: '16:9 FHD (1920×1080)', w: 1920, h: 1080 },
];

export function TopBar() {
  const {
    project,
    currentTime,
    past,
    future,
    undo,
    redo,
    setProject,
    setProjectName,
    setTotalDuration,
    setBackgroundColor,
    updateSettings,
    canvasZoom,
  } = useEditorStore();

  const [showExportModal, setShowExportModal] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('mp4');
  const [exportFps, setExportFps] = useState(30);
  const [exportScale, setExportScale] = useState(1);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [splashOn, setSplashOn] = useState(() => {
    try {
      return localStorage.getItem('videoreels_splash') !== 'off';
    } catch {
      return true;
    }
  });
  const [bgStartup, setBgStartup] = useState(false);
  const [showStartupMenu, setShowStartupMenu] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ipc = (window as unknown as { ipcRenderer?: { invoke: (ch: string, ...args: unknown[]) => Promise<unknown> } })
      .ipcRenderer;
    if (ipc) {
      ipc.invoke('app:getBackgroundStartup').then((val) => setBgStartup(!!val)).catch(() => {});
    }
  }, []);

  const toggleSplash = () => {
    const next = !splashOn;
    setSplashOn(next);
    try {
      localStorage.setItem('videoreels_splash', next ? 'on' : 'off');
    } catch {
      // ignore
    }
  };

  const toggleBgStartup = async () => {
    const next = !bgStartup;
    setBgStartup(next);
    const ipc = (window as unknown as { ipcRenderer?: { invoke: (ch: string, ...args: unknown[]) => Promise<unknown> } })
      .ipcRenderer;
    if (ipc) {
      try {
        const res = await ipc.invoke('app:setBackgroundStartup', next);
        setBgStartup(!!res);
      } catch {
        // ignore
      }
    }
  };

  const mp4Ok = isMp4Supported();
  const currentPresetValue = `${project.settings.width}x${project.settings.height}`;

  const handleSave = async () => {
    const json = JSON.stringify(project, null, 2);
    const ipc = (window as unknown as { ipcRenderer?: { invoke: (ch: string, ...args: unknown[]) => Promise<unknown> } })
      .ipcRenderer;
    if (ipc) {
      await ipc.invoke('dialog:saveProject', json);
      return;
    }
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name || 'project'}.vreel`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoad = async () => {
    const ipc = (window as unknown as { ipcRenderer?: { invoke: (ch: string, ...args: unknown[]) => Promise<unknown> } })
      .ipcRenderer;
    if (ipc) {
      const data = await ipc.invoke('dialog:loadProject');
      if (typeof data === 'string') {
        try {
          setProject(JSON.parse(data));
        } catch {
          alert('Invalid project file.');
        }
      }
      return;
    }
    fileInputRef.current?.click();
  };

  const startExport = async () => {
    setExportError(null);
    setExportProgress(0);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const { blob, ext } = await exportProject(
        project,
        { format, fps: exportFps, scale: exportScale, currentTime },
        setExportProgress,
        ctrl.signal
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name || 'videoreel'}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      setExportProgress(null);
      setShowExportModal(false);
    } catch (err) {
      if ((err as Error).message !== 'Export cancelled') {
        setExportError((err as Error).message || 'Export failed');
      }
      setExportProgress(null);
    }
  };

  return (
    <>
      <div className="h-11 flex items-center gap-2 px-3 bg-[#0c0c1b] border-b border-white/10 select-none flex-shrink-0">
        <div className="flex items-center gap-2 mr-1">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
            <Film className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight text-white">VideoReels</span>
        </div>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <input
          value={project.name}
          onChange={(e) => setProjectName(e.target.value)}
          className="bg-white/[0.03] border border-transparent hover:border-white/15 focus:border-indigo-500 rounded px-2 py-1 text-xs font-medium text-white/90 focus:outline-none w-40 transition-colors"
        />

        <div className="flex items-center gap-0.5 ml-1">
          <button
            onClick={undo}
            disabled={past.length === 0}
            className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={future.length === 0}
            className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <input
          ref={fileInputRef}
          type="file"
          accept=".vreel,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
              try {
                setProject(JSON.parse(ev.target?.result as string));
              } catch {
                alert('Invalid project file.');
              }
            };
            reader.readAsText(file);
            e.target.value = '';
          }}
        />
        <button
          onClick={handleLoad}
          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors cursor-pointer"
          title="Open Project (.vreel)"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Open</span>
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors cursor-pointer"
          title="Save Project (.vreel)"
        >
          <Save className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Save</span>
        </button>

        <div className="flex-1" />

        <select
          value={currentPresetValue}
          onChange={(e) => {
            const [w, h] = e.target.value.split('x').map(Number);
            if (w && h) updateSettings({ width: w, height: h });
          }}
          className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/80 focus:outline-none focus:border-indigo-500 cursor-pointer"
          title="Canvas Aspect Ratio & Resolution"
        >
          {PRESETS.map((p) => (
            <option key={p.label} value={`${p.w}x${p.h}`}>
              {p.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded px-2 py-0.5">
          <span className="text-[11px] text-white/50">BG</span>
          <input
            type="color"
            value={
              project.settings.backgroundColor === 'transparent' || isPaperBackdrop(project.settings.backgroundColor)
                ? '#111122'
                : project.settings.backgroundColor
            }
            onChange={(e) => setBackgroundColor(e.target.value)}
            className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
            title="Canvas Background Color"
          />
          <select
            value={isPaperBackdrop(project.settings.backgroundColor) || project.settings.backgroundColor === '#00FF00' ? project.settings.backgroundColor : ''}
            onChange={(e) => {
              if (e.target.value) setBackgroundColor(e.target.value);
            }}
            className="bg-transparent text-[10px] text-white/75 focus:outline-none cursor-pointer w-20"
            title="Paper Stock & Green Screen Backdrops"
          >
            <option value="">Paper BG...</option>
            {PAPER_BACKDROPS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              setBackgroundColor(project.settings.backgroundColor === 'transparent' ? '#111122' : 'transparent')
            }
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
              project.settings.backgroundColor === 'transparent'
                ? 'bg-indigo-600 text-white'
                : 'bg-white/10 text-white/60 hover:text-white'
            }`}
            title="Toggle Transparent Background (no background color)"
          >
            None
          </button>
        </div>

        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded px-2 py-0.5">
          <span className="text-[11px] text-white/50">Len</span>
          <input
            type="number"
            min={1}
            max={300}
            step={1}
            value={project.totalDuration}
            onChange={(e) => setTotalDuration(Number(e.target.value))}
            className="w-11 bg-transparent text-xs text-white font-mono focus:outline-none text-right"
          />
          <span className="text-[11px] text-white/40">s</span>
        </div>

        <span className="text-[11px] text-white/35 font-mono hidden md:inline">
          {Math.round(canvasZoom * 100)}%
        </span>

        {/* Startup / Splash & Background Startup Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowStartupMenu(!showStartupMenu)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors cursor-pointer ${
              bgStartup || splashOn
                ? 'bg-white/5 border-white/15 text-white/80 hover:bg-white/10'
                : 'bg-transparent border-white/10 text-white/45 hover:text-white'
            }`}
            title="Startup & Splash Screen Settings"
          >
            <Power className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">Startup</span>
          </button>

          {showStartupMenu && (
            <div className="absolute right-0 top-9 z-50 w-56 bg-[#14142b] border border-white/15 rounded-xl shadow-2xl p-3 flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                <span className="text-[11px] font-semibold text-white/75 uppercase tracking-wider">Startup Settings</span>
                <button onClick={() => setShowStartupMenu(false)} className="text-white/40 hover:text-white cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <label className="flex items-center justify-between cursor-pointer text-xs text-white/80">
                <span>Splash Screen</span>
                <button
                  onClick={toggleSplash}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                    splashOn ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white/50'
                  }`}
                >
                  {splashOn ? 'ON' : 'OFF'}
                </button>
              </label>
              <label className="flex items-center justify-between cursor-pointer text-xs text-white/80">
                <span>Background Startup</span>
                <button
                  onClick={toggleBgStartup}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                    bgStartup ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white/50'
                  }`}
                >
                  {bgStartup ? 'ON' : 'OFF'}
                </button>
              </label>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            setExportError(null);
            setShowExportModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
      </div>

      {/* Multi-Format Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-[#14142b] border border-white/15 rounded-xl p-5 w-96 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Export Project</span>
              <button
                onClick={() => {
                  abortRef.current?.abort();
                  setExportProgress(null);
                  setExportError(null);
                  setShowExportModal(false);
                }}
                className="text-white/40 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {exportProgress === null ? (
              <>
                {/* Format selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Format</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        ['mp4', mp4Ok ? 'MP4 Video' : 'MP4 (WebM)'],
                        ['webm', 'WebM Video'],
                        ['gif', 'Animated GIF'],
                        ['png', 'PNG Frame'],
                        ['jpg', 'JPG Frame'],
                      ] as [ExportFormat, string][]
                    ).map(([fmt, label]) => (
                      <button
                        key={fmt}
                        onClick={() => setFormat(fmt)}
                        className={`py-2 px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          format === fmt
                            ? 'bg-indigo-600 border-indigo-400 text-white'
                            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {project.settings.backgroundColor === 'transparent' && (format === 'mp4' || format === 'jpg') && (
                    <p className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1 mt-1">
                      MP4 &amp; JPG do not support transparency (transparent areas become black). Use PNG, GIF, or WebM for transparent background.
                    </p>
                  )}
                </div>

                {/* Quality / Scale */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Resolution</label>
                    <select
                      value={exportScale}
                      onChange={(e) => setExportScale(Number(e.target.value))}
                      className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value={1}>100% ({project.settings.width}×{project.settings.height})</option>
                      <option value={0.75}>75% ({Math.round(project.settings.width * 0.75)}×{Math.round(project.settings.height * 0.75)})</option>
                      <option value={0.5}>50% ({Math.round(project.settings.width * 0.5)}×{Math.round(project.settings.height * 0.5)})</option>
                    </select>
                  </div>

                  {format !== 'png' && format !== 'jpg' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">FPS</label>
                      <select
                        value={exportFps}
                        onChange={(e) => setExportFps(Number(e.target.value))}
                        className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none"
                      >
                        {format === 'gif' ? (
                          <>
                            <option value={10}>10 FPS</option>
                            <option value={15}>15 FPS</option>
                            <option value={20}>20 FPS</option>
                          </>
                        ) : (
                          <>
                            <option value={24}>24 FPS</option>
                            <option value={30}>30 FPS</option>
                            <option value={60}>60 FPS</option>
                          </>
                        )}
                      </select>
                    </div>
                  )}
                </div>

                {exportError && <p className="text-xs text-red-400">{exportError}</p>}

                <button
                  onClick={startExport}
                  className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Start Export (.{format})
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-3 py-2">
                <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-100"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-white/60 font-mono">
                  <span>Exporting {format.toUpperCase()}...</span>
                  <span>{exportProgress}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
