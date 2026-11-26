import { useEffect, useRef, useState } from 'react';
import { Film, Sparkles } from 'lucide-react';

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [fading, setFading] = useState(false);
  const doneCalled = useRef(false);

  const finish = () => {
    if (doneCalled.current) return;
    doneCalled.current = true;
    setFading(true);
    setTimeout(onDone, 260);
  };

  useEffect(() => {
    const start = performance.now();
    const duration = 1400;
    const timer = setInterval(() => {
      const p = Math.min(1, (performance.now() - start) / duration);
      setProgress(Math.round(p * 100));
      if (p >= 1) {
        clearInterval(timer);
        finish();
      }
    }, 30);

    const fallback = setTimeout(finish, 2000);
    return () => {
      clearInterval(timer);
      clearTimeout(fallback);
    };
  }, []);

  return (
    <div
      onClick={finish}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#090914] select-none cursor-pointer transition-opacity duration-300 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="absolute w-96 h-96 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />
      <div className="absolute w-72 h-72 rounded-full bg-[#FF4655]/10 blur-3xl translate-x-24 translate-y-12 pointer-events-none" />

      <div className="relative flex flex-col items-center gap-5">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-600 to-[#FF4655] flex items-center justify-center shadow-2xl shadow-indigo-500/30 rotate-3">
            <Film className="w-10 h-10 text-white -rotate-3" />
          </div>
          <div className="absolute -top-2 -right-2 w-7 h-7 rounded-lg bg-[#fde047] flex items-center justify-center shadow-lg -rotate-12">
            <Sparkles className="w-4 h-4 text-[#090914]" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Video<span className="text-indigo-400">Reels</span>
          </h1>
          <p className="text-xs text-white/50 tracking-widest uppercase font-medium">
            2D Motion · Paper Animator · Valorant Studio
          </p>
        </div>

        <div className="w-56 flex flex-col gap-1.5 mt-2">
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-violet-400 to-[#FF4655] transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/35 font-mono">
            <span>Loading Studio...</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>

      <span className="absolute bottom-6 text-[11px] text-white/25">Click anywhere to skip</span>
    </div>
  );
}
