import React from 'react';
import { Language } from '../types';
import wideHeroBg from '../assets/images/oao_wide_hero_gym_1791201840663.jpg';
import { Sparkles, ArrowDown, Dumbbell, Shield } from 'lucide-react';

interface CinematicHeroProps {
  onEnterPortal: () => void;
  onOpenPrograms: () => void;
  onOpenCoaches?: () => void;
  onOpenFacilities: () => void;
  onOpenAuth?: () => void;
  language: Language;
}

export const CinematicHero: React.FC<CinematicHeroProps> = ({
  onEnterPortal,
  onOpenPrograms,
  onOpenFacilities,
  language,
}) => {

  return (
    <section className="relative w-full h-screen min-h-[680px] flex flex-col justify-between overflow-hidden bg-[#030712] select-none">
      {/* 1. 16:9 FULL SCREEN WIDE HERO BACKGROUND */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src={wideHeroBg}
          alt="OWN AURA OUTCOME 3D Wide Gym Hero"
          className="w-full h-full object-cover object-center transform scale-100 transition-transform duration-1000"
        />

        {/* 2. DARK GLASSMORPHISM OVERLAY FOR EXCELLENT CONTRAST AND LUXURY */}
        <div className="absolute inset-0 bg-[#070b19]/45 backdrop-blur-[0.5px]" />
        
        {/* Cinematic gradient lighting vignettes */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#030712]/80 via-transparent to-[#030712]/90 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#030712]/50 via-transparent to-[#030712]/50 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(3,7,18,0.7)_100%)] pointer-events-none" />
      </div>

      {/* Cinematic Hero Top Spacing */}
      <div className="pt-16 sm:pt-20" />

      {/* 4. CENTER OPEN FOCUS: Leaves the 3D Arm Sculpt and Glowing Flames Unblocked */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center pointer-events-none" />

      {/* 5. BOTTOM HERO SECTION CONTENT: INTERACTIVE BUTTONS */}
      <div className="relative z-20 pb-8 sm:pb-12 px-4 sm:px-8 max-w-6xl mx-auto w-full text-center">
        {/* Interactive Glassmorphism Buttons in Navy & Neon Orange */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-4xl mx-auto">
          {/* 1. PROGRAMS */}
          <button
            onClick={onOpenPrograms}
            className="px-6 sm:px-8 py-3 rounded-2xl backdrop-blur-md bg-[#0B132B]/60 hover:bg-[#1C2541]/80 border border-white/20 hover:border-[#FF5722] hover:shadow-[0_0_20px_rgba(255,87,34,0.5)] text-white font-bold text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer group"
          >
            <Dumbbell className="w-4 h-4 text-[#FF7043] group-hover:scale-110 transition-transform" />
            <span>{language === 'ar' ? 'التمارين (PROGRAMS)' : 'PROGRAMS'}</span>
          </button>

          {/* 2. PLANS / FACILITIES */}
          <button
            onClick={onOpenFacilities}
            className="px-6 sm:px-8 py-3 rounded-2xl backdrop-blur-md bg-[#0B132B]/60 hover:bg-[#1C2541]/80 border border-white/20 hover:border-[#FF5722] hover:shadow-[0_0_20px_rgba(255,87,34,0.5)] text-white font-bold text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer group"
          >
            <Shield className="w-4 h-4 text-[#FF7043] group-hover:scale-110 transition-transform" />
            <span>{language === 'ar' ? 'الاشتراكات (PLANS)' : 'PLANS'}</span>
          </button>

          {/* 3. JOIN NOW / JOIN THE REVOLUTION */}
          <button
            onClick={onEnterPortal}
            className="px-7 sm:px-10 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF5722] via-[#FF7043] to-amber-500 hover:from-[#FF7043] hover:to-amber-400 text-white font-black text-xs sm:text-sm tracking-widest uppercase transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_35px_rgba(255,87,34,0.95)] border-2 border-orange-300/80 flex items-center gap-2.5 cursor-pointer glow-orange"
          >
            <Sparkles className="w-4 h-4 text-white animate-spin" />
            <span>{language === 'ar' ? 'انضم الآن 🔥' : 'JOIN NOW'}</span>
          </button>
        </div>

        {/* Scroll Indicator */}
        <div className="mt-5">
          <button
            onClick={onEnterPortal}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-300 hover:text-orange-400 transition-colors animate-bounce cursor-pointer drop-shadow-md"
          >
            <span>{language === 'ar' ? 'انزل لأسفل لتصفح بوابة المشترك' : 'Scroll down for Athlete Portal'}</span>
            <ArrowDown className="w-3.5 h-3.5 text-orange-500" />
          </button>
        </div>
      </div>
    </section>
  );
};
