import React, { useEffect, useRef } from 'react';
import { Theme } from '../types';

interface BackgroundEffectsProps {
  theme?: Theme;
}

export const BackgroundEffects: React.FC<BackgroundEffectsProps> = ({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    interface Particle {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
      color: string;
      maxLife: number;
      life: number;
    }

    const isLight =
      theme === 'light' ||
      (!theme && !document.documentElement.classList.contains('dark'));

    const particles: Particle[] = [];
    const colors = isLight
      ? [
          'rgba(234, 88, 12, ',  // vibrant orange
          'rgba(249, 115, 22, ', // soft orange
          'rgba(30, 58, 138, ',  // calm navy
          'rgba(11, 19, 43, ',   // deep navy
        ]
      : [
          'rgba(249, 115, 22, ', // bright orange
          'rgba(234, 88, 12, ',  // deeper orange
          'rgba(251, 146, 60, ', // amber gold
          'rgba(30, 58, 138, ',  // calm navy ambient
        ];

    const maxParticles = isLight ? 24 : 38;

    const createParticle = (): Particle => {
      const isOrange = Math.random() > 0.25;
      const baseColor = isOrange
        ? colors[Math.floor(Math.random() * 2)]
        : colors[2 + Math.floor(Math.random() * 2)];
      return {
        x: Math.random() * width,
        y: height + Math.random() * 50,
        size: Math.random() * 2.4 + 0.9,
        speedY: Math.random() * 0.75 + 0.25,
        speedX: (Math.random() - 0.5) * 0.45,
        opacity: isLight ? Math.random() * 0.28 + 0.08 : Math.random() * 0.55 + 0.15,
        color: baseColor,
        maxLife: Math.random() * 200 + 140,
        life: 0,
      };
    };

    for (let i = 0; i < maxParticles - 6; i++) {
      const p = createParticle();
      p.y = Math.random() * height;
      particles.push(p);
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (particles.length < maxParticles && Math.random() < 0.25) {
        particles.push(createParticle());
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.y -= p.speedY;
        p.x += p.speedX;

        const progress = p.life / p.maxLife;
        let alpha = p.opacity;
        if (progress > 0.7) {
          alpha = p.opacity * (1 - (progress - 0.7) / 0.3);
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.max(0, alpha)})`;
        ctx.shadowBlur = isLight ? 0 : p.size * 2.5;
        ctx.shadowColor = p.color.includes('249') || p.color.includes('234') || p.color.includes('251')
          ? '#f97316'
          : '#1e3a8a';
        ctx.fill();
        ctx.shadowBlur = 0;

        if (p.y < -20 || p.life >= p.maxLife || p.x < 0 || p.x > width) {
          particles.splice(i, 1);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
      {/* Calm Navy & Orange Ambient Glow Orbs */}
      <div className="absolute top-1/4 left-[-10%] w-[520px] h-[520px] bg-blue-900/10 dark:bg-blue-900/20 rounded-full blur-[150px] oao-calm-aura-pulse pointer-events-none" />
      <div className="absolute top-1/3 right-[-10%] w-[560px] h-[560px] bg-orange-500/10 dark:bg-orange-600/12 rounded-full blur-[160px] oao-calm-aura-shimmer pointer-events-none" />
      <div className="absolute bottom-[-10%] left-1/3 w-[560px] h-[380px] bg-orange-400/10 dark:bg-orange-500/8 rounded-full blur-[150px] pointer-events-none" />

      {/* Interactive Embers Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
