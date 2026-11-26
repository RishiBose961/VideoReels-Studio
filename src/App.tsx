import React, { useEffect, useState } from 'react';
import { TopBar } from './components/TopBar';
import { Toolbar } from './components/Toolbar';
import { CanvasEditor } from './components/CanvasEditor';
import { PropertiesPanel } from './components/PropertiesPanel';
import { Timeline } from './components/Timeline';
import { SplashScreen } from './components/SplashScreen';
import { useEditorStore } from './store/editorStore';

class EditorErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-[#090914] text-white p-6 gap-3">
          <h2 className="text-lg font-bold text-red-400">Something went wrong</h2>
          <p className="text-xs text-white/60 font-mono max-w-lg text-center">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold cursor-pointer"
          >
            Reload Editor
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [showSplash, setShowSplash] = useState(() => {
    try {
      return localStorage.getItem('videoreels_splash') !== 'off';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditingText =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (isEditingText) return;

      const store = useEditorStore.getState();

      if (e.code === 'Space') {
        e.preventDefault();
        if (store.currentTime >= store.project.totalDuration) {
          store.setCurrentTime(0);
        }
        store.setIsPlaying(!store.isPlaying);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        store.undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        store.redo();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && store.selectedLayerId) {
        e.preventDefault();
        store.removeLayer(store.selectedLayerId);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        store.setIsPlaying(false);
        store.setCurrentTime(Math.max(0, store.currentTime - 1 / store.project.settings.fps));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        store.setIsPlaying(false);
        store.setCurrentTime(Math.min(store.project.totalDuration, store.currentTime + 1 / store.project.settings.fps));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <EditorErrorBoundary>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#090914] text-white">
        {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
        <TopBar />

        <div className="flex flex-1 overflow-hidden">
          <Toolbar />
          <CanvasEditor />
          <PropertiesPanel />
        </div>

        <Timeline />
      </div>
    </EditorErrorBoundary>
  );
}
