import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Plus, X, Bell, Minimize2, Maximize2 } from 'lucide-react';
import { soundEffects } from '../utils/audio';
import { Language } from '../types';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b132b] border border-orange-500/50 rounded-3xl p-6 w-full max-w-sm shadow-[0_0_40px_rgba(249,115,22,0.3)] relative text-center">
        {/* Top bar controls */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setIsMinimized(true)}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-white/5 transition-colors"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <span className="text-orange-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping inline-block" />
            {language === 'ar' ? 'عداد الراحة بين الجولات' : 'Rest Interval Counter'}
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-white/5 transition-colors"
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
              stroke="rgba(255, 255, 255, 0.08)"
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
            <span className="text-4xl font-mono font-black text-white tracking-wider">
              {formattedTime}
            </span>
            <span className="text-[11px] text-orange-400/90 font-medium mt-1">
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
            className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-transform active:scale-95"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsRunning(!isRunning)}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.6)] transition-transform active:scale-95"
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
            className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-orange-400 border border-orange-500/30 font-bold text-xs flex items-center justify-center transition-transform active:scale-95"
            title="+30 Seconds"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>30s</span>
          </button>
        </div>

        {/* Quick presets */}
        <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-white/10">
          {[60, 90, 120].map((preset) => (
            <button
              key={preset}
              onClick={() => {
                setTotalSeconds(preset);
                setSecondsLeft(preset);
                setIsRunning(true);
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                totalSeconds === preset
                  ? 'bg-orange-500/20 text-orange-400 border-orange-500'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
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
