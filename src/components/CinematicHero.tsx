import React, { useEffect, useRef } from 'react';
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
  const logoStageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stage = logoStageRef.current;
    if (!stage) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const sectionEl = stage.closest('section');
    if (!sectionEl) return;

    const handlePointerMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      const insideLogoZone = Math.abs(nx) <= 0.24 && Math.abs(ny) <= 0.39;

      if (insideLogoZone) {
        stage.style.setProperty('--hl-ry', `${(nx * 10).toFixed(2)}deg`);
        stage.style.setProperty('--hl-rx', `${(ny * -8).toFixed(2)}deg`);
        stage.style.setProperty('--hl-hover', '1');
      } else {
        stage.style.setProperty('--hl-ry', '0deg');
        stage.style.setProperty('--hl-rx', '0deg');
        stage.style.setProperty('--hl-hover', '0');
      }
    };

    const handlePointerLeave = () => {
      stage.style.setProperty('--hl-ry', '0deg');
      stage.style.setProperty('--hl-rx', '0deg');
      stage.style.setProperty('--hl-hover', '0');
    };

    sectionEl.addEventListener('pointermove', handlePointerMove, { passive: true });
    sectionEl.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      sectionEl.removeEventListener('pointermove', handlePointerMove);
      sectionEl.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, []);

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
        </div>

        {/* 2. ADAPTIVE SCRIM OVERLAY FOR CONTRAST & SEAMLESS THEME TRANSITION */}
        <div
          className={`absolute inset-0 backdrop-blur-[0.5px] transition-colors duration-300 ${
            isLight ? 'bg-slate-900/15' : 'bg-[#070b19]/45'
          }`}
        />

        {/* SCOPED LOGO-ONLY STAGE: Sharp Metallic Depth, Neon-Orange/Gold Aura & 60fps Motion */}
        <div
          ref={logoStageRef}
          aria-hidden="true"
          className="oao-hero-logo-stage pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 'max(100cqw, calc(100cqh * 16 / 9))',
            height: 'max(100cqh, calc(100cqw * 9 / 16))',
          }}
        >
          <style>{`
            .oao-hero-logo-stage {
              --hl-rx: 0deg;
              --hl-ry: 0deg;
              --hl-hover: 0;
              perspective: 1200px;
              transform-style: preserve-3d;
            }
            .oao-hero-logo-mask {
              -webkit-mask-image: radial-gradient(ellipse 22% 37.5% at 50.6% 47.2%, #000 62%, rgba(0, 0, 0, 0.85) 76%, transparent 94%);
              mask-image: radial-gradient(ellipse 22% 37.5% at 50.6% 47.2%, #000 62%, rgba(0, 0, 0, 0.85) 76%, transparent 94%);
            }
            .oao-hero-logo-aura-outer {
              position: absolute;
              left: 28%;
              top: 10%;
              width: 45%;
              height: 75%;
              border-radius: 50%;
              background: radial-gradient(
                ellipse at 50% 50%,
                rgba(255, 118, 28, 0.36) 0%,
                rgba(255, 168, 60, 0.18) 38%,
                rgba(234, 88, 12, 0.08) 58%,
                transparent 74%
              );
              filter: blur(26px);
              mix-blend-mode: screen;
              animation: oaoHeroAuraBreathe 5.8s ease-in-out infinite;
              will-change: transform, opacity;
            }
            .oao-hero-logo-tilt {
              position: absolute;
              inset: 0;
              transform-origin: 50.6% 48%;
              transform: perspective(1200px) rotateX(var(--hl-rx)) rotateY(var(--hl-ry)) scale(calc(1.004 + var(--hl-hover) * 0.014));
              transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
              will-change: transform;
            }
            .oao-hero-logo-rig {
              position: absolute;
              inset: 0;
              transform-origin: 50.6% 48%;
              animation: oaoHeroLogoFloat 7.2s ease-in-out infinite;
              will-change: transform;
            }
            .oao-hero-logo-core-img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              object-position: center;
              filter: contrast(1.22) saturate(1.26) brightness(1.08) drop-shadow(0 0 18px rgba(249, 115, 22, 0.35));
            }
            .oao-hero-logo-light .oao-hero-logo-core-img {
              filter: contrast(1.18) saturate(1.22) brightness(1.05) drop-shadow(0 6px 20px rgba(11, 19, 43, 0.4));
            }
            .oao-hero-logo-shimmer {
              position: absolute;
              inset: 0;
              background: linear-gradient(
                114deg,
                transparent 36%,
                rgba(255, 255, 255, 0.14) 46%,
                rgba(255, 206, 115, 0.32) 50%,
                rgba(255, 110, 26, 0.2) 54%,
                transparent 64%
              );
              mix-blend-mode: screen;
              animation: oaoHeroShimmerSweep 6.4s ease-in-out infinite;
              will-change: transform, opacity;
            }
            .oao-hero-aura-word-glow {
              position: absolute;
              left: 48.2%;
              top: 45.2%;
              width: 21%;
              height: 12.2%;
              border-radius: 9999px;
              background: radial-gradient(
                ellipse at center,
                rgba(255, 215, 125, 0.42) 0%,
                rgba(255, 115, 24, 0.34) 48%,
                rgba(249, 115, 22, 0) 76%
              );
              mix-blend-mode: screen;
              filter: blur(8px);
              animation: oaoHeroAuraWordPulse 3.6s ease-in-out infinite;
              will-change: transform, opacity;
            }
            .oao-hero-aura-word-rim {
              position: absolute;
              left: 49.4%;
              top: 46.8%;
              width: 18.6%;
              height: 9%;
              border-radius: 9999px;
              background: radial-gradient(
                ellipse at center,
                rgba(255, 232, 165, 0.32) 0%,
                rgba(255, 132, 36, 0.22) 55%,
                rgba(249, 115, 22, 0) 80%
              );
              mix-blend-mode: color-dodge;
              animation: oaoHeroAuraWordPulse 3.6s ease-in-out infinite;
              will-change: transform, opacity;
            }
            .oao-hero-energy-arc {
              position: absolute;
              left: 46%;
              top: 21%;
              width: 22%;
              height: 22%;
              mix-blend-mode: screen;
              animation: oaoHeroArcPulse 4.8s ease-in-out infinite;
              will-change: transform, opacity;
            }
            .oao-hero-ember {
              position: absolute;
              width: 4px;
              height: 4px;
              border-radius: 9999px;
              background: radial-gradient(circle, #fff3c4 0%, #ff9824 55%, rgba(255, 94, 0, 0) 100%);
              box-shadow: 0 0 10px 2px rgba(255, 138, 36, 0.85);
              mix-blend-mode: screen;
              animation: oaoHeroEmberFloat var(--ed, 4.2s) ease-in-out infinite;
              animation-delay: var(--edelay, 0s);
              will-change: transform, opacity;
            }
            @keyframes oaoHeroAuraBreathe {
              0%, 100% { opacity: 0.48; transform: scale(0.97); }
              50% { opacity: 0.9; transform: scale(1.05); }
            }
            @keyframes oaoHeroLogoFloat {
              0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
              50% { transform: translate3d(0, -2.5px, 6px) scale(1.012); }
            }
            @keyframes oaoHeroShimmerSweep {
              0%, 100% { transform: translate3d(-24%, 0, 0); opacity: 0; }
              32% { opacity: 0.85; }
              65% { transform: translate3d(24%, 0, 0); opacity: 0; }
            }
            @keyframes oaoHeroAuraWordPulse {
              0%, 100% { opacity: 0.55; transform: scale(0.98); }
              50% { opacity: 1; transform: scale(1.04); }
            }
            @keyframes oaoHeroArcPulse {
              0%, 100% { opacity: 0.5; transform: rotate(-4deg) scale(0.98); }
              50% { opacity: 0.95; transform: rotate(2deg) scale(1.03); }
            }
            @keyframes oaoHeroEmberFloat {
              0% { transform: translate3d(0, 6px, 0) scale(0.75); opacity: 0; }
              35% { opacity: 0.95; }
              75% { opacity: 0.75; }
              100% { transform: translate3d(var(--ex, 8px), -22px, 0) scale(1.1); opacity: 0; }
            }
            @media (prefers-reduced-motion: reduce) {
              .oao-hero-logo-aura-outer,
              .oao-hero-logo-tilt,
              .oao-hero-logo-rig,
              .oao-hero-logo-shimmer,
              .oao-hero-aura-word-glow,
              .oao-hero-aura-word-rim,
              .oao-hero-energy-arc,
              .oao-hero-ember {
                animation: none !important;
                transition: none !important;
              }
              .oao-hero-logo-tilt {
                transform: scale(1.004) !important;
              }
              .oao-hero-logo-rig {
                transform: none !important;
              }
              .oao-hero-logo-shimmer {
                opacity: 0 !important;
              }
              .oao-hero-aura-word-glow,
              .oao-hero-aura-word-rim {
                opacity: 0.72 !important;
              }
            }
          `}</style>

          {/* Controlled Outer Neon-Orange & Gold Breathing Aura */}
          <div className="oao-hero-logo-aura-outer" />

          {/* Crisp Masked Logo Core (Muscular Arm + Swirling Rings + OWN AURA OUTCOME) */}
          <div className="oao-hero-logo-tilt">
            <div className={`oao-hero-logo-rig oao-hero-logo-mask ${isLight ? 'oao-hero-logo-light' : ''}`}>
              <img
                src={wideHeroBg}
                alt=""
                className="oao-hero-logo-core-img"
              />
              <div className="oao-hero-logo-shimmer" />
            </div>
          </div>

          {/* Sharp Neon-Orange & Warm Gold Rim Glow strictly over AURA */}
          <div className="oao-hero-aura-word-glow" />
          <div className="oao-hero-aura-word-rim" />

          {/* Luminous Gold Energy Arc around Upper Arm/Rings */}
          <svg
            viewBox="0 0 240 160"
            fill="none"
            className="oao-hero-energy-arc"
          >
            <defs>
              <linearGradient id="oaoHeroGoldArcGrad" x1="15%" y1="65%" x2="90%" y2="25%">
                <stop offset="0%" stopColor="#ff7b1c" stopOpacity="0" />
                <stop offset="38%" stopColor="#ffb347" stopOpacity="0.88" />
                <stop offset="68%" stopColor="#fff1b8" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#ff6b14" stopOpacity="0" />
              </linearGradient>
              <filter id="oaoHeroArcGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              d="M 24 88 C 68 38, 174 36, 214 96"
              stroke="url(#oaoHeroGoldArcGrad)"
              strokeWidth="2.4"
              strokeLinecap="round"
              filter="url(#oaoHeroArcGlow)"
            />
          </svg>

          {/* Subtle Golden Energy Sparks around Swirling Rings */}
          <span className="oao-hero-ember" style={{ left: '31.5%', top: '36%', '--ed': '3.8s', '--edelay': '0s', '--ex': '-8px' } as React.CSSProperties} />
          <span className="oao-hero-ember" style={{ left: '34.2%', top: '24%', width: '5px', height: '5px', '--ed': '4.6s', '--edelay': '1.1s', '--ex': '-6px' } as React.CSSProperties} />
          <span className="oao-hero-ember" style={{ left: '65.8%', top: '23%', width: '5px', height: '5px', '--ed': '4.1s', '--edelay': '0.5s', '--ex': '10px' } as React.CSSProperties} />
          <span className="oao-hero-ember" style={{ left: '68.6%', top: '34%', '--ed': '4.8s', '--edelay': '1.8s', '--ex': '12px' } as React.CSSProperties} />
          <span className="oao-hero-ember" style={{ left: '69.2%', top: '49%', width: '3.5px', height: '3.5px', '--ed': '3.9s', '--edelay': '2.4s', '--ex': '8px' } as React.CSSProperties} />
          <span className="oao-hero-ember" style={{ left: '33.5%', top: '67%', width: '3.5px', height: '3.5px', '--ed': '4.5s', '--edelay': '0.9s', '--ex': '-10px' } as React.CSSProperties} />
        </div>

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
