import React, { useEffect, useRef } from 'react';
import { Language, Theme } from '../types';
import { useOaoTheme } from '../lib/themeUtils';
import wideHeroBg from '../assets/images/oao_wide_hero_gym_navy_1795421650206.jpg';
import { Sparkles, ArrowRight, Shield } from 'lucide-react';

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

    const handlePointerMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      stage.style.setProperty('--hl-ry', `${(nx * 14).toFixed(2)}deg`);
      stage.style.setProperty('--hl-rx', `${(ny * -12).toFixed(2)}deg`);
      stage.style.setProperty('--hl-hover', '1');
    };

    const handlePointerLeave = () => {
      stage.style.setProperty('--hl-ry', '0deg');
      stage.style.setProperty('--hl-rx', '0deg');
      stage.style.setProperty('--hl-hover', '0');
    };

    stage.addEventListener('pointermove', handlePointerMove, { passive: true });
    stage.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      stage.removeEventListener('pointermove', handlePointerMove);
      stage.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, []);

  return (
    <section
      style={{ backgroundColor: '#030712' }}
      className="relative w-full max-w-full min-h-[calc(100svh-94px)] md:h-[calc(100svh-94px)] md:max-h-[100svh] flex flex-col items-center justify-center overflow-hidden select-none px-4 sm:px-8 py-4 sm:py-6 bg-[#030712] text-white"
    >
      {/* 1. FUTURISTIC GYM CORRIDOR BACKDROP (High priority, subtle slow zoom, navy vignette & bottom fade) */}
      <div
        className="absolute inset-0 w-full max-w-full z-0 overflow-hidden pointer-events-none"
        style={{
          WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 80%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, #000 0%, #000 80%, transparent 100%)',
        }}
      >
        <img
          src="/assets/hero-gym.jpg"
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className="oao-hero-bg-img w-full h-full object-cover object-center"
        />

        {/* Navy-tinted vertical gradient (darker top & bottom) */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#030712]/85 via-[#0b132b]/45 to-[#030712]/90" />

        {/* Radial vignette (lighter behind logo center, darker toward edges) */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(11,19,43,0.16)_0%,rgba(7,10,20,0.62)_56%,rgba(3,7,18,0.94)_100%)]" />
      </div>

      {/* Smooth bottom fade into the next section background */}
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 bottom-0 h-20 sm:h-24 z-[1] pointer-events-none bg-gradient-to-t ${
          isLight
            ? 'from-[#EEF2F6] via-[#EEF2F6]/35 to-transparent'
            : 'from-[#030712] via-[#030712]/70 to-transparent'
        }`}
      />

      {/* 2. CENTERPIECE: SINGLE MODERATE LOGO + ONE-LINE DESCRIPTION + 2 CTA BUTTONS */}
      <div className="relative z-10 w-full max-w-3xl mx-auto flex flex-col items-center justify-center text-center gap-3 sm:gap-4">
        {/* Soft orange separation glow behind the logo */}
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[58%] w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] rounded-full bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.34)_0%,rgba(255,87,34,0.16)_38%,transparent_70%)] blur-2xl pointer-events-none"
        />

        {/* Scoped Moderate-Size Logo Stage */}
        <div
          ref={logoStageRef}
          className="oao-hero-logo-stage relative w-[220px] h-[220px] sm:w-[295px] sm:h-[295px] md:w-[330px] md:h-[330px] shrink-0"
        >
          <style>{`
            @keyframes oaoHeroBgZoom {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.06); }
            }
            .oao-hero-bg-img {
              animation: oaoHeroBgZoom 25s ease-in-out infinite;
              will-change: transform;
            }
            .oao-hero-logo-stage {
              --hl-rx: 0deg;
              --hl-ry: 0deg;
              --hl-hover: 0;
              perspective: 1200px;
              transform-style: preserve-3d;
            }
            .oao-hero-logo-aura-outer {
              position: absolute;
              inset: -8%;
              border-radius: 50%;
              background: radial-gradient(
                circle at 50% 50%,
                rgba(255, 118, 28, 0.38) 0%,
                rgba(255, 168, 60, 0.2) 38%,
                rgba(234, 88, 12, 0.08) 58%,
                transparent 74%
              );
              filter: blur(26px);
              mix-blend-mode: screen;
              animation: oaoHeroAuraBreathe 5.8s ease-in-out infinite;
              will-change: transform, opacity;
              pointer-events: none;
            }
            .oao-hero-logo-tilt {
              position: relative;
              width: 100%;
              height: 100%;
              transform-origin: center center;
              transform: perspective(1200px) rotateX(var(--hl-rx)) rotateY(var(--hl-ry)) scale(calc(1 + var(--hl-hover) * 0.025));
              transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
              will-change: transform;
            }
            .oao-hero-logo-rig {
              position: relative;
              width: 100%;
              height: 100%;
              animation: oaoHeroLogoFloat 7.2s ease-in-out infinite;
              will-change: transform;
              overflow: hidden;
              -webkit-mask-image: radial-gradient(ellipse 48% 49% at 50% 50%, #000 66%, rgba(0, 0, 0, 0.85) 80%, transparent 98%);
              mask-image: radial-gradient(ellipse 48% 49% at 50% 50%, #000 66%, rgba(0, 0, 0, 0.85) 80%, transparent 98%);
            }
            .oao-hero-logo-core-img {
              position: absolute;
              left: 50%;
              top: 50%;
              height: 135%;
              width: auto;
              max-width: none;
              transform: translate(-50.6%, -47.2%);
              filter: contrast(1.22) saturate(1.26) brightness(1.08) drop-shadow(0 0 18px rgba(249, 115, 22, 0.35));
            }
            .oao-hero-logo-shimmer {
              position: absolute;
              inset: 0;
              background: linear-gradient(
                114deg,
                transparent 36%,
                rgba(255, 255, 255, 0.16) 46%,
                rgba(255, 206, 115, 0.34) 50%,
                rgba(255, 110, 26, 0.22) 54%,
                transparent 64%
              );
              mix-blend-mode: screen;
              animation: oaoHeroShimmerSweep 6.4s ease-in-out infinite;
              will-change: transform, opacity;
              pointer-events: none;
            }
            .oao-hero-aura-word-glow {
              position: absolute;
              left: 44.3%;
              top: 47.3%;
              width: 50%;
              height: 16.5%;
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
              pointer-events: none;
            }
            .oao-hero-aura-word-rim {
              position: absolute;
              left: 46.5%;
              top: 49%;
              width: 45%;
              height: 13%;
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
              pointer-events: none;
            }
            .oao-hero-energy-arc {
              position: absolute;
              left: 39%;
              top: 14.5%;
              width: 52%;
              height: 30%;
              mix-blend-mode: screen;
              animation: oaoHeroArcPulse 4.8s ease-in-out infinite;
              will-change: transform, opacity;
              pointer-events: none;
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
              pointer-events: none;
            }
            @keyframes oaoHeroAuraBreathe {
              0%, 100% { opacity: 0.48; transform: scale(0.97); }
              50% { opacity: 0.9; transform: scale(1.05); }
            }
            @keyframes oaoHeroLogoFloat {
              0%, 100% { transform: translate3d(0, 0, 0); }
              50% { transform: translate3d(0, -5px, 8px); }
            }
            @keyframes oaoHeroShimmerSweep {
              0%, 100% { transform: translate3d(-45%, 0, 0); opacity: 0; }
              32% { opacity: 0.85; }
              65% { transform: translate3d(45%, 0, 0); opacity: 0; }
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
            .oao-hero-tagline {
              animation:
                oaoHeroTaglineEnter 0.85s cubic-bezier(0.22, 1, 0.36, 1) both,
                oaoHeroTaglineFloat 5.2s ease-in-out 0.85s infinite;
              will-change: transform, opacity;
            }
            .oao-hero-tagline-highlight {
              display: inline;
              background: linear-gradient(
                105deg,
                #ffffff 0%,
                #fed7aa 22%,
                #ff6b14 48%,
                #fde68a 72%,
                #ffffff 100%
              );
              background-size: 240% 100%;
              -webkit-background-clip: text;
              background-clip: text;
              color: transparent;
              -webkit-text-fill-color: transparent;
              animation: oaoHeroTaglineShimmer 4.2s ease-in-out infinite;
              will-change: background-position, filter;
            }
            .oao-hero-tagline-coach {
              position: relative;
              display: inline-block;
              color: #ede0bf;
              font-size: 14px;
              border-color: #4b66e3;
              border-style: groove;
              animation: oaoHeroCoachGlow 3.6s ease-in-out infinite;
            }
            .oao-hero-tagline-coach::after {
              content: '';
              position: absolute;
              left: 0;
              right: 0;
              bottom: -2px;
              height: 2px;
              border-radius: 9999px;
              background: linear-gradient(90deg, transparent 0%, #ff7043 30%, #fde68a 50%, #ff7043 70%, transparent 100%);
              background-size: 200% 100%;
              animation: oaoHeroTaglineUnderline 3.6s ease-in-out infinite;
              opacity: 0.9;
            }
            @keyframes oaoHeroTaglineEnter {
              0% { opacity: 0; transform: translate3d(0, 12px, 0) scale(0.985); }
              100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
            }
            @keyframes oaoHeroTaglineFloat {
              0%, 100% { transform: translate3d(0, 0, 0); }
              50% { transform: translate3d(0, -3px, 0); }
            }
            @keyframes oaoHeroTaglineShimmer {
              0%, 100% {
                background-position: 0% 50%;
                filter: drop-shadow(0 0 8px rgba(255, 112, 67, 0.35));
              }
              50% {
                background-position: 100% 50%;
                filter: drop-shadow(0 0 16px rgba(255, 168, 60, 0.72));
              }
            }
            @keyframes oaoHeroCoachGlow {
              0%, 100% { text-shadow: 0 0 8px rgba(251, 191, 36, 0.28); }
              50% { text-shadow: 0 0 18px rgba(255, 138, 36, 0.75); }
            }
            @keyframes oaoHeroTaglineUnderline {
              0%, 100% { background-position: 0% 50%; opacity: 0.65; }
              50% { background-position: 100% 50%; opacity: 1; }
            }
            @media (prefers-reduced-motion: reduce) {
              .oao-hero-bg-img,
              .oao-hero-logo-aura-outer,
              .oao-hero-logo-tilt,
              .oao-hero-logo-rig,
              .oao-hero-logo-shimmer,
              .oao-hero-aura-word-glow,
              .oao-hero-aura-word-rim,
              .oao-hero-energy-arc,
              .oao-hero-ember,
              .oao-hero-tagline,
              .oao-hero-tagline-highlight,
              .oao-hero-tagline-coach,
              .oao-hero-tagline-coach::after {
                animation: none !important;
                transition: none !important;
              }
              .oao-hero-bg-img,
              .oao-hero-logo-tilt,
              .oao-hero-logo-rig,
              .oao-hero-tagline {
                transform: none !important;
                opacity: 1 !important;
              }
              .oao-hero-tagline-highlight {
                background-position: 50% 50%;
                filter: drop-shadow(0 0 10px rgba(255, 112, 67, 0.45));
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
          <div className="oao-hero-logo-aura-outer" aria-hidden="true" />

          {/* Crisp Masked Logo Core (Muscular Arm + Swirling Rings + OWN AURA OUTCOME) */}
          <div className="oao-hero-logo-tilt">
            <div className="oao-hero-logo-rig">
              <img
                src={wideHeroBg}
                alt="OWN AURA OUTCOME"
                className="oao-hero-logo-core-img"
              />
              <div className="oao-hero-logo-shimmer" aria-hidden="true" />
            </div>

            {/* Sharp Neon-Orange & Warm Gold Rim Glow strictly over AURA */}
            <div className="oao-hero-aura-word-glow" aria-hidden="true" />
            <div className="oao-hero-aura-word-rim" aria-hidden="true" />

            {/* Luminous Gold Energy Arc around Upper Arm/Rings */}
            <svg viewBox="0 0 240 160" fill="none" className="oao-hero-energy-arc" aria-hidden="true">
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
            <span className="oao-hero-ember" aria-hidden="true" style={{ left: '6%', top: '36%', '--ed': '3.8s', '--edelay': '0s', '--ex': '-8px' } as React.CSSProperties} />
            <span className="oao-hero-ember" aria-hidden="true" style={{ left: '12%', top: '20%', width: '5px', height: '5px', '--ed': '4.6s', '--edelay': '1.1s', '--ex': '-6px' } as React.CSSProperties} />
            <span className="oao-hero-ember" aria-hidden="true" style={{ left: '86%', top: '18%', width: '5px', height: '5px', '--ed': '4.1s', '--edelay': '0.5s', '--ex': '10px' } as React.CSSProperties} />
            <span className="oao-hero-ember" aria-hidden="true" style={{ left: '92%', top: '34%', '--ed': '4.8s', '--edelay': '1.8s', '--ex': '12px' } as React.CSSProperties} />
            <span className="oao-hero-ember" aria-hidden="true" style={{ left: '93%', top: '52%', width: '3.5px', height: '3.5px', '--ed': '3.9s', '--edelay': '2.4s', '--ex': '8px' } as React.CSSProperties} />
            <span className="oao-hero-ember" aria-hidden="true" style={{ left: '10%', top: '76%', width: '3.5px', height: '3.5px', '--ed': '4.5s', '--edelay': '0.9s', '--ex': '-10px' } as React.CSSProperties} />
          </div>
        </div>

        {/* One-line Brand Description */}
        <p className="oao-hero-tagline text-sm sm:text-base md:text-lg font-semibold max-w-2xl mx-auto leading-relaxed text-slate-100 drop-shadow-[0_2px_12px_rgba(3,7,18,0.95)] transition-transform duration-300 hover:scale-[1.015]">
          {language === 'ar' ? (
            <>
              نظام رياضي نخبوي مصمم{' '}
              <span className="oao-hero-tagline-highlight font-black">
                لتحويل الجينات إلى قوة عضلية حقيقية
              </span>{' '}
              تحت إشراف{' '}
              <span className="oao-hero-tagline-coach font-extrabold">
                الكوتش عمر عدنان
              </span>
            </>
          ) : (
            <>
              Elite training system engineered to{' '}
              <span className="oao-hero-tagline-highlight font-black">
                forge real muscle hypertrophy
              </span>{' '}
              under{' '}
              <span className="oao-hero-tagline-coach font-extrabold">
                Coach Omar Adnan
              </span>
            </>
          )}
        </p>

        {/* Two Visible Above-the-Fold Buttons: Stacked on Mobile (>=44px tall), Row on Tablet/Desktop */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4 mt-1 w-full max-w-[270px] sm:max-w-none sm:w-auto mx-auto">
          <button
            type="button"
            onClick={onOpenPrograms}
            className="w-full sm:w-auto min-h-[44px] px-7 sm:px-9 py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-[#FF5722] via-[#FF7043] to-amber-500 hover:from-[#FF7043] hover:to-amber-400 text-white font-black text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_28px_rgba(255,87,34,0.55)] border border-orange-300/60 flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 glow-orange"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>{language === 'ar' ? 'اشترك الآن' : 'Subscribe Now'}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>

          <button
            type="button"
            onClick={onOpenFacilities}
            className="w-full sm:w-auto min-h-[44px] px-6 sm:px-8 py-3 sm:py-3.5 rounded-2xl backdrop-blur-md border font-bold text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-2 bg-[#0B132B]/75 hover:bg-[#1C2541]/90 border-orange-500/40 hover:border-[#FF5722] text-white shadow-lg"
          >
            <Shield className="w-4 h-4 text-[#FF7043]" />
            <span>{language === 'ar' ? 'شاهد الباقات' : 'View Plans'}</span>
          </button>
        </div>
      </div>
    </section>
  );
};

