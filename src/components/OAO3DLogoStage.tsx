import React, { useRef, useEffect } from 'react';
import oaoImg from '../assets/images/logo.png';

interface OAO3DLogoStageProps {
  className?: string;
  showCaption?: boolean;
  compact?: boolean;
}

export const OAO3DLogoStage: React.FC<OAO3DLogoStageProps> = ({
  className = '',
  showCaption = true,
  compact = false,
}) => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const logoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const logo = logoRef.current;
    if (!stage || !logo) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const handlePointerMove = (event: PointerEvent) => {
      const box = stage.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      logo.style.setProperty('--ry', `${x * 16}deg`);
      logo.style.setProperty('--rx', `${y * -14}deg`);
    };

    const handlePointerLeave = () => {
      logo.style.setProperty('--ry', '0deg');
      logo.style.setProperty('--rx', '0deg');
    };

    stage.addEventListener('pointermove', handlePointerMove);
    stage.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      stage.removeEventListener('pointermove', handlePointerMove);
      stage.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, []);

  return (
    <div className={`relative w-full flex items-center justify-center ${className}`}>
      <style>{`
        .oao-stage {
          --orange: #f97316;
          --orange-deep: #ea580c;
          --navy: #0b132b;
          --blue-deep: #1e3a8a;
          position: relative;
          width: ${compact ? 'min(86vw, 400px)' : 'min(92vw, 480px)'};
          height: ${compact ? 'min(86vw, 370px)' : 'min(92vw, 450px)'};
          display: grid;
          place-items: center;
          perspective: 1200px;
          user-select: none;
        }
        .oao-stage::before {
          content: '';
          position: absolute;
          width: 56%;
          height: 20%;
          bottom: 8%;
          border-radius: 50%;
          background: rgba(11, 19, 43, 0.35);
          filter: blur(28px);
          transform: rotateX(72deg);
          animation: oao-shadow-pulse 7.5s ease-in-out infinite;
        }
        .dark .oao-stage::before {
          background: rgba(0, 0, 0, 0.85);
        }
        /* Calm Navy & Orange Dual Aura Glow */
        .oao-ambient-navy {
          position: absolute;
          width: 82%;
          aspect-ratio: 1;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(30, 58, 138, 0.32) 0%, rgba(11, 19, 43, 0.24) 45%, transparent 72%);
          filter: blur(42px);
          animation: oao-ambient-navy-breathe 8.5s ease-in-out infinite;
          pointer-events: none;
        }
        .oao-ambient-orange {
          position: absolute;
          width: 68%;
          aspect-ratio: 1;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(249, 115, 22, 0.28) 0%, rgba(234, 88, 12, 0.14) 48%, transparent 72%);
          filter: blur(36px);
          animation: oao-ambient-orange-breathe 7.5s ease-in-out infinite;
          pointer-events: none;
        }
        .oao-light-beam {
          position: absolute;
          width: 28%;
          height: 78%;
          opacity: 0.18;
          background: linear-gradient(90deg, transparent, rgba(249, 115, 22, 0.75), rgba(30, 58, 138, 0.55), transparent);
          filter: blur(36px);
          transform: rotate(35deg);
          animation: oao-light-sweep 9.5s ease-in-out infinite;
          pointer-events: none;
        }
        .oao-logo-wrap {
          position: relative;
          z-index: 5;
          width: ${compact ? 'min(64vw, 270px)' : 'min(68vw, 315px)'};
          aspect-ratio: 1;
          transform-style: preserve-3d;
          transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
          transition: transform 0.22s ease-out;
          animation: oao-levitate 7s ease-in-out infinite;
        }
        /* 3D Depth Layer: Metallic extrusion behind emblem */
        .oao-emblem-depth {
          position: absolute;
          inset: 0;
          transform: translateZ(-22px) scale(0.985);
          filter: drop-shadow(0 22px 35px rgba(11, 19, 43, 0.45)) drop-shadow(0 0 26px rgba(234, 88, 12, 0.3)) brightness(0.28) contrast(1.25);
          pointer-events: none;
          opacity: 0.92;
        }
        .dark .oao-emblem-depth {
          filter: drop-shadow(0 25px 40px rgba(0, 0, 0, 0.92)) drop-shadow(0 0 30px rgba(249, 115, 22, 0.35)) brightness(0.25) contrast(1.3);
        }
        .oao-emblem-depth img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        /* Core 3D Free-Floating Emblem */
        .oao-emblem-main {
          position: absolute;
          inset: 0;
          transform: translateZ(32px);
          filter: drop-shadow(0 14px 28px rgba(11, 19, 43, 0.42)) drop-shadow(0 0 28px rgba(234, 88, 12, 0.38));
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dark .oao-emblem-main {
          filter: drop-shadow(0 16px 32px rgba(0, 0, 0, 0.85)) drop-shadow(0 0 34px rgba(249, 115, 22, 0.48));
        }
        .oao-emblem-main img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
          transition: transform 0.45s ease;
        }
        .oao-logo-wrap:hover .oao-emblem-main img {
          transform: scale(1.04);
        }
        /* Calm Specular Gleam Sweep */
        .oao-specular-gleam {
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: 50%;
          background: linear-gradient(115deg, transparent 38%, rgba(255, 255, 255, 0.38) 50%, rgba(249, 115, 22, 0.2) 58%, transparent 68%);
          mix-blend-mode: overlay;
          animation: oao-gleam-sweep 7.5s ease-in-out infinite;
          opacity: 0.65;
        }
        .oao-ring {
          position: absolute;
          z-index: 1;
          left: 50%;
          top: 50%;
          border: 1.5px solid rgba(234, 88, 12, 0.42);
          border-radius: 50%;
          transform-style: preserve-3d;
          pointer-events: none;
        }
        .oao-ring::before {
          content: '';
          position: absolute;
          left: 50%;
          top: -4px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #f97316;
          box-shadow: 0 0 14px 3px rgba(249, 115, 22, 0.72);
        }
        .oao-ring-a {
          width: 124%;
          height: 48%;
          transform: translate(-50%, -50%) rotateX(67deg) rotateZ(12deg) translateZ(16px);
          animation: oao-ring-a 16s linear infinite;
        }
        .oao-ring-b {
          width: 146%;
          height: 58%;
          border-color: rgba(30, 58, 138, 0.45);
          transform: translate(-50%, -50%) rotateX(68deg) rotateY(18deg) translateZ(-5px);
          animation: oao-ring-b 22s linear infinite reverse;
        }
        .dark .oao-ring-b {
          border-color: rgba(59, 130, 246, 0.35);
        }
        .oao-ring-b::before {
          background: #1e3a8a;
          box-shadow: 0 0 14px 3px rgba(30, 58, 138, 0.7);
        }
        .dark .oao-ring-b::before {
          background: #60a5fa;
          box-shadow: 0 0 14px 3px rgba(96, 165, 250, 0.72);
        }
        .oao-ring-c {
          width: 166%;
          height: 68%;
          border-color: rgba(11, 19, 43, 0.22);
          transform: translate(-50%, -50%) rotateX(70deg) rotateZ(-18deg) translateZ(-18px);
          animation: oao-ring-c 28s linear infinite;
        }
        .dark .oao-ring-c {
          border-color: rgba(189, 203, 226, 0.22);
        }
        .oao-caption {
          position: absolute;
          z-index: 8;
          bottom: 1%;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.24em;
        }
        .oao-caption i {
          display: block;
          width: 40px;
          height: 1.5px;
          background: linear-gradient(90deg, transparent, #ea580c);
        }
        .oao-caption i:last-child {
          background: linear-gradient(90deg, #ea580c, transparent);
        }
        @keyframes oao-levitate {
          0%, 100% { transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) translateY(0px); }
          50% { transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) translateY(-10px); }
        }
        @keyframes oao-ambient-navy-breathe {
          0%, 100% { opacity: 0.45; transform: scale(0.96); }
          50% { opacity: 0.82; transform: scale(1.08); }
        }
        @keyframes oao-ambient-orange-breathe {
          0%, 100% { opacity: 0.42; transform: scale(1.02); }
          50% { opacity: 0.78; transform: scale(0.94); }
        }
        @keyframes oao-shadow-pulse {
          0%, 100% { transform: rotateX(72deg) scale(1); opacity: 0.7; }
          50% { transform: rotateX(72deg) scale(0.86); opacity: 0.45; }
        }
        @keyframes oao-light-sweep {
          0%, 100% { transform: translateX(-140px) rotate(35deg); opacity: 0; }
          45% { opacity: 0.24; }
          75% { transform: translateX(140px) rotate(35deg); opacity: 0; }
        }
        @keyframes oao-gleam-sweep {
          0%, 100% { opacity: 0; transform: translateX(-55%) rotate(25deg); }
          35% { opacity: 0.65; }
          65% { opacity: 0; transform: translateX(55%) rotate(25deg); }
        }
        @keyframes oao-ring-a { to { rotate: 360deg; } }
        @keyframes oao-ring-b { to { rotate: -360deg; } }
        @keyframes oao-ring-c { to { rotate: 360deg; } }
        @media (prefers-reduced-motion: reduce) {
          .oao-logo-wrap, .oao-ambient-navy, .oao-ambient-orange, .oao-light-beam, .oao-specular-gleam, .oao-ring {
            animation: none !important;
          }
        }
        @media (max-width: 560px) {
          .oao-logo-wrap { width: ${compact ? 'min(62vw, 230px)' : 'min(68vw, 255px)'}; }
          .oao-caption { bottom: 2%; font-size: 9px; }
          .oao-ring-c { display: none; }
        }
      `}</style>

      <div ref={stageRef} className="oao-stage" aria-label="شعار Own Aura Outcome بتصميم ثلاثي الأبعاد">
        <div className="oao-ambient-navy" />
        <div className="oao-ambient-orange" />
        <div className="oao-light-beam" />
        <div ref={logoRef} className="oao-logo-wrap">
          <div className="oao-ring oao-ring-a" />
          <div className="oao-ring oao-ring-b" />
          <div className="oao-ring oao-ring-c" />

          {/* 3D Depth Extrusion Layer */}
          <div className="oao-emblem-depth" aria-hidden="true">
            <img src={oaoImg} alt="" />
          </div>

          {/* Core 3D Free-Standing Emblem */}
          <div className="oao-emblem-main">
            <img src={oaoImg} alt="Own Aura Outcome" />
            <div className="oao-specular-gleam" aria-hidden="true" />
          </div>
        </div>
        {showCaption && (
          <div className="oao-caption">
            <i />
            <span className="flex items-center gap-1.5 font-black text-xs tracking-wider select-none">
              <span className="text-[#0B132B] dark:text-white">OWN</span>
              <span className="px-1.5 py-0.5 rounded bg-[#0B132B] text-white dark:bg-gradient-to-r dark:from-slate-100 dark:via-white dark:to-slate-200 dark:text-[#07182E] text-[10px] font-black tracking-widest uppercase border border-orange-500/40 dark:border-slate-300 shadow-xs">
                AURA
              </span>
              <span className="text-[#EA580C] dark:text-[#f97316]">OUTCOME</span>
            </span>
            <i />
          </div>
        )}
      </div>
    </div>
  );
};
