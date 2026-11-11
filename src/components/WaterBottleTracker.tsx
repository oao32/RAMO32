import React from 'react';
import { Language, Theme } from '../types';
import { Droplets, RotateCcw, Plus } from 'lucide-react';

interface WaterBottleTrackerProps {
  currentLiters: number;
  goalLiters: number;
  onChange: (newLiters: number) => void;
  language: Language;
  theme?: Theme;
}

export const WaterBottleTracker: React.FC<WaterBottleTrackerProps> = ({
  currentLiters,
  goalLiters,
  onChange,
  language,
  theme,
}) => {
  const percentage = Math.min(Math.round((currentLiters / goalLiters) * 100), 100);

  const addAmount = (amountInLiters: number) => {
    const updated = Math.min(+(currentLiters + amountInLiters).toFixed(2), 6.0);
    onChange(updated);
  };

  const resetAmount = () => {
    onChange(0);
  };

  return (
    <div className="bg-[#FAFBFD] dark:bg-[#0b132b]/90 backdrop-blur-md border border-slate-300/90 dark:border-orange-500/25 rounded-2xl p-5 flex flex-col items-center justify-between shadow-[0_4px_25px_rgba(11,19,43,0.05)] dark:shadow-xl transition-all duration-300 hover:border-orange-500/40">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-3 border-b border-slate-200/90 dark:border-white/5 pb-2.5">
        <h3 className="text-cyan-700 dark:text-cyan-400 font-extrabold text-sm tracking-wide flex items-center gap-2">
          {/* Vibrant Navy + Orange + White Icon Badge */}
          <span className="p-1.5 rounded-xl bg-gradient-to-br from-[#0B132B] to-[#1C2541] text-cyan-400 ring-2 ring-cyan-500/30 shadow-md flex items-center justify-center">
            <Droplets className="w-4 h-4 text-cyan-400 stroke-[2.5]" />
          </span>
          <span>{language === 'ar' ? 'قارورة الماء اليومية' : 'Daily Hydration Bottle'}</span>
        </h3>
        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#0B132B] to-[#1C2541] text-cyan-300 border border-cyan-500/40 font-bold shadow-xs">
          {percentage}% {language === 'ar' ? 'مكتمل' : 'Done'}
        </span>
      </div>

      {/* Visual Water Bottle */}
      <div className="relative w-28 h-44 my-2 flex items-center justify-center">
        {/* Bottle Cap */}
        <div className="absolute -top-3 w-8 h-3.5 bg-gradient-to-r from-slate-600 via-slate-400 to-slate-600 rounded-t-md border border-cyan-400/60 shadow-sm z-10" />

        {/* Bottle Neck */}
        <div className="absolute -top-1 w-10 h-3 bg-slate-700/70 border-x border-cyan-400/50 z-10" />

        {/* Main Bottle Body */}
        <div className="relative w-24 h-40 rounded-2xl border-2 border-cyan-500/70 bg-[#0B132B]/90 overflow-hidden shadow-[0_0_25px_rgba(6,182,212,0.3)] flex flex-col justify-end">
          {/* Water Fill Layer */}
          <div
            className="w-full bg-gradient-to-t from-cyan-600 via-cyan-400 to-sky-300 transition-all duration-500 relative flex items-center justify-center shadow-inner"
            style={{ height: `${percentage}%` }}
          >
            {/* Water Wave Effect Line */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-white/50 blur-[1px] animate-pulse" />

            {/* Bubble particle effects */}
            <div className="absolute bottom-2 left-3 w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" />
            <div className="absolute bottom-5 right-4 w-2 h-2 rounded-full bg-white/60 animate-ping" />
          </div>

          {/* Measurement ticks on bottle */}
          <div className="absolute inset-y-0 right-1 flex flex-col justify-between py-3 pointer-events-none opacity-50">
            <div className="w-2.5 h-[1.5px] bg-white" />
            <div className="w-3.5 h-[1.5px] bg-white" />
            <div className="w-2.5 h-[1.5px] bg-white" />
            <div className="w-3.5 h-[1.5px] bg-white" />
            <div className="w-2.5 h-[1.5px] bg-white" />
          </div>

          {/* Centered Liters Display on Bottle */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            <span className="text-base font-black text-white tracking-wider">
              {currentLiters} / {goalLiters} L
            </span>
            <span className="text-[10px] text-cyan-200 font-bold">
              {language === 'ar' ? 'لتر مستهلك' : 'Consumed'}
            </span>
          </div>
        </div>
      </div>

      {/* High-Contrast Clear Numbers Banner */}
      <div className="w-full my-1.5 px-3 py-1.5 bg-[#EDF2F7] dark:bg-[#070a14]/80 border border-slate-300/80 dark:border-white/5 rounded-xl flex items-center justify-between">
        <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">
          {language === 'ar' ? 'المستهلك الفعلي:' : 'Current Intake:'}
        </span>
        <div className="flex items-baseline gap-1 font-black">
          <span className="text-xl text-[#0B132B] dark:text-white">{currentLiters}</span>
          <span className="text-xs text-slate-500 font-bold">/</span>
          <span className="text-sm text-orange-600 dark:text-orange-400">{goalLiters} L</span>
        </div>
      </div>

      {/* Quick Add Buttons Grid - Vibrant Navy + Orange + White */}
      <div className="w-full grid grid-cols-2 gap-2 mt-2">
        <button
          onClick={() => addAmount(0.15)}
          className="bg-gradient-to-r from-[#0B132B] to-[#1C2541] hover:from-orange-600 hover:to-orange-500 border border-cyan-500/40 hover:border-orange-400 text-white text-xs py-2 px-2.5 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer group"
        >
          <Plus className="w-3.5 h-3.5 text-orange-400 group-hover:text-white" />
          <span>{language === 'ar' ? '150 مل' : '150 ml'}</span>
        </button>
        <button
          onClick={() => addAmount(0.2)}
          className="bg-gradient-to-r from-[#0B132B] to-[#1C2541] hover:from-orange-600 hover:to-orange-500 border border-cyan-500/40 hover:border-orange-400 text-white text-xs py-2 px-2.5 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer group"
        >
          <Plus className="w-3.5 h-3.5 text-orange-400 group-hover:text-white" />
          <span>{language === 'ar' ? '200 مل' : '200 ml'}</span>
        </button>
        <button
          onClick={() => addAmount(0.6)}
          className="bg-gradient-to-r from-[#0B132B] to-[#1C2541] hover:from-orange-600 hover:to-orange-500 border border-cyan-500/40 hover:border-orange-400 text-white text-xs py-2 px-2.5 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer group"
        >
          <Plus className="w-3.5 h-3.5 text-orange-400 group-hover:text-white" />
          <span>{language === 'ar' ? '600 مل' : '600 ml'}</span>
        </button>
        <button
          onClick={() => addAmount(1.0)}
          className="bg-gradient-to-r from-[#0B132B] to-[#1C2541] hover:from-orange-600 hover:to-orange-500 border border-cyan-500/40 hover:border-orange-400 text-white text-xs py-2 px-2.5 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer group"
        >
          <Plus className="w-3.5 h-3.5 text-orange-400 group-hover:text-white" />
          <span>{language === 'ar' ? '1 لتر' : '1.0 L'}</span>
        </button>
      </div>

      {/* Reset Button */}
      <button
        onClick={resetAmount}
        className="w-full mt-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-400 text-xs py-1.5 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>{language === 'ar' ? 'إعادة ضبط القارورة' : 'Reset Hydration'}</span>
      </button>
    </div>
  );
};
