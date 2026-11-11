import React, { useRef, useEffect } from 'react';
import oaoImg from '../assets/images/logo.png';

interface OAO3DLogoStageProps {
  className?: string;
}

export const OAO3DLogoStage: React.FC<OAO3DLogoStageProps> = ({ className = '' }) => {
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
          --orange: #ed651b;
          --navy: #07152e;
          --blue: #173f80;
          --silver: #bcc7d8;
          position: relative;
          width: min(94vw, 560px);
          height: min(94vw, 560px);
          max-height: 580px;
          display: grid;
          place-items: center;
          perspective: 1200px;
          user-select: none;
        }
        .oao-stage::before {
          content: '';
          position: absolute;
          width: 58%;
          height: 22%;
          bottom: 9%;
          border-radius: 50%;
          background: rgba(0,0,0,.85);
          filter: blur(32px);
          transform: rotateX(72deg);
          animation: oao-shadow-pulse 5s ease-in-out infinite;
        }
        .oao-ambient {
          position: absolute;
          width: 65%;
          aspect-ratio: 1;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(237,101,27,.3), rgba(7,21,46,.2) 45%, transparent 70%);
          filter: blur(40px);
          animation: oao-ambient-breathe 4s ease-in-out infinite;
        }
        .oao-light-beam {
          position: absolute;
          width: 26%;
          height: 80%;
          opacity: .25;
          background: linear-gradient(90deg, transparent, #ed651b, transparent);
          filter: blur(35px);
          transform: rotate(38deg);
          animation: oao-light-sweep 7s ease-in-out infinite;
        }
        .oao-logo-wrap {
          position: relative;
          z-index: 5;
          width: min(72vw, 380px);
          aspect-ratio: 1;
          transform-style: preserve-3d;
          transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
          transition: transform .18s ease-out;
          animation: oao-levitate 6s ease-in-out infinite;
        }
        /* 3D Depth Layer: Realistic metallic extrusion behind the emblem */
        .oao-emblem-depth {
          position: absolute;
          inset: 0;
          transform: translateZ(-20px) scale(0.985);
          filter: drop-shadow(0 25px 40px rgba(0,0,0,0.92)) drop-shadow(0 0 30px rgba(237,101,27,0.4)) brightness(0.25) contrast(1.3);
          pointer-events: none;
          opacity: 0.95;
        }
        .oao-emblem-depth img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        /* Core 3D Free-Floating Emblem (Muscle Arm + Energetic Flames + Outcome Typography) */
        .oao-emblem-main {
          position: absolute;
          inset: 0;
          transform: translateZ(30px);
          filter: drop-shadow(0 15px 30px rgba(0,0,0,0.8)) drop-shadow(0 0 35px rgba(237,101,27,0.5));
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .oao-emblem-main img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
          transition: transform 0.4s ease;
        }
        .oao-logo-wrap:hover .oao-emblem-main img {
          transform: scale(1.05);
        }
        /* Specular Gleam Sweep across metallic arm and flame edges */
        .oao-specular-gleam {
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: 50%;
          background: linear-gradient(115deg, transparent 38%, rgba(255,255,255,0.45) 50%, rgba(237,101,27,0.25) 58%, transparent 68%);
          mix-blend-mode: overlay;
          animation: oao-gleam-sweep 5.5s ease-in-out infinite;
          opacity: 0.7;
        }
        .oao-ring {
          position: absolute;
          z-index: 1;
          left: 50%;
          top: 50%;
          border: 1.5px solid rgba(237,101,27,.45);
          border-radius: 50%;
          transform-style: preserve-3d;
          pointer-events: none;
        }
        .oao-ring::before {
          content: '';
          position: absolute;
          left: 50%;
          top: -5px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ed651b;
          box-shadow: 0 0 18px 4px rgba(237,101,27,.85);
        }
        .oao-ring-a {
          width: 125%;
          height: 50%;
          transform: translate(-50%, -50%) rotateX(67deg) rotateZ(12deg) translateZ(16px);
          animation: oao-ring-a 12s linear infinite;
        }
        .oao-ring-b {
          width: 148%;
          height: 60%;
          border-color: rgba(72,167,255,.35);
          transform: translate(-50%, -50%) rotateX(68deg) rotateY(18deg) translateZ(-5px);
          animation: oao-ring-b 18s linear infinite reverse;
        }
        .oao-ring-b::before {
          background: #48a7ff;
          box-shadow: 0 0 18px 4px rgba(72,167,255,.8);
        }
        .oao-ring-c {
          width: 168%;
          height: 70%;
          border-color: rgba(189,203,226,.25);
          transform: translate(-50%, -50%) rotateX(70deg) rotateZ(-18deg) translateZ(-18px);
          animation: oao-ring-c 23s linear infinite;
        }
        .oao-caption {
          position: absolute;
          z-index: 8;
          bottom: 2%;
          display: flex;
          align-items: center;
          gap: 13px;
          color: #8d9bb3;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .28em;
        }
        .oao-caption i {
          display: block;
          width: 46px;
          height: 1px;
          background: #ed651b;
          box-shadow: 0 0 10px #ed651b;
        }
        @keyframes oao-levitate { 0%, 100% { translate: 0 0; } 50% { translate: 0 -13px; } }
        @keyframes oao-ambient-breathe { 0%, 100% { opacity: .6; scale: 1; } 50% { opacity: .95; scale: 1.16; } }
        @keyframes oao-shadow-pulse { 0%, 100% { scale: 1; opacity: .7; } 50% { scale: .8; opacity: .42; } }
        @keyframes oao-light-sweep { 0%, 100% { translate: -180px 0; opacity: 0; } 45% { opacity: .3; } 70% { translate: 180px 0; opacity: 0; } }
        @keyframes oao-gleam-sweep {
          0%, 100% { opacity: 0; transform: translateX(-60%) rotate(25deg); }
          30% { opacity: 0.85; }
          60% { opacity: 0; transform: translateX(60%) rotate(25deg); }
        }
        @keyframes oao-ring-a { to { rotate: 360deg; } }
        @keyframes oao-ring-b { to { rotate: -360deg; } }
        @keyframes oao-ring-c { to { rotate: 360deg; } }
        @media (max-width: 560px) {
          .oao-logo-wrap { width: min(78vw, 320px); }
          .oao-caption { bottom: 3%; font-size: 9px; }
          .oao-ring-c { display: none; }
        }
      `}</style>

      <main ref={stageRef} className="oao-stage" aria-label="شعار Own Aura Outcome بتصميم ثلاثي الأبعاد">
        <div className="oao-ambient"></div>
        <div className="oao-light-beam"></div>
        <div ref={logoRef} className="oao-logo-wrap">
          <div className="oao-ring oao-ring-a"></div>
          <div className="oao-ring oao-ring-b"></div>
          <div className="oao-ring oao-ring-c"></div>

          {/* 3D Depth Extrusion Layer */}
          <div className="oao-emblem-depth" aria-hidden="true">
            <img src={oaoImg} alt="" />
          </div>

          {/* Core 3D Free-Standing Emblem Shape */}
          <div className="oao-emblem-main">
            <img src={oaoImg} alt="Own Aura Outcome" />
            <div className="oao-specular-gleam" aria-hidden="true"></div>
          </div>
        </div>
        <div className="oao-caption">
          <i></i>
          <span className="flex items-center gap-1.5 font-black text-xs tracking-wider select-none">
            <span className="text-white">OWN</span>
            <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-slate-100 via-white to-slate-200 text-[#07182E] text-[10px] font-black tracking-widest uppercase border border-slate-300 shadow-xs">
              AURA
            </span>
            <span className="text-[#ed651b]">OUTCOME</span>
          </span>
          <i></i>
        </div>
      </main>
    </div>
  );
};
