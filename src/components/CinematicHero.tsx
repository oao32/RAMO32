import React from 'react';
import { Language, Theme } from '../types';
import { useOaoTheme } from '../lib/themeUtils';
import wideHeroBg from '../assets/images/oao_wide_hero_gym_navy_1795421650206.jpg';
import { Sparkles, ArrowDown, Dumbbell, Shield } from 'lucide-react';

interface CinematicHeroProps {
  onEnterPortal: () => void;
  onOpenPrograms: () => void;
  onOpenCoaches?: () => void;
  onOpenFacilities: () => void;
  onOpenAuth?: () => void;
  language: Language;
  theme?: Theme;
}

export const CinematicHero: React.FC<CinematicHeroProps> = ({
  onEnterPortal,
  onOpenPrograms,
  onOpenFacilities,
  language,
  theme: propTheme,
}) => {
  const { theme: hookTheme } = useOaoTheme();
  const isLight = (propTheme || hookTheme) === 'light';

  return (
    <section
      className={`relative w-full h-screen min-h-[680px] flex flex-col justify-between overflow-hidden select-none transition-colors duration-300 ${
        isLight ? 'bg-[#EEF2F6]' : 'bg-[#030712]'
      }`}
    >
      {/* 1. 16:9 FULL SCREEN WIDE HERO BACKGROUND */}
      <div className="absolute inset-0 z-0 overflow-hidden" style={{ containerType: 'size' }}>
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 'max(100cqw, calc(100cqh * 16 / 9))',
            height: 'max(100cqh, calc(100cqw * 9 / 16))',
          }}
        >
          <img
            src={wideHeroBg}
            alt="OWN AURA OUTCOME 3D Wide Gym Hero"
            className="w-full h-full object-cover object-center transform scale-100 transition-transform duration-1000"
          />

          {/* Synchronized Luminous Orange-Gold Gleam (وميض) locked directly over AURA */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[48%] top-[46.5%] w-[21.5%] h-[12%] rounded-full mix-blend-screen animate-aura-glow blur-md"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(255, 165, 65, 0.85) 0%, rgba(255, 94, 20, 0.52) 45%, rgba(249, 115, 22, 0) 76%)',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[49.5%] top-[48.5%] w-[18.5%] h-[8%] rounded-full mix-blend-screen animate-aura-glow"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(255, 210, 120, 0.55) 0%, rgba(255, 115, 30, 0.28) 55%, rgba(249, 115, 22, 0) 80%)',
            }}
          />
        </div>

        {/* 2. ADAPTIVE SCRIM OVERLAY FOR CONTRAST & SEAMLESS THEME TRANSITION */}
        <div
          className={`absolute inset-0 backdrop-blur-[0.5px] transition-colors duration-300 ${
            isLight ? 'bg-slate-900/15' : 'bg-[#070b19]/45'
          }`}
        />

        {/* Cinematic gradient lighting vignettes */}
        <div
          className={`absolute inset-0 pointer-events-none transition-colors duration-300 ${
            isLight
              ? 'bg-gradient-to-b from-[#EEF2F6]/55 via-transparent to-[#FAFBFD]/95'
              : 'bg-gradient-to-b from-[#030712]/80 via-transparent to-[#030712]/90'
          }`}
        />
        <div
          className={`absolute inset-0 pointer-events-none transition-colors duration-300 ${
            isLight
              ? 'bg-gradient-to-r from-slate-900/20 via-transparent to-slate-900/20'
              : 'bg-gradient-to-r from-[#030712]/50 via-transparent to-[#030712]/50'
          }`}
        />
        <div
          className={`absolute inset-0 pointer-events-none ${
            isLight
              ? 'bg-[radial-gradient(circle_at_center,transparent_40%,rgba(11,19,43,0.28)_100%)]'
              : 'bg-[radial-gradient(circle_at_center,transparent_30%,rgba(3,7,18,0.7)_100%)]'
          }`}
        />
      </div>

      {/* Cinematic Hero Top Spacing */}
      <div className="pt-16 sm:pt-20" />

      {/* 4. CENTER OPEN FOCUS: Leaves the 3D Arm Sculpt and Glowing Flames Unblocked */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center pointer-events-none" />

      {/* 5. BOTTOM HERO SECTION CONTENT: INTERACTIVE BUTTONS */}
      <div className="relative z-20 pb-8 sm:pb-12 px-4 sm:px-8 max-w-6xl mx-auto w-full text-center">
        {/* Interactive Glassmorphism Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-4xl mx-auto">
          {/* 1. PROGRAMS */}
          <button
            onClick={onOpenPrograms}
            className={`px-6 sm:px-8 py-3 rounded-2xl backdrop-blur-md border font-bold text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer group ${
              isLight
                ? 'bg-white/95 hover:bg-white border-slate-300 hover:border-[#EA580C] text-[#0B132B] shadow-lg'
                : 'bg-[#0B132B]/60 hover:bg-[#1C2541]/80 border-white/20 hover:border-[#FF5722] hover:shadow-[0_0_20px_rgba(255,87,34,0.5)] text-white'
            }`}
          >
            <Dumbbell className="w-4 h-4 text-[#EA580C] dark:text-[#FF7043] group-hover:scale-110 transition-transform" />
            <span>{language === 'ar' ? 'التمارين (PROGRAMS)' : 'PROGRAMS'}</span>
          </button>

          {/* 2. PLANS / FACILITIES */}
          <button
            onClick={onOpenFacilities}
            className={`px-6 sm:px-8 py-3 rounded-2xl backdrop-blur-md border font-bold text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer group ${
              isLight
                ? 'bg-white/95 hover:bg-white border-slate-300 hover:border-[#EA580C] text-[#0B132B] shadow-lg'
                : 'bg-[#0B132B]/60 hover:bg-[#1C2541]/80 border-white/20 hover:border-[#FF5722] hover:shadow-[0_0_20px_rgba(255,87,34,0.5)] text-white'
            }`}
          >
            <Shield className="w-4 h-4 text-[#EA580C] dark:text-[#FF7043] group-hover:scale-110 transition-transform" />
            <span>{language === 'ar' ? 'الاشتراكات (PLANS)' : 'PLANS'}</span>
          </button>

          {/* 3. JOIN NOW / JOIN THE REVOLUTION */}
          <button
            onClick={onEnterPortal}
            className="px-7 sm:px-10 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF5722] via-[#FF7043] to-amber-500 hover:from-[#FF7043] hover:to-amber-400 text-white font-black text-xs sm:text-sm tracking-widest uppercase transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_35px_rgba(255,87,34,0.65)] dark:shadow-[0_0_35px_rgba(255,87,34,0.95)] border-2 border-orange-300/80 flex items-center gap-2.5 cursor-pointer glow-orange"
          >
            <Sparkles className="w-4 h-4 text-white animate-spin" />
            <span>{language === 'ar' ? 'انضم الآن 🔥' : 'JOIN NOW'}</span>
          </button>
        </div>

        {/* Scroll Indicator */}
        <div className="mt-5">
          <button
            onClick={onEnterPortal}
            className={`inline-flex items-center gap-1.5 text-[11px] font-bold transition-colors animate-bounce cursor-pointer ${
              isLight
                ? 'px-4 py-1.5 rounded-xl bg-white/90 hover:bg-white text-[#0B132B] hover:text-orange-600 border border-slate-300 shadow-sm'
                : 'text-slate-300 hover:text-orange-400 drop-shadow-md'
            }`}
          >
            <span>{language === 'ar' ? 'انزل لأسفل لتصفح بوابة المشترك' : 'Scroll down for Athlete Portal'}</span>
            <ArrowDown className="w-3.5 h-3.5 text-orange-600 dark:text-orange-500" />
          </button>
        </div>
      </div>
    </section>
  );
};
