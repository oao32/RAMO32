import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Plus, X, Bell, Minimize2, Maximize2 } from 'lucide-react';
import { soundEffects } from '../utils/audio';
import { Language } from '../types';
import { useOaoTheme } from '../lib/themeUtils';

interface RestTimerProps {
  initialSeconds?: number;
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const RestTimer: React.FC<RestTimerProps> = ({
  initialSeconds = 90,
  isOpen,
  onClose,
  language,
}) => {
  const { theme } = useOaoTheme();
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    setTotalSeconds(initialSeconds);
    setSecondsLeft(initialSeconds);
    setIsRunning(true);
  }, [initialSeconds, isOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            soundEffects.playTimerDone();
            if ('vibrate' in navigator) {
              navigator.vibrate([200, 100, 200]);
            }
            return 0;
          }
          if (prev <= 4) {
            soundEffects.playTick();
          }
          return prev - 1;
        });
      }, 1000);
    } else if (secondsLeft === 0) {
      setIsRunning(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, secondsLeft]);

  if (!isOpen) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const remainingSecs = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;

  const progressPercentage = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 100;
  const strokeDashoffset = 283 - (283 * (100 - progressPercentage)) / 100;

  const addTime = (secs: number) => {
    setTotalSeconds((prev) => prev + secs);
    setSecondsLeft((prev) => prev + secs);
  };

  const resetTimer = () => {
    setSecondsLeft(totalSeconds);
    setIsRunning(true);
  };

  // Minimized floating bubble
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 rtl:right-auto rtl:left-6 z-50 animate-bounce">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-gradient-to-r from-orange-600 to-orange-500 text-white p-3.5 rounded-full shadow-[0_0_20px_rgba(249,115,22,0.8)] border border-white/20 flex items-center gap-2 group"
        >
          <Bell className="w-5 h-5 text-white animate-pulse" />
          <span className="font-mono font-bold text-sm">{formattedTime}</span>
          <Maximize2 className="w-4 h-4 opacity-70 group-hover:opacity-100" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#FAFBFD] dark:bg-[#0b132b] border border-orange-500/50 rounded-3xl p-6 w-full max-w-sm shadow-2xl dark:shadow-[0_0_40px_rgba(249,115,22,0.3)] text-[#0B132B] dark:text-white relative text-center">
        {/* Top bar controls */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setIsMinimized(true)}
            className="text-slate-600 dark:text-slate-400 hover:text-[#0B132B] dark:hover:text-white p-1.5 rounded-lg bg-slate-200/70 dark:bg-white/5 hover:bg-slate-300/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <span className="text-orange-600 dark:text-orange-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
            {language === 'ar' ? 'عداد الراحة بين الجولات' : 'Rest Interval Counter'}
          </span>
          <button
            onClick={onClose}
            className="text-slate-600 dark:text-slate-400 hover:text-[#0B132B] dark:hover:text-white p-1.5 rounded-lg bg-slate-200/70 dark:bg-white/5 hover:bg-slate-300/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Circular Countdown SVG */}
        <div className="relative w-48 h-48 mx-auto my-2 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background ring */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="transparent"
              stroke={theme === 'light' ? 'rgba(11, 19, 43, 0.12)' : 'rgba(255, 255, 255, 0.08)'}
              strokeWidth="6"
            />
            {/* Animated progress ring */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="transparent"
              stroke="#f97316"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="283"
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-linear drop-shadow-[0_0_10px_rgba(249,115,22,0.8)]"
            />
          </svg>

          {/* Centered Timer Number */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-mono font-black text-[#0B132B] dark:text-white tracking-wider">
              {formattedTime}
            </span>
            <span className="text-[11px] text-orange-600 dark:text-orange-400/90 font-semibold mt-1">
              {secondsLeft === 0
                ? language === 'ar'
                  ? 'انتهت الراحة! ابدأ جولتك 🔥'
                  : "Time's up! Crush it 🔥"
                : language === 'ar'
                ? 'تنفس بعمق واستعد'
                : 'Breathe deep & get ready'}
            </span>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={resetTimer}
            className="p-3 rounded-full bg-slate-200/70 dark:bg-white/5 hover:bg-slate-300/70 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-[#0B132B] dark:hover:text-white border border-slate-300 dark:border-white/10 transition-transform active:scale-95 cursor-pointer"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsRunning(!isRunning)}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.6)] transition-transform active:scale-95 cursor-pointer"
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-white" />
                <span className="text-xs">{language === 'ar' ? 'إيقاف مؤقت' : 'Pause'}</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span className="text-xs">{language === 'ar' ? 'استئناف' : 'Resume'}</span>
              </>
            )}
          </button>

          <button
            onClick={() => addTime(30)}
            className="p-3 rounded-full bg-orange-50 dark:bg-white/5 hover:bg-orange-100 dark:hover:bg-white/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 font-bold text-xs flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
            title="+30 Seconds"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>30s</span>
          </button>
        </div>

        {/* Quick presets */}
        <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-white/10">
          {[60, 90, 120].map((preset) => (
            <button
              key={preset}
              onClick={() => {
                setTotalSeconds(preset);
                setSecondsLeft(preset);
                setIsRunning(true);
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                totalSeconds === preset
                  ? 'bg-orange-500/15 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-white/10 hover:text-[#0B132B] dark:hover:text-white'
              }`}
            >
              {preset}s
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
